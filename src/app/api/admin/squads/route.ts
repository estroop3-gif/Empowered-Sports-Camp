/**
 * Admin Squads API
 *
 * GET /api/admin/squads?campId={campId} - Get all squads for a camp with full audit trail
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth/server'
import { prisma } from '@/lib/db/client'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const campId = request.nextUrl.searchParams.get('campId')
    if (!campId) {
      return NextResponse.json({ error: 'campId is required' }, { status: 400 })
    }

    // Fetch all squads for this camp with full member + parent + athlete details
    const squads = await prisma.campFriendSquad.findMany({
      where: { campId },
      include: {
        createdByParent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        members: {
          include: {
            parent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            athlete: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                grade: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        camp: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Fetch pending (pre-signup) invites for this camp
    const pendingInvites = await prisma.pendingSquadInvite.findMany({
      where: { campId },
      orderBy: { createdAt: 'asc' },
    })

    // Serialize dates
    const serialized = squads.map((squad) => ({
      id: squad.id,
      label: squad.label,
      campId: squad.campId,
      campName: squad.camp.name,
      createdAt: squad.createdAt.toISOString(),
      createdByParent: squad.createdByParent,
      members: squad.members.map((m) => ({
        id: m.id,
        athleteId: m.athleteId,
        athleteName: `${m.athlete.firstName} ${m.athlete.lastName}`,
        athleteGrade: m.athlete.grade,
        parentId: m.parentId,
        parentName: [m.parent.firstName, m.parent.lastName].filter(Boolean).join(' ') || m.parent.email,
        parentEmail: m.parent.email,
        status: m.status,
        invitedByEmail: m.invitedByEmail,
        respondedAt: m.respondedAt?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
    }))

    const serializedPending = pendingInvites.map((inv) => ({
      id: inv.id,
      squadId: inv.squadId,
      invitedEmail: inv.invitedEmail,
      invitedByName: inv.invitedByName,
      campName: inv.campName,
      athleteNames: inv.athleteNames,
      status: inv.status,
      expiresAt: inv.expiresAt.toISOString(),
      claimedAt: inv.claimedAt?.toISOString() ?? null,
      claimedByUserId: inv.claimedByUserId,
      createdAt: inv.createdAt.toISOString(),
    }))

    return NextResponse.json({
      squads: serialized,
      pendingInvites: serializedPending,
    })
  } catch (error) {
    console.error('[Admin Squads] Error fetching squads:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
