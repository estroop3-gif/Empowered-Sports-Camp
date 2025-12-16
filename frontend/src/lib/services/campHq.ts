/**
 * Camp HQ Service
 *
 * Unified service layer for the Camp HQ command center.
 * Orchestrates existing services (camp-days, attendance, grouping, roster)
 * to provide a comprehensive camp management interface.
 */

import prisma from '@/lib/db/client'
import { Prisma } from '@/generated/prisma'

// ============================================================================
// TYPES
// ============================================================================

export interface CampHqOverview {
  camp: {
    id: string
    name: string
    slug: string
    description: string | null
    start_date: string
    end_date: string
    start_time: string | null
    end_time: string | null
    min_age: number
    max_age: number
    capacity: number
    status: string
    tenant_id: string | null
    tenant_name: string | null
  }
  location: {
    id: string
    name: string
    address: string | null
    city: string | null
    state: string | null
  } | null
  stats: {
    total_registered: number
    total_capacity: number
    percent_full: number
    total_staff: number
    total_groups: number
    days_total: number
    days_completed: number
    days_remaining: number
  }
  today: {
    camp_day_id: string | null
    day_number: number | null
    status: 'not_started' | 'in_progress' | 'finished' | null
    is_camp_day: boolean
    checked_in: number
    checked_out: number
    on_site: number
    not_arrived: number
    absent: number
  }
  grouping_status: 'pending' | 'reviewed' | 'finalized'
}

export interface CampHqDay {
  id: string
  date: string
  day_number: number
  title: string | null
  status: 'not_started' | 'in_progress' | 'finished'
  notes: string | null
  completed_at: string | null
  stats: {
    registered: number
    checked_in: number
    checked_out: number
    not_arrived: number
    absent: number
  }
}

export interface CampHqStaffMember {
  id: string
  assignment_id: string
  role: 'director' | 'coach' | 'assistant'
  first_name: string
  last_name: string
  email: string
  phone: string | null
  photo_url: string | null
  assigned_group_id: string | null
  assigned_group_name: string | null
}

export interface CampHqGroup {
  id: string
  name: string | null
  color: string | null
  camper_count: number
  staff_count: number
  age_range: { min: number; max: number } | null
}

export interface CampHqQuickAction {
  action: 'start_day' | 'end_day' | 'finalize_groups' | 'send_recap'
  label: string
  available: boolean
  reason?: string
}

// ============================================================================
// OVERVIEW QUERY
// ============================================================================

/**
 * Get comprehensive Camp HQ overview
 * This is the main data fetch for the Camp HQ dashboard
 */
