/**
 * Grouping API - Update Assignments
 *
 * POST /api/grouping/[campId]/update - Update group assignments (drag-and-drop)
 */

import { NextRequest, NextResponse } from 'next/server'
import { updateGroupingAssignments } from '@/lib/services/grouping'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import prisma from '@/lib/db/client'

interface UpdateRequest {
  updates: Array<{
    camper_session_id: string
    new_group_id: string | null
    override_acknowledged?: boolean
    override_note?: string
  }>
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check role - only staff can update grouping
    if (!['director', 'coach', 'hq_admin', 'licensee_owner'].includes(user.role || '')) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    const { campId } = await params

    // Verify user has access to this camp
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: { tenantId: true },
    })

    if (!camp) {
      return NextResponse.json(
        { error: 'Camp not found' },
        { status: 404 }
      )
    }

    // Check tenant access (skip for hq_admin)
    if (user.role !== 'hq_admin' && user.tenantId && camp.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: 'Not authorized to access this camp' },
        { status: 403 }
      )
    }

    // Check director/coach assignment
    if (user.role === 'director' || user.role === 'coach') {
      const assignment = await prisma.campStaffAssignment.findFirst({
        where: {
          campId,
          userId: user.id,
        },
      })

      if (!assignment) {
        return NextResponse.json(
          { error: 'Not assigned to this camp' },
          { status: 403 }
        )
      }
    }

    const body: UpdateRequest = await request.json()

    if (!body.updates || !Array.isArray(body.updates)) {
      return NextResponse.json(
        { error: 'Invalid request: updates array required' },
        { status: 400 }
      )
    }

    const { data, error } = await updateGroupingAssignments({
      camp_id: campId,
      updates: body.updates,
      user_id: user.id,
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[POST /api/grouping/[campId]/update] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
