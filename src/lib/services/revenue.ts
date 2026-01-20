/**
 * Revenue Service
 *
 * Real-time revenue dashboard and royalty automation for Empowered Sports Camp.
 *
 * Handles:
 * - Session-level revenue dashboards
 * - Revenue trend visualization data
 * - Royalty calculation and automation
 * - Revenue snapshots for historical tracking
 */

import { prisma } from '@/lib/db/client'
import type { Prisma } from '@/generated/prisma'

// =============================================================================
// Types
// =============================================================================

export type RoyaltyStatus = 'PENDING' | 'CALCULATED' | 'INVOICED' | 'PAID'

export interface SessionRevenueDashboard {
  sessionId: string
  sessionName: string
  tenantId: string
  tenantName: string
  period: {
    startDate: string
    endDate: string
  }
  revenue: {
    grossRevenue: number
    registrationRevenue: number
    upsellRevenue: number
    refunds: number
    netRevenue: number
  }
  metrics: {
    totalRegistrations: number
    confirmedRegistrations: number
    arpc: number // Average Revenue Per Camper
    conversionRate: number
  }
  royalty: {
    rate: number
    estimatedAmount: number
    status: RoyaltyStatus
  }
}

export interface RevenueTrendData {
  period: string
  grossRevenue: number
  netRevenue: number
  registrations: number
  arpc: number
}

export interface RoyaltyRecord {
  id: string
  campSessionId: string
  tenantId: string
  grossRevenue: number
  royaltyRate: number
  royaltyAmount: number
  status: RoyaltyStatus
  calculatedAt: string
  invoicedAt: string | null
  paidAt: string | null
  notes: string | null
}

