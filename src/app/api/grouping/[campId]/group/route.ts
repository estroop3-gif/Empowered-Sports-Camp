/**
 * Grouping API - Group Management
 *
 * POST /api/grouping/[campId]/group - Add a new group
 * PATCH /api/grouping/[campId]/group - Update group name (legacy)
 * PUT /api/grouping/[campId]/group - Update a group (name, color)
 * DELETE /api/grouping/[campId]/group - Remove a group
 */

import { NextRequest, NextResponse } from 'next/server'
import { addGroup, removeGroup, updateGroup, updateGroupName } from '@/lib/services/grouping'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import prisma from '@/lib/db/client'

// Helper to verify access
async function verifyAccess(request: NextRequest, campId: string) {
  const user = await getAuthenticatedUserFromRequest(request)
  if (!user) {
    return { error: 'Not authenticated', status: 401 }
  }

  // Check role - only staff can manage groups
  if (!['director', 'coach', 'hq_admin', 'licensee_owner'].includes(user.role || '')) {
    return { error: 'Not authorized', status: 403 }
  }

  // Verify user has access to this camp
  const camp = await prisma.camp.findUnique({
    where: { id: campId },
    select: { tenantId: true, groupingFinalizedAt: true },
  })

  if (!camp) {
    return { error: 'Camp not found', status: 404 }
  }

  // Check tenant access (skip for hq_admin)
  if (user.role !== 'hq_admin' && user.tenantId && camp.tenantId !== user.tenantId) {
    return { error: 'Not authorized to access this camp', status: 403 }
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
      return { error: 'Not assigned to this camp', status: 403 }
    }
  }

  return { user, camp }
}

// POST - Add a new group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const { campId } = await params
    const access = await verifyAccess(request, campId)

    if ('error' in access) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    // Check if grouping is finalized
    if (access.camp.groupingFinalizedAt) {
      return NextResponse.json(
        { error: 'Grouping has been finalized. Unfinalize to make changes.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { groupName, groupColor } = body

    const { data, error } = await addGroup(campId, { groupName, groupColor })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[POST /api/grouping/[campId]/group] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update group name (legacy support)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const { campId } = await params
    const access = await verifyAccess(request, campId)

    if ('error' in access) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    // Check if grouping is finalized
    if (access.camp.groupingFinalizedAt) {
      return NextResponse.json(
        { error: 'Grouping has been finalized. Unfinalize to make changes.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { group_id, name } = body

    if (!group_id || !name) {
      return NextResponse.json(
        { error: 'group_id and name are required' },
        { status: 400 }
      )
    }

    const { data, error } = await updateGroupName(group_id, name)

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

// PUT - Update a group (name and/or color)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const { campId } = await params
    const access = await verifyAccess(request, campId)

    if ('error' in access) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    // Check if grouping is finalized
    if (access.camp.groupingFinalizedAt) {
      return NextResponse.json(
        { error: 'Grouping has been finalized. Unfinalize to make changes.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { groupId, groupName, groupColor } = body

    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      )
    }

    // Verify group belongs to this camp
    const group = await prisma.campGroup.findFirst({
      where: { id: groupId, campId },
    })

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    const { data, error } = await updateGroup(groupId, { groupName, groupColor })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[PUT /api/grouping/[campId]/group] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const { campId } = await params
    const access = await verifyAccess(request, campId)

    if ('error' in access) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    // Check if grouping is finalized
    if (access.camp.groupingFinalizedAt) {
      return NextResponse.json(
        { error: 'Grouping has been finalized. Unfinalize to make changes.' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')

    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      )
    }

    // Verify group belongs to this camp
    const group = await prisma.campGroup.findFirst({
      where: { id: groupId, campId },
    })

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    // Check if this is the last group
    const groupCount = await prisma.campGroup.count({
      where: { campId },
    })

    if (groupCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last group' },
        { status: 400 }
      )
    }

    const { data, error } = await removeGroup(groupId)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[DELETE /api/grouping/[campId]/group] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
