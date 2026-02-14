/**
 * Stripe Reconciliation API
 *
 * GET  /api/admin/stripe-reconcile — Pull charges from Stripe, compare with DB
 * POST /api/admin/stripe-reconcile — Fix DB records to match Stripe amounts
 *
 * Since registrations may not have stripePaymentIntentId stored,
 * this endpoint queries Stripe directly and matches via metadata.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover',
})

interface StripeCharge {
  paymentIntentId: string
  checkoutSessionId: string | null
  stripeAmountCents: number
  registrationIds: string[]
  status: string
  created: string
}

interface Comparison {
  paymentIntentId: string
  registrationIds: string[]
  athleteNames: string[]
  stripeAmountCents: number
  dbTotalCents: number
  diffCents: number
  perRegistration: {
    id: string
    athleteName: string
    dbTotal: number
    storedAddons: number
    actualAddons: number
    addonMismatch: boolean
  }[]
}

/**
 * GET — Pull all charges from Stripe, match to DB, show discrepancies
 */
export async function GET() {
  try {
    // Step 1: List all checkout sessions from Stripe with registration metadata
    const sessions: Stripe.Checkout.Session[] = []
    let hasMore = true
    let startingAfter: string | undefined

    while (hasMore) {
      const batch = await stripe.checkout.sessions.list({
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      })
      sessions.push(...batch.data)
      hasMore = batch.has_more
      if (batch.data.length > 0) {
        startingAfter = batch.data[batch.data.length - 1].id
      }
    }

    // Filter to registration sessions only
    const regSessions = sessions.filter(
      s => s.metadata?.type === 'registration' && s.status === 'complete'
    )

    // Step 2: For each session, get the charge amount and registration IDs
    const stripeCharges: StripeCharge[] = []
    for (const session of regSessions) {
      const regIds = session.metadata?.registrationIds
        ? session.metadata.registrationIds.split(',')
        : session.metadata?.registrationId
          ? [session.metadata.registrationId]
          : []

      if (regIds.length === 0) continue

      const piId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || null

      stripeCharges.push({
        paymentIntentId: piId || 'unknown',
        checkoutSessionId: session.id,
        stripeAmountCents: session.amount_total || 0,
        registrationIds: regIds,
        status: session.payment_status || 'unknown',
        created: new Date((session.created || 0) * 1000).toISOString(),
      })
    }

    // Step 3: Look up DB registrations for each charge
    const allRegIds = stripeCharges.flatMap(c => c.registrationIds)
    const registrations = await prisma.registration.findMany({
      where: { id: { in: allRegIds } },
      select: {
        id: true,
        totalPriceCents: true,
        basePriceCents: true,
        discountCents: true,
        promoDiscountCents: true,
        addonsTotalCents: true,
        taxCents: true,
        paymentStatus: true,
        stripePaymentIntentId: true,
        athlete: { select: { firstName: true, lastName: true } },
        registrationAddons: { select: { priceCents: true } },
      },
    })

    const regMap = new Map(registrations.map(r => [r.id, r]))

    // Step 4: Compare
    const comparisons: Comparison[] = []
    let totalStripeCents = 0
    let totalDbCents = 0
    let discrepancyCount = 0

    for (const charge of stripeCharges) {
      const regs = charge.registrationIds
        .map(id => regMap.get(id))
        .filter(Boolean) as typeof registrations

      if (regs.length === 0) continue

      const dbTotal = regs.reduce((s, r) => s + (r.totalPriceCents || 0), 0)
      const diff = dbTotal - charge.stripeAmountCents

      totalStripeCents += charge.stripeAmountCents
      totalDbCents += dbTotal

      const comparison: Comparison = {
        paymentIntentId: charge.paymentIntentId,
        registrationIds: charge.registrationIds,
        athleteNames: regs.map(r => `${r.athlete?.firstName} ${r.athlete?.lastName}`),
        stripeAmountCents: charge.stripeAmountCents,
        dbTotalCents: dbTotal,
        diffCents: diff,
        perRegistration: regs.map(r => {
          const actualAddons = r.registrationAddons.reduce((s, a) => s + a.priceCents, 0)
          return {
            id: r.id,
            athleteName: `${r.athlete?.firstName} ${r.athlete?.lastName}`,
            dbTotal: r.totalPriceCents,
            storedAddons: r.addonsTotalCents,
            actualAddons,
            addonMismatch: actualAddons !== r.addonsTotalCents,
          }
        }),
      }

      if (Math.abs(diff) > 1) discrepancyCount++
      comparisons.push(comparison)
    }

    return NextResponse.json({
      summary: {
        stripeCharges: stripeCharges.length,
        dbRegistrations: registrations.length,
        discrepancyCount,
        stripeTotal: `$${(totalStripeCents / 100).toFixed(2)}`,
        dbTotal: `$${(totalDbCents / 100).toFixed(2)}`,
        difference: `$${((totalDbCents - totalStripeCents) / 100).toFixed(2)}`,
      },
      comparisons: comparisons.map(c => ({
        paymentIntentId: c.paymentIntentId,
        athleteNames: c.athleteNames,
        stripeAmount: `$${(c.stripeAmountCents / 100).toFixed(2)}`,
        dbTotal: `$${(c.dbTotalCents / 100).toFixed(2)}`,
        diff: c.diffCents !== 0 ? `$${(c.diffCents / 100).toFixed(2)}` : 'match',
        perRegistration: c.perRegistration,
      })),
      stripeCharges: stripeCharges.map(c => ({
        ...c,
        stripeAmount: `$${(c.stripeAmountCents / 100).toFixed(2)}`,
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
 * POST — Fix DB records to match Stripe amounts
 *
 * 1. Fixes addonsTotalCents from actual registrationAddons
 * 2. Recalculates totalPriceCents
 * 3. Backfills stripePaymentIntentId and stripeCheckoutSessionId
 */
export async function POST() {
  try {
    // Step 1: Get Stripe checkout sessions
    const sessions: Stripe.Checkout.Session[] = []
    let hasMore = true
    let startingAfter: string | undefined

    while (hasMore) {
      const batch = await stripe.checkout.sessions.list({
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      })
      sessions.push(...batch.data)
      hasMore = batch.has_more
      if (batch.data.length > 0) {
        startingAfter = batch.data[batch.data.length - 1].id
      }
    }

    const regSessions = sessions.filter(
      s => s.metadata?.type === 'registration' && s.status === 'complete'
    )

    // Step 2: Process each session
    const fixes: {
      registrationId: string
      athleteName: string
      changes: string[]
    }[] = []

    for (const session of regSessions) {
      const regIds = session.metadata?.registrationIds
        ? session.metadata.registrationIds.split(',')
        : session.metadata?.registrationId
          ? [session.metadata.registrationId]
          : []

      if (regIds.length === 0) continue

      const piId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || null

      // Get registrations with their addons
      const regs = await prisma.registration.findMany({
        where: { id: { in: regIds } },
        select: {
          id: true,
          totalPriceCents: true,
          basePriceCents: true,
          discountCents: true,
          promoDiscountCents: true,
          addonsTotalCents: true,
          taxCents: true,
          stripePaymentIntentId: true,
          stripeCheckoutSessionId: true,
          athlete: { select: { firstName: true, lastName: true } },
          registrationAddons: { select: { priceCents: true } },
        },
      })

      for (const reg of regs) {
        const changes: string[] = []

        // Fix 1: Backfill stripePaymentIntentId
        if (!reg.stripePaymentIntentId && piId) {
          changes.push(`stripePaymentIntentId: null → ${piId}`)
        }

        // Fix 2: Backfill stripeCheckoutSessionId
        if (!reg.stripeCheckoutSessionId) {
          changes.push(`stripeCheckoutSessionId: null → ${session.id}`)
        }

        // Fix 3: Correct addonsTotalCents from actual registrationAddons
        const actualAddons = reg.registrationAddons.reduce((s, a) => s + a.priceCents, 0)
        const addonMismatch = actualAddons !== reg.addonsTotalCents

        // Fix 4: Recalculate totalPriceCents
        const correctTotal = reg.basePriceCents - reg.discountCents - reg.promoDiscountCents +
          (addonMismatch ? actualAddons : reg.addonsTotalCents) + reg.taxCents

        if (addonMismatch) {
          changes.push(`addonsTotalCents: ${reg.addonsTotalCents} → ${actualAddons}`)
        }
        if (correctTotal !== reg.totalPriceCents) {
          changes.push(`totalPriceCents: ${reg.totalPriceCents} → ${correctTotal}`)
        }

        if (changes.length > 0) {
          await prisma.registration.update({
            where: { id: reg.id },
            data: {
              ...(piId && !reg.stripePaymentIntentId ? { stripePaymentIntentId: piId } : {}),
              ...(!reg.stripeCheckoutSessionId ? { stripeCheckoutSessionId: session.id } : {}),
              ...(addonMismatch ? { addonsTotalCents: actualAddons } : {}),
              ...(correctTotal !== reg.totalPriceCents ? { totalPriceCents: correctTotal } : {}),
            },
          })

          fixes.push({
            registrationId: reg.id,
            athleteName: `${reg.athlete?.firstName} ${reg.athlete?.lastName}`,
            changes,
          })
        }
      }
    }

    return NextResponse.json({
      fixed: fixes.length,
      fixes,
    })
  } catch (error) {
    console.error('[Reconcile] Fix failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fix' },
      { status: 500 }
    )
  }
}
