/**
 * Coach Dashboard Service
 *
 * Service functions for the Coach portal including:
 * - Dashboard overview (profile, camps, training progress, incentives)
 * - Camp assignments and schedules ("game-day hub" focus)
 * - Group/athlete responsibility data
 * - Curriculum and drills for assigned stations
 * - EmpowerU training progress (Skill Station portal)
 * - Compensation and incentive tracking
 *
 * Designed as a focused "game-day hub" answering:
 * - What camps am I coaching?
 * - What's my schedule today?
 * - Which athletes/groups am I responsible for?
 * - What drills/curriculum am I running?
 * - Where am I on training and incentives?
 */

import { prisma } from '@/lib/db/client'
import { coachDashboardLogger as logger } from '@/lib/logger'
import { cache, cacheTTL, tenantCacheKey } from '@/lib/cache'
import type { EmpowerUProgressStatus, CampSessionDay, CampSessionScheduleBlock, CampGroup } from '@/generated/prisma'

// =============================================================================
// Types
// =============================================================================

export interface CoachProfileInfo {
  id: string
  first_name: string
  last_name: string
  email: string
  avatar_url: string | null
  tenant_id: string | null
  tenant_name: string | null
}

export interface CoachCampSummary {
  id: string
  name: string
  slug: string
  start_date: string
  end_date: string
  start_time: string | null
  end_time: string | null
  location_name: string | null
  location_city: string | null
  location_state: string | null
  licensee_name: string
  role: string
  station_name: string | null
  call_time: string | null
  shift_end_time: string | null
  is_lead: boolean
  status: 'upcoming' | 'in_progress' | 'completed'
  days_until_start: number | null
  registered_count: number
  capacity: number
  day_number: number | null
  total_days: number
}

export interface CoachTodaySchedule {
  camp_id: string
  camp_name: string
  camp_day_id: string
  day_number: number
  total_days: number
  date: string
  location_name: string | null
  location_address: string | null
  call_time: string | null
  shift_end_time: string | null
  camp_start_time: string | null
  camp_end_time: string | null
  station_name: string | null
  role: string
  notes: string | null
  schedule_blocks: CoachScheduleBlock[]
  groups: CoachGroupInfo[]
  quick_stats: {
    total_campers: number
    checked_in: number
    on_site: number
  }
}

export interface CoachScheduleBlock {
  id: string
  start_time: string
  end_time: string
  title: string
  block_type: string
  location_notes: string | null
  description: string | null
  curriculum_block_id: string | null
  is_my_station: boolean
}

export interface CoachGroupInfo {
  id: string
  name: string
  group_number: number
  team_color: string | null
  camper_count: number
  min_grade: number | null
  max_grade: number | null
}

export interface CoachEmpowerUProgress {
  total_modules: number
  completed_modules: number
  in_progress_modules: number
  completion_percentage: number
  has_completed_core: boolean
  next_module: {
    module_id: string
    title: string
    slug: string
    estimated_minutes: number
  } | null
  modules: {
    module_id: string
    title: string
    slug: string
    status: EmpowerUProgressStatus | 'NOT_STARTED'
    progress_percent: number
    is_required: boolean
  }[]
}

export interface CoachIncentiveSnapshot {
  total_sessions: number
  total_compensation: number
  pending_compensation: number
  finalized_compensation: number
  current_camp: {
    camp_id: string
    camp_name: string
    plan_name: string
    fixed_stipend: number
    variable_bonus: number
    total: number
    is_finalized: boolean
  } | null
  recent_camps: {
    camp_id: string
    camp_name: string
    camp_dates: string
    plan_name: string
    total: number
    is_finalized: boolean
  }[]
}

export interface CoachCurriculumBlock {
  id: string
  title: string
  description: string | null
  block_type: string // BlockCategory: drill, warmup, cooldown, etc.
  duration_minutes: number
  sport: string
  intensity: string
  equipment_needed: string | null
  setup_notes: string | null
  coaching_points: string[]
}

export interface CoachMessageSummary {
  unread_count: number
  recent_messages: {
    id: string
    subject: string
    from_name: string
    sent_at: string
    is_read: boolean
    message_type: string
  }[]
}

