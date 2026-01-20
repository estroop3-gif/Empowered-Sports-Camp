/**
 * Camp HQ Staff Assignment API
 *
 * PUT /api/camps/[campId]/hq/staff/[assignmentId] - Update a staff assignment
 * DELETE /api/camps/[campId]/hq/staff/[assignmentId] - Remove a staff assignment
 */

import { NextRequest, NextResponse } from 'next/server'
import { updateStaffAssignment, removeStaffAssignment } from '@/lib/services/campHq'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'

interface RouteParams {
  params: Promise<{ campId: string; assignmentId: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { assignmentId } = await params
    const user = await getAuthenticatedUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { data, error } = await updateStaffAssignment(assignmentId, body)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] PUT /api/camps/[campId]/hq/staff/[assignmentId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { assignmentId } = await params
    const user = await getAuthenticatedUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await removeStaffAssignment(assignmentId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] DELETE /api/camps/[campId]/hq/staff/[assignmentId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
