import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

/**
 * Revenue diagnostic: shows breakdown of all Stripe-charged items
 * GET /api/admin/revenue-diagnostic
 */
export async function GET() {
  // Registration breakdown by paymentStatus
  const regByStatus = await prisma.registration.groupBy({
    by: ['paymentStatus'],
    where: { status: { not: 'cancelled' } },
    _count: true,
    _sum: { totalPriceCents: true, refundAmountCents: true },
  })

  // Shop orders breakdown by status
  const shopByStatus = await prisma.shopOrder.groupBy({
    by: ['status'],
    _count: true,
    _sum: { totalCents: true },
  })

  // Total registration revenue (paid + partial + refunded)
  const regGross = await prisma.registration.aggregate({
    where: {
      status: { not: 'cancelled' },
      paymentStatus: { in: ['paid', 'partial', 'refunded'] },
    },
    _count: true,
    _sum: { totalPriceCents: true, refundAmountCents: true },
  })

  // Total shop order revenue
  const shopGross = await prisma.shopOrder.aggregate({
    where: {
      status: { in: ['paid', 'shipped', 'delivered', 'processing'] },
    },
    _count: true,
    _sum: { totalCents: true },
  })

  // Registrations with stripePaymentIntentId but still pending
  const pendingWithPI = await prisma.registration.count({
    where: {
      paymentStatus: 'pending',
      stripePaymentIntentId: { not: null },
    },
  })

  // Pending registrations with checkout session but no PI
  const pendingWithSession = await prisma.registration.count({
    where: {
      paymentStatus: 'pending',
      stripeCheckoutSessionId: { not: null },
      stripePaymentIntentId: null,
    },
  })

  const regGrossTotal = regGross._sum.totalPriceCents || 0
  const shopGrossTotal = shopGross._sum?.totalCents || 0
  const combinedGross = regGrossTotal + shopGrossTotal

  return NextResponse.json({
    summary: {
      registrationGross: `$${(regGrossTotal / 100).toFixed(2)}`,
      shopOrderGross: `$${(shopGrossTotal / 100).toFixed(2)}`,
      combinedGross: `$${(combinedGross / 100).toFixed(2)}`,
      registrationCount: regGross._count,
      shopOrderCount: shopGross._count,
    },
    registrationsByStatus: regByStatus.map(r => ({
      paymentStatus: r.paymentStatus,
      count: r._count,
      totalPriceCents: r._sum.totalPriceCents,
      totalPrice: `$${((r._sum.totalPriceCents || 0) / 100).toFixed(2)}`,
      refundAmountCents: r._sum.refundAmountCents,
      refundAmount: `$${((r._sum.refundAmountCents || 0) / 100).toFixed(2)}`,
    })),
    shopOrdersByStatus: shopByStatus.map(s => ({
      status: s.status,
      count: s._count,
      totalCents: s._sum.totalCents,
      total: `$${((s._sum.totalCents || 0) / 100).toFixed(2)}`,
    })),
    potentialIssues: {
      pendingRegistrationsWithStripePI: pendingWithPI,
      pendingRegistrationsWithCheckoutSession: pendingWithSession,
    },
  })
}