export async function getCampHqOverview(
  campId: string
): Promise<{ data: CampHqOverview | null; error: Error | null }> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      include: {
        tenant: {
          select: { name: true },
        },
        location: true,
        registrations: {
          where: { status: 'confirmed' },
          select: { id: true },
        },
        staffAssignments: {
          select: { id: true },
        },
        campGroups: {
          select: { id: true },
        },
        campDays: {
          orderBy: { date: 'asc' },
          include: {
            attendance: {
              select: { status: true },
            },
          },
        },
      },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp not found') }
    }

    // Calculate date-based stats
    const startDate = new Date(camp.startDate)
    const endDate = new Date(camp.endDate)
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(0, 0, 0, 0)

    const daysTotal = Math.floor(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1

    const daysCompleted = camp.campDays.filter(d => d.status === 'finished').length
    const daysRemaining = Math.max(0, daysTotal - daysCompleted)

    // Check if today is a camp day
    const isCampDay = today >= startDate && today <= endDate

    // Get today's camp day if exists
    let todayCampDay = camp.campDays.find(
      d => d.date.toISOString().split('T')[0] === today.toISOString().split('T')[0]
    )

    // Calculate today's stats
    let todayStats = {
      checked_in: 0,
      checked_out: 0,
      on_site: 0,
      not_arrived: 0,
      absent: 0,
    }

    if (todayCampDay) {
      todayStats = {
        checked_in: todayCampDay.attendance.filter(a => a.status === 'checked_in').length,
        checked_out: todayCampDay.attendance.filter(a => a.status === 'checked_out').length,
        on_site: todayCampDay.attendance.filter(a => a.status === 'checked_in').length,
        not_arrived: todayCampDay.attendance.filter(a => a.status === 'not_arrived').length,
        absent: todayCampDay.attendance.filter(a => a.status === 'absent').length,
      }
    }

    // Calculate today's day number
    let dayNumber: number | null = null
    if (isCampDay) {
      dayNumber = Math.floor(
        (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1
    }

    // Get grouping status from camper session data
    const groupingStatus = await prisma.camperSessionData.findFirst({
      where: { campId },
      select: { campId: true },
    })

    // Determine grouping status based on data
    let groupingStatusValue: 'pending' | 'reviewed' | 'finalized' = 'pending'
    const camperWithGroups = await prisma.camperSessionData.count({
      where: { campId, assignedGroupId: { not: null } },
    })
    const totalCampers = camp.registrations.length

    if (camperWithGroups > 0 && camperWithGroups === totalCampers) {
      groupingStatusValue = 'finalized'
    } else if (camperWithGroups > 0) {
      groupingStatusValue = 'reviewed'
    }

    const overview: CampHqOverview = {
      camp: {
        id: camp.id,
        name: camp.name,
        slug: camp.slug,
        description: camp.description,
        start_date: camp.startDate.toISOString().split('T')[0],
        end_date: camp.endDate.toISOString().split('T')[0],
        start_time: camp.startTime?.toISOString().split('T')[1]?.slice(0, 5) || null,
        end_time: camp.endTime?.toISOString().split('T')[1]?.slice(0, 5) || null,
        min_age: camp.minAge ?? 5,
        max_age: camp.maxAge ?? 14,
        capacity: camp.capacity ?? 60,
        status: camp.status,
        tenant_id: camp.tenantId,
        tenant_name: camp.tenant?.name || null,
      },
      location: camp.location
        ? {
            id: camp.location.id,
            name: camp.location.name,
            address: camp.location.address,
            city: camp.location.city,
            state: camp.location.state,
          }
        : null,
      stats: {
        total_registered: camp.registrations.length,
        total_capacity: camp.capacity ?? 60,
        percent_full: (camp.capacity ?? 60) > 0
          ? Math.round((camp.registrations.length / (camp.capacity ?? 60)) * 100)
          : 0,
        total_staff: camp.staffAssignments.length,
        total_groups: camp.campGroups.length,
        days_total: daysTotal,
        days_completed: daysCompleted,
        days_remaining: daysRemaining,
      },
      today: {
        camp_day_id: todayCampDay?.id || null,
        day_number: dayNumber,
        status: todayCampDay?.status as CampHqOverview['today']['status'] || null,
        is_camp_day: isCampDay,
        ...todayStats,
      },
      grouping_status: groupingStatusValue,
    }

    return { data: overview, error: null }
  } catch (error) {
    console.error('[getCampHqOverview] Error:', error)
    return { data: null, error: error as Error }
  }
}

// ============================================================================
// CAMP DAYS QUERIES
// ============================================================================

/**
 * Get all camp days for a camp session
 */
export async function getCampHqDays(
  campId: string
): Promise<{ data: CampHqDay[] | null; error: Error | null }> {
  try {
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: {
        startDate: true,
        endDate: true,
        registrations: {
          where: { status: 'confirmed' },
          select: { id: true },
        },
      },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp not found') }
    }

    const campDays = await prisma.campDay.findMany({
      where: { campId },
      include: {
        attendance: {
          select: { status: true },
        },
      },
      orderBy: { date: 'asc' },
    })

    // Generate all expected days
    const startDate = new Date(camp.startDate)
    const endDate = new Date(camp.endDate)
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(0, 0, 0, 0)

    const registeredCount = camp.registrations.length
    const result: CampHqDay[] = []

    let currentDate = new Date(startDate)
    let dayNumber = 1

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const existingDay = campDays.find(
        d => d.date.toISOString().split('T')[0] === dateStr
      )

      if (existingDay) {
        result.push({
          id: existingDay.id,
          date: dateStr,
          day_number: existingDay.dayNumber,
          title: existingDay.title,
          status: existingDay.status as CampHqDay['status'],
          notes: existingDay.notes,
          completed_at: existingDay.completedAt?.toISOString() || null,
          stats: {
            registered: registeredCount,
            checked_in: existingDay.attendance.filter(a => a.status === 'checked_in').length,
            checked_out: existingDay.attendance.filter(a => a.status === 'checked_out').length,
            not_arrived: existingDay.attendance.filter(a => a.status === 'not_arrived').length,
            absent: existingDay.attendance.filter(a => a.status === 'absent').length,
          },
        })
      } else {
        // Day record doesn't exist yet - return placeholder
        result.push({
          id: `pending-${dateStr}`,
          date: dateStr,
          day_number: dayNumber,
          title: `Day ${dayNumber}`,
          status: 'not_started',
          notes: null,
          completed_at: null,
          stats: {
            registered: registeredCount,
            checked_in: 0,
            checked_out: 0,
            not_arrived: registeredCount,
            absent: 0,
          },
        })
      }

      currentDate.setDate(currentDate.getDate() + 1)
      dayNumber++
    }

    return { data: result, error: null }
  } catch (error) {
    console.error('[getCampHqDays] Error:', error)
    return { data: null, error: error as Error }
  }
}

