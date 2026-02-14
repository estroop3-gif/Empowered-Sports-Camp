/**
 * Stripe Reconciliation API
 *
 * GET  /api/admin/stripe-reconcile — Compare DB amounts with actual Stripe charges
 * POST /api/admin/stripe-reconcile — Fix DB records to match Stripe
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover',
})

interface Discrepancy {
  paymentIntentId: string
  registrationIds: string[]
  athleteNames: string[]
  dbTotalCents: number
  stripeTotalCents: number
  diffCents: number
  stripeStatus: string
}

/**
 * GET — Show all discrepancies between DB and Stripe
 */
export async function GET() {
  try {
    // Get all registrations with a Stripe payment intent
    const registrations = await prisma.registration.findMany({
      where: {
        stripePaymentIntentId: { not: null },
        status: { not: 'cancelled' },
      },
      select: {
        id: true,
        stripePaymentIntentId: true,
        totalPriceCents: true,
        basePriceCents: true,
        discountCents: true,
        promoDiscountCents: true,
        addonsTotalCents: true,
        taxCents: true,
        paymentStatus: true,
        athlete: { select: { firstName: true, lastName: true } },
        registrationAddons: {
          select: { priceCents: true, quantity: true },
        },
      },
    })

    // Group by payment intent (multi-camper checkouts share one PI)
    const byPI = new Map<string, typeof registrations>()
    for (const reg of registrations) {
      const pi = reg.stripePaymentIntentId!
      if (!byPI.has(pi)) byPI.set(pi, [])
      byPI.get(pi)!.push(reg)
    }

    const discrepancies: Discrepancy[] = []
    const matches: { paymentIntentId: string; amount: number }[] = []
    let totalDbCents = 0
    let totalStripeCents = 0

    // Query Stripe for each unique payment intent
    for (const [piId, regs] of byPI) {
      // Skip demo payment intents
      if (piId.startsWith('demo_')) continue

      try {
        const pi = await stripe.paymentIntents.retrieve(piId)
        const stripeAmount = pi.amount_received || pi.amount || 0
        const dbAmount = regs.reduce((s, r) => s + (r.totalPriceCents || 0), 0)

        totalDbCents += dbAmount
        totalStripeCents += stripeAmount

        if (Math.abs(dbAmount - stripeAmount) > 1) {
          // Check what addon totals SHOULD be based on registrationAddons
          const addonDetails = regs.map(r => ({
            id: r.id,
            storedAddonTotal: r.addonsTotalCents,
            actualAddonTotal: r.registrationAddons.reduce((s, a) => s + a.priceCents, 0),
            athleteName: `${r.athlete?.firstName} ${r.athlete?.lastName}`,
          }))

          discrepancies.push({
            paymentIntentId: piId,
            registrationIds: regs.map(r => r.id),
            athleteNames: regs.map(r => `${r.athlete?.firstName} ${r.athlete?.lastName}`),
            dbTotalCents: dbAmount,
            stripeTotalCents: stripeAmount,
            diffCents: dbAmount - stripeAmount,
            stripeStatus: pi.status,
          })
        } else {
          matches.push({ paymentIntentId: piId, amount: stripeAmount })
        }
      } catch (err) {
        discrepancies.push({
          paymentIntentId: piId,
          registrationIds: regs.map(r => r.id),
          athleteNames: regs.map(r => `${r.athlete?.firstName} ${r.athlete?.lastName}`),
          dbTotalCents: regs.reduce((s, r) => s + (r.totalPriceCents || 0), 0),
          stripeTotalCents: 0,
          diffCents: regs.reduce((s, r) => s + (r.totalPriceCents || 0), 0),
          stripeStatus: `error: ${err instanceof Error ? err.message : 'unknown'}`,
        })
      }
    }

    return NextResponse.json({
      summary: {
        totalPaymentIntents: byPI.size,
        matchingCount: matches.length,
        discrepancyCount: discrepancies.length,
        dbTotal: `$${(totalDbCents / 100).toFixed(2)}`,
        stripeTotal: `$${(totalStripeCents / 100).toFixed(2)}`,
        difference: `$${((totalDbCents - totalStripeCents) / 100).toFixed(2)}`,
      },
      discrepancies: discrepancies.map(d => ({
        ...d,
        dbTotal: `$${(d.dbTotalCents / 100).toFixed(2)}`,
        stripeTotal: `$${(d.stripeTotalCents / 100).toFixed(2)}`,
        diff: `$${(d.diffCents / 100).toFixed(2)}`,
      })),
      matches: matches.map(m => ({
        paymentIntentId: m.paymentIntentId,
        amount: `$${(m.amount / 100).toFixed(2)}`,
      })),
    })
  } catch (error) {
    console.error('[Reconcile] Failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reconcile' },
      { status: 500 }
    )
  }
}

