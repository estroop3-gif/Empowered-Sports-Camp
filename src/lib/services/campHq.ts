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
    total_waitlisted: number
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
  user_id: string | null
  role: 'director' | 'coach' | 'assistant' | 'cit' | 'volunteer'
  first_name: string
  last_name: string
  email: string
  phone: string | null
  photo_url: string | null
  assigned_group_id: string | null
  assigned_group_name: string | null
  is_ad_hoc: boolean
  is_lead: boolean
  call_time: string | null
  end_time: string | null
  notes: string | null
  station_name: string | null
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
          where: { status: { in: ['confirmed', 'pending'] } },
          select: { id: true, status: true },
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

    // Count waitlisted registrations
    const totalWaitlisted = await prisma.registration.count({
      where: { campId, status: 'waitlisted' },
    })

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
        total_waitlisted: totalWaitlisted,
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
 * Handles both profile-linked staff and ad-hoc staff
 */
export async function getCampHqStaff(
  campId: string
): Promise<{ data: CampHqStaffMember[] | null; error: Error | null }> {
  try {
    const assignments = await prisma.campStaffAssignment.findMany({
      where: { campId },
      include: {
        user: true, // Will be null for ad-hoc staff
      },
      orderBy: [
        { role: 'asc' },
      ],
    })

    // Helper to format time
    const formatTime = (time: Date | null): string | null => {
      if (!time) return null
      return time.toISOString().split('T')[1]?.slice(0, 5) || null
    }

    const staff: CampHqStaffMember[] = assignments.map(a => ({
      id: a.id,
      assignment_id: a.id,
      user_id: a.userId,
      role: a.role as CampHqStaffMember['role'],
      first_name: a.isAdHoc ? (a.adHocFirstName || '') : (a.user?.firstName || ''),
      last_name: a.isAdHoc ? (a.adHocLastName || '') : (a.user?.lastName || ''),
      email: a.isAdHoc ? (a.adHocEmail || '') : (a.user?.email || ''),
      phone: a.isAdHoc ? a.adHocPhone : (a.user?.phone || null),
      photo_url: a.isAdHoc ? null : (a.user?.avatarUrl || null),
      assigned_group_id: null,
      assigned_group_name: null,
      is_ad_hoc: a.isAdHoc,
      is_lead: a.isLead,
      call_time: formatTime(a.callTime),
      end_time: formatTime(a.endTime),
      notes: a.notes,
      station_name: a.stationName,
    }))

    // Sort by last name
    staff.sort((a, b) => a.last_name.localeCompare(b.last_name))

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
// STAFF SEARCH & CRUD
// ============================================================================

export interface TenantStaffSearchResult {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  avatar_url: string | null
  role: string
  territories: Array<{
    id: string
    name: string
    state_region: string
    city: string | null
  }>
}

/**
 * Search for staff in a tenant's roster who can be assigned to a camp
 * Excludes staff already assigned to the camp
 * Supports filtering by territory
 */
export async function searchTenantStaff(
  tenantId: string,
  campId: string,
  search?: string,
  territoryId?: string,
  limit: number = 50
): Promise<{ data: TenantStaffSearchResult[] | null; error: Error | null }> {
  try {
    // Get existing profile-linked assignments to exclude them (only those with linked profiles)
    const existingAssignments = await prisma.campStaffAssignment.findMany({
      where: { campId, isAdHoc: false },
      select: { userId: true },
    })
    const assignedUserIds = existingAssignments
      .map(a => a.userId)
      .filter((id): id is string => id !== null)

    // Also exclude users with pending requests for this camp
    const pendingRequests = await prisma.staffAssignmentRequest.findMany({
      where: { campId, status: 'pending' },
      select: { requestedUserId: true },
    })
    const pendingUserIds = pendingRequests.map(r => r.requestedUserId)

    const excludeUserIds = [...assignedUserIds, ...pendingUserIds]

    // Build the where clause
    const searchCondition = search && search.length > 0 ? {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        // Also search by territory name
        {
          territoryAssignments: {
            some: {
              territory: {
                name: { contains: search, mode: 'insensitive' as const },
              },
            },
          },
        },
      ],
    } : {}

    const territoryCondition = territoryId ? {
      territoryAssignments: {
        some: { territoryId },
      },
    } : {}

    // Search profiles with staff roles (any staff role, not just this tenant)
    const profiles = await prisma.profile.findMany({
      where: {
        id: { notIn: excludeUserIds.length > 0 ? excludeUserIds : undefined },
        userRoles: {
          some: {
            isActive: true,
            // Include all staff roles, exclude parent and hq_admin
            role: { in: ['coach', 'director', 'cit_volunteer', 'licensee_owner'] },
          },
        },
        ...searchCondition,
        ...territoryCondition,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        userRoles: {
          where: {
            isActive: true,
            role: { in: ['coach', 'director', 'cit_volunteer', 'licensee_owner'] },
          },
          select: { role: true },
          take: 1,
        },
        territoryAssignments: {
          select: {
            territory: {
              select: {
                id: true,
                name: true,
                stateRegion: true,
                city: true,
              },
            },
          },
        },
      },
      take: limit,
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    })

    return {
      data: profiles.map(p => ({
        id: p.id,
        first_name: p.firstName || '',
        last_name: p.lastName || '',
        email: p.email,
        phone: p.phone,
        avatar_url: p.avatarUrl,
        role: p.userRoles[0]?.role || 'coach',
        territories: p.territoryAssignments.map(ta => ({
          id: ta.territory.id,
          name: ta.territory.name,
          state_region: ta.territory.stateRegion,
          city: ta.territory.city,
        })),
      })),
      error: null,
    }
  } catch (error) {
    console.error('[searchTenantStaff] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get all territories for filtering in staff search
 */
export async function getTenantTerritories(
  tenantId: string
): Promise<{ data: Array<{ id: string; name: string; state_region: string; city: string | null }> | null; error: Error | null }> {
  try {
    const territories = await prisma.territory.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        stateRegion: true,
        city: true,
      },
      orderBy: { name: 'asc' },
    })

    return {
      data: territories.map(t => ({
        id: t.id,
        name: t.name,
        state_region: t.stateRegion,
        city: t.city,
      })),
      error: null,
    }
  } catch (error) {
    console.error('[getTenantTerritories] Error:', error)
    return { data: null, error: error as Error }
  }
}

export interface AddStaffAssignmentInput {
  campId: string
  // For profile-linked staff
  userId?: string
  // For ad-hoc staff
  adHocFirstName?: string
  adHocLastName?: string
  adHocEmail?: string
  adHocPhone?: string
  // Common fields
  role: string
  isLead?: boolean
  callTime?: string
  endTime?: string
  notes?: string
  stationName?: string
}

/**
 * Parse time string (HH:MM) to Date for storage
 */
function parseTimeString(timeStr: string | undefined): Date | null {
  if (!timeStr) return null
  const [hours, minutes] = timeStr.split(':').map(Number)
  if (isNaN(hours) || isNaN(minutes)) return null
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

/**
 * Add a staff assignment to a camp
 * Supports both profile-linked staff and ad-hoc staff
 */
export async function addStaffAssignment(
  input: AddStaffAssignmentInput
): Promise<{ data: { id: string } | null; error: Error | null }> {
  try {
    const isAdHoc = !input.userId

    // Validate: either userId or ad-hoc info required
    if (!isAdHoc && !input.userId) {
      return { data: null, error: new Error('User ID required for profile-linked staff') }
    }
    if (isAdHoc && (!input.adHocFirstName || !input.adHocLastName)) {
      return { data: null, error: new Error('First and last name required for ad-hoc staff') }
    }

    // Check for duplicate profile assignment
    if (!isAdHoc) {
      const existing = await prisma.campStaffAssignment.findFirst({
        where: { campId: input.campId, userId: input.userId },
      })
      if (existing) {
        return { data: null, error: new Error('This staff member is already assigned to this camp') }
      }
    }

    const assignment = await prisma.campStaffAssignment.create({
      data: {
        campId: input.campId,
        userId: input.userId || null,
        role: input.role,
        isLead: input.isLead || false,
        callTime: parseTimeString(input.callTime),
        endTime: parseTimeString(input.endTime),
        notes: input.notes || null,
        stationName: input.stationName || null,
        isAdHoc,
        adHocFirstName: isAdHoc ? input.adHocFirstName : null,
        adHocLastName: isAdHoc ? input.adHocLastName : null,
        adHocEmail: isAdHoc ? (input.adHocEmail || null) : null,
        adHocPhone: isAdHoc ? (input.adHocPhone || null) : null,
      },
    })

    return { data: { id: assignment.id }, error: null }
  } catch (error) {
    console.error('[addStaffAssignment] Error:', error)
    return { data: null, error: error as Error }
  }
}

export interface UpdateStaffAssignmentInput {
  role?: string
  isLead?: boolean
  callTime?: string | null
  endTime?: string | null
  notes?: string | null
  stationName?: string | null
  // For ad-hoc staff only
  adHocFirstName?: string
  adHocLastName?: string
  adHocEmail?: string | null
  adHocPhone?: string | null
}

/**
 * Update an existing staff assignment
 */
export async function updateStaffAssignment(
  assignmentId: string,
  updates: UpdateStaffAssignmentInput
): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    await prisma.campStaffAssignment.update({
      where: { id: assignmentId },
      data: {
        role: updates.role,
        isLead: updates.isLead,
        callTime: updates.callTime !== undefined ? parseTimeString(updates.callTime || undefined) : undefined,
        endTime: updates.endTime !== undefined ? parseTimeString(updates.endTime || undefined) : undefined,
        notes: updates.notes,
        stationName: updates.stationName,
        adHocFirstName: updates.adHocFirstName,
        adHocLastName: updates.adHocLastName,
        adHocEmail: updates.adHocEmail,
        adHocPhone: updates.adHocPhone,
      },
    })
    return { data: { success: true }, error: null }
  } catch (error) {
    console.error('[updateStaffAssignment] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Remove a staff assignment from a camp
 */
export async function removeStaffAssignment(
  assignmentId: string
): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    await prisma.campStaffAssignment.delete({
      where: { id: assignmentId },
    })
    return { data: { success: true }, error: null }
  } catch (error) {
    console.error('[removeStaffAssignment] Error:', error)
    return { data: null, error: error as Error }
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
    console.log('[startCampDay] Starting for campId:', campId)

    const targetDate = date || new Date()
    targetDate.setHours(0, 0, 0, 0)
    console.log('[startCampDay] Target date:', targetDate.toISOString())

    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: { startDate: true, endDate: true },
    })

    if (!camp) {
      console.log('[startCampDay] Camp not found')
      return { data: null, error: new Error('Camp not found') }
    }

    const startDate = new Date(camp.startDate)
    const endDate = new Date(camp.endDate)
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(0, 0, 0, 0)

    console.log('[startCampDay] Camp dates:', { startDate: startDate.toISOString(), endDate: endDate.toISOString() })

    if (targetDate < startDate || targetDate > endDate) {
      return { data: null, error: new Error('Date is outside camp date range') }
    }

    // Calculate day number
    const dayNumber = Math.floor(
      (targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1

    console.log('[startCampDay] Upserting camp day, dayNumber:', dayNumber)

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

    console.log('[startCampDay] Camp day created/updated:', campDay.id)

    // Initialize attendance records if not exists
    const registrations = await prisma.registration.findMany({
      where: { campId, status: 'confirmed' },
      select: {
        id: true,
        athleteId: true,
        parentId: true,
        athlete: {
          select: {
            camperSessionData: {
              where: { campId },
              select: { assignedGroupId: true },
            },
          },
        },
      },
    })

    console.log('[startCampDay] Found registrations:', registrations.length)

    const existingAttendance = await prisma.campAttendance.findMany({
      where: { campDayId: campDay.id },
      select: { athleteId: true },
    })

    console.log('[startCampDay] Existing attendance:', existingAttendance.length)

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

    console.log('[startCampDay] New attendance records to create:', newAttendance.length)

    if (newAttendance.length > 0) {
      await prisma.campAttendance.createMany({
        data: newAttendance,
      })
      console.log('[startCampDay] Attendance records created')
    }

    return { data: { camp_day_id: campDay.id }, error: null }
  } catch (error) {
    console.error('[startCampDay] Error:', error)
    console.error('[startCampDay] Error details:', error instanceof Error ? error.message : String(error))
    if (error instanceof Error && error.stack) {
      console.error('[startCampDay] Stack:', error.stack)
    }
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

// ============================================================================
// FINANCIAL OVERVIEW
// ============================================================================

export interface FinancialOverview {
  // Collected revenue (paid only)
  collectedRevenueCents: number
  collectedRegistrationFeeCents: number
  collectedAddonFeeCents: number
  collectedDiscountsCents: number
  // Expected revenue (all non-cancelled)
  expectedRevenueCents: number
  expectedRegistrationFeeCents: number
  expectedAddonFeeCents: number
  expectedDiscountsCents: number
  // Counts
  totalRegistrations: number
  paidCount: number
  unpaidCount: number
  partialCount: number
  refundedCount: number
  registrations: Array<{
    athleteName: string
    parentName: string
    parentEmail: string
    basePriceCents: number
    discountCents: number
    promoDiscountCents: number
    addonsTotalCents: number
    totalPriceCents: number
    paymentStatus: string
    paidAt: string | null
  }>
}

export async function getFinancialOverview(params: {
  campId: string
  tenantId: string | null
}): Promise<{ data: FinancialOverview | null; error: Error | null }> {
  try {
    const { campId, tenantId } = params

    // Verify camp and tenant access
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: { id: true, tenantId: true },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp not found') }
    }

    if (tenantId && camp.tenantId !== tenantId) {
      return { data: null, error: new Error('Not authorized') }
    }

    const registrations = await prisma.registration.findMany({
      where: {
        campId,
        status: { not: 'cancelled' },
      },
      include: {
        athlete: {
          select: { firstName: true, lastName: true },
        },
        parent: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: [
        { athlete: { lastName: 'asc' } },
        { athlete: { firstName: 'asc' } },
      ],
    })

    let collectedRevenueCents = 0
    let collectedRegistrationFeeCents = 0
    let collectedAddonFeeCents = 0
    let collectedDiscountsCents = 0
    let expectedRevenueCents = 0
    let expectedRegistrationFeeCents = 0
    let expectedAddonFeeCents = 0
    let expectedDiscountsCents = 0
    let paidCount = 0
    let unpaidCount = 0
    let partialCount = 0
    let refundedCount = 0

    const registrationRows = registrations.map((r) => {
      // Always count expected revenue from all non-cancelled registrations
      expectedRevenueCents += r.totalPriceCents
      expectedRegistrationFeeCents += r.basePriceCents - r.discountCents - r.promoDiscountCents
      expectedAddonFeeCents += r.addonsTotalCents
      expectedDiscountsCents += r.discountCents + r.promoDiscountCents

      if (r.paymentStatus === 'paid') {
        collectedRevenueCents += r.totalPriceCents
        collectedRegistrationFeeCents += r.basePriceCents - r.discountCents - r.promoDiscountCents
        collectedAddonFeeCents += r.addonsTotalCents
        collectedDiscountsCents += r.discountCents + r.promoDiscountCents
        paidCount++
      } else if (r.paymentStatus === 'partial') {
        partialCount++
      } else if (r.paymentStatus === 'refunded') {
        refundedCount++
      } else {
        unpaidCount++
      }

      return {
        athleteName: `${r.athlete.firstName} ${r.athlete.lastName}`,
        parentName: r.parent.firstName && r.parent.lastName
          ? `${r.parent.firstName} ${r.parent.lastName}`
          : r.parent.email,
        parentEmail: r.parent.email,
        basePriceCents: r.basePriceCents,
        discountCents: r.discountCents,
        promoDiscountCents: r.promoDiscountCents,
        addonsTotalCents: r.addonsTotalCents,
        totalPriceCents: r.totalPriceCents,
        paymentStatus: r.paymentStatus,
        paidAt: r.paidAt?.toISOString() || null,
      }
    })

    return {
      data: {
        collectedRevenueCents,
        collectedRegistrationFeeCents,
        collectedAddonFeeCents,
        collectedDiscountsCents,
        expectedRevenueCents,
        expectedRegistrationFeeCents,
        expectedAddonFeeCents,
        expectedDiscountsCents,
        totalRegistrations: registrations.length,
        paidCount,
        unpaidCount,
        partialCount,
        refundedCount,
        registrations: registrationRows,
      },
      error: null,
    }
  } catch (error) {
    console.error('[getFinancialOverview] Error:', error)
    return { data: null, error: error as Error }
  }
}