export interface RevenueSnapshot {
  id: string
  tenantId: string
  periodStart: string
  periodEnd: string
  grossRevenue: number
  netRevenue: number
  arpc: number
  sessionsHeld: number
  totalCampers: number
  createdAt: string
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Get real-time revenue dashboard for a camp session
 */
export async function getSessionRevenueDashboard(params: {
  campSessionId: string
  tenantId: string
  role: string
}): Promise<{ data: SessionRevenueDashboard | null; error: Error | null }> {
  try {
    const { campSessionId, tenantId } = params

    // Fetch camp session data with tenant
    const camp = await prisma.camp.findFirst({
      where: {
        id: campSessionId,
        tenantId,
      },
      include: {
        tenant: true,
        registrations: true,
      },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp session not found') }
    }

    // Calculate revenue metrics
    const confirmedRegistrations = camp.registrations.filter(
      (r) => r.status === 'confirmed'
    )
    const refundedRegistrations = camp.registrations.filter(
      (r) => r.status === 'refunded'
    )

    // Calculate totals (amounts are in cents, convert to dollars)
    const registrationRevenueCents = confirmedRegistrations.reduce(
      (sum, r) => sum + (r.totalPriceCents || 0),
      0
    )
    const registrationRevenue = registrationRevenueCents / 100

    // Get upsell revenue from shop orders for this tenant during the camp period
    const shopOrders = await prisma.shopOrder.findMany({
      where: {
        licenseeId: tenantId,
        status: { in: ['processing', 'shipped', 'delivered'] },
        createdAt: {
          gte: camp.startDate,
          lte: camp.endDate,
        },
      },
      select: { totalCents: true },
    })
    const upsellRevenueCents = shopOrders.reduce((sum, o) => sum + (o.totalCents || 0), 0)
    const upsellRevenue = upsellRevenueCents / 100

    // Calculate refunds from refunded registrations
    const refundsCents = refundedRegistrations.reduce(
      (sum, r) => sum + (r.totalPriceCents || 0),
      0
    )
    const refunds = refundsCents / 100

    const grossRevenue = registrationRevenue + upsellRevenue
    const netRevenue = grossRevenue - refunds

    // Calculate ARPC (Average Revenue Per Camper)
    const arpc = confirmedRegistrations.length > 0
      ? netRevenue / confirmedRegistrations.length
      : 0

    // Get royalty rate from tenant settings (default 8%)
    const royaltyRate = camp.tenant?.royaltyRate
      ? Number(camp.tenant.royaltyRate)
      : 0.08
    const estimatedRoyalty = grossRevenue * royaltyRate

    // Check for existing royalty invoice for this camp
    const existingInvoice = await prisma.royaltyInvoice.findFirst({
      where: {
        tenantId,
        campId: campSessionId,
      },
      select: { status: true },
    })

    // Map database status to our RoyaltyStatus type
    let royaltyStatus: RoyaltyStatus = 'PENDING'
    if (existingInvoice) {
      const statusMap: Record<string, RoyaltyStatus> = {
        pending: 'CALCULATED',
        invoiced: 'INVOICED',
        paid: 'PAID',
        overdue: 'INVOICED',
        disputed: 'INVOICED',
        waived: 'PAID',
      }
      royaltyStatus = statusMap[existingInvoice.status] || 'PENDING'
    }

    return {
      data: {
        sessionId: camp.id,
        sessionName: camp.name,
        tenantId: camp.tenantId || '',
        tenantName: camp.tenant?.name || 'Unknown Tenant',
        period: {
          startDate: camp.startDate.toISOString(),
          endDate: camp.endDate.toISOString(),
        },
        revenue: {
          grossRevenue,
          registrationRevenue,
          upsellRevenue,
          refunds,
          netRevenue,
        },
        metrics: {
          totalRegistrations: camp.registrations.length,
          confirmedRegistrations: confirmedRegistrations.length,
          arpc,
          conversionRate: camp.registrations.length > 0
            ? (confirmedRegistrations.length / camp.registrations.length) * 100
            : 0,
        },
        royalty: {
          rate: royaltyRate,
          estimatedAmount: estimatedRoyalty,
          status: royaltyStatus,
        },
      },
      error: null,
    }
  } catch (error) {
    console.error('[Revenue] Failed to get session revenue dashboard:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get revenue trends for a tenant over time
 * Uses revenue snapshots for historical data.
 */
export async function getSessionRevenueTrends(params: {
  tenantId: string
  role: string
  range: 'season' | 'ytd' | 'custom'
  startDate?: string
  endDate?: string
}): Promise<{ data: { trends: RevenueTrendData[] } | null; error: Error | null }> {
  try {
    const { tenantId, range, startDate, endDate } = params

    // Calculate date range based on range parameter
    const now = new Date()
    let rangeStart: Date
    let rangeEnd: Date = now

    switch (range) {
      case 'season':
        // Current season (e.g., summer camps May-August)
        rangeStart = new Date(now.getFullYear(), 4, 1) // May 1
        rangeEnd = new Date(now.getFullYear(), 7, 31) // August 31
        break
      case 'ytd':
        rangeStart = new Date(now.getFullYear(), 0, 1) // January 1
        break
      case 'custom':
        rangeStart = startDate ? new Date(startDate) : new Date(now.getFullYear(), 0, 1)
        rangeEnd = endDate ? new Date(endDate) : now
        break
      default:
        rangeStart = new Date(now.getFullYear(), 0, 1)
    }

    // Query revenue snapshots for the period
    const snapshots = await prisma.revenueSnapshot.findMany({
      where: {
        tenantId,
        periodStart: { gte: rangeStart },
        periodEnd: { lte: rangeEnd },
      },
      orderBy: { periodStart: 'asc' },
    })

    // Convert snapshots to trend data
    const trends: RevenueTrendData[] = snapshots.map((s) => {
      // Format period as YYYY-MM from periodStart
      const period = s.periodStart.toISOString().substring(0, 7)
      return {
        period,
        grossRevenue: s.grossRevenueCents / 100,
        netRevenue: s.netRevenueCents / 100,
        registrations: s.totalCampers,
        arpc: s.arpcCents / 100,
      }
    })

    // If no snapshots exist, calculate from registrations directly
    if (trends.length === 0) {
      const registrations = await prisma.registration.findMany({
        where: {
          tenantId,
          status: 'confirmed',
          createdAt: {
            gte: rangeStart,
            lte: rangeEnd,
          },
        },
        select: {
          totalPriceCents: true,
          createdAt: true,
        },
      })

      // Group by month
      const monthlyData = new Map<string, { gross: number; count: number }>()

      for (const reg of registrations) {
        const period = reg.createdAt.toISOString().substring(0, 7)
        const current = monthlyData.get(period) || { gross: 0, count: 0 }
        current.gross += reg.totalPriceCents || 0
        current.count += 1
        monthlyData.set(period, current)
      }

      // Convert to trend data
      for (const [period, data] of monthlyData) {
        trends.push({
          period,
          grossRevenue: data.gross / 100,
          netRevenue: data.gross / 100, // No refund data available in this query
          registrations: data.count,
          arpc: data.count > 0 ? (data.gross / 100) / data.count : 0,
        })
      }

      // Sort by period
      trends.sort((a, b) => a.period.localeCompare(b.period))
    }

    return {
      data: { trends },
      error: null,
    }
  } catch (error) {
    console.error('[Revenue] Failed to get revenue trends:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Run royalty automation for a camp session
 *
 * Calculates royalty based on gross revenue and creates/updates royalty records.
 */
export async function runRoyaltyAutomationForSession(params: {
  campSessionId: string
  tenantId: string
}): Promise<{ data: RoyaltyRecord | null; error: Error | null }> {
  try {
    const { campSessionId, tenantId } = params

    // Get session revenue
    const { data: revenueDashboard, error: revenueError } = await getSessionRevenueDashboard({
      campSessionId,
      tenantId,
      role: 'hq_admin', // Internal call
    })

    if (revenueError || !revenueDashboard) {
      return { data: null, error: revenueError || new Error('Failed to get revenue data') }
    }

    // Get royalty rate from revenue dashboard (already includes tenant settings)
    const royaltyRate = revenueDashboard.royalty.rate

    // Calculate amounts in cents
    const grossRevenueCents = Math.round(revenueDashboard.revenue.grossRevenue * 100)
    const registrationRevenueCents = Math.round(revenueDashboard.revenue.registrationRevenue * 100)
    const addonRevenueCents = Math.round(revenueDashboard.revenue.upsellRevenue * 100)
    const refundsCents = Math.round(revenueDashboard.revenue.refunds * 100)
    const netRevenueCents = grossRevenueCents - refundsCents

    // Calculate royalty in basis points and cents
    const royaltyRateBps = Math.round(royaltyRate * 10000) // Convert to basis points
    const royaltyDueCents = Math.round(grossRevenueCents * royaltyRate)

    // Generate invoice number
    const invoiceNumber = `ROY-${tenantId.substring(0, 8)}-${Date.now()}`

    // Check for existing invoice for this camp
    const existingInvoice = await prisma.royaltyInvoice.findFirst({
      where: {
        tenantId,
        campId: campSessionId,
      },
    })

    let invoice
    if (existingInvoice) {
      // Update existing invoice
      invoice = await prisma.royaltyInvoice.update({
        where: { id: existingInvoice.id },
        data: {
          grossRevenueCents,
          registrationRevenueCents,
          addonRevenueCents,
          refundsTotalCents: refundsCents,
          netRevenueCents,
          royaltyRateBps,
          royaltyDueCents,
          totalDueCents: royaltyDueCents,
          periodStart: new Date(revenueDashboard.period.startDate),
          periodEnd: new Date(revenueDashboard.period.endDate),
        },
      })
    } else {
      // Create new invoice with due date 30 days from now
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30)

      invoice = await prisma.royaltyInvoice.create({
        data: {
          tenantId,
          campId: campSessionId,
          invoiceNumber,
          periodType: 'camp_session',
          periodStart: new Date(revenueDashboard.period.startDate),
          periodEnd: new Date(revenueDashboard.period.endDate),
          grossRevenueCents,
          registrationRevenueCents,
          addonRevenueCents,
          refundsTotalCents: refundsCents,
          netRevenueCents,
          royaltyRateBps,
          royaltyDueCents,
          totalDueCents: royaltyDueCents,
          status: 'pending',
          dueDate,
        },
      })
    }

    const royaltyRecord: RoyaltyRecord = {
      id: invoice.id,
      campSessionId,
      tenantId,
      grossRevenue: grossRevenueCents / 100,
      royaltyRate,
      royaltyAmount: royaltyDueCents / 100,
      status: 'CALCULATED',
      calculatedAt: invoice.createdAt.toISOString(),
      invoicedAt: invoice.generatedAt?.toISOString() || null,
      paidAt: invoice.paidAt?.toISOString() || null,
      notes: invoice.adjustmentNotes,
    }

    return {
      data: royaltyRecord,
      error: null,
    }
  } catch (error) {
    console.error('[Revenue] Failed to run royalty automation:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get royalty status for a licensee
 */
export async function getRoyaltyStatusForLicensee(params: {
  tenantId: string
  range?: string
}): Promise<{
  data: {
    royalties: RoyaltyRecord[]
    summary: {
      totalDue: number
      totalPaid: number
      pending: number
    }
  } | null
  error: Error | null
}> {
  try {
    const { tenantId, range } = params

    // Query royalty invoices from database
    const invoices = await prisma.royaltyInvoice.findMany({
      where: {
        tenantId,
        ...(range ? { createdAt: { gte: new Date(range) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    // Map database status to RoyaltyStatus
    const statusMap: Record<string, RoyaltyStatus> = {
      pending: 'CALCULATED',
      invoiced: 'INVOICED',
      paid: 'PAID',
      overdue: 'INVOICED',
      disputed: 'INVOICED',
      waived: 'PAID',
    }

    // Convert to RoyaltyRecord format
    const royalties: RoyaltyRecord[] = invoices.map((inv) => ({
      id: inv.id,
      campSessionId: inv.campId || '',
      tenantId: inv.tenantId,
      grossRevenue: inv.grossRevenueCents / 100,
      royaltyRate: inv.royaltyRateBps / 10000, // Convert basis points to decimal
      royaltyAmount: inv.totalDueCents / 100,
      status: statusMap[inv.status] || 'PENDING',
      calculatedAt: inv.createdAt.toISOString(),
      invoicedAt: inv.generatedAt?.toISOString() || null,
      paidAt: inv.paidAt?.toISOString() || null,
      notes: inv.adjustmentNotes,
    }))

    // Calculate summary
    const totalDue = royalties
      .filter((r) => r.status !== 'PAID')
      .reduce((sum, r) => sum + r.royaltyAmount, 0)

    const totalPaid = royalties
      .filter((r) => r.status === 'PAID')
      .reduce((sum, r) => sum + r.royaltyAmount, 0)

    const pending = royalties.filter((r) => r.status === 'CALCULATED').length

    return {
      data: {
        royalties,
        summary: {
          totalDue,
          totalPaid,
          pending,
        },
      },
      error: null,
    }
  } catch (error) {
    console.error('[Revenue] Failed to get royalty status:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Mark royalty as invoiced
 */
export async function markRoyaltyInvoiced(params: {
  royaltyId: string
  tenantId: string
  invoiceNumber?: string
}): Promise<{ data: RoyaltyRecord | null; error: Error | null }> {
  try {
    const { royaltyId, tenantId } = params

    // Update royalty invoice status to invoiced
    const invoice = await prisma.royaltyInvoice.update({
      where: {
        id: royaltyId,
        tenantId,
      },
      data: {
        status: 'invoiced',
      },
    })

    // Map to RoyaltyRecord format
    const royaltyRecord: RoyaltyRecord = {
      id: invoice.id,
      campSessionId: invoice.campId || '',
      tenantId: invoice.tenantId,
      grossRevenue: invoice.grossRevenueCents / 100,
      royaltyRate: invoice.royaltyRateBps / 10000,
      royaltyAmount: invoice.totalDueCents / 100,
      status: 'INVOICED',
      calculatedAt: invoice.createdAt.toISOString(),
      invoicedAt: invoice.generatedAt?.toISOString() || null,
      paidAt: invoice.paidAt?.toISOString() || null,
      notes: invoice.adjustmentNotes,
    }

    return {
      data: royaltyRecord,
      error: null,
    }
  } catch (error) {
    console.error('[Revenue] Failed to mark royalty invoiced:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Mark royalty as paid
 */
export async function markRoyaltyPaid(params: {
  royaltyId: string
  tenantId: string
  paymentReference?: string
}): Promise<{ data: RoyaltyRecord | null; error: Error | null }> {
  try {
    const { royaltyId, tenantId, paymentReference } = params

    // Update royalty invoice status to paid
    const invoice = await prisma.royaltyInvoice.update({
      where: {
        id: royaltyId,
        tenantId,
      },
      data: {
        status: 'paid',
        paidAt: new Date(),
        ...(paymentReference ? { paymentReference } : {}),
      },
    })

    // Map to RoyaltyRecord format
    const royaltyRecord: RoyaltyRecord = {
      id: invoice.id,
      campSessionId: invoice.campId || '',
      tenantId: invoice.tenantId,
      grossRevenue: invoice.grossRevenueCents / 100,
      royaltyRate: invoice.royaltyRateBps / 10000,
      royaltyAmount: invoice.totalDueCents / 100,
      status: 'PAID',
      calculatedAt: invoice.createdAt.toISOString(),
      invoicedAt: invoice.generatedAt?.toISOString() || null,
      paidAt: invoice.paidAt?.toISOString() || null,
      notes: invoice.adjustmentNotes,
    }

    return {
      data: royaltyRecord,
      error: null,
    }
  } catch (error) {
    console.error('[Revenue] Failed to mark royalty paid:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Create a revenue snapshot for a specific period
 * Calculates and stores aggregated revenue metrics.
 */
export async function createRevenueSnapshot(params: {
  tenantId: string
  periodStart: string
  periodEnd: string
}): Promise<{ data: RevenueSnapshot | null; error: Error | null }> {
  try {
    const { tenantId, periodStart, periodEnd } = params
    const startDate = new Date(periodStart)
    const endDate = new Date(periodEnd)

    // Get all camps within this period
    const camps = await prisma.camp.findMany({
      where: {
        tenantId,
        startDate: { gte: startDate },
        endDate: { lte: endDate },
      },
      include: {
        registrations: {
          where: { status: 'confirmed' },
        },
      },
    })

    // Calculate revenue from confirmed registrations (amounts in cents)
    let grossRevenueCents = 0
    let totalCampers = 0

    for (const camp of camps) {
      for (const reg of camp.registrations) {
        grossRevenueCents += reg.totalPriceCents || 0
        totalCampers += 1
      }
    }

    // Get refunded registrations for this period
    const refundedRegistrations = await prisma.registration.findMany({
      where: {
        tenantId,
        status: 'refunded',
        updatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        totalPriceCents: true,
      },
    })

    const refundsCents = refundedRegistrations.reduce((sum, r) => sum + (r.totalPriceCents || 0), 0)
    const netRevenueCents = grossRevenueCents - refundsCents
    const arpcCents = totalCampers > 0 ? Math.round(netRevenueCents / totalCampers) : 0
    const sessionsHeld = camps.length

    // Upsert the snapshot (update if exists for this period)
    const snapshot = await prisma.revenueSnapshot.upsert({
      where: {
        tenantId_periodStart_periodEnd: {
          tenantId,
          periodStart: startDate,
          periodEnd: endDate,
        },
      },
      update: {
        grossRevenueCents,
        netRevenueCents,
        refundsCents,
        totalCampers,
        arpcCents,
        sessionsHeld,
      },
      create: {
        tenantId,
        periodStart: startDate,
        periodEnd: endDate,
        grossRevenueCents,
        netRevenueCents,
        refundsCents,
        totalCampers,
        arpcCents,
        sessionsHeld,
      },
    })

    return {
      data: {
        id: snapshot.id,
        tenantId: snapshot.tenantId,
        periodStart: snapshot.periodStart.toISOString(),
        periodEnd: snapshot.periodEnd.toISOString(),
        grossRevenue: snapshot.grossRevenueCents / 100,
        netRevenue: snapshot.netRevenueCents / 100,
        arpc: snapshot.arpcCents / 100,
        sessionsHeld: snapshot.sessionsHeld,
        totalCampers: snapshot.totalCampers,
        createdAt: snapshot.createdAt.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[Revenue] Failed to create revenue snapshot:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get revenue snapshots for a tenant (for charts/reporting)
 */
export async function getRevenueSnapshots(params: {
  tenantId: string
  startDate?: string
  endDate?: string
  limit?: number
}): Promise<{ data: { snapshots: RevenueSnapshot[] } | null; error: Error | null }> {
  try {
    const { tenantId, startDate, endDate, limit = 12 } = params

    const snapshots = await prisma.revenueSnapshot.findMany({
      where: {
        tenantId,
        ...(startDate ? { periodStart: { gte: new Date(startDate) } } : {}),
        ...(endDate ? { periodEnd: { lte: new Date(endDate) } } : {}),
      },
      orderBy: { periodStart: 'desc' },
      take: limit,
    })

    return {
      data: {
        snapshots: snapshots.map((s) => ({
          id: s.id,
          tenantId: s.tenantId,
          periodStart: s.periodStart.toISOString(),
          periodEnd: s.periodEnd.toISOString(),
          grossRevenue: s.grossRevenueCents / 100,
          netRevenue: s.netRevenueCents / 100,
          arpc: s.arpcCents / 100,
          sessionsHeld: s.sessionsHeld,
          totalCampers: s.totalCampers,
          createdAt: s.createdAt.toISOString(),
        })),
      },
      error: null,
    }
  } catch (error) {
    console.error('[Revenue] Failed to get revenue snapshots:', error)
    return { data: null, error: error as Error }
  }
}
