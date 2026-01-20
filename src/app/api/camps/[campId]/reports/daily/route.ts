/**
 * Comprehensive Daily Report API
 *
 * GET /api/camps/[campId]/reports/daily - Get complete camp report with all data
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
          include: {
            athlete: true,
            registrationAddons: {
              include: {
                addon: true,
              },
            },
          },
        },
        campDays: {
          orderBy: { dayNumber: 'asc' },
          include: {
            recap: true,
            attendance: {
              include: {
                athlete: true,
              },
            },
          },
        },
        guestSpeakers: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!camp) {
      return NextResponse.json({ error: 'Camp not found' }, { status: 404 })
    }

    // ==================== REGISTRATION STATS ====================
    const confirmedRegistrations = camp.registrations.filter(
      (r) => r.status === 'confirmed'
    ).length
    const pendingRegistrations = camp.registrations.filter(
      (r) => r.status === 'pending'
    ).length
    const cancelledRegistrations = camp.registrations.filter(
      (r) => r.status === 'cancelled'
    ).length

    // Grade distribution (only confirmed)
    const gradeMap = new Map<string, number>()
    camp.registrations
      .filter((r) => r.status === 'confirmed')
      .forEach((r) => {
        const grade = r.athlete.grade || 'Unknown'
        gradeMap.set(grade, (gradeMap.get(grade) || 0) + 1)
      })
    const gradeDistribution = Array.from(gradeMap.entries())
      .map(([grade, count]) => ({ grade, count }))
      .sort((a, b) => {
        const aNum = parseInt(a.grade)
        const bNum = parseInt(b.grade)
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum
        return a.grade.localeCompare(b.grade)
      })

    // Gender distribution (only confirmed)
    const genderMap = new Map<string, number>()
    camp.registrations
      .filter((r) => r.status === 'confirmed')
      .forEach((r) => {
        const gender = r.athlete.gender || 'Unknown'
        genderMap.set(gender, (genderMap.get(gender) || 0) + 1)
      })
    const genderDistribution = Array.from(genderMap.entries())
      .map(([gender, count]) => ({ gender, count }))
      .sort((a, b) => b.count - a.count)

    // Add-ons revenue
    let addonsRevenue = 0
    camp.registrations.forEach((r) => {
      r.registrationAddons.forEach((ra) => {
        addonsRevenue += ra.priceCents || 0
      })
    })

    // ==================== ATTENDANCE & DAY STATS ====================
    const completedDays = camp.campDays.filter((d) => d.status === 'finished')

    // Collect all sports, words, and speakers from recaps
    const sportsSet = new Set<string>()
    const wordsSet = new Set<string>()

    completedDays.forEach((day) => {
      if (day.recap?.primarySport) sportsSet.add(day.recap.primarySport)
      if (day.recap?.secondarySport) sportsSet.add(day.recap.secondarySport)
      if (day.recap?.wordOfTheDay) wordsSet.add(day.recap.wordOfTheDay)
    })

    // Calculate overall attendance stats
    let totalAttended = 0
    let totalAbsent = 0
    let totalRecords = 0

    // Build detailed day summaries
    const daysSummary = camp.campDays.map((day) => {
      const checkedIn = day.attendance.filter((a) => a.status === 'checked_in').length
      const checkedOut = day.attendance.filter((a) => a.status === 'checked_out').length
      const absent = day.attendance.filter((a) => a.status === 'absent').length
      const notArrived = day.attendance.filter((a) => a.status === 'not_arrived').length
      const attended = checkedIn + checkedOut

      if (day.status === 'finished') {
        totalAttended += attended
        totalAbsent += absent
        totalRecords += day.attendance.length
      }

      return {
        id: day.id,
        dayNumber: day.dayNumber,
        date: day.date.toISOString(),
        status: day.status,
        title: day.title,
        notes: day.notes,
        stats: {
          total: day.attendance.length,
          checkedIn,
          checkedOut,
          attended,
          absent,
          notArrived,
          attendanceRate: day.attendance.length > 0
            ? (attended / day.attendance.length) * 100
            : 0,
        },
        recap: day.recap ? {
          dayTheme: day.recap.dayTheme,
          wordOfTheDay: day.recap.wordOfTheDay,
          wordOfTheDayExample: day.recap.wordOfTheDayExample,
          primarySport: day.recap.primarySport,
          primarySportFocus: day.recap.primarySportFocus,
          secondarySport: day.recap.secondarySport,
          secondarySportFocus: day.recap.secondarySportFocus,
          guestSpeakerName: day.recap.guestSpeakerName,
          guestSpeakerTitle: day.recap.guestSpeakerTitle,
          guestSpeakerTopic: day.recap.guestSpeakerTopic,
          pinkPointSkill: day.recap.pinkPointSkill,
          purplePointSkill: day.recap.purplePointSkill,
          highlights: day.recap.highlights,
          tomorrowSport1: day.recap.tomorrowSport1,
          tomorrowSport2: day.recap.tomorrowSport2,
          tomorrowWordOfTheDay: day.recap.tomorrowWordOfTheDay,
        } : null,
      }
    })

    const averageAttendance = completedDays.length > 0
      ? totalAttended / completedDays.length
      : 0
    const averageAttendanceRate = totalRecords > 0
      ? (totalAttended / totalRecords) * 100
      : 0

    // ==================== GUEST SPEAKERS ====================
    const guestSpeakers = camp.guestSpeakers.map((speaker) => ({
      id: speaker.id,
      name: speaker.name,
      title: speaker.title,
      organization: speaker.organization,
      topic: speaker.topic,
      speakerDate: speaker.speakerDate?.toISOString() || null,
      isHighProfile: speaker.isHighProfile,
    }))

    return NextResponse.json({
      // Camp Info
      campId: camp.id,
      campName: camp.name,
      startDate: camp.startDate.toISOString(),
      endDate: camp.endDate.toISOString(),
      status: camp.status,

      // Registration Summary
      registration: {
        total: camp.registrations.length,
        confirmed: confirmedRegistrations,
        pending: pendingRegistrations,
        cancelled: cancelledRegistrations,
        gradeDistribution,
        genderDistribution,
        addonsRevenue,
      },

      // Attendance Summary
      attendance: {
        totalDays: camp.campDays.length,
        completedDays: completedDays.length,
        averageAttendance: Math.round(averageAttendance),
        averageAttendanceRate,
        totalAbsences: totalAbsent,
      },

      // Session Highlights
      highlights: {
        sports: Array.from(sportsSet),
        wordsOfTheDay: Array.from(wordsSet),
        guestSpeakers,
      },

      // Detailed Day Breakdown
      days: daysSummary,
    })
  } catch (error) {
    console.error('[GET /api/camps/[campId]/reports/daily] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
