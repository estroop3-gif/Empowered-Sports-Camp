/**
 * Grouping API - Update Group
 *
 * PATCH /api/grouping/[campId]/group - Update group name
 */

import { NextRequest, NextResponse } from 'next/server'
import { updateGroupName } from '@/lib/services/grouping'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import prisma from '@/lib/db/client'

interface UpdateGroupRequest {
  group_id: string
  name: string
}

export async function PATCH(
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

    // Check role
    if (!['director', 'coach', 'hq_admin', 'licensee_owner'].includes(user.role || '')) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    const { campId } = await params

    // Verify camp exists and user has access
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

    const body: UpdateGroupRequest = await request.json()

    if (!body.group_id || !body.name) {
      return NextResponse.json(
        { error: 'group_id and name are required' },
        { status: 400 }
      )
    }

    const { data, error } = await updateGroupName(body.group_id, body.name)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[PATCH /api/grouping/[campId]/group] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
