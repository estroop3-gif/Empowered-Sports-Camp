/**
 * Camp HQ Team Color Manual Override API
 *
 * PATCH /api/camps/[campId]/hq/team-colors/[camperSessionId] - Update camper's team color
 */

import { NextRequest, NextResponse } from 'next/server'
import { updateTeamColor } from '@/lib/services/grouping'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import prisma from '@/lib/db/client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string; camperSessionId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check role - only director, licensee_owner, or hq_admin can update
    if (!['director', 'hq_admin', 'licensee_owner'].includes(user.role || '')) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    const { campId, camperSessionId } = await params

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

    // Verify camper session belongs to this camp
    const camperSession = await prisma.camperSessionData.findUnique({
      where: { id: camperSessionId },
      select: { campId: true },
    })

    if (!camperSession) {
      return NextResponse.json(
        { error: 'Camper session not found' },
        { status: 404 }
      )
    }

    if (camperSession.campId !== campId) {
      return NextResponse.json(
        { error: 'Camper session does not belong to this camp' },
        { status: 400 }
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

    // Parse request body
    const body = await request.json()
    const { teamColor } = body

    // Validate team color
    if (teamColor !== null && teamColor !== 'pink' && teamColor !== 'purple') {
      return NextResponse.json(
        { error: 'Invalid team color. Must be "pink", "purple", or null' },
        { status: 400 }
      )
    }

    const { data, error } = await updateTeamColor(camperSessionId, teamColor)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[PATCH /api/camps/[campId]/hq/team-colors/[camperSessionId]] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
