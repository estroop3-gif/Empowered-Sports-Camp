/**
 * Squad Dashboard API
 *
 * Returns aggregated squad data for the parent dashboard:
 * - Per athlete → per camp: squad members, sent email invites
 * - Incoming squad invites
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth/server'
import { prisma } from '@/lib/db/client'
import { getSquadInvitesForParent } from '@/lib/services/campSquads'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parentId = user.id

    // Get parent profile for email
    const profile = await prisma.profile.findUnique({
      where: { id: parentId },
      select: { email: true },
    })

    // Get athletes with their registrations
    const athletes = await prisma.athlete.findMany({
      where: { parentId },
      include: {
        registrations: {
          where: {
            status: { in: ['pending', 'confirmed'] },
          },
          include: {
            camp: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
                tenantId: true,
              },
            },
          },
        },
      },
    })

    // Collect all camp IDs from registrations
    const campIds = new Set<string>()
    for (const athlete of athletes) {
      for (const reg of athlete.registrations) {
        campIds.add(reg.campId)
      }
    }

    // Get all squads for these camps where parent is owner or member
    const squads = await prisma.campFriendSquad.findMany({
      where: {
        campId: { in: Array.from(campIds) },
        OR: [
          { createdByParentId: parentId },
          { members: { some: { parentId } } },
        ],
      },
      include: {
        members: {
          include: {
            athlete: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            parent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    // Build squad lookup by campId
    const squadsByCamp = new Map<string, typeof squads>()
    for (const squad of squads) {
      const existing = squadsByCamp.get(squad.campId) || []
      existing.push(squad)
      squadsByCamp.set(squad.campId, existing)
    }

    // Get sent email invites
    let sentInvites: Array<{
      id: string
      invitedEmail: string
      status: string
      campId: string
      createdAt: Date
    }> = []
    if (profile?.email) {
      sentInvites = await prisma.pendingSquadInvite.findMany({
        where: {
          inviterEmail: profile.email.toLowerCase(),
          campId: { in: Array.from(campIds) },
        },
        select: {
          id: true,
          invitedEmail: true,
          status: true,
          campId: true,
          createdAt: true,
        },
      })
    }

    // Build sent invites lookup by campId
    const sentInvitesByCamp = new Map<string, typeof sentInvites>()
    for (const invite of sentInvites) {
      const existing = sentInvitesByCamp.get(invite.campId) || []
      existing.push(invite)
      sentInvitesByCamp.set(invite.campId, existing)
    }

    // Build response
    const athleteData = athletes.map((athlete: typeof athletes[number]) => ({
      athleteId: athlete.id,
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      camps: athlete.registrations.map((reg) => {
        const campSquads = squadsByCamp.get(reg.campId) || []
        // Find the squad this parent owns or is a member of
        const ownSquad = campSquads.find((s) => s.createdByParentId === parentId)
        const memberSquad = campSquads.find(
          (s) =>
            s.createdByParentId !== parentId &&
            s.members.some((m) => m.parentId === parentId)
        )
        const activeSquad = ownSquad || memberSquad

        const campSentInvites = sentInvitesByCamp.get(reg.campId) || []

        const dateOpts: Intl.DateTimeFormatOptions = {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }

        return {
          campId: reg.camp.id,
          campName: reg.camp.name,
          campDates: `${new Date(reg.camp.startDate).toLocaleDateString('en-US', dateOpts)} – ${new Date(reg.camp.endDate).toLocaleDateString('en-US', dateOpts)}`,
          tenantId: reg.camp.tenantId,
          registrationId: reg.id,
          squad: activeSquad
            ? {
                id: activeSquad.id,
                label: activeSquad.label,
                isOwner: activeSquad.createdByParentId === parentId,
                members: activeSquad.members.map((m) => ({
                  id: m.id,
                  athleteName: `${m.athlete.firstName} ${m.athlete.lastName}`,
                  parentName: [m.parent.firstName, m.parent.lastName]
                    .filter(Boolean)
                    .join(' '),
                  status: m.status,
                  notes: m.notes,
                  isOwnAthlete: m.parentId === parentId,
                })),
              }
            : null,
          sentInvites: campSentInvites.map((inv) => ({
            id: inv.id,
            invitedEmail: inv.invitedEmail,
            status: inv.status === 'pending' ? 'pending' : 'claimed',
            createdAt: inv.createdAt.toISOString(),
          })),
        }
      }),
    }))

    // Get incoming invites
    const { data: incomingInvites } = await getSquadInvitesForParent({
      parentId,
    })

    return NextResponse.json({
      data: {
        parentEmail: profile?.email || '',
        athletes: athleteData,
        incomingInvites: incomingInvites || [],
      },
    })
  } catch (error) {
    console.error('[Squads Dashboard API] Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
