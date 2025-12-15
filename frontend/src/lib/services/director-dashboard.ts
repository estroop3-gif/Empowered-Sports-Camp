/**
 * Director Dashboard Service
 *
 * Service functions for the Camp Director Dashboard.
 * Provides aggregated data for today's camps, upcoming camps,
 * EmpowerU progress, and incentive snapshots.
 */

import prisma from '@/lib/db/client'
import { PortalType, EmpowerUProgressStatus } from '@/generated/prisma'

// =============================================================================
// Types
// =============================================================================

export interface DirectorTodayCamp {
  id: string
  camp_id: string
  camp_name: string
  location_name: string | null
  location_city: string | null
  location_state: string | null
  day_number: number
  total_days: number
  date: string
  start_time: string | null
  end_time: string | null
  status: 'not_started' | 'in_progress' | 'finished'
  stats: {
    registered: number
    checked_in: number
    checked_out: number
    on_site: number
    not_arrived: number
    absent: number
  }
  has_recap: boolean
  recap_complete: boolean
}

export interface DirectorUpcomingCamp {
  id: string
  name: string
  slug: string
  start_date: string
  end_date: string
  start_time: string | null
  end_time: string | null
  location_name: string | null
  location_city: string | null
  capacity: number
  registered_count: number
  status: string
  days_until_start: number
}

export interface DirectorEmpowerUProgress {
  portal_type: PortalType
  total_modules: number
  completed_modules: number
  in_progress_modules: number
  percent_complete: number
  required_completed: boolean
  locked_features: string[]
  next_module?: {
    id: string
    slug: string
    title: string
    estimated_minutes: number
  }
}

export interface DirectorIncentiveSnapshot {
  total_sessions: number
  total_compensation: number
  pending_compensation: number
  finalized_compensation: number
  avg_csat_score: number | null
  avg_enrollment: number | null
  current_camp_pending: boolean
  camps: {
    camp_id: string
    camp_name: string
    camp_dates: string
    plan_name: string
    fixed_stipend: number
    variable_bonus: number
    total: number
    is_finalized: boolean
  }[]
}

