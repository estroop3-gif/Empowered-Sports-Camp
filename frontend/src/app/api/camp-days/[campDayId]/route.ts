/**
 * Camp Day Detail API
 *
 * GET /api/camp-days/[campDayId] - Get camp day with full details
 * PATCH /api/camp-days/[campDayId] - Update camp day (status, notes)
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getCampDayWithDetails,
  updateCampDayStatus,
  updateCampDayNotes,
  markCampDayComplete,
  initializeAttendance,
} from '@/lib/services/camp-days'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { CampDayStatus } from '@/generated/prisma'

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

    // Get camp day with details
    const { data, error } = await getCampDayWithDetails(campDayId)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }

    // Initialize attendance if empty
    if (data && data.attendance.length === 0) {
      await initializeAttendance(campDayId)
      // Re-fetch with updated attendance
      const { data: refreshed } = await getCampDayWithDetails(campDayId)
      return NextResponse.json({ data: refreshed })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[GET /api/camp-days/[campDayId]] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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

    // Check role - only director, coach, or admin can update
    if (!['director', 'coach', 'hq_admin', 'licensee_owner'].includes(user.role || '')) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    const { campDayId } = await params
    const body = await request.json()

    // Handle different update types
    if (body.action === 'complete') {
      const { data, error } = await markCampDayComplete(
        campDayId,
        user.id,
        body.notes,
        body.recapData // Pass recap data for daily email
      )

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }

      return NextResponse.json({ data })
    }

    if (body.status) {
      const { data, error } = await updateCampDayStatus(
        campDayId,
        body.status as CampDayStatus,
        user.id
      )

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }

      return NextResponse.json({ data })
    }

    if (body.notes !== undefined) {
      const { data, error } = await updateCampDayNotes(
        campDayId,
        body.notes
      )

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }

      return NextResponse.json({ data })
    }

    return NextResponse.json(
      { error: 'No valid update provided' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[PATCH /api/camp-days/[campDayId]] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