export interface CoachDashboardOverview {
  profile: CoachProfileInfo
  todays_camps: CoachTodaySchedule[]
  upcoming_camps: CoachCampSummary[]
  empoweru_progress: CoachEmpowerUProgress
  incentive_snapshot: CoachIncentiveSnapshot
  messages: CoachMessageSummary
  quick_stats: {
    camps_assigned: number
    camps_completed: number
    modules_completed: number
    active_camps_today: number
  }
  quick_actions: {
    has_active_camp: boolean
    active_camp_id: string | null
    needs_training: boolean
    has_unread_messages: boolean
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatTimeString(date: Date | null): string | null {
  if (!date) return null
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function getCampStatus(startDate: Date, endDate: Date): 'upcoming' | 'in_progress' | 'completed' {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())

  if (today < start) return 'upcoming'
  if (today > end) return 'completed'
  return 'in_progress'
}

function getDaysUntilStart(startDate: Date): number | null {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())

  if (today >= start) return null
  const diffTime = start.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

function getTotalDays(startDate: Date, endDate: Date): number {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

function getCurrentDayNumber(startDate: Date, endDate: Date): number | null {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())

  if (today < start || today > end) return null
  return Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

function decimalToNumber(val: any): number | null {
  if (val === null || val === undefined) return null
  const num = Number(val)
  return isNaN(num) ? null : num
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Get comprehensive dashboard overview for a coach
 */
export async function getCoachDashboardOverview(params: {
  userId: string
}): Promise<{ data: CoachDashboardOverview | null; error: Error | null }> {
  try {
    const { userId } = params

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          where: { role: 'coach' },
          include: { tenant: true },
          take: 1,
        },
      },
    })

    if (!profile) {
      return { data: null, error: new Error('Profile not found') }
    }

    const tenantId = profile.userRoles[0]?.tenantId || null
    const tenantName = profile.userRoles[0]?.tenant?.name || null

    // Fetch all data in parallel
    const [
      campAssignmentsResult,
      empoweruResult,
      incentiveResult,
      messagesResult,
    ] = await Promise.all([
      getCoachCampAssignments({ userId }),
      getCoachEmpowerUProgress({ userId, tenantId }),
      getCoachIncentiveSnapshot({ userId, tenantId }),
      getCoachMessages({ userId }),
    ])

    const campAssignments = campAssignmentsResult.data || []

    // Process today's camps and upcoming camps
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // First pass: collect all camp day IDs that need attendance data
    const campDayIds: string[] = []
    const campDayMap = new Map<string, { assignment: typeof campAssignments[0]; campDay: CampSessionDay }>()

    for (const assignment of campAssignments) {
      const status = getCampStatus(assignment.camp.startDate, assignment.camp.endDate)
      if (status === 'completed') continue

      const todayCampDay = assignment.camp.campSessionDays?.find(
        (day: CampSessionDay) => day.actualDate && day.actualDate.toISOString().split('T')[0] === todayStr
      )

      if (todayCampDay) {
        campDayIds.push(todayCampDay.id)
        campDayMap.set(todayCampDay.id, { assignment, campDay: todayCampDay })
      }
    }

    // Batch query: get attendance stats for all camp days in one query
    const attendanceStats = campDayIds.length > 0
      ? await prisma.campAttendance.groupBy({
          by: ['campDayId'],
          where: {
            campDayId: { in: campDayIds },
            checkInTime: { not: null },
          },
          _count: { id: true },
        })
      : []

    // Get on-site counts (checked in but not checked out)
    const onSiteStats = campDayIds.length > 0
      ? await prisma.campAttendance.groupBy({
          by: ['campDayId'],
          where: {
            campDayId: { in: campDayIds },
            checkInTime: { not: null },
            checkOutTime: null,
          },
          _count: { id: true },
        })
      : []

    // Create lookup maps for O(1) access
    const checkedInMap = new Map(attendanceStats.map(s => [s.campDayId, s._count.id]))
    const onSiteMap = new Map(onSiteStats.map(s => [s.campDayId, s._count.id]))

    const todaysCamps: CoachTodaySchedule[] = []
    const upcomingCamps: CoachCampSummary[] = []
    let completedCampCount = 0

    for (const assignment of campAssignments) {
      const status = getCampStatus(assignment.camp.startDate, assignment.camp.endDate)

      if (status === 'completed') {
        completedCampCount++
        continue
      }

      // Check if today is a camp day
      const todayCampDay = assignment.camp.campSessionDays?.find(
        (day: CampSessionDay) => day.actualDate && day.actualDate.toISOString().split('T')[0] === todayStr
      )

      if (todayCampDay) {
        // Use pre-fetched attendance stats (O(1) lookup)
        const checkedIn = checkedInMap.get(todayCampDay.id) || 0
        const onSite = onSiteMap.get(todayCampDay.id) || 0

        todaysCamps.push({
          camp_id: assignment.camp.id,
          camp_name: assignment.camp.name,
          camp_day_id: todayCampDay.id,
          day_number: todayCampDay.dayNumber,
          total_days: getTotalDays(assignment.camp.startDate, assignment.camp.endDate),
          date: todayCampDay.actualDate?.toISOString() || '',
          location_name: assignment.camp.location?.name || null,
          location_address: assignment.camp.location?.address || null,
          call_time: assignment.callTime ? formatTimeString(assignment.callTime) : null,
          shift_end_time: assignment.endTime ? formatTimeString(assignment.endTime) : null,
          camp_start_time: assignment.camp.startTime ? formatTimeString(assignment.camp.startTime) : null,
          camp_end_time: assignment.camp.endTime ? formatTimeString(assignment.camp.endTime) : null,
          station_name: assignment.stationName,
          role: assignment.role,
          notes: assignment.notes,
          schedule_blocks: (todayCampDay.scheduleBlocks || []).map((block: CampSessionScheduleBlock) => ({
            id: block.id,
            start_time: formatTimeString(block.startTime) || '',
            end_time: formatTimeString(block.endTime) || '',
            title: block.label,
            block_type: block.blockType,
            location_notes: block.location,
            description: block.description,
            curriculum_block_id: block.curriculumBlockId,
            is_my_station: assignment.stationName
              ? block.label.toLowerCase().includes(assignment.stationName.toLowerCase())
              : false,
          })),
          groups: (assignment.camp.campGroups || []).map((g: CampGroup) => ({
            id: g.id,
            name: g.groupName || `Group ${g.groupNumber}`,
            group_number: g.groupNumber,
            team_color: g.groupColor,
            camper_count: g.camperCount,
            min_grade: g.minGrade,
            max_grade: g.maxGrade,
          })),
          quick_stats: {
            total_campers: assignment.camp.registrations?.length || 0,
            checked_in: checkedIn,
            on_site: onSite,
          },
        })
      }

      // Add to upcoming if not completed
      upcomingCamps.push({
        id: assignment.camp.id,
        name: assignment.camp.name,
        slug: assignment.camp.slug,
        start_date: assignment.camp.startDate.toISOString(),
        end_date: assignment.camp.endDate.toISOString(),
        start_time: assignment.camp.startTime ? formatTimeString(assignment.camp.startTime) : null,
        end_time: assignment.camp.endTime ? formatTimeString(assignment.camp.endTime) : null,
        location_name: assignment.camp.location?.name || null,
        location_city: assignment.camp.location?.city || null,
        location_state: assignment.camp.location?.state || null,
        licensee_name: assignment.camp.tenant?.name || 'Unknown',
        role: assignment.role,
        station_name: assignment.stationName,
        call_time: assignment.callTime ? formatTimeString(assignment.callTime) : null,
        shift_end_time: assignment.endTime ? formatTimeString(assignment.endTime) : null,
        is_lead: assignment.isLead,
        status,
        days_until_start: getDaysUntilStart(assignment.camp.startDate),
        registered_count: assignment.camp.registrations?.length || 0,
        capacity: assignment.camp.capacity || 60,
        day_number: getCurrentDayNumber(assignment.camp.startDate, assignment.camp.endDate),
        total_days: getTotalDays(assignment.camp.startDate, assignment.camp.endDate),
      })
    }

    // Sort upcoming camps by start date
    upcomingCamps.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

    const empoweruProgress = empoweruResult.data || {
      total_modules: 0,
      completed_modules: 0,
      in_progress_modules: 0,
      completion_percentage: 0,
      has_completed_core: false,
      next_module: null,
      modules: [],
    }

    const incentiveSnapshot = incentiveResult.data || {
      total_sessions: 0,
      total_compensation: 0,
      pending_compensation: 0,
      finalized_compensation: 0,
      current_camp: null,
      recent_camps: [],
    }

    const messages = messagesResult.data || {
      unread_count: 0,
      recent_messages: [],
    }

    return {
      data: {
        profile: {
          id: profile.id,
          first_name: profile.firstName || '',
          last_name: profile.lastName || '',
          email: profile.email,
          avatar_url: profile.avatarUrl,
          tenant_id: tenantId,
          tenant_name: tenantName,
        },
        todays_camps: todaysCamps,
        upcoming_camps: upcomingCamps,
        empoweru_progress: empoweruProgress,
        incentive_snapshot: incentiveSnapshot,
        messages,
        quick_stats: {
          camps_assigned: campAssignments.length,
          camps_completed: completedCampCount,
          modules_completed: empoweruProgress.completed_modules,
          active_camps_today: todaysCamps.length,
        },
        quick_actions: {
          has_active_camp: todaysCamps.length > 0,
          active_camp_id: todaysCamps[0]?.camp_id || null,
          needs_training: !empoweruProgress.has_completed_core,
          has_unread_messages: messages.unread_count > 0,
        },
      },
      error: null,
    }
  } catch (error) {
    logger.error('Failed to get overview', { userId: params.userId }, error as Error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get all camp assignments for a coach
 */
async function getCoachCampAssignments(params: {
  userId: string
}): Promise<{ data: any[] | null; error: Error | null }> {
  try {
    const { userId } = params

    const assignments = await prisma.campStaffAssignment.findMany({
      where: {
        userId,
        role: 'coach',
      },
      include: {
        camp: {
          include: {
            location: true,
            tenant: true,
            campSessionDays: {
              include: {
                scheduleBlocks: {
                  orderBy: { startTime: 'asc' },
                },
              },
            },
            campGroups: true,
            registrations: {
              where: { status: { in: ['confirmed', 'pending'] } },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { camp: { startDate: 'asc' } },
    })

    return { data: assignments, error: null }
  } catch (error) {
    logger.error('Failed to get camp assignments', { userId: params.userId }, error as Error)
    return { data: null, error: error as Error }
  }
}

/**
 * List all camps where coach is assigned (with pagination)
 */
export async function listCoachCamps(params: {
  userId: string
  status?: 'all' | 'upcoming' | 'in_progress' | 'completed'
  page?: number
  limit?: number
}): Promise<{
  data: {
    camps: CoachCampSummary[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  } | null
  error: Error | null
}> {
  try {
    const { userId, status = 'all', page = 1, limit = 20 } = params
    const skip = (page - 1) * limit

    const campAssignments = await prisma.campStaffAssignment.findMany({
      where: {
        userId,
        role: 'coach',
      },
      include: {
        camp: {
          include: {
            location: true,
            tenant: true,
            registrations: {
              where: { status: { in: ['confirmed', 'pending'] } },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { camp: { startDate: 'asc' } },
    })

    // Filter by status first
    const filteredAssignments = campAssignments.filter((assignment) => {
      if (status === 'all') return true
      const campStatus = getCampStatus(assignment.camp.startDate, assignment.camp.endDate)
      return campStatus === status
    })

    const total = filteredAssignments.length
    const paginatedAssignments = filteredAssignments.slice(skip, skip + limit)

    const camps: CoachCampSummary[] = paginatedAssignments.map((assignment) => {
      const camp = assignment.camp
      const campStatus = getCampStatus(camp.startDate, camp.endDate)

      return {
        id: camp.id,
        name: camp.name,
        slug: camp.slug,
        start_date: camp.startDate.toISOString(),
        end_date: camp.endDate.toISOString(),
        start_time: camp.startTime ? formatTimeString(camp.startTime) : null,
        end_time: camp.endTime ? formatTimeString(camp.endTime) : null,
        location_name: camp.location?.name || null,
        location_city: camp.location?.city || null,
        location_state: camp.location?.state || null,
        licensee_name: camp.tenant?.name || 'Unknown',
        role: assignment.role,
        station_name: assignment.stationName,
        call_time: assignment.callTime ? formatTimeString(assignment.callTime) : null,
        shift_end_time: assignment.endTime ? formatTimeString(assignment.endTime) : null,
        is_lead: assignment.isLead,
        status: campStatus,
        days_until_start: getDaysUntilStart(camp.startDate),
        registered_count: camp.registrations?.length || 0,
        capacity: camp.capacity || 60,
        day_number: getCurrentDayNumber(camp.startDate, camp.endDate),
        total_days: getTotalDays(camp.startDate, camp.endDate),
      }
    })

    return {
      data: {
        camps,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      error: null,
    }
  } catch (error) {
    logger.error('Failed to list camps', { userId: params.userId }, error as Error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get today's schedule for a coach
 */
export async function getCoachTodaySchedule(params: {
  userId: string
}): Promise<{ data: CoachTodaySchedule[] | null; error: Error | null }> {
  try {
    const { userId } = params
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    const campAssignments = await prisma.campStaffAssignment.findMany({
      where: {
        userId,
        role: 'coach',
      },
      include: {
        camp: {
          include: {
            location: true,
            campSessionDays: {
              where: {
                actualDate: {
                  gte: new Date(todayStr),
                  lt: new Date(new Date(todayStr).getTime() + 24 * 60 * 60 * 1000),
                },
              },
              include: {
                scheduleBlocks: {
                  orderBy: { startTime: 'asc' },
                },
              },
            },
            campDays: {
              where: {
                date: {
                  gte: new Date(todayStr),
                  lt: new Date(new Date(todayStr).getTime() + 24 * 60 * 60 * 1000),
                },
              },
              include: {
                attendance: true,
              },
            },
            campGroups: true,
            registrations: {
              where: { status: { in: ['confirmed', 'pending'] } },
              select: { id: true },
            },
          },
        },
      },
    })

    const todaysSchedules: CoachTodaySchedule[] = []

    for (const assignment of campAssignments) {
      const camp = assignment.camp
      const todayCampSessionDay = camp.campSessionDays[0]
      const todayCampDay = camp.campDays[0]

      if (todayCampSessionDay) {
        const checkedIn = todayCampDay?.attendance.filter((a) => a.checkInTime).length || 0
        const onSite = todayCampDay?.attendance.filter(
          (a) => a.checkInTime && !a.checkOutTime
        ).length || 0

        todaysSchedules.push({
          camp_id: camp.id,
          camp_name: camp.name,
          camp_day_id: todayCampSessionDay.id,
          day_number: todayCampSessionDay.dayNumber,
          total_days: getTotalDays(camp.startDate, camp.endDate),
          date: todayCampSessionDay.actualDate?.toISOString() || '',
          location_name: camp.location?.name || null,
          location_address: camp.location?.address || null,
          call_time: assignment.callTime ? formatTimeString(assignment.callTime) : null,
          shift_end_time: assignment.endTime ? formatTimeString(assignment.endTime) : null,
          camp_start_time: camp.startTime ? formatTimeString(camp.startTime) : null,
          camp_end_time: camp.endTime ? formatTimeString(camp.endTime) : null,
          station_name: assignment.stationName,
          role: assignment.role,
          notes: assignment.notes,
          schedule_blocks: todayCampSessionDay.scheduleBlocks.map((block) => ({
            id: block.id,
            start_time: formatTimeString(block.startTime) || '',
            end_time: formatTimeString(block.endTime) || '',
            title: block.label,
            block_type: block.blockType,
            location_notes: block.location,
            description: block.description,
            curriculum_block_id: block.curriculumBlockId,
            is_my_station: assignment.stationName
              ? block.label.toLowerCase().includes(assignment.stationName.toLowerCase())
              : false,
          })),
          groups: camp.campGroups.map((g) => ({
            id: g.id,
            name: g.groupName || `Group ${g.groupNumber}`,
            group_number: g.groupNumber,
            team_color: g.groupColor,
            camper_count: g.camperCount,
            min_grade: g.minGrade,
            max_grade: g.maxGrade,
          })),
          quick_stats: {
            total_campers: camp.registrations?.length || 0,
            checked_in: checkedIn,
            on_site: onSite,
          },
        })
      }
    }

    return { data: todaysSchedules, error: null }
  } catch (error) {
    logger.error('Failed to get today schedule', { userId: params.userId }, error as Error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get EmpowerU progress for a coach (Skill Station portal - core training)
 */
export async function getCoachEmpowerUProgress(params: {
  userId: string
  tenantId?: string | null
}): Promise<{ data: CoachEmpowerUProgress | null; error: Error | null }> {
  try {
    const { userId, tenantId } = params

    // Coaches use SKILL_STATION portal (core training)
    // Cache modules as they rarely change (15 min TTL)
    const cacheKey = tenantCacheKey(tenantId || 'global', 'empoweru-modules-skill-station')
    const modules = await cache.getOrSet(
      cacheKey,
      async () => {
        return prisma.empowerUModule.findMany({
          where: {
            portalType: 'SKILL_STATION',
            isPublished: true,
            OR: [
              { tenantId: null },
              ...(tenantId ? [{ tenantId }] : []),
            ],
          },
          orderBy: [{ level: 'asc' }, { createdAt: 'asc' }],
        })
      },
      cacheTTL.long
    )

    const moduleIds = modules.map((m) => m.id)
    const userProgress = await prisma.empowerUModuleProgress.findMany({
      where: {
        userId,
        moduleId: { in: moduleIds },
      },
    })

    const progressMap = new Map(userProgress.map((p) => [p.moduleId, p]))
    const completedModules = userProgress.filter((p) => p.status === 'COMPLETED').length
    const inProgressModules = userProgress.filter((p) => p.status === 'IN_PROGRESS').length

    // Find next module to work on
    const nextModule = modules.find((m) => {
      const prog = progressMap.get(m.id)
      return !prog || prog.status !== 'COMPLETED'
    })

    // Core training is considered complete if at least 3 modules done or all available
    const requiredCount = Math.min(3, modules.length)
    const hasCompletedCore = completedModules >= requiredCount

    return {
      data: {
        total_modules: modules.length,
        completed_modules: completedModules,
        in_progress_modules: inProgressModules,
        completion_percentage:
          modules.length > 0
            ? Math.round((completedModules / modules.length) * 100)
            : 0,
        has_completed_core: hasCompletedCore,
        next_module: nextModule
          ? {
              module_id: nextModule.id,
              title: nextModule.title,
              slug: nextModule.slug,
              estimated_minutes: nextModule.estimatedMinutes,
            }
          : null,
        modules: modules.map((mod) => {
          const progress = progressMap.get(mod.id)
          const status = (progress?.status as EmpowerUProgressStatus) || 'NOT_STARTED'
          // Calculate progress percent based on status since EmpowerUModuleProgress doesn't have progressPercent
          const progressPercent = status === 'COMPLETED' ? 100 : status === 'IN_PROGRESS' ? 50 : 0
          return {
            module_id: mod.id,
            title: mod.title,
            slug: mod.slug,
            status,
            progress_percent: progressPercent,
            is_required: mod.level <= 1, // Level 1 modules are required
          }
        }),
      },
      error: null,
    }
  } catch (error) {
    logger.error('Failed to get EmpowerU progress', { userId: params.userId, tenantId: params.tenantId || undefined }, error as Error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get incentive/compensation snapshot for a coach
 */
export async function getCoachIncentiveSnapshot(params: {
  userId: string
  tenantId?: string | null
}): Promise<{ data: CoachIncentiveSnapshot | null; error: Error | null }> {
  try {
    const { userId, tenantId } = params

    const sessions = await prisma.campSessionCompensation.findMany({
      where: {
        staffProfileId: userId,
        ...(tenantId ? { tenantId } : {}),
      },
      include: {
        compensationPlan: true,
        camp: true,
      },
      orderBy: { camp: { startDate: 'desc' } },
    })

    let totalCompensation = 0
    let pendingCompensation = 0
    let finalizedCompensation = 0
    let currentCamp: CoachIncentiveSnapshot['current_camp'] = null

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const recentCamps: CoachIncentiveSnapshot['recent_camps'] = []

    for (const session of sessions) {
      const total = decimalToNumber(session.totalCompensation) || 0
      const fixed = decimalToNumber(session.fixedStipendTotal) || 0
      const variable = decimalToNumber(session.totalVariableBonus) || 0

      totalCompensation += total
      if (session.isFinalized) {
        finalizedCompensation += total
      } else {
        pendingCompensation += total
      }

      // Check if this is the current active camp
      const isCurrentCamp =
        session.camp.startDate <= today && session.camp.endDate >= today

      if (isCurrentCamp && !currentCamp) {
        currentCamp = {
          camp_id: session.campId,
          camp_name: session.camp.name,
          plan_name: session.compensationPlan.name,
          fixed_stipend: fixed,
          variable_bonus: variable,
          total,
          is_finalized: session.isFinalized,
        }
      }

      const startDate = session.camp.startDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
      const endDate = session.camp.endDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })

      recentCamps.push({
        camp_id: session.campId,
        camp_name: session.camp.name,
        camp_dates: `${startDate} - ${endDate}`,
        plan_name: session.compensationPlan.name,
        total,
        is_finalized: session.isFinalized,
      })
    }

    return {
      data: {
        total_sessions: sessions.length,
        total_compensation: totalCompensation,
        pending_compensation: pendingCompensation,
        finalized_compensation: finalizedCompensation,
        current_camp: currentCamp,
        recent_camps: recentCamps.slice(0, 5),
      },
      error: null,
    }
  } catch (error) {
    logger.error('Failed to get incentive snapshot', { userId: params.userId }, error as Error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get messages/notifications for a coach
 */
export async function getCoachMessages(params: {
  userId: string
}): Promise<{ data: CoachMessageSummary | null; error: Error | null }> {
  try {
    const { userId } = params

    // Get notifications for this user
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    const unreadCount = notifications.filter((n) => !n.isRead).length

    return {
      data: {
        unread_count: unreadCount,
        recent_messages: notifications.map((n) => ({
          id: n.id,
          subject: n.title,
          from_name: 'System',
          sent_at: n.createdAt.toISOString(),
          is_read: n.isRead,
          message_type: n.type,
        })),
      },
      error: null,
    }
  } catch (error) {
    logger.error('Failed to get messages', { userId: params.userId }, error as Error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get a specific camp's detail for a coach
 */
export async function getCoachCampDetail(params: {
  userId: string
  campId: string
}): Promise<{
  data: {
    camp: CoachCampSummary
    assignment: {
      role: string
      station_name: string | null
      call_time: string | null
      shift_end_time: string | null
      notes: string | null
      is_lead: boolean
    }
    groups: CoachGroupInfo[]
    camp_days: {
      id: string
      day_number: number
      date: string
      status: string
      schedule_blocks: CoachScheduleBlock[]
    }[]
    staff: {
      id: string
      name: string
      role: string
      station_name: string | null
    }[]
  } | null
  error: Error | null
}> {
  try {
    const { userId, campId } = params

    // Verify coach is assigned to this camp
    const assignment = await prisma.campStaffAssignment.findFirst({
      where: {
        userId,
        campId,
        role: 'coach',
      },
      include: {
        camp: {
          include: {
            location: true,
            tenant: true,
            campGroups: true,
            campSessionDays: {
              orderBy: { dayNumber: 'asc' },
              include: {
                scheduleBlocks: {
                  orderBy: { startTime: 'asc' },
                },
              },
            },
            staffAssignments: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            registrations: {
              where: { status: { in: ['confirmed', 'pending'] } },
              select: { id: true },
            },
          },
        },
      },
    })

    if (!assignment) {
      return { data: null, error: new Error('Not assigned to this camp') }
    }

    const camp = assignment.camp
    const campStatus = getCampStatus(camp.startDate, camp.endDate)

    return {
      data: {
        camp: {
          id: camp.id,
          name: camp.name,
          slug: camp.slug,
          start_date: camp.startDate.toISOString(),
          end_date: camp.endDate.toISOString(),
          start_time: camp.startTime ? formatTimeString(camp.startTime) : null,
          end_time: camp.endTime ? formatTimeString(camp.endTime) : null,
          location_name: camp.location?.name || null,
          location_city: camp.location?.city || null,
          location_state: camp.location?.state || null,
          licensee_name: camp.tenant?.name || 'Unknown',
          role: assignment.role,
          station_name: assignment.stationName,
          call_time: assignment.callTime ? formatTimeString(assignment.callTime) : null,
          shift_end_time: assignment.endTime ? formatTimeString(assignment.endTime) : null,
          is_lead: assignment.isLead,
          status: campStatus,
          days_until_start: getDaysUntilStart(camp.startDate),
          registered_count: camp.registrations?.length || 0,
          capacity: camp.capacity || 60,
          day_number: getCurrentDayNumber(camp.startDate, camp.endDate),
          total_days: getTotalDays(camp.startDate, camp.endDate),
        },
        assignment: {
          role: assignment.role,
          station_name: assignment.stationName,
          call_time: assignment.callTime ? formatTimeString(assignment.callTime) : null,
          shift_end_time: assignment.endTime ? formatTimeString(assignment.endTime) : null,
          notes: assignment.notes,
          is_lead: assignment.isLead,
        },
        groups: camp.campGroups.map((g) => ({
          id: g.id,
          name: g.groupName || `Group ${g.groupNumber}`,
          group_number: g.groupNumber,
          team_color: g.groupColor,
          camper_count: g.camperCount,
          min_grade: g.minGrade,
          max_grade: g.maxGrade,
        })),
        camp_days: camp.campSessionDays.map((day) => ({
          id: day.id,
          day_number: day.dayNumber,
          date: day.actualDate?.toISOString() || '',
          status: day.status,
          schedule_blocks: day.scheduleBlocks.map((block) => ({
            id: block.id,
            start_time: formatTimeString(block.startTime) || '',
            end_time: formatTimeString(block.endTime) || '',
            title: block.label,
            block_type: block.blockType,
            location_notes: block.location,
            description: block.description,
            curriculum_block_id: block.curriculumBlockId,
            is_my_station: assignment.stationName
              ? block.label.toLowerCase().includes(assignment.stationName.toLowerCase())
              : false,
          })),
        })),
        staff: camp.staffAssignments.map((s) => ({
          id: s.user?.id || s.id,
          name: s.isAdHoc
            ? `${s.adHocFirstName || ''} ${s.adHocLastName || ''}`.trim() || 'Unknown'
            : `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim() || 'Unknown',
          role: s.role,
          station_name: s.stationName,
        })),
      },
      error: null,
    }
  } catch (error) {
    logger.error('Failed to get camp detail', { userId: params.userId, campId: params.campId }, error as Error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get curriculum/drills for a coach's assigned blocks
 */
export async function getCoachCurriculum(params: {
  userId: string
  campId?: string
}): Promise<{
  data: {
    curriculum_blocks: CoachCurriculumBlock[]
  } | null
  error: Error | null
}> {
  try {
    const { userId, campId } = params

    // Get coach's assignments to find their stations
    const assignments = await prisma.campStaffAssignment.findMany({
      where: {
        userId,
        role: 'coach',
        ...(campId ? { campId } : {}),
      },
      include: {
        camp: {
          include: {
            campSessionDays: {
              include: {
                scheduleBlocks: {
                  where: {
                    curriculumBlockId: { not: null },
                  },
                },
              },
            },
          },
        },
      },
    })

    // Collect all curriculum block IDs
    const curriculumBlockIds = new Set<string>()
    for (const assignment of assignments) {
      for (const day of assignment.camp.campSessionDays) {
        for (const block of day.scheduleBlocks) {
          if (block.curriculumBlockId) {
            curriculumBlockIds.add(block.curriculumBlockId)
          }
        }
      }
    }

    // Get curriculum blocks
    const curriculumBlocks = await prisma.curriculumBlock.findMany({
      where: {
        id: { in: Array.from(curriculumBlockIds) },
      },
    })

    return {
      data: {
        curriculum_blocks: curriculumBlocks.map((block) => ({
          id: block.id,
          title: block.title,
          description: block.description,
          block_type: block.category, // category is the block type (drill, warmup, etc.)
          duration_minutes: block.durationMinutes,
          sport: block.sport,
          intensity: block.intensity,
          equipment_needed: block.equipmentNeeded,
          setup_notes: block.setupNotes,
          coaching_points: block.coachingPoints ? block.coachingPoints.split('\n').filter(Boolean) : [],
        })),
      },
      error: null,
    }
  } catch (error) {
    logger.error('Failed to get curriculum', { userId: params.userId, campId: params.campId }, error as Error)
    return { data: null, error: error as Error }
  }
}
