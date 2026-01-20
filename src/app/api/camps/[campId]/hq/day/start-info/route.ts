/**
 * Camp Day Start Info API
 *
 * GET /api/camps/[campId]/hq/day/start-info - Get information before starting a day
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/client'

interface StartDayInfo {
  day_number: number
  date: string
  registered_count: number
  camp_name: string
  start_time: string | null
  end_time: string | null
  previous_day?: {
    day_number: number
    unchecked_out_count: number
    camper_names?: string[]
  }
}

interface StartDayWarning {
  type: 'warning' | 'error'
  message: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const { campId } = await params

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        startTime: true,
        endTime: true,
        status: true,
        isLocked: true,
        registrations: {
          where: { status: 'confirmed' },
          select: { id: true },
        },
        campDays: {
          orderBy: { date: 'desc' },
          take: 2,
          select: {
            id: true,
            date: true,
            dayNumber: true,
            status: true,
            attendance: {
              where: { status: 'checked_in' },
              select: {
                id: true,
                status: true,
                athlete: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
    })

    if (!camp) {
      return NextResponse.json(
        { error: 'Camp not found' },
        { status: 404 }
      )
    }

    const warnings: StartDayWarning[] = []

    // Check if camp is locked
    if (camp.isLocked) {
      warnings.push({
        type: 'error',
        message: 'This camp is locked and cannot be modified.',
      })
    }

    // Check camp date range
    const startDate = new Date(camp.startDate)
    const endDate = new Date(camp.endDate)
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(0, 0, 0, 0)

    if (today < startDate) {
      warnings.push({
        type: 'error',
        message: `Camp has not started yet. It begins on ${startDate.toLocaleDateString()}.`,
      })
    }

    if (today > endDate) {
      warnings.push({
        type: 'error',
        message: 'Camp has already ended.',
      })
    }

    // Check if day already in progress
    const todayDay = camp.campDays.find(
      (d) => d.date.toISOString().split('T')[0] === today.toISOString().split('T')[0]
    )

    if (todayDay?.status === 'in_progress') {
      warnings.push({
        type: 'error',
        message: 'Day is already in progress.',
      })
    }

    if (todayDay?.status === 'finished') {
      warnings.push({
        type: 'error',
        message: 'Day has already been completed.',
      })
    }

    // Calculate day number
    const dayNumber = Math.floor(
      (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1

    // Check for previous day unchecked-out campers
    let previousDayInfo: StartDayInfo['previous_day'] | undefined

    const previousDay = camp.campDays.find(
      (d) => d.date.toISOString().split('T')[0] < today.toISOString().split('T')[0]
    )

    if (previousDay && previousDay.attendance.length > 0) {
      const uncheckedOutCampers = previousDay.attendance.filter(
        (a) => a.status === 'checked_in'
      )

      if (uncheckedOutCampers.length > 0) {
        warnings.push({
          type: 'warning',
          message: `${uncheckedOutCampers.length} camper${uncheckedOutCampers.length !== 1 ? 's were' : ' was'} not checked out from the previous day.`,
        })

        previousDayInfo = {
          day_number: previousDay.dayNumber,
          unchecked_out_count: uncheckedOutCampers.length,
          camper_names: uncheckedOutCampers.map((a) =>
            a.athlete
              ? `${a.athlete.firstName} ${a.athlete.lastName}`
              : 'Unknown'
          ),
        }
      }
    }

    // Check registration count
    if (camp.registrations.length === 0) {
      warnings.push({
        type: 'warning',
        message: 'No campers are registered for this camp.',
      })
    }

    const info: StartDayInfo = {
      day_number: dayNumber,
      date: today.toISOString().split('T')[0],
      registered_count: camp.registrations.length,
      camp_name: camp.name,
      start_time: camp.startTime?.toISOString().split('T')[1]?.slice(0, 5) || null,
      end_time: camp.endTime?.toISOString().split('T')[1]?.slice(0, 5) || null,
      previous_day: previousDayInfo,
    }

    return NextResponse.json({
      data: {
        info,
        warnings,
      },
    })
  } catch (error) {
    console.error('[GET /api/camps/[campId]/hq/day/start-info] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
