/**
 * Camp HQ Staff Requests API
 *
 * GET /api/camps/[campId]/hq/staff/requests - Get pending staff assignment requests for a camp
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStaffAssignmentRequestsForCamp, cancelStaffAssignmentRequest } from '@/lib/services/staffAssignmentRequests'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'

interface RouteParams {
  params: Promise<{ campId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { campId } = await params
    const user = await getAuthenticatedUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status') as 'pending' | 'accepted' | 'declined' | undefined

    const { data, error } = await getStaffAssignmentRequestsForCamp(campId, status || 'pending')

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/camps/[campId]/hq/staff/requests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