/**
 * POST — Fix DB records to match actual Stripe charge amounts
 *
 * For each discrepancy:
 * 1. Recalculates addonsTotalCents from actual registrationAddons
 * 2. Recalculates totalPriceCents = base - discount - promo + addons + tax
 * 3. If still doesn't match Stripe, distributes Stripe amount proportionally
 */
export async function POST() {
  try {
    const registrations = await prisma.registration.findMany({
      where: {
        stripePaymentIntentId: { not: null },
        status: { not: 'cancelled' },
      },
      select: {
        id: true,
        stripePaymentIntentId: true,
        totalPriceCents: true,
        basePriceCents: true,
        discountCents: true,
        promoDiscountCents: true,
        addonsTotalCents: true,
        taxCents: true,
        paymentStatus: true,
        registrationAddons: {
          select: { priceCents: true, quantity: true },
        },
      },
    })

    // Group by payment intent
    const byPI = new Map<string, typeof registrations>()
    for (const reg of registrations) {
      const pi = reg.stripePaymentIntentId!
      if (!byPI.has(pi)) byPI.set(pi, [])
      byPI.get(pi)!.push(reg)
    }

    const fixes: { registrationId: string; oldTotal: number; newTotal: number; oldAddons: number; newAddons: number }[] = []

    for (const [piId, regs] of byPI) {
      if (piId.startsWith('demo_')) continue

      let stripeAmount: number
      try {
        const pi = await stripe.paymentIntents.retrieve(piId)
        stripeAmount = pi.amount_received || pi.amount || 0
      } catch {
        continue // Skip if can't reach Stripe
      }

      // Step 1: Fix addonsTotalCents from actual registrationAddons
      for (const reg of regs) {
        const actualAddonTotal = reg.registrationAddons.reduce((s, a) => s + a.priceCents, 0)
        if (actualAddonTotal !== reg.addonsTotalCents) {
          const correctTotal = reg.basePriceCents - reg.discountCents - reg.promoDiscountCents + actualAddonTotal + reg.taxCents

          fixes.push({
            registrationId: reg.id,
            oldTotal: reg.totalPriceCents,
            newTotal: correctTotal,
            oldAddons: reg.addonsTotalCents,
            newAddons: actualAddonTotal,
          })

          await prisma.registration.update({
            where: { id: reg.id },
            data: {
              addonsTotalCents: actualAddonTotal,
              totalPriceCents: correctTotal,
            },
          })

          // Update in-memory for step 2
          reg.addonsTotalCents = actualAddonTotal
          reg.totalPriceCents = correctTotal
        }
      }

      // Step 2: If DB total still doesn't match Stripe, distribute proportionally
      const dbTotal = regs.reduce((s, r) => s + r.totalPriceCents, 0)
      if (Math.abs(dbTotal - stripeAmount) > 1) {
        // Distribute Stripe amount proportionally across registrations
        let remaining = stripeAmount
        for (let i = 0; i < regs.length; i++) {
          const reg = regs[i]
          const isLast = i === regs.length - 1
          const share = isLast
            ? remaining
            : Math.round(stripeAmount * (reg.totalPriceCents / dbTotal))
          if (!isLast) remaining -= share

          if (share !== reg.totalPriceCents) {
            fixes.push({
              registrationId: reg.id,
              oldTotal: reg.totalPriceCents,
              newTotal: share,
              oldAddons: reg.addonsTotalCents,
              newAddons: reg.addonsTotalCents, // Keep addons as-is for proportional fix
            })

            await prisma.registration.update({
              where: { id: reg.id },
              data: { totalPriceCents: share },
            })
          }
        }
      }
    }

    return NextResponse.json({
      fixed: fixes.length,
      details: fixes.map(f => ({
        registrationId: f.registrationId,
        oldTotal: `$${(f.oldTotal / 100).toFixed(2)}`,
        newTotal: `$${(f.newTotal / 100).toFixed(2)}`,
        addonChange: f.oldAddons !== f.newAddons
          ? `$${(f.oldAddons / 100).toFixed(2)} → $${(f.newAddons / 100).toFixed(2)}`
          : 'unchanged',
      })),
    })
  } catch (error) {
    console.error('[Reconcile] Fix failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fix' },
      { status: 500 }
    )
  }
}
