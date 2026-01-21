/**
 * Camp Days Service
 *
 * Handles camp day CRUD operations, including auto-creation of camp days
 * for camp sessions and retrieving camp day information with stats.
 */

import prisma from '@/lib/db/client'
import { CampDayStatus, Prisma } from '@/generated/prisma'
import { sendDailyRecapEmail, sendSessionRecapEmail } from '@/lib/services/email'

// ============================================================================
// TYPES
// ============================================================================

export interface CampDay {
  id: string
  camp_id: string
  date: string
  day_number: number
  title: string | null
  status: 'not_started' | 'in_progress' | 'finished'
  notes: string | null
  completed_at: string | null
  completed_by: string | null
  created_at: string
  updated_at: string
}

export interface CampDayWithStats extends CampDay {
  stats: {
    registered: number
    checked_in: number
    checked_out: number
    not_arrived: number
    absent: number
  }
  camp: {
    id: string
    name: string
    slug: string
    start_date: string
    end_date: string
    start_time: string | null
    end_time: string | null
    tenant_id: string | null
  }
  location: {
    id: string
    name: string
    address: string | null
  } | null
}

export interface CampDayWithDetails extends CampDayWithStats {
  attendance: AttendanceRecord[]
  schedule_blocks: ScheduleBlock[]
}

export interface AttendanceRecord {
  id: string
  athlete_id: string
  athlete_name: string
  athlete_photo_url: string | null
  parent_profile_id: string
  group_id: string | null
  group_name: string | null
  group_color: string | null
  status: 'not_arrived' | 'checked_in' | 'checked_out' | 'absent'
  check_in_time: string | null
  check_out_time: string | null
  has_medical_notes: boolean
  has_allergies: boolean
}

export interface ScheduleBlock {
  id: string
  start_time: string
  end_time: string
  label: string
  description: string | null
  location: string | null
  block_type: string
  is_started: boolean
  is_completed: boolean
  started_at: string | null
  completed_at: string | null
}

// ============================================================================
// TRANSFORM FUNCTIONS
// ============================================================================

