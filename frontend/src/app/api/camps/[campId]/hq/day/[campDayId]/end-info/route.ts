/**
 * Camp Day End Info API
 *
 * GET /api/camps/[campId]/hq/day/[campDayId]/end-info - Get information before ending a day
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/client'

interface EndDayInfo {
  day_number: number
  date: string
  camp_day_id: string
  camp_name: string
  stats: {
    checked_in: number
    checked_out: number
    on_site: number
    not_arrived: number
    absent: number
  }
  on_site_campers?: Array<{
    name: string
    registration_id: string
  }>
  existing_recap?: {
    word_of_the_day: string | null
    primary_sport: string | null
    secondary_sport: string | null
    guest_speaker: string | null
    notes: string | null
  }
}

interface EndDayWarning {
  type: 'warning' | 'error'
  message: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string; campDayId: string }> }
) {
  try {
    const { campId, campDayId } = await params

    const campDay = await prisma.campDay.findUnique({
      where: { id: campDayId },
      select: {
        id: true,
        campId: true,
        date: true,
        dayNumber: true,
        status: true,
        notes: true,
        camp: {
          select: {
            id: true,
            name: true,
          },
        },
        recap: true,
        attendance: {
          select: {
            id: true,
            status: true,
            registrationId: true,
            athlete: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    })

    if (!campDay) {
      return NextResponse.json(
        { error: 'Camp day not found' },
        { status: 404 }
      )
    }

    if (campDay.campId !== campId) {
      return NextResponse.json(
        { error: 'Camp day does not belong to this camp' },
        { status: 400 }
      )
    }

    const warnings: EndDayWarning[] = []

    // Check if day is already finished
    if (campDay.status === 'finished') {
      warnings.push({
        type: 'error',
        message: 'This day has already been completed.',
      })
    }

    // Check if day has not started
    if (campDay.status === 'not_started') {
      warnings.push({
        type: 'error',
        message: 'This day has not been started yet.',
      })
    }

    // Calculate stats
    const stats = {
      checked_in: campDay.attendance.filter((a) => a.status === 'checked_in').length,
      checked_out: campDay.attendance.filter((a) => a.status === 'checked_out').length,
      on_site: campDay.attendance.filter((a) => a.status === 'checked_in').length,
      not_arrived: campDay.attendance.filter((a) => a.status === 'not_arrived').length,
      absent: campDay.attendance.filter((a) => a.status === 'absent').length,
    }

    // Get on-site camper names
    const onSiteCampers = campDay.attendance
      .filter((a) => a.status === 'checked_in')
      .map((a) => ({
        name: a.athlete
          ? `${a.athlete.firstName} ${a.athlete.lastName}`
          : 'Unknown',
        registration_id: a.registrationId,
      }))

    if (stats.on_site > 0) {
      warnings.push({
        type: 'warning',
        message: `${stats.on_site} camper${stats.on_site !== 1 ? 's are' : ' is'} still checked in and not yet checked out.`,
      })
    }

    // Check for high absence rate
    const totalExpected = stats.checked_in + stats.checked_out + stats.not_arrived + stats.absent
    if (totalExpected > 0) {
      const absenceRate = ((stats.absent + stats.not_arrived) / totalExpected) * 100
      if (absenceRate > 20) {
        warnings.push({
          type: 'warning',
          message: `High absence rate today: ${absenceRate.toFixed(0)}% of campers did not attend.`,
        })
      }
    }

    const info: EndDayInfo = {
      day_number: campDay.dayNumber,
      date: campDay.date.toISOString().split('T')[0],
      camp_day_id: campDay.id,
      camp_name: campDay.camp.name,
      stats,
      on_site_campers: onSiteCampers,
      existing_recap: campDay.recap
        ? {
            word_of_the_day: campDay.recap.wordOfTheDay,
            primary_sport: campDay.recap.primarySport,
            secondary_sport: campDay.recap.secondarySport,
            guest_speaker: campDay.recap.guestSpeakerName,
            notes: campDay.notes,
          }
        : undefined,
    }

    return NextResponse.json({
      data: {
        info,
        warnings,
      },
    })
  } catch (error) {
    console.error('[GET /api/camps/[campId]/hq/day/[campDayId]/end-info] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
