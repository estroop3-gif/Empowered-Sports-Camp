/**
 * Camp Check-In Status API
 *
 * GET /api/camp-checkin/status?campId={campId}
 *
 * Returns the check-in status for the current parent user,
 * including which athletes are registered and their check-in status.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCheckInStatus } from '@/lib/services/attendance'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get camp ID from query
    const campId = request.nextUrl.searchParams.get('campId')
    if (!campId) {
      return NextResponse.json(
        { error: 'Camp ID is required' },
        { status: 400 }
      )
    }

    // Get check-in status
    const { data, error } = await getCheckInStatus(campId, user.id)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[GET /api/camp-checkin/status] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
