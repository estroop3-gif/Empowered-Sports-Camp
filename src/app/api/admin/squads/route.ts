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

    // ── Backfill: ensure every pending invite from a known parent has a squad ──
    // Guest-invite emails sent before this fix was deployed have squadId = null.
    // Resolve them now so they appear in the squad table immediately.
    const uninkedInvites = await prisma.pendingSquadInvite.findMany({
      where: { campId, squadId: null },
    })

    for (const inv of uninkedInvites) {
      if (!inv.inviterEmail) continue
      const inviterProfile = await prisma.profile.findFirst({
        where: { email: inv.inviterEmail.toLowerCase() },
      })
      if (!inviterProfile) continue

      const squad = await prisma.campFriendSquad.upsert({
        where: {
          campId_createdByParentId: {
            campId,
            createdByParentId: inviterProfile.id,
          },
        },
        update: {},
        create: {
          campId,
          tenantId: inv.tenantId,
          createdByParentId: inviterProfile.id,
          label: `${inviterProfile.firstName || 'Her'}'s Squad`,
        },
      })

      // Add the inviter's registered athletes (auto-accepted)
      const regs = await prisma.registration.findMany({
        where: {
          campId,
          athlete: { parentId: inviterProfile.id },
          status: { in: ['pending', 'confirmed'] },
        },
        select: { athleteId: true },
      })
      for (const { athleteId } of regs) {
        await prisma.campFriendSquadMember.upsert({
          where: { squadId_athleteId: { squadId: squad.id, athleteId } },
          update: {},
          create: {
            squadId: squad.id,
            parentId: inviterProfile.id,
            athleteId,
            status: 'accepted',
            respondedAt: new Date(),
          },
        })
      }

      // Link the invite to its squad
      await prisma.pendingSquadInvite.update({
        where: { id: inv.id },
        data: { squadId: squad.id },
      })
    }
    // ── End backfill ──────────────────────────────────────────────────────────

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
