/**
 * Attendance Report API
 *
 * GET /api/camps/[campId]/reports/attendance - Get attendance report for a camp
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

    const totalRegistrations = camp.registrations.length
    const completedDays = camp.campDays.filter((d) => d.status === 'finished')

    // Calculate stats for each day
    const days = camp.campDays.map((day) => {
      const attended = day.attendance.filter(
        (a) => a.status === 'checked_in' || a.status === 'checked_out'
      ).length
      const absent = day.attendance.filter((a) => a.status === 'absent').length
      const total = day.attendance.length

      return {
        dayNumber: day.dayNumber,
        date: day.date.toISOString(),
        status: day.status,
        stats: {
          total,
          attended,
          absent,
          attendanceRate: total > 0 ? (attended / total) * 100 : 0,
        },
      }
    })

    // Calculate overall stats
    const completedDaysStats = days.filter((d) => d.status === 'finished')
    const averageAttendance =
      completedDaysStats.length > 0
        ? completedDaysStats.reduce((sum, d) => sum + d.stats.attended, 0) / completedDaysStats.length
        : 0
    const averageAttendanceRate =
      completedDaysStats.length > 0
        ? completedDaysStats.reduce((sum, d) => sum + d.stats.attendanceRate, 0) / completedDaysStats.length
        : 0

    return NextResponse.json({
      campName: camp.name,
      totalDays: camp.campDays.length,
      completedDays: completedDays.length,
      overallStats: {
        totalRegistrations,
        averageAttendance: Math.round(averageAttendance),
        averageAttendanceRate,
      },
      days,
    })
  } catch (error) {
    console.error('[GET /api/camps/[campId]/reports/attendance] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
