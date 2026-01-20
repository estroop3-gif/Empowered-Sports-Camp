/**
 * Session Report API
 *
 * GET /api/camps/[campId]/reports/session - Get complete camp session report
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const { campId } = await params

    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      include: {
        registrations: {
          where: { status: 'confirmed' },
          select: { id: true },
        },
        campDays: {
          orderBy: { dayNumber: 'asc' },
          include: {
            recap: true,
            attendance: {
              select: { status: true },
            },
          },
        },
      },
    })

    if (!camp) {
      return NextResponse.json({ error: 'Camp not found' }, { status: 404 })
    }

    const completedDays = camp.campDays.filter((d) => d.status === 'finished')
    const totalRegistrations = camp.registrations.length

    // Collect all sports, words, and speakers
    const sportsSet = new Set<string>()
    const wordsSet = new Set<string>()
    const speakersSet = new Set<string>()

    completedDays.forEach((day) => {
      if (day.recap?.primarySport) sportsSet.add(day.recap.primarySport)
      if (day.recap?.secondarySport) sportsSet.add(day.recap.secondarySport)
      if (day.recap?.wordOfTheDay) wordsSet.add(day.recap.wordOfTheDay)
      if (day.recap?.guestSpeakerName) speakersSet.add(day.recap.guestSpeakerName)
    })

    // Calculate stats
    let totalAttended = 0
    let totalAbsent = 0
    let totalRecords = 0

    const daysSummary = completedDays.map((day) => {
      const attended = day.attendance.filter(
        (a) => a.status === 'checked_in' || a.status === 'checked_out'
      ).length
      const absent = day.attendance.filter((a) => a.status === 'absent').length

      totalAttended += attended
      totalAbsent += absent
      totalRecords += day.attendance.length

      return {
        dayNumber: day.dayNumber,
        date: day.date.toISOString(),
        wordOfTheDay: day.recap?.wordOfTheDay,
        primarySport: day.recap?.primarySport,
        attended,
        absent,
      }
    })

    const averageAttendance = completedDays.length > 0 ? totalAttended / completedDays.length : 0
    const averageAttendanceRate =
      totalRecords > 0 ? (totalAttended / totalRecords) * 100 : 0

    return NextResponse.json({
      campName: camp.name,
      startDate: camp.startDate.toISOString(),
      endDate: camp.endDate.toISOString(),
      status: camp.status,
      totalDays: camp.campDays.length,
      completedDays: completedDays.length,
      stats: {
        totalRegistrations,
        averageAttendance: Math.round(averageAttendance),
        averageAttendanceRate,
        totalAbsences: totalAbsent,
      },
      sports: Array.from(sportsSet),
      wordsOfTheDay: Array.from(wordsSet),
      guestSpeakers: Array.from(speakersSet),
      daysSummary,
    })
  } catch (error) {
    console.error('[GET /api/camps/[campId]/reports/session] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
