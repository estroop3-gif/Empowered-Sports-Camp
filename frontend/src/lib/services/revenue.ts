/**
 * Revenue Service
 *
 * SHELL: Real-time revenue dashboard and royalty automation
 *
 * Handles:
 * - Session-level revenue dashboards
 * - Revenue trend visualization data
 * - Royalty calculation and automation
 * - Revenue snapshots for historical tracking
 */

import { prisma } from '@/lib/db/client'

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
 * SHELL: Get real-time revenue dashboard for a camp session
 */
export async function getSessionRevenueDashboard(params: {
  campSessionId: string
  tenantId: string
  role: string
}): Promise<{ data: SessionRevenueDashboard | null; error: Error | null }> {
  try {
    const { campSessionId, tenantId, role } = params

    // SHELL: Fetch camp session data
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

    // SHELL: Calculate revenue metrics
    // TODO: Implement full revenue calculation
    const confirmedRegistrations = camp.registrations.filter(
      (r) => r.status === 'confirmed'
    )

    // SHELL: Calculate totals (amounts are in cents)
    const registrationRevenue = confirmedRegistrations.reduce(
      (sum, r) => sum + (r.totalPriceCents || 0),
      0
    ) / 100 // Convert cents to dollars

    // SHELL: Get upsell revenue from shop orders
    // TODO: Query shop_orders related to this camp session

    // SHELL: Calculate refunds
    // TODO: Query refund records

    const grossRevenue = registrationRevenue // + upsellRevenue
    const netRevenue = grossRevenue // - refunds

    // SHELL: Calculate ARPC
    const arpc = confirmedRegistrations.length > 0
      ? netRevenue / confirmedRegistrations.length
      : 0

    // SHELL: Get royalty info
    // TODO: Query royalties table after it's created
    const royaltyRate = 0.05 // Default 5% - TODO: get from tenant settings
    const estimatedRoyalty = grossRevenue * royaltyRate

    console.log('[Revenue] SHELL: Would return revenue dashboard for session:', campSessionId)

    return {
      data: {
        sessionId: camp.id,
        sessionName: camp.name,
        tenantId: camp.tenantId,
        tenantName: camp.tenant.name,
        period: {
          startDate: camp.startDate.toISOString(),
          endDate: camp.endDate.toISOString(),
        },
        revenue: {
          grossRevenue,
          registrationRevenue,
          upsellRevenue: 0, // SHELL: Calculate from shop orders
          refunds: 0, // SHELL: Calculate from refund records
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
          status: 'PENDING', // SHELL: Get actual status
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
 * SHELL: Get revenue trends for a tenant over time
 */
export async function getSessionRevenueTrends(params: {
  tenantId: string
  role: string
  range: 'season' | 'ytd' | 'custom'
  startDate?: string
  endDate?: string
}): Promise<{ data: { trends: RevenueTrendData[] } | null; error: Error | null }> {
  try {
    const { tenantId, role, range, startDate, endDate } = params

    // SHELL: Calculate date range based on range parameter
    const now = new Date()
    let rangeStart: Date
    let rangeEnd: Date = now

    switch (range) {
      case 'season':
        // SHELL: Current season (e.g., summer camps May-August)
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

    // SHELL: Query revenue snapshots or calculate from registrations
    // TODO: Implement after revenue_snapshots table is created
    /*
    const snapshots = await prisma.revenueSnapshot.findMany({
      where: {
        tenantId,
        periodStart: { gte: rangeStart },
        periodEnd: { lte: rangeEnd },
      },
      orderBy: { periodStart: 'asc' },
    })
    */

    console.log('[Revenue] SHELL: Would return revenue trends for tenant:', {
      tenantId,
      range,
      rangeStart,
      rangeEnd,
    })

    // SHELL: Return mock trend data
    const mockTrends: RevenueTrendData[] = [
      { period: '2024-06', grossRevenue: 45000, netRevenue: 42000, registrations: 120, arpc: 350 },
      { period: '2024-07', grossRevenue: 62000, netRevenue: 58000, registrations: 165, arpc: 352 },
      { period: '2024-08', grossRevenue: 38000, netRevenue: 35500, registrations: 98, arpc: 362 },
    ]

    return {
      data: { trends: mockTrends },
      error: null,
    }
  } catch (error) {
    console.error('[Revenue] Failed to get revenue trends:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: Run royalty automation for a camp session
 *
 * Calculates royalty based on gross revenue and creates/updates royalty records.
 */
export async function runRoyaltyAutomationForSession(params: {
  campSessionId: string
  tenantId: string
}): Promise<{ data: RoyaltyRecord | null; error: Error | null }> {
  try {
    const { campSessionId, tenantId } = params

    // SHELL: Get session revenue
    const { data: revenueDashboard, error: revenueError } = await getSessionRevenueDashboard({
      campSessionId,
      tenantId,
      role: 'hq_admin', // Internal call
    })

    if (revenueError || !revenueDashboard) {
      return { data: null, error: revenueError || new Error('Failed to get revenue data') }
    }

    // SHELL: Get royalty rate from tenant settings or franchise agreement
    // TODO: Query tenant settings for custom royalty rate
    const royaltyRate = 0.05 // Default 5%

    // SHELL: Calculate royalty amount
    // TODO: Implement royalty formula using camp_session_compensation + gross revenue
    const grossRevenue = revenueDashboard.revenue.grossRevenue
    const royaltyAmount = grossRevenue * royaltyRate

    // SHELL: Create or update royalty record
    // TODO: Implement after royalties table is created
    /*
    const royalty = await prisma.royalty.upsert({
      where: {
        campSessionId_tenantId: {
          campSessionId,
          tenantId,
        },
      },
      update: {
        grossRevenue,
        royaltyRate,
        royaltyAmount,
        status: 'CALCULATED',
        calculatedAt: new Date(),
      },
      create: {
        campSessionId,
        tenantId,
        grossRevenue,
        royaltyRate,
        royaltyAmount,
        status: 'CALCULATED',
        calculatedAt: new Date(),
      },
    })
    */

    console.log('[Revenue] SHELL: Would run royalty automation:', {
      campSessionId,
      grossRevenue,
      royaltyRate,
      royaltyAmount,
    })

    // SHELL: Notify licensee of calculated royalty
    // TODO: Call createNotification

    const mockRoyalty: RoyaltyRecord = {
      id: `royalty_${Date.now()}`,
      campSessionId,
      tenantId,
      grossRevenue,
      royaltyRate,
      royaltyAmount,
      status: 'CALCULATED',
      calculatedAt: new Date().toISOString(),
      invoicedAt: null,
      paidAt: null,
      notes: null,
    }

    return {
      data: mockRoyalty,
      error: null,
    }
  } catch (error) {
    console.error('[Revenue] Failed to run royalty automation:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: Get royalty status for a licensee
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

    // SHELL: Query royalties from database
    // TODO: Implement after royalties table is created
    /*
    const royalties = await prisma.royalty.findMany({
      where: {
        tenantId,
        ...(range ? { calculatedAt: { gte: new Date(range) } } : {}),
      },
      orderBy: { calculatedAt: 'desc' },
      include: {
        campSession: true,
      },
    })
    */

    console.log('[Revenue] SHELL: Would get royalty status for tenant:', tenantId)

    // SHELL: Return mock data
    const mockRoyalties: RoyaltyRecord[] = [
      {
        id: 'royalty_1',
        campSessionId: 'session_1',
        tenantId,
        grossRevenue: 45000,
        royaltyRate: 0.05,
        royaltyAmount: 2250,
        status: 'PAID',
        calculatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        invoicedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        paidAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        notes: null,
      },
      {
        id: 'royalty_2',
        campSessionId: 'session_2',
        tenantId,
        grossRevenue: 62000,
        royaltyRate: 0.05,
        royaltyAmount: 3100,
        status: 'INVOICED',
        calculatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        invoicedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        paidAt: null,
        notes: null,
      },
      {
        id: 'royalty_3',
        campSessionId: 'session_3',
        tenantId,
        grossRevenue: 38000,
        royaltyRate: 0.05,
        royaltyAmount: 1900,
        status: 'CALCULATED',
        calculatedAt: new Date().toISOString(),
        invoicedAt: null,
        paidAt: null,
        notes: null,
      },
    ]

    const totalDue = mockRoyalties
      .filter((r) => r.status !== 'PAID')
      .reduce((sum, r) => sum + r.royaltyAmount, 0)

    const totalPaid = mockRoyalties
      .filter((r) => r.status === 'PAID')
      .reduce((sum, r) => sum + r.royaltyAmount, 0)

    const pending = mockRoyalties.filter((r) => r.status === 'CALCULATED').length

    return {
      data: {
        royalties: mockRoyalties,
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
 * SHELL: Mark royalty as invoiced
 */
export async function markRoyaltyInvoiced(params: {
  royaltyId: string
  tenantId: string
  invoiceNumber?: string
}): Promise<{ data: RoyaltyRecord | null; error: Error | null }> {
  try {
    const { royaltyId, tenantId, invoiceNumber } = params

    // SHELL: Update royalty record
    // TODO: Implement after royalties table is created

    console.log('[Revenue] SHELL: Would mark royalty as invoiced:', {
      royaltyId,
      invoiceNumber,
    })

    return {
      data: null, // SHELL: Return updated royalty
      error: null,
    }
  } catch (error) {
    console.error('[Revenue] Failed to mark royalty invoiced:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: Mark royalty as paid
 */
export async function markRoyaltyPaid(params: {
  royaltyId: string
  tenantId: string
  paymentReference?: string
}): Promise<{ data: RoyaltyRecord | null; error: Error | null }> {
  try {
    const { royaltyId, tenantId, paymentReference } = params

    // SHELL: Update royalty record
    // TODO: Implement after royalties table is created

    console.log('[Revenue] SHELL: Would mark royalty as paid:', {
      royaltyId,
      paymentReference,
    })

    return {
      data: null, // SHELL: Return updated royalty
      error: null,
    }
  } catch (error) {
    console.error('[Revenue] Failed to mark royalty paid:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: Create a revenue snapshot for reporting
 */
export async function createRevenueSnapshot(params: {
  tenantId: string
  periodStart: string
  periodEnd: string
}): Promise<{ data: RevenueSnapshot | null; error: Error | null }> {
  try {
    const { tenantId, periodStart, periodEnd } = params

    // SHELL: Calculate metrics for the period
    // TODO: Aggregate from registrations, orders, refunds

    // SHELL: Create snapshot record
    // TODO: Implement after revenue_snapshots table is created

    console.log('[Revenue] SHELL: Would create revenue snapshot:', {
      tenantId,
      periodStart,
      periodEnd,
    })

    return {
      data: null, // SHELL: Return created snapshot
      error: null,
    }
  } catch (error) {
    console.error('[Revenue] Failed to create revenue snapshot:', error)
    return { data: null, error: error as Error }
  }
}
