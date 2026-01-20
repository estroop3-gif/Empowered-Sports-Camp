/**
 * Camp Day Attendance API
 *
 * GET /api/camp-days/[campDayId]/attendance - Get attendance roster
 * POST /api/camp-days/[campDayId]/attendance - Manual check-in by staff
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getAttendanceRoster,
  getAttendanceStats,
  checkInAthlete,
  markAthleteAbsent,
} from '@/lib/services/attendance'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import prisma from '@/lib/db/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campDayId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { campDayId } = await params
    const includeStats = request.nextUrl.searchParams.get('stats') === 'true'

    // Get attendance roster
    const { data: roster, error } = await getAttendanceRoster(campDayId)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Optionally include stats
    let stats = null
    if (includeStats) {
      const statsResult = await getAttendanceStats(campDayId)
      stats = statsResult.data
    }

    return NextResponse.json({
      data: {
        roster,
        stats,
      },
    })
  } catch (error) {
    console.error('[GET /api/camp-days/[campDayId]/attendance] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campDayId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check role - only staff can manually check in
    if (!['director', 'coach', 'hq_admin', 'licensee_owner'].includes(user.role || '')) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    const { campDayId } = await params
    const body = await request.json()
    const { athlete_id, action, notes } = body

    if (!athlete_id) {
      return NextResponse.json(
        { error: 'Athlete ID is required' },
        { status: 400 }
      )
    }

    if (action === 'absent') {
      const { data, error } = await markAthleteAbsent({
        campDayId,
        athleteId: athlete_id,
        markedByUserId: user.id,
        notes,
      })

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }

      return NextResponse.json({ data })
    }

    // Default action: check in
    // Get registration info for this athlete
    const campDay = await prisma.campDay.findUnique({
      where: { id: campDayId },
      select: { campId: true },
    })

    if (!campDay) {
      return NextResponse.json(
        { error: 'Camp day not found' },
        { status: 404 }
      )
    }

    const registration = await prisma.registration.findFirst({
      where: {
        campId: campDay.campId,
        athleteId: athlete_id,
        status: 'confirmed',
      },
      select: { id: true, parentId: true },
    })

    if (!registration) {
      return NextResponse.json(
        { error: 'Athlete is not registered for this camp' },
        { status: 400 }
      )
    }

    const { data, error } = await checkInAthlete({
      campDayId,
      athleteId: athlete_id,
      parentProfileId: registration.parentId,
      registrationId: registration.id,
      method: 'manual',
      checkedInByUserId: user.id,
      notes,
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[POST /api/camp-days/[campDayId]/attendance] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
