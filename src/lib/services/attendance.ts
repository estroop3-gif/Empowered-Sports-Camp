/**
 * Attendance Service
 *
 * Handles check-in and check-out operations for camp days.
 * Supports both QR-based and manual check-in/out methods.
 */

import prisma from '@/lib/db/client'
import { AttendanceStatus, CheckMethod, Prisma } from '@/generated/prisma'

// ============================================================================
// TYPES
// ============================================================================

export interface Attendance {
  id: string
  camp_day_id: string
  athlete_id: string
  parent_profile_id: string
  registration_id: string
  group_id: string | null
  check_in_time: string | null
  check_in_method: 'qr' | 'manual' | null
  check_in_by_user_id: string | null
  check_in_notes: string | null
  check_out_time: string | null
  check_out_method: 'qr' | 'manual' | null
  check_out_by_user_id: string | null
  check_out_notes: string | null
  status: 'not_arrived' | 'checked_in' | 'checked_out' | 'absent'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AttendanceWithAthlete extends Attendance {
  athlete: {
    id: string
    first_name: string
    last_name: string
    photo_url: string | null
    medical_notes: string | null
    allergies: string | null
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
  }
  group: {
    id: string
    name: string | null
    color: string | null
  } | null
}

export interface CheckInStatusResult {
  camp_id: string
  camp_name: string
  camp_slug: string
  camp_day_id: string | null
  date: string
  athletes: {
    id: string
    name: string
    photo_url: string | null
    is_registered: boolean
    registration_id: string | null
    attendance_id: string | null
    status: 'not_arrived' | 'checked_in' | 'checked_out' | 'absent' | 'not_registered'
    previous_attendance_count: number
    needs_onboarding: boolean
  }[]
}

// ============================================================================
// TRANSFORM FUNCTIONS
// ============================================================================

function transformAttendance(
  record: Prisma.CampAttendanceGetPayload<{}>
): Attendance {
  return {
    id: record.id,
    camp_day_id: record.campDayId,
    athlete_id: record.athleteId,
    parent_profile_id: record.parentProfileId,
    registration_id: record.registrationId,
    group_id: record.groupId,
    check_in_time: record.checkInTime?.toISOString() || null,
    check_in_method: record.checkInMethod as Attendance['check_in_method'],
    check_in_by_user_id: record.checkInByUserId,
    check_in_notes: record.checkInNotes,
    check_out_time: record.checkOutTime?.toISOString() || null,
    check_out_method: record.checkOutMethod as Attendance['check_out_method'],
    check_out_by_user_id: record.checkOutByUserId,
    check_out_notes: record.checkOutNotes,
    status: record.status as Attendance['status'],
    notes: record.notes,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
  }
}

// ============================================================================
// CHECK-IN STATUS QUERY
// ============================================================================

/**
 * Get check-in status for a parent scanning a camp QR code
 * Returns information about their athletes and registration/check-in status
 */
export async function getCheckInStatus(
  campId: string,
  parentProfileId: string
): Promise<{ data: CheckInStatusResult | null; error: Error | null }> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get camp info
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: {
        id: true,
        name: true,
        slug: true,
        startDate: true,
        endDate: true,
      },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp not found') }
    }

    // Check if today is within camp dates
    const campStart = new Date(camp.startDate)
    const campEnd = new Date(camp.endDate)
    campStart.setHours(0, 0, 0, 0)
    campEnd.setHours(0, 0, 0, 0)

    if (today < campStart || today > campEnd) {
      return { data: null, error: new Error('Camp is not running today') }
    }

    // Get or create camp day for today
    const diffTime = today.getTime() - campStart.getTime()
    const dayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1

    let campDay = await prisma.campDay.findFirst({
      where: { campId, date: today },
    })

    if (!campDay) {
      campDay = await prisma.campDay.create({
        data: {
          campId,
          date: today,
          dayNumber,
          title: `Day ${dayNumber}`,
          status: 'not_started',
        },
      })
    }

    // Get parent's athletes
    const athletes = await prisma.athlete.findMany({
      where: { parentId: parentProfileId },
      include: {
        registrations: {
          where: {
            campId,
            status: 'confirmed',
          },
          select: {
            id: true,
          },
        },
        attendance: {
          where: { campDayId: campDay.id },
          select: {
            id: true,
            status: true,
          },
        },
        parentOnboarding: {
          where: {
            campId,
            parentProfileId,
          },
          select: {
            completedAt: true,
          },
        },
      },
    })

    // Get previous attendance count for each athlete
    const previousAttendance = await prisma.campAttendance.groupBy({
      by: ['athleteId'],
      where: {
        campDay: { campId },
        status: { in: ['checked_in', 'checked_out'] },
        athleteId: { in: athletes.map(a => a.id) },
      },
      _count: true,
    })

    const prevCountMap = new Map(
      previousAttendance.map(p => [p.athleteId, p._count])
    )

    const athleteResults = athletes.map(athlete => {
      const registration = athlete.registrations[0]
      const attendance = athlete.attendance[0]
      const onboarding = athlete.parentOnboarding[0]
      const prevCount = prevCountMap.get(athlete.id) || 0

      let status: CheckInStatusResult['athletes'][0]['status'] = 'not_registered'
      if (registration) {
        status = attendance?.status as CheckInStatusResult['athletes'][0]['status'] || 'not_arrived'
      }

      return {
        id: athlete.id,
        name: `${athlete.firstName} ${athlete.lastName}`,
        photo_url: athlete.photoUrl,
        is_registered: !!registration,
        registration_id: registration?.id || null,
        attendance_id: attendance?.id || null,
        status,
        previous_attendance_count: prevCount,
        needs_onboarding: registration && !onboarding?.completedAt,
      }
    })

    return {
      data: {
        camp_id: camp.id,
        camp_name: camp.name,
        camp_slug: camp.slug,
        camp_day_id: campDay.id,
        date: today.toISOString().split('T')[0],
        athletes: athleteResults,
      },
      error: null,
    }
  } catch (error) {
    console.error('[getCheckInStatus] Error:', error)
    return { data: null, error: error as Error }
  }
}

