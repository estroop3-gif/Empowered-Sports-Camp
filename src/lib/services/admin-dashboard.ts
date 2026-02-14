/**
 * Admin Dashboard Service
 *
 * Provides real-time data for the HQ Admin dashboard home page.
 * Aggregates data across all licensees for global metrics.
 */

import { prisma } from '@/lib/db/client'
import Stripe from 'stripe'

// =============================================================================
// Types
// =============================================================================

export interface AdminDashboardOverview {
  activeLicensees: number
  totalRegistrations: number
  grossRevenue: number // in cents - base + addons (before discounts)
  netRevenue: number // in cents - totalPriceCents (matches revenue analytics)
  totalDiscounts: number // in cents - discounts + promo discounts
  taxRevenue: number // in cents - tax collected
  addonRevenue: number // in cents - add-on revenue only
  activeAthletes: number
  activeCamps: number
  todayCampers: number
}

export interface LicenseeDashboardItem {
  id: string
  name: string
  territory: string | null
  status: 'active' | 'suspended' | 'terminated'
  registrations: number
  revenue: number // in cents
  athletes: number
  upcomingCamps: number
}

export interface RecentActivityItem {
  type: 'registration' | 'payment' | 'licensee' | 'camp' | 'alert'
  message: string
  time: string
  timestamp: Date
}

export interface RegistrationDetailItem {
  id: string
  athleteName: string
  parentName: string
  parentEmail: string
  campName: string
  registrationChargeCents: number
  addonChargeCents: number
  totalChargeCents: number
  paymentStatus: string
  createdAt: string
}

export interface RevenueShareSummary {
  grossRevenue: number // in cents
  licenseeShare: number // in cents (typically 90%)
  hqRevenue: number // in cents (typically 10%)
  royaltyRate: number // e.g., 0.10 for 10%
}

export interface TotalRevenuePeriodData {
  grossVolume: number     // all charges including refunded (matches Stripe Gross Volume)
  refunded: number        // refunded amount
  transactions: number    // number of transactions
  stripeFees: number      // estimated Stripe fees (2.9% + $0.30/txn on gross)
  netVolume: number       // gross - refunds - fees (matches Stripe Net Volume)
}

export interface TotalRevenueByPeriod {
  allTime: TotalRevenuePeriodData
  thirtyDays: TotalRevenuePeriodData
  ninetyDays: TotalRevenuePeriodData
  yearToDate: TotalRevenuePeriodData
}

export interface AdminDashboardData {
  overview: AdminDashboardOverview
  licensees: LicenseeDashboardItem[]
  recentActivity: RecentActivityItem[]
  revenueShare: RevenueShareSummary
  registrationDetails: RegistrationDetailItem[]
  totalRevenueByPeriod: TotalRevenueByPeriod
}

// =============================================================================
// Helper Functions
// =============================================================================

function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// =============================================================================
// Main Service Function
// =============================================================================

/**
 * Get all data needed for the Admin HQ dashboard
 */
