import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import Stripe from 'stripe'

/**
 * One-time backfill: Populate refundAmountCents from Stripe for existing refunded/partial registrations.
 * GET /api/admin/backfill-refunds
 */
export async function GET() {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY not set' }, { status: 500 })
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })

  // Find all registrations that are refunded or partially refunded but don't have refundAmountCents set
  const registrations = await prisma.registration.findMany({
    where: {
      paymentStatus: { in: ['refunded', 'partial'] },
      refundAmountCents: 0,
      stripePaymentIntentId: { not: null },
    },
    select: {
      id: true,
      stripePaymentIntentId: true,
      totalPriceCents: true,
      paymentStatus: true,
    },
  })

  const results: { id: string; refundAmount: number; status: string }[] = []
  const errors: { id: string; error: string }[] = []

  // Group by payment intent (multi-camper checkouts share one PI)
  const byPI = new Map<string, typeof registrations>()
  for (const reg of registrations) {
    if (!reg.stripePaymentIntentId) continue
    const existing = byPI.get(reg.stripePaymentIntentId) || []
    existing.push(reg)
    byPI.set(reg.stripePaymentIntentId, existing)
  }

  for (const [piId, regs] of byPI) {
    try {
      const pi = await stripe.paymentIntents.retrieve(piId)
      const charges = pi.latest_charge
        ? [typeof pi.latest_charge === 'string'
          ? await stripe.charges.retrieve(pi.latest_charge)
          : pi.latest_charge]
        : []

      const charge = charges[0]
      if (!charge || !charge.amount_refunded) {
        // No refund found in Stripe — mark with totalPriceCents for full refunds
        for (const reg of regs) {
          if (reg.paymentStatus === 'refunded') {
            await prisma.registration.update({
              where: { id: reg.id },
              data: { refundAmountCents: reg.totalPriceCents },
            })
            results.push({ id: reg.id, refundAmount: reg.totalPriceCents, status: 'full-fallback' })
          }
        }
        continue
      }

      // Distribute refund proportionally across registrations
      const totalCharged = regs.reduce((s, r) => s + (r.totalPriceCents || 0), 0)
      const refundedCents = charge.amount_refunded

      for (const reg of regs) {
        const regShare = totalCharged > 0
          ? Math.round((reg.totalPriceCents / totalCharged) * refundedCents)
          : 0

        await prisma.registration.update({
          where: { id: reg.id },
          data: {
            refundAmountCents: regShare,
            refundedAt: new Date(charge.created * 1000),
          },
        })
        results.push({ id: reg.id, refundAmount: regShare, status: 'from-stripe' })
      }
    } catch (err) {
      errors.push({ id: piId, error: String(err) })
    }
  }

  return NextResponse.json({
    processed: results.length,
    errors: errors.length,
    results,
    errors_detail: errors,
  })
}