export interface DirectorDashboardData {
  user: {
    id: string
    name: string
    email: string
  }
  today_camps: DirectorTodayCamp[]
  upcoming_camps: DirectorUpcomingCamp[]
  empoweru_progress: DirectorEmpowerUProgress
  incentive_snapshot: DirectorIncentiveSnapshot
  quick_actions: {
    has_active_camp: boolean
    active_camp_id: string | null
    active_camp_day_id: string | null
    needs_recap: boolean
    needs_grouping: boolean
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function decimalToNumber(val: any): number | null {
  if (val === null || val === undefined) return null
  return Number(val)
}

// =============================================================================
// Main Service Functions
// =============================================================================

/**
 * Get today's camps for a director
 */
export async function getDirectorTodayCamps(params: {
  userId: string
  tenantId?: string
}): Promise<{ data: DirectorTodayCamp[] | null; error: Error | null }> {
  try {
    const { userId, tenantId } = params
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    // Get camps where this director is assigned
    // For now, get all camps running today - in production, filter by staff_assignments
    const camps = await prisma.camp.findMany({
      where: {
        startDate: { lte: today },
        endDate: { gte: today },
        ...(tenantId ? { tenantId } : {}),
      },
      include: {
        location: true,
        campDays: {
          where: {
            date: {
              gte: today,
              lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
            },
          },
          include: {
            attendance: true,
          },
        },
        registrations: {
          where: { status: { in: ['confirmed', 'pending'] } },
        },
      },
    })

    const todayCamps: DirectorTodayCamp[] = camps.map((camp) => {
      const campDay = camp.campDays[0]
      const totalDays = Math.ceil(
        (camp.endDate.getTime() - camp.startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1

      const registeredCount = camp.registrations.length

      let checkedIn = 0
      let checkedOut = 0
      let absent = 0

      if (campDay) {
        checkedIn = campDay.attendance.filter((a) => a.checkInTime && !a.checkOutTime).length
        checkedOut = campDay.attendance.filter((a) => a.checkOutTime).length
        absent = campDay.attendance.filter((a) => a.status === 'absent').length
      }

      const onSite = checkedIn
      const notArrived = registeredCount - checkedIn - checkedOut - absent

      return {
        id: campDay?.id || `pending-${camp.id}`,
        camp_id: camp.id,
        camp_name: camp.name,
        location_name: camp.location?.name || null,
        location_city: camp.location?.city || null,
        location_state: camp.location?.state || null,
        day_number: campDay?.dayNumber || 1,
        total_days: totalDays,
        date: todayStr,
        start_time: camp.startTime?.toISOString().slice(11, 16) || null,
        end_time: camp.endTime?.toISOString().slice(11, 16) || null,
        status: campDay?.status as 'not_started' | 'in_progress' | 'finished' || 'not_started',
        stats: {
          registered: registeredCount,
          checked_in: checkedIn + checkedOut, // Total who arrived
          checked_out: checkedOut,
          on_site: onSite,
          not_arrived: Math.max(0, notArrived),
          absent,
        },
        has_recap: !!campDay?.completedAt,
        recap_complete: !!campDay?.completedAt && campDay.status === 'finished',
      }
    })

    return { data: todayCamps, error: null }
  } catch (error) {
    console.error('[DirectorDashboard] Failed to get today camps:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get upcoming camps for a director
 */
export async function getDirectorUpcomingCamps(params: {
  userId: string
  tenantId?: string
  limit?: number
}): Promise<{ data: DirectorUpcomingCamp[] | null; error: Error | null }> {
  try {
    const { tenantId, limit = 10 } = params
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const camps = await prisma.camp.findMany({
      where: {
        endDate: { gte: today },
        ...(tenantId ? { tenantId } : {}),
      },
      include: {
        location: true,
        registrations: {
          where: { status: { in: ['confirmed', 'pending'] } },
        },
      },
      orderBy: { startDate: 'asc' },
      take: limit,
    })

    const upcomingCamps: DirectorUpcomingCamp[] = camps.map((camp) => {
      const daysUntilStart = Math.ceil(
        (camp.startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )

      return {
        id: camp.id,
        name: camp.name,
        slug: camp.slug,
        start_date: camp.startDate.toISOString().split('T')[0],
        end_date: camp.endDate.toISOString().split('T')[0],
        start_time: camp.startTime?.toISOString().slice(11, 16) || null,
        end_time: camp.endTime?.toISOString().slice(11, 16) || null,
        location_name: camp.location?.name || null,
        location_city: camp.location?.city || null,
        capacity: camp.capacity || 60,
        registered_count: camp.registrations.length,
        status: camp.status,
        days_until_start: Math.max(0, daysUntilStart),
      }
    })

    return { data: upcomingCamps, error: null }
  } catch (error) {
    console.error('[DirectorDashboard] Failed to get upcoming camps:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get EmpowerU progress for a director (Operational Execution Portal)
 */
export async function getDirectorEmpowerUProgress(params: {
  userId: string
  tenantId?: string
}): Promise<{ data: DirectorEmpowerUProgress | null; error: Error | null }> {
  try {
    const { userId, tenantId } = params
    const portalType = PortalType.OPERATIONAL

    // Get all modules for the Operational portal
    const modules = await prisma.empowerUModule.findMany({
      where: {
        portalType,
        isPublished: true,
        OR: [
          { tenantId: null },
          ...(tenantId ? [{ tenantId }] : []),
        ],
      },
      orderBy: [{ level: 'asc' }, { createdAt: 'asc' }],
    })

    // Get user's progress
    const progress = await prisma.empowerUModuleProgress.findMany({
      where: {
        userId,
        moduleId: { in: modules.map((m) => m.id) },
      },
    })

    const progressMap = new Map(progress.map((p) => [p.moduleId, p]))

    const totalModules = modules.length
    const completedModules = progress.filter(
      (p) => p.status === EmpowerUProgressStatus.COMPLETED && p.quizPassed
    ).length
    const inProgressModules = progress.filter(
      (p) => p.status === EmpowerUProgressStatus.IN_PROGRESS
    ).length

    const percentComplete = totalModules > 0
      ? Math.round((completedModules / totalModules) * 100)
      : 0

    // Find next module to work on
    const nextModule = modules.find((m) => {
      const prog = progressMap.get(m.id)
      return !prog || prog.status !== EmpowerUProgressStatus.COMPLETED
    })

    // Check for locked features
    const userUnlocks = await prisma.empowerUUserUnlock.findMany({
      where: {
        userId,
        ...(tenantId ? { tenantId } : {}),
      },
    })

    const unlockedFeatures = new Set(userUnlocks.map((u) => u.featureCode))

    // Define expected features for directors
    const expectedFeatures = ['GROUPING_TOOL', 'CAMP_DAY_FLOW', 'COMMUNICATIONS', 'DAILY_RECAP']
    const lockedFeatures = expectedFeatures.filter((f) => !unlockedFeatures.has(f))

    return {
      data: {
        portal_type: portalType,
        total_modules: totalModules,
        completed_modules: completedModules,
        in_progress_modules: inProgressModules,
        percent_complete: percentComplete,
        required_completed: completedModules >= Math.min(3, totalModules), // Assuming 3 required modules
        locked_features: lockedFeatures,
        next_module: nextModule
          ? {
              id: nextModule.id,
              slug: nextModule.slug,
              title: nextModule.title,
              estimated_minutes: nextModule.estimatedMinutes,
            }
          : undefined,
      },
      error: null,
    }
  } catch (error) {
    console.error('[DirectorDashboard] Failed to get EmpowerU progress:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get incentive snapshot for a director
 */
export async function getDirectorIncentiveSnapshot(params: {
  userId: string
  staffProfileId: string
  tenantId?: string
}): Promise<{ data: DirectorIncentiveSnapshot | null; error: Error | null }> {
  try {
    const { staffProfileId, tenantId } = params

    const sessions = await prisma.campSessionCompensation.findMany({
      where: {
        staffProfileId,
        ...(tenantId ? { tenantId } : {}),
      },
      include: {
        compensationPlan: true,
        camp: true,
      },
      orderBy: { camp: { startDate: 'desc' } },
    })

    const totalSessions = sessions.length
    let totalCompensation = 0
    let pendingCompensation = 0
    let finalizedCompensation = 0
    let currentCampPending = false

    const csatScores: number[] = []
    const enrollments: number[] = []

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const camps = sessions.map((s) => {
      const total = decimalToNumber(s.totalCompensation) || 0
      const fixed = (decimalToNumber(s.fixedStipendTotal) || 0)
      const variable = (decimalToNumber(s.totalVariableBonus) || 0)

      totalCompensation += total
      if (s.isFinalized) {
        finalizedCompensation += total
      } else {
        pendingCompensation += total
        // Check if this is a current camp
        if (s.camp.startDate <= today && s.camp.endDate >= today) {
          currentCampPending = true
        }
      }

      const csatScore = decimalToNumber(s.csatAvgScore)
      if (csatScore !== null) {
        csatScores.push(csatScore)
      }

      if (s.totalEnrolledCampers !== null) {
        enrollments.push(s.totalEnrolledCampers)
      }

      const startDate = s.camp.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const endDate = s.camp.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

      return {
        camp_id: s.campId,
        camp_name: s.camp.name,
        camp_dates: `${startDate} - ${endDate}`,
        plan_name: s.compensationPlan.name,
        fixed_stipend: fixed,
        variable_bonus: variable,
        total,
        is_finalized: s.isFinalized,
      }
    })

    const avgCsat = csatScores.length > 0
      ? csatScores.reduce((a, b) => a + b, 0) / csatScores.length
      : null

    const avgEnrollment = enrollments.length > 0
      ? enrollments.reduce((a, b) => a + b, 0) / enrollments.length
      : null

    return {
      data: {
        total_sessions: totalSessions,
        total_compensation: totalCompensation,
        pending_compensation: pendingCompensation,
        finalized_compensation: finalizedCompensation,
        avg_csat_score: avgCsat,
        avg_enrollment: avgEnrollment,
        current_camp_pending: currentCampPending,
        camps,
      },
      error: null,
    }
  } catch (error) {
    console.error('[DirectorDashboard] Failed to get incentive snapshot:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get full dashboard data for a director
 */
export async function getDirectorDashboardData(params: {
  userId: string
  staffProfileId: string
  tenantId?: string
}): Promise<{ data: DirectorDashboardData | null; error: Error | null }> {
  try {
    const { userId, staffProfileId, tenantId } = params

    // Get user info
    const profile = await prisma.profile.findUnique({
      where: { id: staffProfileId },
    })

    if (!profile) {
      return { data: null, error: new Error('Profile not found') }
    }

    // Fetch all data in parallel
    const [todayCampsResult, upcomingCampsResult, empoweruResult, incentiveResult] = await Promise.all([
      getDirectorTodayCamps({ userId, tenantId }),
      getDirectorUpcomingCamps({ userId, tenantId }),
      getDirectorEmpowerUProgress({ userId, tenantId }),
      getDirectorIncentiveSnapshot({ userId, staffProfileId, tenantId }),
    ])

    const todayCamps = todayCampsResult.data || []
    const upcomingCamps = upcomingCampsResult.data || []

    // Determine quick actions
    const activeCamp = todayCamps.find((c) => c.status === 'in_progress')
    const needsRecap = todayCamps.some(
      (c) => (c.status === 'in_progress' || c.status === 'finished') && !c.recap_complete
    )

    // Check if any upcoming camp needs grouping
    const needsGrouping = upcomingCamps.some(
      (c) => c.days_until_start <= 7 && c.registered_count > 0
    )

    return {
      data: {
        user: {
          id: profile.id,
          name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.email,
          email: profile.email,
        },
        today_camps: todayCamps,
        upcoming_camps: upcomingCamps,
        empoweru_progress: empoweruResult.data || {
          portal_type: PortalType.OPERATIONAL,
          total_modules: 0,
          completed_modules: 0,
          in_progress_modules: 0,
          percent_complete: 0,
          required_completed: false,
          locked_features: [],
        },
        incentive_snapshot: incentiveResult.data || {
          total_sessions: 0,
          total_compensation: 0,
          pending_compensation: 0,
          finalized_compensation: 0,
          avg_csat_score: null,
          avg_enrollment: null,
          current_camp_pending: false,
          camps: [],
        },
        quick_actions: {
          has_active_camp: !!activeCamp,
          active_camp_id: activeCamp?.camp_id || null,
          active_camp_day_id: activeCamp?.id || null,
          needs_recap: needsRecap,
          needs_grouping: needsGrouping,
        },
      },
      error: null,
    }
  } catch (error) {
    console.error('[DirectorDashboard] Failed to get dashboard data:', error)
    return { data: null, error: error as Error }
  }
}