// ============================================================================
// CHECK-IN OPERATIONS
// ============================================================================

/**
 * Check in an athlete (QR or manual)
 */
export async function checkInAthlete(params: {
  campDayId: string
  athleteId: string
  parentProfileId: string
  registrationId: string
  method: 'qr' | 'manual'
  checkedInByUserId: string
  notes?: string
}): Promise<{ data: Attendance | null; error: Error | null }> {
  try {
    const { campDayId, athleteId, parentProfileId, registrationId, method, checkedInByUserId, notes } = params

    // Check if attendance record exists
    let attendance = await prisma.campAttendance.findFirst({
      where: { campDayId, athleteId },
    })

    if (attendance) {
      // Already checked in
      if (attendance.status === 'checked_in') {
        return { data: transformAttendance(attendance), error: null }
      }

      // Update existing record
      attendance = await prisma.campAttendance.update({
        where: { id: attendance.id },
        data: {
          status: 'checked_in',
          checkInTime: new Date(),
          checkInMethod: method as CheckMethod,
          checkInByUserId: checkedInByUserId,
          checkInNotes: notes,
        },
      })
    } else {
      // Get group assignment from camper session data
      const campDay = await prisma.campDay.findUnique({
        where: { id: campDayId },
        select: { campId: true },
      })

      let groupId: string | null = null
      if (campDay) {
        const camperData = await prisma.camperSessionData.findFirst({
          where: { campId: campDay.campId, athleteId },
          select: { assignedGroupId: true },
        })
        groupId = camperData?.assignedGroupId || null
      }

      // Create new attendance record
      attendance = await prisma.campAttendance.create({
        data: {
          campDayId,
          athleteId,
          parentProfileId,
          registrationId,
          groupId,
          status: 'checked_in',
          checkInTime: new Date(),
          checkInMethod: method as CheckMethod,
          checkInByUserId: checkedInByUserId,
          checkInNotes: notes,
        },
      })
    }

    // Update camp day status if not already in progress
    await prisma.campDay.update({
      where: { id: campDayId },
      data: {
        status: 'in_progress',
      },
    })

    return { data: transformAttendance(attendance), error: null }
  } catch (error) {
    console.error('[checkInAthlete] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Check out an athlete (via pickup token or manual)
 */
export async function checkOutAthlete(params: {
  campDayId: string
  athleteId: string
  method: 'qr' | 'manual'
  checkedOutByUserId: string
  notes?: string
}): Promise<{ data: Attendance | null; error: Error | null }> {
  try {
    const { campDayId, athleteId, method, checkedOutByUserId, notes } = params

    const attendance = await prisma.campAttendance.findFirst({
      where: { campDayId, athleteId },
    })

    if (!attendance) {
      return { data: null, error: new Error('Attendance record not found') }
    }

    if (attendance.status !== 'checked_in') {
      return { data: null, error: new Error('Athlete is not currently checked in') }
    }

    const updated = await prisma.campAttendance.update({
      where: { id: attendance.id },
      data: {
        status: 'checked_out',
        checkOutTime: new Date(),
        checkOutMethod: method as CheckMethod,
        checkOutByUserId: checkedOutByUserId,
        checkOutNotes: notes,
      },
    })

    return { data: transformAttendance(updated), error: null }
  } catch (error) {
    console.error('[checkOutAthlete] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Mark athlete as absent
 */
export async function markAthleteAbsent(params: {
  campDayId: string
  athleteId: string
  markedByUserId: string
  notes?: string
}): Promise<{ data: Attendance | null; error: Error | null }> {
  try {
    const { campDayId, athleteId, markedByUserId, notes } = params

    const attendance = await prisma.campAttendance.findFirst({
      where: { campDayId, athleteId },
    })

    if (!attendance) {
      return { data: null, error: new Error('Attendance record not found') }
    }

    const updated = await prisma.campAttendance.update({
      where: { id: attendance.id },
      data: {
        status: 'absent',
        notes: notes ? `${attendance.notes || ''}\n[Absent] ${notes}`.trim() : attendance.notes,
      },
    })

    return { data: transformAttendance(updated), error: null }
  } catch (error) {
    console.error('[markAthleteAbsent] Error:', error)
    return { data: null, error: error as Error }
  }
}

// ============================================================================
// ATTENDANCE QUERIES
// ============================================================================

/**
 * Get attendance roster for a camp day
 */
export async function getAttendanceRoster(
  campDayId: string
): Promise<{ data: AttendanceWithAthlete[] | null; error: Error | null }> {
  try {
    const records = await prisma.campAttendance.findMany({
      where: { campDayId },
      include: {
        athlete: true,
        group: true,
      },
      orderBy: [
        { status: 'asc' },
        { athlete: { lastName: 'asc' } },
        { athlete: { firstName: 'asc' } },
      ],
    })

    const result: AttendanceWithAthlete[] = records.map(r => ({
      ...transformAttendance(r),
      athlete: {
        id: r.athlete.id,
        first_name: r.athlete.firstName,
        last_name: r.athlete.lastName,
        photo_url: r.athlete.photoUrl,
        medical_notes: r.athlete.medicalNotes,
        allergies: r.athlete.allergies,
        emergency_contact_name: r.athlete.emergencyContactName,
        emergency_contact_phone: r.athlete.emergencyContactPhone,
      },
      group: r.group ? {
        id: r.group.id,
        name: r.group.groupName,
        color: r.group.groupColor,
      } : null,
    }))

    return { data: result, error: null }
  } catch (error) {
    console.error('[getAttendanceRoster] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get attendance stats for a camp day
 */
export async function getAttendanceStats(
  campDayId: string
): Promise<{
  data: {
    registered: number
    checked_in: number
    checked_out: number
    not_arrived: number
    absent: number
    on_site: number
  } | null
  error: Error | null
}> {
  try {
    const records = await prisma.campAttendance.findMany({
      where: { campDayId },
      select: { status: true },
    })

    const stats = {
      registered: records.length,
      checked_in: records.filter(r => r.status === 'checked_in').length,
      checked_out: records.filter(r => r.status === 'checked_out').length,
      not_arrived: records.filter(r => r.status === 'not_arrived').length,
      absent: records.filter(r => r.status === 'absent').length,
      on_site: records.filter(r => r.status === 'checked_in').length, // Currently on site
    }

    return { data: stats, error: null }
  } catch (error) {
    console.error('[getAttendanceStats] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update attendance group assignment
 */
export async function updateAttendanceGroup(
  attendanceId: string,
  groupId: string | null
): Promise<{ data: Attendance | null; error: Error | null }> {
  try {
    const attendance = await prisma.campAttendance.update({
      where: { id: attendanceId },
      data: { groupId },
    })

    return { data: transformAttendance(attendance), error: null }
  } catch (error) {
    console.error('[updateAttendanceGroup] Error:', error)
    return { data: null, error: error as Error }
  }
}

// ============================================================================
// ONBOARDING
// ============================================================================

/**
 * Complete parent onboarding for a camp
 */
export async function completeOnboarding(params: {
  parentProfileId: string
  campId: string
  athleteId: string
  emergencyContactConfirmed: boolean
  medicalInfoConfirmed: boolean
  pickupAuthConfirmed: boolean
  waiverAccepted: boolean
}): Promise<{ data: { completed: boolean }; error: Error | null }> {
  try {
    const { parentProfileId, campId, athleteId, ...flags } = params

    // Upsert onboarding record
    await prisma.parentOnboarding.upsert({
      where: {
        parentProfileId_campId_athleteId: {
          parentProfileId,
          campId,
          athleteId,
        },
      },
      create: {
        parentProfileId,
        campId,
        athleteId,
        emergencyContactConfirmed: flags.emergencyContactConfirmed,
        medicalInfoConfirmed: flags.medicalInfoConfirmed,
        pickupAuthConfirmed: flags.pickupAuthConfirmed,
        waiverAccepted: flags.waiverAccepted,
        waiverAcceptedAt: flags.waiverAccepted ? new Date() : null,
        completedAt: new Date(),
      },
      update: {
        emergencyContactConfirmed: flags.emergencyContactConfirmed,
        medicalInfoConfirmed: flags.medicalInfoConfirmed,
        pickupAuthConfirmed: flags.pickupAuthConfirmed,
        waiverAccepted: flags.waiverAccepted,
        waiverAcceptedAt: flags.waiverAccepted ? new Date() : undefined,
        completedAt: new Date(),
      },
    })

    return { data: { completed: true }, error: null }
  } catch (error) {
    console.error('[completeOnboarding] Error:', error)
    return { data: { completed: false }, error: error as Error }
  }
}

/**
 * Get onboarding status for an athlete at a camp
 */
export async function getOnboardingStatus(
  parentProfileId: string,
  campId: string,
  athleteId: string
): Promise<{
  data: {
    has_completed: boolean
    emergency_contact_confirmed: boolean
    medical_info_confirmed: boolean
    pickup_auth_confirmed: boolean
    waiver_accepted: boolean
    completed_at: string | null
  } | null
  error: Error | null
}> {
  try {
    const onboarding = await prisma.parentOnboarding.findUnique({
      where: {
        parentProfileId_campId_athleteId: {
          parentProfileId,
          campId,
          athleteId,
        },
      },
    })

    if (!onboarding) {
      return {
        data: {
          has_completed: false,
          emergency_contact_confirmed: false,
          medical_info_confirmed: false,
          pickup_auth_confirmed: false,
          waiver_accepted: false,
          completed_at: null,
        },
        error: null,
      }
    }

    return {
      data: {
        has_completed: !!onboarding.completedAt,
        emergency_contact_confirmed: onboarding.emergencyContactConfirmed,
        medical_info_confirmed: onboarding.medicalInfoConfirmed,
        pickup_auth_confirmed: onboarding.pickupAuthConfirmed,
        waiver_accepted: onboarding.waiverAccepted,
        completed_at: onboarding.completedAt?.toISOString() || null,
      },
      error: null,
    }
  } catch (error) {
    console.error('[getOnboardingStatus] Error:', error)
    return { data: null, error: error as Error }
  }
}
