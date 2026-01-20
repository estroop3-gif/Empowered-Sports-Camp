/**
 * Licensee Dashboard Service
 *
 * Provides data aggregation for the licensee business owner dashboard.
 * All queries are scoped to the specific tenant (territory).
 *
 * Licensees have full visibility into their territory including:
 * - Sales & Growth KPIs
 * - Financial Health (royalties, ARPC)
 * - Quality & Compliance metrics
 * - Camp management
 * - Staff/IC oversight
 * - Tasks and alerts
 */

import { prisma } from '@/lib/db/client'
import { Prisma } from '@/generated/prisma'

// =============================================================================
// Types
// =============================================================================

export interface LicenseeTerritoryInfo {
  id: string
  name: string
  territory_name: string
  territory_description: string | null
  primary_contact_name: string | null
  primary_contact_email: string | null
  primary_contact_phone: string | null
  created_at: string
  status: string
}

export interface LicenseeSalesKpis {
  total_gross_revenue: number
  revenue_delta_percent: number | null
  sessions_held: number
  sessions_delta: number | null
  avg_enrollment_per_session: number
  enrollment_delta_percent: number | null
  total_registrations: number
  upsell_revenue: number
  period_start: string
  period_end: string
}

export interface LicenseeFinancialKpis {
  total_royalty_due: number
  total_royalty_paid: number
  royalty_compliance_rate: number
  sessions_needing_closeout: number
  average_revenue_per_camper: number
  arpc_delta_percent: number | null
}

export interface LicenseeQualityKpis {
  avg_csat_score: number | null
  csat_delta: number | null
  complaint_ratio: number // per 100 campers
  curriculum_adherence_score: number // percentage
  sessions_with_full_curriculum: number
  total_sessions_measured: number
  warnings: string[]
}

export interface LicenseeCampSummary {
  id: string
  name: string
  slug: string
  start_date: string
  end_date: string
  location_name: string | null
  location_city: string | null
  location_state: string | null
  enrolled_count: number
  capacity: number
  status: 'planning' | 'registration' | 'running' | 'completed'
  has_director: boolean
  director_name: string | null
  royalty_status: 'not_generated' | 'invoice_generated' | 'paid' | null
}

export interface LicenseeStaffSummary {
  directors: {
    count: number
    active_this_season: number
  }
  coaches: {
    count: number
    active_this_season: number
  }
  cits: {
    count: number
    active_this_season: number
  }
  total_staff: number
}

export interface LicenseeTasksAndAlerts {
  cit_applications_pending: number
  sessions_needing_closeout: number
  incentives_to_finalize: number
  contributions_pending_review: number
  jobs_open: number
  low_csat_camps: number
  total_alerts: number
}

export interface LicenseeEmpowerUProgress {
  business_portal: {
    completed_modules: number
    total_modules: number
    percentage: number
    next_module: string | null
    gated_features: string[]
  }
  operational_portal: {
    completed_modules: number
    total_modules: number
    percentage: number
  }
}

export interface LicenseeIncentiveOverview {
  total_paid_this_season: number
  total_pending: number
  total_finalized: number
  staff_with_compensation: number
  avg_compensation_per_session: number
}

export interface LicenseeDashboardData {
  territory: LicenseeTerritoryInfo | null
  sales_kpis: LicenseeSalesKpis
  financial_kpis: LicenseeFinancialKpis
  quality_kpis: LicenseeQualityKpis
  active_camps: LicenseeCampSummary[]
  upcoming_camps: LicenseeCampSummary[]
  staff_summary: LicenseeStaffSummary
  tasks_alerts: LicenseeTasksAndAlerts
  empoweru_progress: LicenseeEmpowerUProgress
  incentive_overview: LicenseeIncentiveOverview
}

// =============================================================================
// Helper Functions
// =============================================================================

function getSeasonDateRange(): { start: Date; end: Date } {
  const now = new Date()
  const year = now.getFullYear()
  // Season runs roughly March to September
  const seasonStart = new Date(year, 2, 1) // March 1
  const seasonEnd = new Date(year, 8, 30) // September 30
  return { start: seasonStart, end: seasonEnd }
}

