/**
 * Staff Assignment Requests API
 *
 * GET /api/staff/assignment-requests - Get assignment requests for the current user
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStaffAssignmentRequestsForUser } from '@/lib/services/staffAssignmentRequests'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status') as 'pending' | 'accepted' | 'declined' | undefined

    const { data, error } = await getStaffAssignmentRequestsForUser(user.id, status || undefined)

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/staff/assignment-requests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
