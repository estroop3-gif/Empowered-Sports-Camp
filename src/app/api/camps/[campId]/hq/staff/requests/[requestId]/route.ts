/**
 * Camp HQ Staff Request by ID API
 *
 * DELETE /api/camps/[campId]/hq/staff/requests/[requestId] - Cancel a pending request
 */

import { NextRequest, NextResponse } from 'next/server'
import { cancelStaffAssignmentRequest } from '@/lib/services/staffAssignmentRequests'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'

interface RouteParams {
  params: Promise<{ campId: string; requestId: string }>
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { requestId } = await params
    const user = await getAuthenticatedUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { success, error } = await cancelStaffAssignmentRequest(requestId, user.id)

    if (!success) {
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] DELETE /api/camps/[campId]/hq/staff/requests/[requestId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