function getPeriodDates(period: string): { start: Date; end: Date } {
  const now = new Date()
  const year = now.getFullYear()

  switch (period) {
    case 'last_30_days':
      return {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        end: now,
      }
    case 'ytd':
      return {
        start: new Date(year, 0, 1),
        end: now,
      }
    case 'season':
    default:
      return getSeasonDateRange()
  }
}

// =============================================================================
// Main Service Functions
// =============================================================================

/**
 * Get territory information for a licensee
 */
export async function getLicenseeTerritoryInfo(params: {
  tenantId: string
}): Promise<{ data: LicenseeTerritoryInfo | null; error: Error | null }> {
  try {
    // Get the tenant (licensee organization)
    const tenant = await prisma.tenant.findUnique({
      where: { id: params.tenantId },
      include: {
        territories: true,
      },
    })

    if (!tenant) {
      return { data: null, error: null }
    }

    // Get primary territory (first one assigned to this tenant)
    const territory = tenant.territories[0]

    return {
      data: {
        id: tenant.id,
        name: tenant.name || 'Unnamed Licensee',
        territory_name: territory?.name || 'Unassigned Territory',
        territory_description: territory?.description || null,
        primary_contact_name: tenant.name,
        primary_contact_email: tenant.contactEmail || null,
        primary_contact_phone: tenant.contactPhone || null,
        created_at: tenant.createdAt.toISOString(),
        status: tenant.licenseStatus,
      },
      error: null,
    }
  } catch (error) {
    console.error('[LicenseeDashboard] Failed to get territory info:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get Sales & Growth KPIs for a licensee
 */
export async function getLicenseeSalesKpis(params: {
  tenantId: string
  period?: string
}): Promise<{ data: LicenseeSalesKpis | null; error: Error | null }> {
  try {
    const { start, end } = getPeriodDates(params.period || 'season')
    const prevStart = new Date(start.getTime() - (end.getTime() - start.getTime()))

    // Get camps in period
    const camps = await prisma.camp.findMany({
      where: {
        tenantId: params.tenantId,
        startDate: { gte: start, lte: end },
      },
      include: {
        registrations: {
          where: { status: 'confirmed' },
        },
        _count: {
          select: { registrations: true },
        },
      },
    })

    // Get previous period camps for delta calculation
    const prevCamps = await prisma.camp.findMany({
      where: {
        tenantId: params.tenantId,
        startDate: { gte: prevStart, lt: start },
      },
      include: {
        registrations: {
          where: { status: 'confirmed' },
        },
      },
    })

    // Calculate current period metrics
    let totalRevenue = 0
    let totalRegistrations = 0
    let upsellRevenue = 0

    for (const camp of camps) {
      for (const reg of camp.registrations) {
        totalRevenue += Number(reg.totalPriceCents || 0)
        totalRegistrations += 1
        // Upsell would be calculated from order items if we had them
      }
    }

    const sessionsHeld = camps.filter(c => c.status === 'completed' || c.status === 'in_progress').length
    const avgEnrollment = sessionsHeld > 0 ? totalRegistrations / sessionsHeld : 0

    // Calculate previous period for deltas
    let prevRevenue = 0
    let prevRegistrations = 0
    for (const camp of prevCamps) {
      for (const reg of camp.registrations) {
        prevRevenue += Number(reg.totalPriceCents || 0)
        prevRegistrations += 1
      }
    }
    const prevSessions = prevCamps.filter(c => c.status === 'completed' || c.status === 'in_progress').length
    const prevAvgEnrollment = prevSessions > 0 ? prevRegistrations / prevSessions : 0

    // Calculate deltas
    const revenueDelta = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : null
    const sessionsDelta = prevSessions > 0 ? sessionsHeld - prevSessions : null
    const enrollmentDelta = prevAvgEnrollment > 0
      ? ((avgEnrollment - prevAvgEnrollment) / prevAvgEnrollment) * 100
      : null

    return {
      data: {
        total_gross_revenue: totalRevenue,
        revenue_delta_percent: revenueDelta,
        sessions_held: sessionsHeld,
        sessions_delta: sessionsDelta,
        avg_enrollment_per_session: avgEnrollment,
        enrollment_delta_percent: enrollmentDelta,
        total_registrations: totalRegistrations,
        upsell_revenue: upsellRevenue,
        period_start: start.toISOString(),
        period_end: end.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[LicenseeDashboard] Failed to get sales KPIs:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get Financial Health KPIs for a licensee
 */
export async function getLicenseeFinancialKpis(params: {
  tenantId: string
}): Promise<{ data: LicenseeFinancialKpis | null; error: Error | null }> {
  try {
    const { start, end } = getSeasonDateRange()

    // Get all camps with compensation data
    const camps = await prisma.camp.findMany({
      where: {
        tenantId: params.tenantId,
        startDate: { gte: start, lte: end },
      },
      include: {
        registrations: {
          where: { status: 'confirmed' },
        },
        sessionCompensations: true,
      },
    })

    let totalRevenue = 0
    let totalCampers = 0
    let royaltyDue = 0
    let royaltyPaid = 0
    let sessionsNeedingCloseout = 0

    for (const camp of camps) {
      let campRevenue = 0
      for (const reg of camp.registrations) {
        campRevenue += Number(reg.totalPriceCents || 0)
        totalCampers += 1
      }
      totalRevenue += campRevenue

      // Calculate 10% royalty
      const campRoyalty = campRevenue * 0.10
      royaltyDue += campRoyalty

      // Check if camp has been closed out (has compensation record with finalized status)
      const hasCloseout = camp.sessionCompensations.some(sc => sc.isFinalized)
      if (!hasCloseout && camp.status === 'completed') {
        sessionsNeedingCloseout += 1
      }

      // Sum up paid royalties (we'd track this in a royalty_payments table ideally)
      // For now, consider finalized compensations as "paid"
      for (const sc of camp.sessionCompensations) {
        if (sc.isFinalized) {
          royaltyPaid += campRoyalty
        }
      }
    }

    const arpc = totalCampers > 0 ? totalRevenue / totalCampers : 0
    const totalSessions = camps.filter(c => c.status === 'completed').length
    const paidSessions = totalSessions - sessionsNeedingCloseout
    const complianceRate = totalSessions > 0 ? (paidSessions / totalSessions) * 100 : 100

    return {
      data: {
        total_royalty_due: royaltyDue,
        total_royalty_paid: royaltyPaid,
        royalty_compliance_rate: complianceRate,
        sessions_needing_closeout: sessionsNeedingCloseout,
        average_revenue_per_camper: arpc,
        arpc_delta_percent: null, // Would compare to previous period
      },
      error: null,
    }
  } catch (error) {
    console.error('[LicenseeDashboard] Failed to get financial KPIs:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get Quality & Compliance KPIs for a licensee
 */
export async function getLicenseeQualityKpis(params: {
  tenantId: string
}): Promise<{ data: LicenseeQualityKpis | null; error: Error | null }> {
  try {
    const { start, end } = getSeasonDateRange()

    // Get camps with CSAT data
    const camps = await prisma.camp.findMany({
      where: {
        tenantId: params.tenantId,
        startDate: { gte: start, lte: end },
        status: { in: ['completed', 'in_progress'] },
      },
      include: {
        sessionCompensations: true,
        registrations: {
          where: { status: 'confirmed' },
        },
        campDays: {
          include: {
            scheduleBlockProgress: true,
          },
        },
      },
    })

    let totalCsat = 0
    let csatCount = 0
    let totalCampers = 0
    let totalComplaints = 0
    let sessionsWithFullCurriculum = 0
    const warnings: string[] = []

    for (const camp of camps) {
      // Aggregate CSAT from compensation snapshots
      for (const sc of camp.sessionCompensations) {
        if (sc.csatAvgScore) {
          totalCsat += Number(sc.csatAvgScore)
          csatCount += 1
        }
      }

      totalCampers += camp.registrations.length

      // Check curriculum adherence (did they use grouping tool and complete curriculum blocks?)
      const totalDays = camp.campDays.length
      let daysWithProgress = 0
      for (const day of camp.campDays) {
        if (day.scheduleBlockProgress.length > 0) {
          daysWithProgress += 1
        }
      }
      if (totalDays > 0 && daysWithProgress === totalDays) {
        sessionsWithFullCurriculum += 1
      }
    }

    const avgCsat = csatCount > 0 ? totalCsat / csatCount : null
    const complaintRatio = totalCampers > 0 ? (totalComplaints / totalCampers) * 100 : 0
    const totalSessionsMeasured = camps.length
    const curriculumAdherence = totalSessionsMeasured > 0
      ? (sessionsWithFullCurriculum / totalSessionsMeasured) * 100
      : 100

    // Add warnings
    if (avgCsat !== null && avgCsat < 4.2) {
      warnings.push('CSAT score below 4.2 threshold')
    }
    if (complaintRatio > 2) {
      warnings.push('Complaint ratio above 2%')
    }
    if (curriculumAdherence < 80) {
      warnings.push('Curriculum adherence below 80%')
    }

    return {
      data: {
        avg_csat_score: avgCsat,
        csat_delta: null,
        complaint_ratio: complaintRatio,
        curriculum_adherence_score: curriculumAdherence,
        sessions_with_full_curriculum: sessionsWithFullCurriculum,
        total_sessions_measured: totalSessionsMeasured,
        warnings,
      },
      error: null,
    }
  } catch (error) {
    console.error('[LicenseeDashboard] Failed to get quality KPIs:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get camps list for a licensee
 */
export async function getLicenseeCamps(params: {
  tenantId?: string  // Optional - if undefined, returns all camps (for HQ admin)
  status?: string
  limit?: number
}): Promise<{ data: LicenseeCampSummary[] | null; error: Error | null }> {
  try {
    const now = new Date()
    const whereClause: Prisma.CampWhereInput = {}

    // Filter by tenant if provided (HQ admins may not have a tenantId)
    if (params.tenantId) {
      whereClause.tenantId = params.tenantId
    }

    if (params.status === 'active') {
      whereClause.status = 'in_progress'
    } else if (params.status === 'upcoming') {
      whereClause.startDate = { gt: now }
      whereClause.status = { in: ['draft', 'published'] }
    } else if (params.status === 'completed') {
      whereClause.status = 'completed'
    }

    const camps = await prisma.camp.findMany({
      where: whereClause,
      include: {
        location: true,
        registrations: {
          where: { status: 'confirmed' },
        },
        staffAssignments: {
          where: { role: 'director' },
          include: {
            user: true,
          },
        },
        sessionCompensations: true,
      },
      orderBy: { startDate: 'asc' },
      take: params.limit,
    })

    const campSummaries: LicenseeCampSummary[] = camps.map(camp => {
      const director = camp.staffAssignments[0]?.user

      // Determine royalty status
      let royaltyStatus: 'not_generated' | 'invoice_generated' | 'paid' | null = null
      if (camp.status === 'completed') {
        const hasFinalized = camp.sessionCompensations.some(sc => sc.isFinalized)
        royaltyStatus = hasFinalized ? 'paid' : 'not_generated'
      }

      // Determine camp status
      let status: 'planning' | 'registration' | 'running' | 'completed' = 'planning'
      if (camp.status === 'completed') {
        status = 'completed'
      } else if (camp.status === 'in_progress') {
        status = 'running'
      } else if (camp.status === 'published') {
        status = 'registration'
      }

      return {
        id: camp.id,
        name: camp.name,
        slug: camp.slug,
        start_date: camp.startDate.toISOString(),
        end_date: camp.endDate.toISOString(),
        location_name: camp.location?.name || null,
        location_city: camp.location?.city || null,
        location_state: camp.location?.state || null,
        enrolled_count: camp.registrations.length,
        capacity: camp.capacity || 50,
        status,
        has_director: !!director,
        director_name: director ? `${director.firstName} ${director.lastName}` : null,
        royalty_status: royaltyStatus,
      }
    })

    return { data: campSummaries, error: null }
  } catch (error) {
    console.error('[LicenseeDashboard] Failed to get camps:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get staff summary for a licensee
 */
export async function getLicenseeStaffSummary(params: {
  tenantId: string
}): Promise<{ data: LicenseeStaffSummary | null; error: Error | null }> {
  try {
    const { start, end } = getSeasonDateRange()

    // Get all staff profiles for this tenant (via userRoles)
    const profiles = await prisma.profile.findMany({
      where: {
        userRoles: {
          some: { tenantId: params.tenantId },
        },
      },
      include: {
        userRoles: {
          where: { tenantId: params.tenantId },
        },
        staffAssignments: {
          where: {
            camp: {
              tenantId: params.tenantId,
              startDate: { gte: start, lte: end },
            },
          },
        },
      },
    })

    let directors = { count: 0, active_this_season: 0 }
    let coaches = { count: 0, active_this_season: 0 }
    let cits = { count: 0, active_this_season: 0 }

    for (const profile of profiles) {
      const roles = profile.userRoles.map(r => r.role.toLowerCase())
      const hasAssignments = profile.staffAssignments.length > 0

      if (roles.includes('director')) {
        directors.count += 1
        if (hasAssignments) directors.active_this_season += 1
      }
      if (roles.includes('coach')) {
        coaches.count += 1
        if (hasAssignments) coaches.active_this_season += 1
      }
      if (roles.includes('cit_volunteer')) {
        cits.count += 1
        if (hasAssignments) cits.active_this_season += 1
      }
    }

    return {
      data: {
        directors,
        coaches,
        cits,
        total_staff: directors.count + coaches.count + cits.count,
      },
      error: null,
    }
  } catch (error) {
    console.error('[LicenseeDashboard] Failed to get staff summary:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get tasks and alerts for a licensee
 */
export async function getLicenseeTasksAndAlerts(params: {
  tenantId: string
}): Promise<{ data: LicenseeTasksAndAlerts | null; error: Error | null }> {
  try {
    // CIT applications pending (assigned to this licensee/tenant)
    const citPending = await prisma.citApplication.count({
      where: {
        assignedLicenseeId: params.tenantId,
        status: { in: ['applied', 'under_review', 'interview_scheduled', 'interview_completed'] },
      },
    })

    // Sessions needing closeout
    const { start, end } = getSeasonDateRange()
    const completedCamps = await prisma.camp.findMany({
      where: {
        tenantId: params.tenantId,
        status: 'completed',
        startDate: { gte: start, lte: end },
      },
      include: {
        sessionCompensations: true,
      },
    })
    const sessionsNeedingCloseout = completedCamps.filter(
      c => !c.sessionCompensations.some(sc => sc.isFinalized)
    ).length

    // Incentives to finalize
    const incentivesToFinalize = await prisma.campSessionCompensation.count({
      where: {
        camp: { tenantId: params.tenantId, status: 'completed' },
        isFinalized: false,
      },
    })

    // Contributions pending review
    const contributionsPending = await prisma.empowerUContribution.count({
      where: {
        tenantId: params.tenantId,
        status: 'PENDING',
      },
    })

    // Open jobs
    const openJobs = await prisma.jobPosting.count({
      where: {
        tenantId: params.tenantId,
        status: 'open',
      },
    })

    // Low CSAT camps (simplified - would need more complex query)
    const lowCsatCamps = 0

    const totalAlerts = citPending + sessionsNeedingCloseout + incentivesToFinalize + contributionsPending

    return {
      data: {
        cit_applications_pending: citPending,
        sessions_needing_closeout: sessionsNeedingCloseout,
        incentives_to_finalize: incentivesToFinalize,
        contributions_pending_review: contributionsPending,
        jobs_open: openJobs,
        low_csat_camps: lowCsatCamps,
        total_alerts: totalAlerts,
      },
      error: null,
    }
  } catch (error) {
    console.error('[LicenseeDashboard] Failed to get tasks and alerts:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get EmpowerU progress for a licensee
 */
export async function getLicenseeEmpowerUProgress(params: {
  userId: string
  tenantId: string
}): Promise<{ data: LicenseeEmpowerUProgress | null; error: Error | null }> {
  try {
    // Get business portal modules
    const businessModules = await prisma.empowerUModule.findMany({
      where: {
        portalType: 'BUSINESS',
        isPublished: true,
      },
    })

    // Get user's progress
    const userProgress = await prisma.empowerUModuleProgress.findMany({
      where: {
        userId: params.userId,
        module: {
          portalType: { in: ['BUSINESS', 'OPERATIONAL'] },
        },
      },
      include: {
        module: true,
      },
    })

    const businessCompleted = userProgress.filter(
      p => p.module.portalType === 'BUSINESS' && p.completedAt
    ).length

    const operationalModules = await prisma.empowerUModule.count({
      where: { portalType: 'OPERATIONAL', isPublished: true },
    })
    const operationalCompleted = userProgress.filter(
      p => p.module.portalType === 'OPERATIONAL' && p.completedAt
    ).length

    // Find next module
    const completedIds = userProgress.filter(p => p.completedAt).map(p => p.moduleId)
    const nextModule = businessModules.find(m => !completedIds.includes(m.id))

    // Check gated features
    const gatedFeatures: string[] = []
    // Would check specific module completions against feature unlocks

    return {
      data: {
        business_portal: {
          completed_modules: businessCompleted,
          total_modules: businessModules.length,
          percentage: businessModules.length > 0
            ? Math.round((businessCompleted / businessModules.length) * 100)
            : 0,
          next_module: nextModule?.title || null,
          gated_features: gatedFeatures,
        },
        operational_portal: {
          completed_modules: operationalCompleted,
          total_modules: operationalModules,
          percentage: operationalModules > 0
            ? Math.round((operationalCompleted / operationalModules) * 100)
            : 0,
        },
      },
      error: null,
    }
  } catch (error) {
    console.error('[LicenseeDashboard] Failed to get EmpowerU progress:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get incentive overview for licensee's staff
 */
export async function getLicenseeIncentiveOverview(params: {
  tenantId: string
}): Promise<{ data: LicenseeIncentiveOverview | null; error: Error | null }> {
  try {
    const { start, end } = getSeasonDateRange()

    const compensations = await prisma.campSessionCompensation.findMany({
      where: {
        camp: {
          tenantId: params.tenantId,
          startDate: { gte: start, lte: end },
        },
      },
    })

    let totalPaid = 0
    let totalPending = 0
    let totalFinalized = 0
    const staffIds = new Set<string>()

    for (const comp of compensations) {
      const total = Number(comp.fixedStipendTotal || 0) + Number(comp.totalVariableBonus || 0)
      staffIds.add(comp.staffProfileId)

      if (comp.isFinalized) {
        totalFinalized += total
        totalPaid += total
      } else {
        totalPending += total
      }
    }

    const sessionsWithComp = compensations.length
    const avgPerSession = sessionsWithComp > 0 ? (totalPaid + totalPending) / sessionsWithComp : 0

    return {
      data: {
        total_paid_this_season: totalPaid,
        total_pending: totalPending,
        total_finalized: totalFinalized,
        staff_with_compensation: staffIds.size,
        avg_compensation_per_session: avgPerSession,
      },
      error: null,
    }
  } catch (error) {
    console.error('[LicenseeDashboard] Failed to get incentive overview:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Sales Report Types & Function
// =============================================================================

export interface LicenseeSalesReportTrend {
  periodStart: string
  periodLabel: string
  revenue: number
  campers: number
}

export interface LicenseeSalesReportCamp {
  campId: string
  campName: string
  revenue: number
  campers: number
  dates: string
  status: string
}

export interface LicenseeSalesReport {
  grossRevenue: number
  sessionsHeld: number
  totalCampers: number
  arpc: number
  comparison: {
    revenueChange: number | null
    campersChange: number | null
  }
  trends: LicenseeSalesReportTrend[]
  campBreakdown: LicenseeSalesReportCamp[]
  periodStart: string
  periodEnd: string
}

/**
 * Get detailed sales report for a licensee
 */
export async function getLicenseeSalesReport(params: {
  tenantId: string
  period?: string
}): Promise<{ data: LicenseeSalesReport | null; error: Error | null }> {
  try {
    const { start, end } = getPeriodDates(params.period || 'season')
    const prevStart = new Date(start.getTime() - (end.getTime() - start.getTime()))

    // Get camps in period with registrations
    const camps = await prisma.camp.findMany({
      where: {
        tenantId: params.tenantId,
        startDate: { gte: start, lte: end },
      },
      include: {
        registrations: {
          where: { status: 'confirmed' },
        },
        location: true,
      },
      orderBy: { startDate: 'asc' },
    })

    // Get previous period camps for delta calculation
    const prevCamps = await prisma.camp.findMany({
      where: {
        tenantId: params.tenantId,
        startDate: { gte: prevStart, lt: start },
      },
      include: {
        registrations: {
          where: { status: 'confirmed' },
        },
      },
    })

    // Calculate current period metrics
    let totalRevenue = 0
    let totalCampers = 0
    const campBreakdown: LicenseeSalesReportCamp[] = []

    for (const camp of camps) {
      let campRevenue = 0
      let campCampers = 0

      for (const reg of camp.registrations) {
        campRevenue += Number(reg.totalPriceCents || 0)
        campCampers += 1
      }

      totalRevenue += campRevenue
      totalCampers += campCampers

      // Format date range
      const startDate = new Date(camp.startDate)
      const endDate = new Date(camp.endDate)
      const dateStr = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

      campBreakdown.push({
        campId: camp.id,
        campName: camp.name,
        revenue: campRevenue,
        campers: campCampers,
        dates: dateStr,
        status: camp.status,
      })
    }

    const sessionsHeld = camps.filter(c => c.status === 'completed' || c.status === 'in_progress').length
    const arpc = totalCampers > 0 ? Math.round(totalRevenue / totalCampers) : 0

    // Calculate previous period for deltas
    let prevRevenue = 0
    let prevCampers = 0
    for (const camp of prevCamps) {
      for (const reg of camp.registrations) {
        prevRevenue += Number(reg.totalPriceCents || 0)
        prevCampers += 1
      }
    }

    // Calculate deltas
    const revenueChange = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : null
    const campersChange = prevCampers > 0 ? Math.round(((totalCampers - prevCampers) / prevCampers) * 100) : null

    // Calculate trends (group by week or month depending on period length)
    const trends: LicenseeSalesReportTrend[] = []
    const periodLengthDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    // Use weekly granularity for periods under 90 days, monthly for longer
    const granularity = periodLengthDays <= 90 ? 'week' : 'month'

    // Group camps by period
    const periodMap = new Map<string, { revenue: number; campers: number; label: string }>()

    for (const camp of camps) {
      const campDate = new Date(camp.startDate)
      let periodKey: string
      let periodLabel: string

      if (granularity === 'week') {
        // Get week start (Sunday)
        const weekStart = new Date(campDate)
        weekStart.setDate(campDate.getDate() - campDate.getDay())
        periodKey = weekStart.toISOString().split('T')[0]
        periodLabel = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      } else {
        // Group by month
        periodKey = `${campDate.getFullYear()}-${String(campDate.getMonth() + 1).padStart(2, '0')}`
        periodLabel = campDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      }

      const existing = periodMap.get(periodKey) || { revenue: 0, campers: 0, label: periodLabel }

      for (const reg of camp.registrations) {
        existing.revenue += Number(reg.totalPriceCents || 0)
        existing.campers += 1
      }

      periodMap.set(periodKey, existing)
    }

    // Convert map to sorted array
    const sortedPeriods = Array.from(periodMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    for (const [periodStart, data] of sortedPeriods) {
      trends.push({
        periodStart,
        periodLabel: data.label,
        revenue: data.revenue,
        campers: data.campers,
      })
    }

    return {
      data: {
        grossRevenue: totalRevenue,
        sessionsHeld,
        totalCampers,
        arpc,
        comparison: {
          revenueChange,
          campersChange,
        },
        trends,
        campBreakdown,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[LicenseeDashboard] Failed to get sales report:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get full dashboard data for a licensee
 */
export async function getLicenseeDashboardData(params: {
  userId: string
  tenantId: string
  period?: string
}): Promise<{ data: LicenseeDashboardData | null; error: Error | null }> {
  try {
    // Fetch all data in parallel
    const [
      territoryResult,
      salesResult,
      financialResult,
      qualityResult,
      activeCampsResult,
      upcomingCampsResult,
      staffResult,
      tasksResult,
      empoweruResult,
      incentiveResult,
    ] = await Promise.all([
      getLicenseeTerritoryInfo({ tenantId: params.tenantId }),
      getLicenseeSalesKpis({ tenantId: params.tenantId, period: params.period }),
      getLicenseeFinancialKpis({ tenantId: params.tenantId }),
      getLicenseeQualityKpis({ tenantId: params.tenantId }),
      getLicenseeCamps({ tenantId: params.tenantId, status: 'active', limit: 5 }),
      getLicenseeCamps({ tenantId: params.tenantId, status: 'upcoming', limit: 5 }),
      getLicenseeStaffSummary({ tenantId: params.tenantId }),
      getLicenseeTasksAndAlerts({ tenantId: params.tenantId }),
      getLicenseeEmpowerUProgress({ userId: params.userId, tenantId: params.tenantId }),
      getLicenseeIncentiveOverview({ tenantId: params.tenantId }),
    ])

    // Return aggregated data with defaults for any failed fetches
    return {
      data: {
        territory: territoryResult.data,
        sales_kpis: salesResult.data || {
          total_gross_revenue: 0,
          revenue_delta_percent: null,
          sessions_held: 0,
          sessions_delta: null,
          avg_enrollment_per_session: 0,
          enrollment_delta_percent: null,
          total_registrations: 0,
          upsell_revenue: 0,
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
        },
        financial_kpis: financialResult.data || {
          total_royalty_due: 0,
          total_royalty_paid: 0,
          royalty_compliance_rate: 100,
          sessions_needing_closeout: 0,
          average_revenue_per_camper: 0,
          arpc_delta_percent: null,
        },
        quality_kpis: qualityResult.data || {
          avg_csat_score: null,
          csat_delta: null,
          complaint_ratio: 0,
          curriculum_adherence_score: 100,
          sessions_with_full_curriculum: 0,
          total_sessions_measured: 0,
          warnings: [],
        },
        active_camps: activeCampsResult.data || [],
        upcoming_camps: upcomingCampsResult.data || [],
        staff_summary: staffResult.data || {
          directors: { count: 0, active_this_season: 0 },
          coaches: { count: 0, active_this_season: 0 },
          cits: { count: 0, active_this_season: 0 },
          total_staff: 0,
        },
        tasks_alerts: tasksResult.data || {
          cit_applications_pending: 0,
          sessions_needing_closeout: 0,
          incentives_to_finalize: 0,
          contributions_pending_review: 0,
          jobs_open: 0,
          low_csat_camps: 0,
          total_alerts: 0,
        },
        empoweru_progress: empoweruResult.data || {
          business_portal: {
            completed_modules: 0,
            total_modules: 0,
            percentage: 0,
            next_module: null,
            gated_features: [],
          },
          operational_portal: {
            completed_modules: 0,
            total_modules: 0,
            percentage: 0,
          },
        },
        incentive_overview: incentiveResult.data || {
          total_paid_this_season: 0,
          total_pending: 0,
          total_finalized: 0,
          staff_with_compensation: 0,
          avg_compensation_per_session: 0,
        },
      },
      error: null,
    }
  } catch (error) {
    console.error('[LicenseeDashboard] Failed to get dashboard data:', error)
    return { data: null, error: error as Error }
  }
}