function transformCampDay(day: Prisma.CampDayGetPayload<{}>): CampDay {
  return {
    id: day.id,
    camp_id: day.campId,
    date: day.date.toISOString().split('T')[0],
    day_number: day.dayNumber,
    title: day.title,
    status: day.status as CampDay['status'],
    notes: day.notes,
    completed_at: day.completedAt?.toISOString() || null,
    completed_by: day.completedBy,
    created_at: day.createdAt.toISOString(),
    updated_at: day.updatedAt.toISOString(),
  }
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get or create a camp day for a specific date
 */
export async function getOrCreateCampDay(
  campId: string,
  date: Date
): Promise<{ data: CampDay | null; error: Error | null }> {
  try {
    // Normalize date to start of day
    const normalizedDate = new Date(date)
    normalizedDate.setHours(0, 0, 0, 0)

    // Try to find existing camp day
    let campDay = await prisma.campDay.findFirst({
      where: {
        campId,
        date: normalizedDate,
      },
    })

    if (!campDay) {
      // Get camp to calculate day number
      const camp = await prisma.camp.findUnique({
        where: { id: campId },
        select: { startDate: true, endDate: true },
      })

      if (!camp) {
        return { data: null, error: new Error('Camp not found') }
      }

      // Check if date is within camp range
      const campStart = new Date(camp.startDate)
      const campEnd = new Date(camp.endDate)
      campStart.setHours(0, 0, 0, 0)
      campEnd.setHours(0, 0, 0, 0)

      if (normalizedDate < campStart || normalizedDate > campEnd) {
        return { data: null, error: new Error('Date is outside camp date range') }
      }

      // Calculate day number (1-indexed)
      const diffTime = normalizedDate.getTime() - campStart.getTime()
      const dayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1

      // Create camp day
      campDay = await prisma.campDay.create({
        data: {
          campId,
          date: normalizedDate,
          dayNumber,
          title: `Day ${dayNumber}`,
          status: 'not_started',
        },
      })
    }

    return { data: transformCampDay(campDay), error: null }
  } catch (error) {
    console.error('[getOrCreateCampDay] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get camp day by ID with stats
 */
export async function getCampDayById(
  campDayId: string
): Promise<{ data: CampDayWithStats | null; error: Error | null }> {
  try {
    const campDay = await prisma.campDay.findUnique({
      where: { id: campDayId },
      include: {
        camp: {
          include: {
            location: true,
          },
        },
        attendance: {
          select: {
            status: true,
          },
        },
      },
    })

    if (!campDay) {
      return { data: null, error: new Error('Camp day not found') }
    }

    // Calculate stats
    const stats = {
      registered: campDay.attendance.length,
      checked_in: campDay.attendance.filter(a => a.status === 'checked_in').length,
      checked_out: campDay.attendance.filter(a => a.status === 'checked_out').length,
      not_arrived: campDay.attendance.filter(a => a.status === 'not_arrived').length,
      absent: campDay.attendance.filter(a => a.status === 'absent').length,
    }

    return {
      data: {
        ...transformCampDay(campDay),
        stats,
        camp: {
          id: campDay.camp.id,
          name: campDay.camp.name,
          slug: campDay.camp.slug,
          start_date: campDay.camp.startDate.toISOString().split('T')[0],
          end_date: campDay.camp.endDate.toISOString().split('T')[0],
          start_time: campDay.camp.startTime?.toISOString().split('T')[1]?.slice(0, 5) || null,
          end_time: campDay.camp.endTime?.toISOString().split('T')[1]?.slice(0, 5) || null,
          tenant_id: campDay.camp.tenantId,
        },
        location: campDay.camp.location ? {
          id: campDay.camp.location.id,
          name: campDay.camp.location.name,
          address: campDay.camp.location.address,
        } : null,
      },
      error: null,
    }
  } catch (error) {
    console.error('[getCampDayById] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get camp days for a specific date (for Today's Camps view)
 */
export async function getCampDaysForDate(options: {
  date: Date
  directorId?: string
  tenantId?: string
}): Promise<{ data: CampDayWithStats[] | null; error: Error | null }> {
  try {
    const { date, directorId, tenantId } = options
    const normalizedDate = new Date(date)
    normalizedDate.setHours(0, 0, 0, 0)

    // Find camps that are running on this date
    const whereClause: Prisma.CampWhereInput = {
      startDate: { lte: normalizedDate },
      endDate: { gte: normalizedDate },
      status: { in: ['registration_open', 'registration_closed', 'in_progress'] },
    }

    if (tenantId) {
      whereClause.tenantId = tenantId
    }

    if (directorId) {
      whereClause.staffAssignments = {
        some: {
          userId: directorId,
          role: { in: ['director', 'coach'] },
        },
      }
    }

    const camps = await prisma.camp.findMany({
      where: whereClause,
      include: {
        location: true,
        campDays: {
          where: { date: normalizedDate },
          include: {
            attendance: {
              select: { status: true },
            },
          },
        },
        registrations: {
          where: { status: 'confirmed' },
          select: { id: true },
        },
      },
    })

    const result: CampDayWithStats[] = []

    for (const camp of camps) {
      // Get or create camp day for this date
      let campDay = camp.campDays[0]

      if (!campDay) {
        // Calculate day number
        const campStart = new Date(camp.startDate)
        campStart.setHours(0, 0, 0, 0)
        const diffTime = normalizedDate.getTime() - campStart.getTime()
        const dayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1

        campDay = await prisma.campDay.create({
          data: {
            campId: camp.id,
            date: normalizedDate,
            dayNumber,
            title: `Day ${dayNumber}`,
            status: 'not_started',
          },
          include: {
            attendance: {
              select: { status: true },
            },
          },
        })
      }

      const stats = {
        registered: camp.registrations.length,
        checked_in: campDay.attendance.filter(a => a.status === 'checked_in').length,
        checked_out: campDay.attendance.filter(a => a.status === 'checked_out').length,
        not_arrived: campDay.attendance.filter(a => a.status === 'not_arrived').length,
        absent: campDay.attendance.filter(a => a.status === 'absent').length,
      }

      result.push({
        id: campDay.id,
        camp_id: camp.id,
        date: campDay.date.toISOString().split('T')[0],
        day_number: campDay.dayNumber,
        title: campDay.title,
        status: campDay.status as CampDay['status'],
        notes: campDay.notes,
        completed_at: campDay.completedAt?.toISOString() || null,
        completed_by: campDay.completedBy,
        created_at: campDay.createdAt.toISOString(),
        updated_at: campDay.updatedAt.toISOString(),
        stats,
        camp: {
          id: camp.id,
          name: camp.name,
          slug: camp.slug,
          start_date: camp.startDate.toISOString().split('T')[0],
          end_date: camp.endDate.toISOString().split('T')[0],
          start_time: camp.startTime?.toISOString().split('T')[1]?.slice(0, 5) || null,
          end_time: camp.endTime?.toISOString().split('T')[1]?.slice(0, 5) || null,
          tenant_id: camp.tenantId,
        },
        location: camp.location ? {
          id: camp.location.id,
          name: camp.location.name,
          address: camp.location.address,
        } : null,
      })
    }

    return { data: result, error: null }
  } catch (error) {
    console.error('[getCampDaysForDate] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get camp day with full details (attendance roster, schedule)
 */
export async function getCampDayWithDetails(
  campDayId: string
): Promise<{ data: CampDayWithDetails | null; error: Error | null }> {
  try {
    const campDay = await prisma.campDay.findUnique({
      where: { id: campDayId },
      include: {
        camp: {
          include: {
            location: true,
            campSessionDays: {
              include: {
                scheduleBlocks: {
                  orderBy: { startTime: 'asc' },
                },
              },
            },
          },
        },
        attendance: {
          include: {
            athlete: true,
            group: true,
          },
        },
        scheduleBlockProgress: true,
      },
    })

    if (!campDay) {
      return { data: null, error: new Error('Camp day not found') }
    }

    // Get schedule blocks for this day
    const campSessionDay = campDay.camp.campSessionDays.find(
      d => d.dayNumber === campDay.dayNumber
    )
    const scheduleBlocks = campSessionDay?.scheduleBlocks || []

    // Map progress to schedule blocks
    const progressMap = new Map(
      campDay.scheduleBlockProgress.map(p => [p.scheduleBlockId, p])
    )

    const stats = {
      registered: campDay.attendance.length,
      checked_in: campDay.attendance.filter(a => a.status === 'checked_in').length,
      checked_out: campDay.attendance.filter(a => a.status === 'checked_out').length,
      not_arrived: campDay.attendance.filter(a => a.status === 'not_arrived').length,
      absent: campDay.attendance.filter(a => a.status === 'absent').length,
    }

    return {
      data: {
        id: campDay.id,
        camp_id: campDay.campId,
        date: campDay.date.toISOString().split('T')[0],
        day_number: campDay.dayNumber,
        title: campDay.title,
        status: campDay.status as CampDay['status'],
        notes: campDay.notes,
        completed_at: campDay.completedAt?.toISOString() || null,
        completed_by: campDay.completedBy,
        created_at: campDay.createdAt.toISOString(),
        updated_at: campDay.updatedAt.toISOString(),
        stats,
        camp: {
          id: campDay.camp.id,
          name: campDay.camp.name,
          slug: campDay.camp.slug,
          start_date: campDay.camp.startDate.toISOString().split('T')[0],
          end_date: campDay.camp.endDate.toISOString().split('T')[0],
          start_time: campDay.camp.startTime?.toISOString().split('T')[1]?.slice(0, 5) || null,
          end_time: campDay.camp.endTime?.toISOString().split('T')[1]?.slice(0, 5) || null,
          tenant_id: campDay.camp.tenantId,
        },
        location: campDay.camp.location ? {
          id: campDay.camp.location.id,
          name: campDay.camp.location.name,
          address: campDay.camp.location.address,
        } : null,
        attendance: campDay.attendance.map(a => ({
          id: a.id,
          athlete_id: a.athleteId,
          athlete_name: `${a.athlete.firstName} ${a.athlete.lastName}`,
          athlete_photo_url: a.athlete.photoUrl,
          parent_profile_id: a.parentProfileId,
          group_id: a.groupId,
          group_name: a.group?.groupName || null,
          group_color: a.group?.groupColor || null,
          status: a.status as AttendanceRecord['status'],
          check_in_time: a.checkInTime?.toISOString() || null,
          check_out_time: a.checkOutTime?.toISOString() || null,
          has_medical_notes: !!a.athlete.medicalNotes,
          has_allergies: !!a.athlete.allergies,
        })),
        schedule_blocks: scheduleBlocks.map(block => {
          const progress = progressMap.get(block.id)
          return {
            id: block.id,
            start_time: block.startTime.toISOString().split('T')[1]?.slice(0, 5) || '',
            end_time: block.endTime.toISOString().split('T')[1]?.slice(0, 5) || '',
            label: block.label,
            description: block.description,
            location: block.location,
            block_type: block.blockType,
            is_started: !!progress?.startedAt,
            is_completed: !!progress?.completedAt,
            started_at: progress?.startedAt?.toISOString() || null,
            completed_at: progress?.completedAt?.toISOString() || null,
          }
        }),
      },
      error: null,
    }
  } catch (error) {
    console.error('[getCampDayWithDetails] Error:', error)
    return { data: null, error: error as Error }
  }
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Update camp day status
 */
export async function updateCampDayStatus(
  campDayId: string,
  status: CampDayStatus,
  userId?: string
): Promise<{ data: CampDay | null; error: Error | null }> {
  try {
    const updateData: Prisma.CampDayUpdateInput = {
      status,
    }

    if (status === 'finished') {
      updateData.completedAt = new Date()
      updateData.completedBy = userId
    }

    const campDay = await prisma.campDay.update({
      where: { id: campDayId },
      data: updateData,
    })

    return { data: transformCampDay(campDay), error: null }
  } catch (error) {
    console.error('[updateCampDayStatus] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Mark camp day as complete
 * - Sets status to 'finished'
 * - Marks remaining not_arrived as 'absent'
 * - Sends daily recap emails to parents
 * - Sends session recap if this is the last day
 */
export async function markCampDayComplete(
  campDayId: string,
  userId: string,
  notes?: string,
  recapData?: {
    dayTheme?: string
    wordOfTheDay?: string
    wordOfTheDayExample?: string
    primarySport?: string
    primarySportFocus?: string
    secondarySport?: string
    secondarySportFocus?: string
    guestSpeakerName?: string
    guestSpeakerTitle?: string
    guestSpeakerTopic?: string
    pinkPointSkill?: string
    purplePointSkill?: string
    tomorrowSport1?: string
    tomorrowSport2?: string
    tomorrowWordOfTheDay?: string
  }
): Promise<{ data: CampDay | null; error: Error | null }> {
  try {
    // Fetch camp day with camp info to determine if last day
    const existingCampDay = await prisma.campDay.findUnique({
      where: { id: campDayId },
      include: {
        camp: {
          select: {
            id: true,
            tenantId: true,
            startDate: true,
            endDate: true,
          },
        },
        recap: true,
      },
    })

    if (!existingCampDay) {
      return { data: null, error: new Error('Camp day not found') }
    }

    const tenantId = existingCampDay.camp.tenantId

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
    const campDay = await prisma.campDay.update({
      where: { id: campDayId },
      data: {
        status: 'finished',
        completedAt: new Date(),
        completedBy: userId,
        notes: notes || undefined,
      },
    })

    // Save or update recap data if provided
    if (recapData && Object.keys(recapData).length > 0 && tenantId) {
      await prisma.campDayRecap.upsert({
        where: { campDayId },
        create: {
          campDayId,
          tenantId,
          submittedByUserId: userId,
          ...recapData,
        },
        update: {
          submittedByUserId: userId,
          ...recapData,
        },
      })
    }

    // Calculate if this is the last day of camp
    const campStart = new Date(existingCampDay.camp.startDate)
    const campEnd = new Date(existingCampDay.camp.endDate)
    campStart.setHours(0, 0, 0, 0)
    campEnd.setHours(0, 0, 0, 0)
    const totalDays = Math.floor((campEnd.getTime() - campStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const isLastDay = existingCampDay.dayNumber === totalDays

    // Send daily recap emails to parents (async - don't block completion)
    if (tenantId) {
      sendDailyRecapEmail({
        campDayId,
        tenantId,
        recapData: recapData || {},
      }).then(({ error }) => {
        if (error) {
          console.error('[markCampDayComplete] Failed to send daily recap emails:', error)
        } else {
          console.log('[markCampDayComplete] Daily recap emails sent for camp day:', campDayId)
        }
      })
    }

    // If this is the last day, also send session recap emails
    if (isLastDay && tenantId) {
      sendSessionRecapEmail({
        campId: existingCampDay.camp.id,
        tenantId,
      }).then(({ error }) => {
        if (error) {
          console.error('[markCampDayComplete] Failed to send session recap emails:', error)
        } else {
          console.log('[markCampDayComplete] Session recap emails sent for camp:', existingCampDay.camp.id)
        }
      })
    }

    return { data: transformCampDay(campDay), error: null }
  } catch (error) {
    console.error('[markCampDayComplete] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update camp day notes
 */
export async function updateCampDayNotes(
  campDayId: string,
  notes: string
): Promise<{ data: CampDay | null; error: Error | null }> {
  try {
    const campDay = await prisma.campDay.update({
      where: { id: campDayId },
      data: { notes },
    })

    return { data: transformCampDay(campDay), error: null }
  } catch (error) {
    console.error('[updateCampDayNotes] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * End camp day with extended options
 * Enhanced version that supports:
 * - Recap data (word of day, sports, guest speaker)
 * - Auto-checkout remaining campers
 * - Generate daily report
 * - Send parent emails
 */
export interface EndDayOptions {
  recap?: {
    word_of_the_day?: string | null
    primary_sport?: string | null
    secondary_sport?: string | null
    guest_speaker?: string | null
    notes?: string | null
  }
  auto_checkout_all?: boolean
  generate_report?: boolean
  send_emails?: boolean
  force?: boolean
}

export async function endCampDayWithOptions(
  campDayId: string,
  userId: string,
  options: EndDayOptions = {}
): Promise<{ data: { success: boolean; report_url?: string } | null; error: Error | null }> {
  try {
    const {
      recap,
      auto_checkout_all = true,
      generate_report = false,
      send_emails = false,
      force = false,
    } = options

    // Fetch camp day with details
    const existingCampDay = await prisma.campDay.findUnique({
      where: { id: campDayId },
      include: {
        camp: {
          select: {
            id: true,
            tenantId: true,
            startDate: true,
            endDate: true,
            isLocked: true,
          },
        },
        attendance: {
          where: { status: 'checked_in' },
          select: { id: true },
        },
        recap: true,
      },
    })

    if (!existingCampDay) {
      return { data: null, error: new Error('Camp day not found') }
    }

    // Check if camp is locked
    if (existingCampDay.camp.isLocked) {
      return { data: null, error: new Error('Camp is locked and cannot be modified') }
    }

    // Check if day is in correct state
    if (existingCampDay.status === 'finished') {
      return { data: null, error: new Error('Day has already been completed') }
    }

    if (existingCampDay.status === 'not_started') {
      return { data: null, error: new Error('Day has not been started') }
    }

    const tenantId = existingCampDay.camp.tenantId

    // Check for campers still on-site
    const onSiteCount = existingCampDay.attendance.length
    if (onSiteCount > 0 && !auto_checkout_all && !force) {
      return {
        data: null,
        error: new Error(`${onSiteCount} camper${onSiteCount !== 1 ? 's are' : ' is'} still on-site. Enable auto-checkout or force end.`),
      }
    }

    // Auto-checkout all remaining campers if requested
    if (auto_checkout_all && onSiteCount > 0) {
      await prisma.campAttendance.updateMany({
        where: {
          campDayId,
          status: 'checked_in',
        },
        data: {
          status: 'checked_out',
          checkOutTime: new Date(),
        },
      })
    }

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
        notes: recap?.notes || undefined,
      },
    })

    // Save or update recap data if provided
    if (recap && tenantId) {
      const recapData = {
        wordOfTheDay: recap.word_of_the_day || undefined,
        primarySport: recap.primary_sport || undefined,
        secondarySport: recap.secondary_sport || undefined,
        guestSpeakerName: recap.guest_speaker || undefined,
      }

      if (Object.values(recapData).some(v => v !== undefined)) {
        await prisma.campDayRecap.upsert({
          where: { campDayId },
          create: {
            campDayId,
            tenantId,
            submittedByUserId: userId,
            ...recapData,
          },
          update: {
            submittedByUserId: userId,
            ...recapData,
          },
        })
      }
    }

    // Calculate if this is the last day of camp
    const campStart = new Date(existingCampDay.camp.startDate)
    const campEnd = new Date(existingCampDay.camp.endDate)
    campStart.setHours(0, 0, 0, 0)
    campEnd.setHours(0, 0, 0, 0)
    const totalDays = Math.floor((campEnd.getTime() - campStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const isLastDay = existingCampDay.dayNumber === totalDays

    // Send daily recap emails to parents (async - don't block completion)
    if (send_emails && tenantId) {
      sendDailyRecapEmail({
        campDayId,
        tenantId,
        recapData: {
          wordOfTheDay: recap?.word_of_the_day || undefined,
          primarySport: recap?.primary_sport || undefined,
          secondarySport: recap?.secondary_sport || undefined,
          guestSpeakerName: recap?.guest_speaker || undefined,
        },
      }).then(({ error }) => {
        if (error) {
          console.error('[endCampDayWithOptions] Failed to send daily recap emails:', error)
        } else {
          console.log('[endCampDayWithOptions] Daily recap emails sent for camp day:', campDayId)
        }
      })
    }

    // If this is the last day, also send session recap emails
    if (isLastDay && send_emails && tenantId) {
      sendSessionRecapEmail({
        campId: existingCampDay.camp.id,
        tenantId,
      }).then(({ error }) => {
        if (error) {
          console.error('[endCampDayWithOptions] Failed to send session recap emails:', error)
        } else {
          console.log('[endCampDayWithOptions] Session recap emails sent for camp:', existingCampDay.camp.id)
        }
      })
    }

    // TODO: Generate daily report PDF if requested
    let reportUrl: string | undefined
    if (generate_report) {
      // Report generation will be implemented in the reports service
      console.log('[endCampDayWithOptions] Report generation requested for camp day:', campDayId)
    }

    return { data: { success: true, report_url: reportUrl }, error: null }
  } catch (error) {
    console.error('[endCampDayWithOptions] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Initialize attendance records for a camp day
 * Creates attendance records for all registered athletes
 */
export async function initializeAttendance(
  campDayId: string
): Promise<{ data: number; error: Error | null }> {
  try {
    const campDay = await prisma.campDay.findUnique({
      where: { id: campDayId },
      include: {
        camp: {
          include: {
            registrations: {
              where: { status: 'confirmed' },
              include: {
                athlete: {
                  include: {
                    camperSessionData: {
                      where: { campId: { not: undefined } },
                    },
                  },
                },
              },
            },
          },
        },
        attendance: {
          select: { athleteId: true },
        },
      },
    })

    if (!campDay) {
      return { data: 0, error: new Error('Camp day not found') }
    }

    // Get existing attendance athlete IDs
    const existingAthleteIds = new Set(campDay.attendance.map(a => a.athleteId))

    // Create attendance for athletes not yet tracked
    const newAttendance = campDay.camp.registrations
      .filter(r => !existingAthleteIds.has(r.athleteId))
      .map(r => {
        // Get group ID from camper session data if available
        const camperData = r.athlete.camperSessionData.find(
          cs => cs.campId === campDay.campId
        )

        return {
          campDayId,
          athleteId: r.athleteId,
          parentProfileId: r.parentId,
          registrationId: r.id,
          groupId: camperData?.assignedGroupId || null,
          status: 'not_arrived' as const,
        }
      })

    if (newAttendance.length > 0) {
      await prisma.campAttendance.createMany({
        data: newAttendance,
      })
    }

    return { data: newAttendance.length, error: null }
  } catch (error) {
    console.error('[initializeAttendance] Error:', error)
    return { data: 0, error: error as Error }
  }
}
