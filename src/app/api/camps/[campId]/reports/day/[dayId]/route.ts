/**
 * Day Report API
 *
 * GET /api/camps/[campId]/reports/day/[dayId] - Get detailed report for a specific day
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string; dayId: string }> }
) {
  try {
    const { campId, dayId } = await params

    const campDay = await prisma.campDay.findUnique({
      where: { id: dayId },
      include: {
        camp: {
          select: {
            id: true,
            name: true,
          },
        },
        recap: true,
        attendance: {
          select: {
            status: true,
          },
        },
      },
    })

    if (!campDay) {
      return NextResponse.json({ error: 'Camp day not found' }, { status: 404 })
    }

    if (campDay.campId !== campId) {
      return NextResponse.json({ error: 'Camp day does not belong to this camp' }, { status: 400 })
    }

    const stats = {
      total: campDay.attendance.length,
      checkedIn: campDay.attendance.filter((a) => a.status === 'checked_in').length,
      checkedOut: campDay.attendance.filter((a) => a.status === 'checked_out').length,
      absent: campDay.attendance.filter((a) => a.status === 'absent').length,
      notArrived: campDay.attendance.filter((a) => a.status === 'not_arrived').length,
    }

    return NextResponse.json({
      dayNumber: campDay.dayNumber,
      date: campDay.date.toISOString(),
      status: campDay.status,
      notes: campDay.notes,
      recap: campDay.recap
        ? {
            wordOfTheDay: campDay.recap.wordOfTheDay,
            primarySport: campDay.recap.primarySport,
            secondarySport: campDay.recap.secondarySport,
            guestSpeakerName: campDay.recap.guestSpeakerName,
          }
        : undefined,
      stats,
      campName: campDay.camp.name,
    })
  } catch (error) {
    console.error('[GET /api/camps/[campId]/reports/day/[dayId]] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