export async function getAdminDashboardData(params: {
  from?: Date
  to?: Date
}): Promise<{ data: AdminDashboardData | null; error: Error | null }> {
  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const startDate = params.from || thirtyDaysAgo
    const endDate = params.to || now

    // -------------------------------------------------------------------------
    // Overview Stats
    // -------------------------------------------------------------------------

    // Active licensees
    const activeLicensees = await prisma.tenant.count({
      where: { licenseStatus: 'active' },
    })

    // Confirmed registrations in range (matches revenue analytics filter)
    const registrations = await prisma.registration.findMany({
      where: {
        status: 'confirmed',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        basePriceCents: true,
        discountCents: true,
        promoDiscountCents: true,
        addonsTotalCents: true,
        totalPriceCents: true,
        taxCents: true,
        athleteId: true,
      },
    })

    const totalRegistrations = registrations.length

    // Revenue calculations aligned with revenue analytics page
    const grossRevenue = registrations.reduce(
      (sum, r) => sum + (r.basePriceCents || 0) + (r.addonsTotalCents || 0),
      0
    )
    const netRevenue = registrations.reduce(
      (sum, r) => sum + (r.totalPriceCents || 0),
      0
    )
    const totalDiscounts = registrations.reduce(
      (sum, r) => sum + (r.discountCents || 0) + (r.promoDiscountCents || 0),
      0
    )
    const taxRevenue = registrations.reduce(
      (sum, r) => sum + (r.taxCents || 0),
      0
    )
    const addonRevenue = registrations.reduce((sum, r) => sum + (r.addonsTotalCents || 0), 0)

    // Unique athletes
    const uniqueAthletes = new Set(registrations.map(r => r.athleteId))
    const activeAthletes = uniqueAthletes.size

    // Active camps (camps currently running based on dates)
    const activeCamps = await prisma.camp.count({
      where: {
        startDate: { lte: now },
        endDate: { gte: today },
        status: { notIn: ['draft', 'cancelled'] },
      },
    })

    // Today's campers (registrations for camps running today)
    const todayCampsData = await prisma.camp.findMany({
      where: {
        startDate: { lte: now },
        endDate: { gte: today },
        status: { notIn: ['draft', 'cancelled'] },
      },
      select: {
        _count: {
          select: {
            registrations: {
              where: { status: 'confirmed' },
            },
          },
        },
      },
    })

    const todayCampers = todayCampsData.reduce((sum, c) => sum + c._count.registrations, 0)

    const overview: AdminDashboardOverview = {
      activeLicensees,
      totalRegistrations,
      grossRevenue,
      netRevenue,
      totalDiscounts,
      taxRevenue,
      addonRevenue,
      activeAthletes,
      activeCamps,
      todayCampers,
    }

    // -------------------------------------------------------------------------
    // Licensee Performance Data
    // -------------------------------------------------------------------------

    const licenseeRaw = await prisma.tenant.findMany({
      where: {
        licenseStatus: { in: ['active', 'suspended'] },
      },
      select: {
        id: true,
        name: true,
        licenseStatus: true,
        territories: {
          take: 1,
          select: { name: true },
        },
        registrations: {
          where: {
            status: 'confirmed',
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            basePriceCents: true,
            addonsTotalCents: true,
            totalPriceCents: true,
            athleteId: true,
          },
        },
        camps: {
          where: {
            status: { in: ['published', 'registration_open', 'registration_closed'] },
            startDate: { gte: today },
          },
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    const licensees: LicenseeDashboardItem[] = licenseeRaw.map(l => {
      const uniqueLicenseeAthletes = new Set(l.registrations.map(r => r.athleteId))
      return {
        id: l.id,
        name: l.name,
        territory: l.territories[0]?.name || null,
        status: l.licenseStatus as 'active' | 'suspended' | 'terminated',
        registrations: l.registrations.length,
        revenue: l.registrations.reduce(
          (sum, r) => sum + (r.totalPriceCents || 0),
          0
        ),
        athletes: uniqueLicenseeAthletes.size,
        upcomingCamps: l.camps.length,
      }
    })

    // Sort by revenue descending
    licensees.sort((a, b) => b.revenue - a.revenue)

    // -------------------------------------------------------------------------
    // Recent Activity
    // -------------------------------------------------------------------------

    const recentActivity: RecentActivityItem[] = []

    // Recent registrations
    const recentRegistrations = await prisma.registration.findMany({
      where: {
        status: { not: 'cancelled' },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        createdAt: true,
        totalPriceCents: true,
        tenant: { select: { name: true } },
      },
    })

    for (const reg of recentRegistrations) {
      recentActivity.push({
        type: reg.totalPriceCents && reg.totalPriceCents > 0 ? 'payment' : 'registration',
        message: reg.totalPriceCents && reg.totalPriceCents > 0
          ? `$${(reg.totalPriceCents / 100).toFixed(0)} payment received - ${reg.tenant.name}`
          : `New registration at ${reg.tenant.name}`,
        time: getRelativeTime(reg.createdAt),
        timestamp: reg.createdAt,
      })
    }

    // Recent licensee changes
    const recentLicensees = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        name: true,
        createdAt: true,
        licenseStatus: true,
      },
    })

    for (const licensee of recentLicensees) {
      recentActivity.push({
        type: 'licensee',
        message: `${licensee.name} ${licensee.licenseStatus === 'active' ? 'is now active' : 'joined the network'}`,
        time: getRelativeTime(licensee.createdAt),
        timestamp: licensee.createdAt,
      })
    }

    // Recent camps created
    const recentCamps = await prisma.camp.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        name: true,
        createdAt: true,
        status: true,
        tenant: { select: { name: true } },
      },
    })

    for (const camp of recentCamps) {
      recentActivity.push({
        type: 'camp',
        message: `${camp.name} ${camp.status === 'registration_open' ? 'opened for registration' : 'created'} - ${camp.tenant?.name || 'Unknown Tenant'}`,
        time: getRelativeTime(camp.createdAt),
        timestamp: camp.createdAt,
      })
    }

    // Sort by timestamp and take top 5
    recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    const topActivity = recentActivity.slice(0, 5)

    // -------------------------------------------------------------------------
    // Recent Registration Details
    // -------------------------------------------------------------------------

    const recentRegDetails = await prisma.registration.findMany({
      where: {
        status: 'confirmed',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        basePriceCents: true,
        discountCents: true,
        promoDiscountCents: true,
        addonsTotalCents: true,
        totalPriceCents: true,
        paymentStatus: true,
        createdAt: true,
        athlete: {
          select: { firstName: true, lastName: true },
        },
        parent: {
          select: { firstName: true, lastName: true, email: true },
        },
        camp: {
          select: { name: true },
        },
      },
    })

    const registrationDetails: RegistrationDetailItem[] = recentRegDetails.map(r => {
      const regCharge = Math.max(
        0,
        (r.basePriceCents || 0) - (r.discountCents || 0) - (r.promoDiscountCents || 0)
      )
      return {
        id: r.id,
        athleteName: `${r.athlete.firstName} ${r.athlete.lastName}`,
        parentName: `${r.parent.firstName || ''} ${r.parent.lastName || ''}`.trim(),
        parentEmail: r.parent.email,
        campName: r.camp.name,
        registrationChargeCents: regCharge,
        addonChargeCents: r.addonsTotalCents || 0,
        totalChargeCents: r.totalPriceCents || 0,
        paymentStatus: r.paymentStatus,
        createdAt: r.createdAt.toISOString(),
      }
    })

    // -------------------------------------------------------------------------
    // Revenue Share Summary (This Month)
    // -------------------------------------------------------------------------

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const monthlyRegistrations = await prisma.registration.findMany({
      where: {
        status: 'confirmed',
        createdAt: {
          gte: thisMonthStart,
          lte: now,
        },
      },
      select: {
        totalPriceCents: true,
      },
    })

    const monthlyGrossRevenue = monthlyRegistrations.reduce((sum, r) => sum + (r.totalPriceCents || 0), 0)

    // Default royalty rate is 10% (configurable per tenant, but we use average)
    const royaltyRate = 0.10
    const hqRevenue = Math.round(monthlyGrossRevenue * royaltyRate)
    const licenseeShare = monthlyGrossRevenue - hqRevenue

    const revenueShare: RevenueShareSummary = {
      grossRevenue: monthlyGrossRevenue,
      licenseeShare,
      hqRevenue,
      royaltyRate,
    }

    // -------------------------------------------------------------------------
    // Total Revenue by Period — pulled directly from Stripe for accuracy
    // -------------------------------------------------------------------------

    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    const yearStart = new Date(now.getFullYear(), 0, 1)

    let totalRevenueByPeriod: TotalRevenueByPeriod

    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY || ''
      if (!stripeKey || (!stripeKey.startsWith('sk_') && !stripeKey.startsWith('rk_'))) {
        throw new Error('Stripe not configured')
      }

      const stripeClient = new Stripe(stripeKey, { apiVersion: '2025-12-15.clover' })

      // Fetch all charges from Stripe with balance transaction for actual fees
      const allCharges: Stripe.Charge[] = []
      let hasMore = true
      let startingAfter: string | undefined

      while (hasMore) {
        const batch = await stripeClient.charges.list({
          limit: 100,
          expand: ['data.balance_transaction'],
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        })
        allCharges.push(...batch.data)
        hasMore = batch.has_more
        if (batch.data.length > 0) startingAfter = batch.data[batch.data.length - 1].id
      }

      // Calculate period data from actual Stripe charges
      const calcStripePeriod = (since?: Date): TotalRevenuePeriodData => {
        const filtered = since
          ? allCharges.filter(c => new Date(c.created * 1000) >= since)
          : allCharges

        let grossVolume = 0
        let refunded = 0
        let stripeFees = 0
        let transactions = 0

        for (const charge of filtered) {
          if (charge.paid) {
            grossVolume += charge.amount
            refunded += charge.amount_refunded
            transactions++
            const bt = charge.balance_transaction
            if (bt && typeof bt !== 'string') {
              stripeFees += bt.fee
            }
          }
        }

        return {
          grossVolume,
          refunded,
          transactions,
          stripeFees,
          netVolume: grossVolume - refunded - stripeFees,
        }
      }

      totalRevenueByPeriod = {
        allTime: calcStripePeriod(),
        thirtyDays: calcStripePeriod(thirtyDaysAgo),
        ninetyDays: calcStripePeriod(ninetyDaysAgo),
        yearToDate: calcStripePeriod(yearStart),
      }
    } catch (stripeError) {
      // Fallback to DB-based calculation if Stripe API fails
      console.warn('[AdminDashboard] Stripe API unavailable, using DB fallback:', stripeError)

      const grossWhere = {
        status: { not: 'cancelled' as const },
        paymentStatus: { in: ['paid' as const, 'partial' as const, 'refunded' as const] },
      }
      const refundWhere = {
        status: { not: 'cancelled' as const },
        paymentStatus: { in: ['partial' as const, 'refunded' as const] },
      }

      const [allTimeGross, thirtyDayGross, ninetyDayGross, ytdGross,
        allTimeRefund, thirtyDayRefund, ninetyDayRefund, ytdRefund] = await Promise.all([
        prisma.registration.aggregate({ where: grossWhere, _count: true, _sum: { totalPriceCents: true } }),
        prisma.registration.aggregate({ where: { ...grossWhere, createdAt: { gte: thirtyDaysAgo } }, _count: true, _sum: { totalPriceCents: true } }),
        prisma.registration.aggregate({ where: { ...grossWhere, createdAt: { gte: ninetyDaysAgo } }, _count: true, _sum: { totalPriceCents: true } }),
        prisma.registration.aggregate({ where: { ...grossWhere, createdAt: { gte: yearStart } }, _count: true, _sum: { totalPriceCents: true } }),
        prisma.registration.aggregate({ where: refundWhere, _sum: { refundAmountCents: true, totalPriceCents: true } }),
        prisma.registration.aggregate({ where: { ...refundWhere, createdAt: { gte: thirtyDaysAgo } }, _sum: { refundAmountCents: true, totalPriceCents: true } }),
        prisma.registration.aggregate({ where: { ...refundWhere, createdAt: { gte: ninetyDaysAgo } }, _sum: { refundAmountCents: true, totalPriceCents: true } }),
        prisma.registration.aggregate({ where: { ...refundWhere, createdAt: { gte: yearStart } }, _sum: { refundAmountCents: true, totalPriceCents: true } }),
      ])

      const calcFallback = (
        grossAgg: typeof allTimeGross,
        refundAgg: typeof allTimeRefund,
      ): TotalRevenuePeriodData => {
        const grossVolume = grossAgg._sum.totalPriceCents || 0
        const transactions = grossAgg._count || 0
        const trackedRefunds = refundAgg._sum.refundAmountCents || 0
        const fallbackRefunds = refundAgg._sum.totalPriceCents || 0
        const refundedAmt = trackedRefunds > 0 ? trackedRefunds : fallbackRefunds
        const stripeFees = Math.round(grossVolume * 0.029) + (transactions * 30)
        return { grossVolume, refunded: refundedAmt, transactions, stripeFees, netVolume: grossVolume - refundedAmt - stripeFees }
      }

      totalRevenueByPeriod = {
        allTime: calcFallback(allTimeGross, allTimeRefund),
        thirtyDays: calcFallback(thirtyDayGross, thirtyDayRefund),
        ninetyDays: calcFallback(ninetyDayGross, ninetyDayRefund),
        yearToDate: calcFallback(ytdGross, ytdRefund),
      }
    }

    return {
      data: {
        overview,
        licensees,
        recentActivity: topActivity,
        revenueShare,
        registrationDetails,
        totalRevenueByPeriod,
      },
      error: null,
    }
  } catch (error) {
    console.error('[AdminDashboard] Failed to fetch dashboard data:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get comparison metrics (change percentages)
 * Compares current period to previous period of same length
 */
export async function getAdminDashboardComparison(params: {
  from?: Date
  to?: Date
}): Promise<{
  data: {
    revenueChange: number
    registrationChange: number
  } | null
  error: Error | null
}> {
  try {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    const currentStart = params.from || thirtyDaysAgo
    const currentEnd = params.to || now
    const periodLength = currentEnd.getTime() - currentStart.getTime()
    const previousStart = new Date(currentStart.getTime() - periodLength)
    const previousEnd = new Date(currentStart.getTime())

    // Current period - net revenue using totalPriceCents (matches revenue analytics)
    const [currentRegs, previousRegs] = await Promise.all([
      prisma.registration.findMany({
        where: {
          status: 'confirmed',
          createdAt: { gte: currentStart, lte: currentEnd },
        },
        select: {
          totalPriceCents: true,
        },
      }),
      prisma.registration.findMany({
        where: {
          status: 'confirmed',
          createdAt: { gte: previousStart, lte: previousEnd },
        },
        select: {
          totalPriceCents: true,
        },
      }),
    ])

    const calcNetRevenue = (regs: typeof currentRegs) =>
      regs.reduce((sum, r) => sum + (r.totalPriceCents || 0), 0)

    const currentRevenue = calcNetRevenue(currentRegs)
    const previousRevenue = calcNetRevenue(previousRegs)
    const currentCount = currentRegs.length
    const previousCount = previousRegs.length

    const revenueChange = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : currentRevenue > 0 ? 100 : 0

    const registrationChange = previousCount > 0
      ? ((currentCount - previousCount) / previousCount) * 100
      : currentCount > 0 ? 100 : 0

    return {
      data: {
        revenueChange: Math.round(revenueChange * 10) / 10,
        registrationChange: Math.round(registrationChange * 10) / 10,
      },
      error: null,
    }
  } catch (error) {
    console.error('[AdminDashboard] Failed to fetch comparison data:', error)
    return { data: null, error: error as Error }
  }
}
