/**
 * Grouping API - Finalize
 *
 * POST /api/grouping/[campId]/finalize - Finalize or unfinalize grouping
 */

import { NextRequest, NextResponse } from 'next/server'
import { finalizeGrouping, unfinalizeGrouping } from '@/lib/services/grouping'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import prisma from '@/lib/db/client'

interface FinalizeRequest {
  action: 'finalize' | 'unfinalize'
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

    // Check role - only director, licensee_owner, or hq_admin can finalize
    if (!['director', 'hq_admin', 'licensee_owner'].includes(user.role || '')) {
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

    // Check director assignment
    if (user.role === 'director') {
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

    const body: FinalizeRequest = await request.json()
    const action = body.action || 'finalize'

    let result

    if (action === 'unfinalize') {
      result = await unfinalizeGrouping(campId)
    } else {
      result = await finalizeGrouping(campId, user.id)
    }

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('[POST /api/grouping/[campId]/finalize] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