// ============================================================================
// STAFF QUERIES
// ============================================================================

/**
 * Get staff assignments for a camp
 * Note: CampStaffAssignment.user points to Profile directly
 */
export async function getCampHqStaff(
  campId: string
): Promise<{ data: CampHqStaffMember[] | null; error: Error | null }> {
  try {
    const assignments = await prisma.campStaffAssignment.findMany({
      where: { campId },
      include: {
        user: true, // user is actually Profile
      },
      orderBy: [
        { role: 'asc' },
      ],
    })

    // Sort by last name after fetching
    const sortedAssignments = assignments.sort((a, b) => {
      const lastNameA = a.user.lastName || ''
      const lastNameB = b.user.lastName || ''
      return lastNameA.localeCompare(lastNameB)
    })

    const staff: CampHqStaffMember[] = sortedAssignments.map(a => ({
      id: a.userId,
      assignment_id: a.id,
      role: a.role as CampHqStaffMember['role'],
      first_name: a.user.firstName || '',
      last_name: a.user.lastName || '',
      email: a.user.email,
      phone: a.user.phone || null,
      photo_url: a.user.avatarUrl || null,
      assigned_group_id: null, // Staff-to-group assignment not currently in schema
      assigned_group_name: null,
    }))

    return { data: staff, error: null }
  } catch (error) {
    console.error('[getCampHqStaff] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Assign staff to a group
 * Note: This feature requires schema changes to add assignedGroupId to CampStaffAssignment
 */
export async function assignStaffToGroup(
  _assignmentId: string,
  _groupId: string | null
): Promise<{ data: { success: boolean }; error: Error | null }> {
  // Staff-to-group assignment not currently supported in schema
  return {
    data: { success: false },
    error: new Error('Staff-to-group assignment is not yet implemented'),
  }
}

// ============================================================================
// GROUP QUERIES
// ============================================================================

/**
 * Get groups overview for Camp HQ
 * Note: CampGroup stores camperCount directly and has camperSessionData relation
 */
export async function getCampHqGroups(
  campId: string
): Promise<{ data: CampHqGroup[] | null; error: Error | null }> {
  try {
    const groups = await prisma.campGroup.findMany({
      where: { campId },
      include: {
        camperSessionData: {
          include: {
            athlete: {
              select: {
                dateOfBirth: true,
              },
            },
          },
        },
      },
      orderBy: { groupName: 'asc' },
    })

    const result: CampHqGroup[] = groups.map(g => {
      // Calculate age range from assigned campers
      let ageRange: { min: number; max: number } | null = null
      if (g.camperSessionData.length > 0) {
        const today = new Date()
        const ages = g.camperSessionData
          .map(csd => {
            if (!csd.athlete.dateOfBirth) return null
            const dob = new Date(csd.athlete.dateOfBirth)
            return Math.floor((today.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
          })
          .filter((age): age is number => age !== null)

        if (ages.length > 0) {
          ageRange = {
            min: Math.min(...ages),
            max: Math.max(...ages),
          }
        }
      }

      return {
        id: g.id,
        name: g.groupName,
        color: g.groupColor,
        camper_count: g.camperCount, // Use stored count
        staff_count: 0, // Staff-to-group not currently tracked
        age_range: ageRange,
      }
    })

    return { data: result, error: null }
  } catch (error) {
    console.error('[getCampHqGroups] Error:', error)
    return { data: null, error: error as Error }
  }
}

// ============================================================================
// QUICK ACTIONS
// ============================================================================

/**
 * Get available quick actions for Camp HQ
 */
export async function getCampHqQuickActions(
  campId: string
): Promise<{ data: CampHqQuickAction[] | null; error: Error | null }> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      include: {
        campDays: {
          where: { date: today },
        },
        registrations: {
          where: { status: 'confirmed' },
          select: { id: true },
        },
      },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp not found') }
    }

    const startDate = new Date(camp.startDate)
    const endDate = new Date(camp.endDate)
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(0, 0, 0, 0)

    const isCampDay = today >= startDate && today <= endDate
    const todayCampDay = camp.campDays[0]

    // Get grouping status
    const camperWithGroups = await prisma.camperSessionData.count({
      where: { campId, assignedGroupId: { not: null } },
    })
    const groupsFinalized = camperWithGroups === camp.registrations.length && camp.registrations.length > 0

    const actions: CampHqQuickAction[] = []

    // Start Day action
    if (isCampDay && (!todayCampDay || todayCampDay.status === 'not_started')) {
      actions.push({
        action: 'start_day',
        label: 'Start Today',
        available: true,
      })
    } else if (!isCampDay) {
      actions.push({
        action: 'start_day',
        label: 'Start Today',
        available: false,
        reason: 'Today is not a camp day',
      })
    }

    // End Day action
    if (todayCampDay && todayCampDay.status === 'in_progress') {
      actions.push({
        action: 'end_day',
        label: 'End Day',
        available: true,
      })
    }

    // Finalize Groups action
    if (!groupsFinalized) {
      actions.push({
        action: 'finalize_groups',
        label: 'Finalize Groups',
        available: camp.registrations.length > 0,
        reason: camp.registrations.length === 0 ? 'No registered campers' : undefined,
      })
    }

    // Send Recap action
    if (todayCampDay && todayCampDay.status === 'finished') {
      actions.push({
        action: 'send_recap',
        label: 'Send Daily Recap',
        available: true,
      })
    }

    return { data: actions, error: null }
  } catch (error) {
    console.error('[getCampHqQuickActions] Error:', error)
    return { data: null, error: error as Error }
  }
}

// ============================================================================
// DAY OPERATIONS
// ============================================================================

/**
 * Start a camp day (creates if needed, sets to in_progress)
 */
export async function startCampDay(
  campId: string,
  date?: Date
): Promise<{ data: { camp_day_id: string } | null; error: Error | null }> {
  try {
    const targetDate = date || new Date()
    targetDate.setHours(0, 0, 0, 0)

    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: { startDate: true, endDate: true },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp not found') }
    }

    const startDate = new Date(camp.startDate)
    const endDate = new Date(camp.endDate)
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(0, 0, 0, 0)

    if (targetDate < startDate || targetDate > endDate) {
      return { data: null, error: new Error('Date is outside camp date range') }
    }

    // Calculate day number
    const dayNumber = Math.floor(
      (targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1

    // Upsert camp day
    const campDay = await prisma.campDay.upsert({
      where: {
        campId_date: {
          campId,
          date: targetDate,
        },
      },
      create: {
        campId,
        date: targetDate,
        dayNumber,
        title: `Day ${dayNumber}`,
        status: 'in_progress',
      },
      update: {
        status: 'in_progress',
      },
    })

    // Initialize attendance records if not exists
    const registrations = await prisma.registration.findMany({
      where: { campId, status: 'confirmed' },
      include: {
        athlete: {
          include: {
            camperSessionData: {
              where: { campId },
              select: { assignedGroupId: true },
            },
          },
        },
      },
    })

    const existingAttendance = await prisma.campAttendance.findMany({
      where: { campDayId: campDay.id },
      select: { athleteId: true },
    })

    const existingAthleteIds = new Set(existingAttendance.map(a => a.athleteId))

    const newAttendance = registrations
      .filter(r => !existingAthleteIds.has(r.athleteId))
      .map(r => ({
        campDayId: campDay.id,
        athleteId: r.athleteId,
        parentProfileId: r.parentId,
        registrationId: r.id,
        groupId: r.athlete.camperSessionData[0]?.assignedGroupId || null,
        status: 'not_arrived' as const,
      }))

    if (newAttendance.length > 0) {
      await prisma.campAttendance.createMany({
        data: newAttendance,
      })
    }

    return { data: { camp_day_id: campDay.id }, error: null }
  } catch (error) {
    console.error('[startCampDay] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * End a camp day
 */
export async function endCampDay(
  campDayId: string,
  userId: string,
  notes?: string
): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    // Mark remaining not_arrived as absent
    await prisma.campAttendance.updateMany({
      where: {
        campDayId,
        status: 'not_arrived',
      },
      data: {
        status: 'absent',
      },
    })

    // Update camp day
    await prisma.campDay.update({
      where: { id: campDayId },
      data: {
        status: 'finished',
        completedAt: new Date(),
        completedBy: userId,
        notes: notes || undefined,
      },
    })

    return { data: { success: true }, error: null }
  } catch (error) {
    console.error('[endCampDay] Error:', error)
    return { data: null, error: error as Error }
  }
}

// ============================================================================
// REPORTS QUERIES
// ============================================================================

export interface CampHqDailyReport {
  camp_day_id: string
  date: string
  day_number: number
  stats: {
    registered: number
    attended: number
    absent: number
    attendance_rate: number
  }
  notes: string | null
}

export interface CampHqWeeklyReport {
  week_number: number
  start_date: string
  end_date: string
  days: CampHqDailyReport[]
  totals: {
    total_attendance: number
    total_absent: number
    average_attendance_rate: number
  }
}

/**
 * Get attendance report for a camp
 */
export async function getCampHqAttendanceReport(
  campId: string
): Promise<{ data: CampHqDailyReport[] | null; error: Error | null }> {
  try {
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      include: {
        registrations: {
          where: { status: 'confirmed' },
          select: { id: true },
        },
        campDays: {
          include: {
            attendance: {
              select: { status: true },
            },
          },
          orderBy: { date: 'asc' },
        },
      },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp not found') }
    }

    const registeredCount = camp.registrations.length

    const reports: CampHqDailyReport[] = camp.campDays.map(day => {
      const attended = day.attendance.filter(
        a => a.status === 'checked_in' || a.status === 'checked_out'
      ).length
      const absent = day.attendance.filter(a => a.status === 'absent').length

      return {
        camp_day_id: day.id,
        date: day.date.toISOString().split('T')[0],
        day_number: day.dayNumber,
        stats: {
          registered: registeredCount,
          attended,
          absent,
          attendance_rate: registeredCount > 0
            ? Math.round((attended / registeredCount) * 100)
            : 0,
        },
        notes: day.notes,
      }
    })

    return { data: reports, error: null }
  } catch (error) {
    console.error('[getCampHqAttendanceReport] Error:', error)
    return { data: null, error: error as Error }
  }
}
