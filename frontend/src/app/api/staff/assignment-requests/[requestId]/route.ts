/**
 * Staff Assignment Request Response API
 *
 * PATCH /api/staff/assignment-requests/[requestId] - Accept or decline a request
 */

import { NextRequest, NextResponse } from 'next/server'
import { respondToStaffAssignmentRequest } from '@/lib/services/staffAssignmentRequests'
import { notifyStaffAssignmentRequestAccepted, notifyStaffAssignmentRequestDeclined } from '@/lib/services/notifications'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'

interface RouteParams {
  params: Promise<{ requestId: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { requestId } = await params
    const user = await getAuthenticatedUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { response } = body

    if (!response || !['accepted', 'declined'].includes(response)) {
      return NextResponse.json({ error: 'Invalid response. Must be "accepted" or "declined"' }, { status: 400 })
    }

    const { data, error } = await respondToStaffAssignmentRequest(requestId, user.id, response)

    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    // Send notification to the requester
    if (data) {
      const notifyFn = response === 'accepted'
        ? notifyStaffAssignmentRequestAccepted
        : notifyStaffAssignmentRequestDeclined

      notifyFn({
        userId: data.requested_by_user_id,
        tenantId: data.tenant_id,
        campId: data.camp_id,
        campName: data.camp_name,
        staffName: data.requested_user_name,
        role: data.role,
      }).catch((err) => console.error('[API] Failed to send notification:', err))
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] PATCH /api/staff/assignment-requests/[requestId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
