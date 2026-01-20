/**
 * Camp Friend Squad Service
 *
 * Handles the "Build Her Squad" feature where parents can invite other parents
 * to have their athletes grouped together for a camp session.
 *
 * This integrates with the grouping algorithm via friendGroupId assignment.
 */

import { prisma } from '@/lib/db/client'
import { createNotification } from './notifications'
import { sendSquadInviteEmail } from '@/lib/email'
import type { SquadMemberStatus } from '@/generated/prisma'

// =============================================================================
// Types
// =============================================================================

export interface FriendSquad {
  id: string
  tenantId: string
  campId: string
  label: string
  createdByParentId: string
  createdByParent: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  }
  members: FriendSquadMember[]
  createdAt: string
}

export interface FriendSquadMember {
  id: string
  squadId: string
  parentId: string
  athleteId: string
  status: SquadMemberStatus
  invitedByEmail: string | null
  respondedAt: string | null
  parent: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  }
  athlete: {
    id: string
    firstName: string
    lastName: string
    grade: string | null
  }
  createdAt: string
}

export interface SquadInvite {
  id: string
  squadId: string
  campId: string
  campName: string
  invitingParentName: string
  athleteNames: string[]
  status: SquadMemberStatus
  createdAt: string
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Create or get a squad for a parent and camp session.
 * Each parent can only have one squad per camp.
 */
export async function createOrGetSquad(params: {
  campId: string
  parentId: string
  tenantId: string
  label?: string
}): Promise<{ data: FriendSquad | null; error: Error | null }> {
  try {
    const { campId, parentId, tenantId, label = 'Her Squad' } = params

    // Check if squad already exists
    let squad = await prisma.campFriendSquad.findUnique({
      where: {
        campId_createdByParentId: {
          campId,
          createdByParentId: parentId,
        },
      },
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
        },
      },
    })

    if (!squad) {
      // Create new squad
      squad = await prisma.campFriendSquad.create({
        data: {
          campId,
          tenantId,
          createdByParentId: parentId,
          label,
        },
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
          },
        },
      })
    }

    return {
      data: {
        ...squad,
        createdAt: squad.createdAt.toISOString(),
        members: squad.members.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
          respondedAt: m.respondedAt?.toISOString() || null,
        })),
      },
      error: null,
    }
  } catch (error) {
    console.error('[CampSquads] Failed to create/get squad:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Add the creating parent's own athletes to the squad (they are automatically accepted).
 */
export async function addOwnAthletesToSquad(params: {
  squadId: string
  parentId: string
  athleteIds: string[]
}): Promise<{ data: FriendSquadMember[] | null; error: Error | null }> {
  try {
    const { squadId, parentId, athleteIds } = params

    const members: FriendSquadMember[] = []

    for (const athleteId of athleteIds) {
      // Check if already exists
      const existing = await prisma.campFriendSquadMember.findUnique({
        where: {
          squadId_athleteId: {
            squadId,
            athleteId,
          },
        },
      })

      if (existing) continue

      const member = await prisma.campFriendSquadMember.create({
        data: {
          squadId,
          parentId,
          athleteId,
          status: 'accepted', // Own athletes are automatically accepted
          respondedAt: new Date(),
        },
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
      })

      members.push({
        ...member,
        createdAt: member.createdAt.toISOString(),
        respondedAt: member.respondedAt?.toISOString() || null,
      })
    }

    return { data: members, error: null }
  } catch (error) {
    console.error('[CampSquads] Failed to add own athletes:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Send a squad invite to another parent by email.
 * Creates membership records with status=requested and sends notification.
 */
export async function sendSquadInvite(params: {
  squadId: string
  inviteeEmail?: string
  invitedEmail?: string // Alias for inviteeEmail
  inviterParentId?: string
  invitingParentId?: string // Alias for inviterParentId
  inviterName?: string
  athleteIds?: string[] // Optional - inviting parent's athletes to be grouped
  campName?: string
  campId?: string
  tenantId: string
}): Promise<{ data: { sent: boolean; isNewUser: boolean } | null; error: Error | null }> {
  try {
    const {
      squadId,
      inviteeEmail: inviteeEmailParam,
      invitedEmail: invitedEmailParam,
      inviterParentId,
      invitingParentId: invitingParentIdParam,
      athleteIds,
      tenantId,
    } = params

    // Support both parameter names
    const invitedEmail = inviteeEmailParam || invitedEmailParam
    const invitingParentId = inviterParentId || invitingParentIdParam

    if (!invitedEmail) {
      return { data: null, error: new Error('Email is required') }
    }

    if (!invitingParentId) {
      return { data: null, error: new Error('Parent ID is required') }
    }

    // Get squad info for notification
    const squad = await prisma.campFriendSquad.findUnique({
      where: { id: squadId },
      include: {
        camp: true,
        createdByParent: true,
      },
    })

    if (!squad) {
      return { data: null, error: new Error('Squad not found') }
    }

    // Look up invited parent by email
    const invitedParent = await prisma.profile.findFirst({
      where: { email: invitedEmail.toLowerCase() },
    })

    const invitingParent = await prisma.profile.findUnique({
      where: { id: invitingParentId },
    })

    const invitingName = [invitingParent?.firstName, invitingParent?.lastName].filter(Boolean).join(' ') || 'A parent'

    // Add inviting parent's athletes to squad first (if not already and if provided)
    if (athleteIds && athleteIds.length > 0) {
      await addOwnAthletesToSquad({
        squadId,
        parentId: invitingParentId,
        athleteIds,
      })
    }

    if (invitedParent) {
      // Parent exists - get their athletes for this camp (if registered)
      const invitedAthletes = await prisma.athlete.findMany({
        where: { parentId: invitedParent.id },
        select: { id: true },
      })

      // Create membership invites for their athletes (they'll accept per athlete)
      for (const athlete of invitedAthletes) {
        const existing = await prisma.campFriendSquadMember.findUnique({
          where: {
            squadId_athleteId: {
              squadId,
              athleteId: athlete.id,
            },
          },
        })

        if (!existing) {
          await prisma.campFriendSquadMember.create({
            data: {
              squadId,
              parentId: invitedParent.id,
              athleteId: athlete.id,
              status: 'requested',
              invitedByEmail: invitedEmail.toLowerCase(),
            },
          })
        }
      }

      // Send notification to invited parent
      await createNotification({
        userId: invitedParent.id,
        tenantId,
        type: 'squad_invite_received',
        title: `${invitingName} invited you to join a camp squad!`,
        body: `You've been invited to have your athletes grouped together with ${invitingName}'s athletes for ${squad.camp.name}. Accept the invite to keep the girls together!`,
        category: 'camp',
        severity: 'info',
        actionUrl: `/portal/squads`,
        data: {
          squadId,
          campId: squad.campId,
          campName: squad.camp.name,
        },
      })

      return { data: { sent: true, isNewUser: false }, error: null }
    } else {
      // Parent doesn't exist - create pending invite
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30) // 30 day expiry

      await prisma.pendingSquadInvite.create({
        data: {
          squadId,
          invitedEmail: invitedEmail.toLowerCase(),
          invitedByName: invitingName,
          campName: squad.camp.name,
          campId: squad.campId,
          tenantId,
          expiresAt,
        },
      })

      // Send email to invite them to sign up
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://empoweredsportscamp.com'
      const signupUrl = `${baseUrl}/signup?invite=squad&email=${encodeURIComponent(invitedEmail.toLowerCase())}&campId=${squad.campId}`

      await sendSquadInviteEmail({
        to: invitedEmail.toLowerCase(),
        inviterName: invitingName,
        campName: squad.camp.name,
        signupUrl,
      })

      return { data: { sent: true, isNewUser: true }, error: null }
    }
  } catch (error) {
    console.error('[CampSquads] Failed to send squad invite:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get pending squad invites for a parent.
 */
export async function getSquadInvitesForParent(params: {
  parentId: string
  campId?: string
}): Promise<{ data: SquadInvite[] | null; error: Error | null }> {
  try {
    const { parentId, campId } = params

    // Get memberships where status = requested
    const memberships = await prisma.campFriendSquadMember.findMany({
      where: {
        parentId,
        status: 'requested',
        ...(campId ? { squad: { campId } } : {}),
      },
      include: {
        squad: {
          include: {
            camp: true,
            createdByParent: true,
            members: {
              where: {
                status: 'accepted',
              },
              include: {
                athlete: true,
              },
            },
          },
        },
        athlete: true,
      },
    })

    // Group by squad
    const squadMap = new Map<string, SquadInvite>()

    for (const m of memberships) {
      const existingInvite = squadMap.get(m.squadId)

      if (existingInvite) {
        existingInvite.athleteNames.push(`${m.athlete.firstName} ${m.athlete.lastName}`)
      } else {
        const invitingParent = m.squad.createdByParent
        const invitingName = [invitingParent.firstName, invitingParent.lastName].filter(Boolean).join(' ') || 'A parent'

        squadMap.set(m.squadId, {
          id: m.id,
          squadId: m.squadId,
          campId: m.squad.campId,
          campName: m.squad.camp.name,
          invitingParentName: invitingName,
          athleteNames: [`${m.athlete.firstName} ${m.athlete.lastName}`],
          status: m.status,
          createdAt: m.createdAt.toISOString(),
        })
      }
    }

    return { data: Array.from(squadMap.values()), error: null }
  } catch (error) {
    console.error('[CampSquads] Failed to get squad invites:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Respond to a squad invite (accept or decline).
 * Supports two modes:
 * - By memberId: Respond to a specific membership record
 * - By squadId + parentId: Respond to all invites for a parent in a squad
 */
export async function respondToSquadInvite(params: {
  memberId?: string // Direct member ID for responding to specific invite
  squadId?: string // Squad ID for batch response
  parentId: string
  response?: 'accepted' | 'declined' // New parameter name
  decision?: 'accept' | 'decline' // Legacy parameter name
  athleteIds?: string[] // Optional - specific athletes to accept
}): Promise<{ data: { success: boolean; squadId?: string } | null; error: Error | null }> {
  try {
    const { memberId, squadId, parentId, response: responseParam, decision: decisionParam, athleteIds } = params

    // Support both response formats
    const acceptDecision = responseParam === 'accepted' || decisionParam === 'accept'
    const declineDecision = responseParam === 'declined' || decisionParam === 'decline'

    if (!acceptDecision && !declineDecision) {
      return { data: null, error: new Error('Invalid response - must be accepted/declined or accept/decline') }
    }

    const newStatus: SquadMemberStatus = acceptDecision ? 'accepted' : 'declined'
    let resolvedSquadId = squadId

    // If memberId provided, update that specific member and get squadId from it
    if (memberId) {
      const member = await prisma.campFriendSquadMember.findUnique({
        where: { id: memberId },
        include: { squad: true },
      })

      if (!member) {
        return { data: null, error: new Error('Member not found') }
      }

      // Verify the parent owns this membership
      if (member.parentId !== parentId) {
        return { data: null, error: new Error('Unauthorized') }
      }

      resolvedSquadId = member.squadId

      await prisma.campFriendSquadMember.update({
        where: { id: memberId },
        data: {
          status: newStatus,
          respondedAt: new Date(),
        },
      })
    } else if (squadId) {
      // Legacy mode: update all requested memberships for this parent in the squad
      const whereClause: {
        squadId: string
        parentId: string
        status: SquadMemberStatus
        athleteId?: { in: string[] }
      } = {
        squadId,
        parentId,
        status: 'requested',
      }

      if (athleteIds && athleteIds.length > 0) {
        whereClause.athleteId = { in: athleteIds }
      }

      // Update membership status
      await prisma.campFriendSquadMember.updateMany({
        where: whereClause,
        data: {
          status: newStatus,
          respondedAt: new Date(),
        },
      })
    } else {
      return { data: null, error: new Error('Either memberId or squadId is required') }
    }

    // Get squad info for notification
    if (resolvedSquadId) {
      const squad = await prisma.campFriendSquad.findUnique({
        where: { id: resolvedSquadId },
        include: {
          camp: true,
          createdByParent: true,
        },
      })

      if (squad) {
        const respondingParent = await prisma.profile.findUnique({
          where: { id: parentId },
        })

        const respondingName = [respondingParent?.firstName, respondingParent?.lastName].filter(Boolean).join(' ') || 'A parent'

        // Notify squad creator
        await createNotification({
          userId: squad.createdByParentId,
          tenantId: squad.tenantId,
          type: acceptDecision ? 'squad_invite_accepted' : 'squad_invite_declined',
          title: acceptDecision
            ? `${respondingName} joined your squad!`
            : `${respondingName} declined your squad invite`,
          body: acceptDecision
            ? `Great news! ${respondingName}'s athletes will be grouped together with yours for ${squad.camp.name}.`
            : `${respondingName} won't be joining your squad for ${squad.camp.name}. You can invite someone else!`,
          category: 'camp',
          severity: acceptDecision ? 'success' : 'info',
          actionUrl: `/portal/squads`,
        })

        // If accepted, sync friend group IDs for the camp
        if (acceptDecision) {
          await syncFriendGroupIdsForSquad({ squadId: resolvedSquadId })
        }
      }
    }

    return { data: { success: true, squadId: resolvedSquadId }, error: null }
  } catch (error) {
    console.error('[CampSquads] Failed to respond to squad invite:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Sync friend group IDs for all accepted members in a squad.
 * This ensures the grouping algorithm keeps squad members together.
 */
export async function syncFriendGroupIdsForSquad(params: {
  squadId: string
}): Promise<{ data: { synced: number } | null; error: Error | null }> {
  try {
    const { squadId } = params

    // Get squad with accepted members
    const squad = await prisma.campFriendSquad.findUnique({
      where: { id: squadId },
      include: {
        members: {
          where: { status: 'accepted' },
        },
      },
    })

    if (!squad || squad.members.length === 0) {
      return { data: { synced: 0 }, error: null }
    }

    const athleteIds = squad.members.map((m) => m.athleteId)

    // Update registrations with the squad ID as friendSquadId
    const result = await prisma.registration.updateMany({
      where: {
        campId: squad.campId,
        athleteId: { in: athleteIds },
        status: { in: ['pending', 'confirmed'] },
      },
      data: {
        friendSquadId: squadId,
      },
    })

    // Also update CamperSessionData if it exists
    // The grouping algorithm uses friendGroupId from CamperSessionData
    // We need to create or find a FriendGroup for this squad
    const existingFriendGroup = await prisma.friendGroup.findFirst({
      where: {
        campId: squad.campId,
        placementNotes: `squad:${squadId}`,
      },
    })

    let friendGroupId: string

    if (existingFriendGroup) {
      friendGroupId = existingFriendGroup.id
    } else {
      // Get next group number
      const maxGroup = await prisma.friendGroup.findFirst({
        where: { campId: squad.campId },
        orderBy: { groupNumber: 'desc' },
      })

      const newFriendGroup = await prisma.friendGroup.create({
        data: {
          campId: squad.campId,
          tenantId: squad.tenantId,
          groupNumber: (maxGroup?.groupNumber || 0) + 1,
          memberCount: athleteIds.length,
          placementNotes: `squad:${squadId}`,
        },
      })

      friendGroupId = newFriendGroup.id
    }

    // Update member count
    await prisma.friendGroup.update({
      where: { id: friendGroupId },
      data: { memberCount: athleteIds.length },
    })

    // Update CamperSessionData with friendGroupId
    await prisma.camperSessionData.updateMany({
      where: {
        campId: squad.campId,
        athleteId: { in: athleteIds },
      },
      data: {
        friendGroupId,
      },
    })

    return { data: { synced: result.count }, error: null }
  } catch (error) {
    console.error('[CampSquads] Failed to sync friend group IDs:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Sync friend group IDs for all squads in a camp.
 * Call this before running the grouping algorithm.
 */
export async function syncFriendGroupIdsForCamp(params: {
  campId: string
}): Promise<{ data: { synced: number } | null; error: Error | null }> {
  try {
    const { campId } = params

    // Get all squads for this camp with accepted members
    const squads = await prisma.campFriendSquad.findMany({
      where: { campId },
      include: {
        members: {
          where: { status: 'accepted' },
        },
      },
    })

    let totalSynced = 0

    for (const squad of squads) {
      if (squad.members.length >= 2) {
        // Only sync if there are at least 2 accepted members
        const result = await syncFriendGroupIdsForSquad({ squadId: squad.id })
        if (result.data) {
          totalSynced += result.data.synced
        }
      }
    }

    return { data: { synced: totalSynced }, error: null }
  } catch (error) {
    console.error('[CampSquads] Failed to sync friend group IDs for camp:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get squads for a parent (created by them or invited to).
 */
export async function getSquadsForParent(params: {
  parentId: string
  campId?: string
}): Promise<{ data: FriendSquad[] | null; error: Error | null }> {
  try {
    const { parentId, campId } = params

    // Get squads created by this parent
    const createdSquads = await prisma.campFriendSquad.findMany({
      where: {
        createdByParentId: parentId,
        ...(campId ? { campId } : {}),
      },
      include: {
        createdByParent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        camp: true,
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
        },
      },
    })

    // Get squads where parent is invited (has membership)
    const memberSquads = await prisma.campFriendSquad.findMany({
      where: {
        members: {
          some: {
            parentId,
            status: { in: ['requested', 'accepted'] },
          },
        },
        createdByParentId: { not: parentId },
        ...(campId ? { campId } : {}),
      },
      include: {
        createdByParent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        camp: true,
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
        },
      },
    })

    const allSquads = [...createdSquads, ...memberSquads]

    return {
      data: allSquads.map((squad) => ({
        ...squad,
        createdAt: squad.createdAt.toISOString(),
        members: squad.members.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
          respondedAt: m.respondedAt?.toISOString() || null,
        })),
      })),
      error: null,
    }
  } catch (error) {
    console.error('[CampSquads] Failed to get squads for parent:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get other registered campers for a camp (for squad building).
 * Excludes the current user's athletes.
 */
export async function getOtherRegisteredCampers(params: {
  campId: string
  excludeParentId: string
}): Promise<{
  data: Array<{
    athleteId: string
    athleteName: string
    athleteFirstName: string
    athleteLastName: string
    grade: string | null
    parentName: string
    parentId: string
  }> | null
  error: Error | null
}> {
  try {
    const { campId, excludeParentId } = params

    // Get confirmed/pending registrations for this camp, excluding current user's athletes
    const registrations = await prisma.registration.findMany({
      where: {
        campId,
        status: { in: ['pending', 'confirmed'] },
        athlete: {
          parentId: { not: excludeParentId },
        },
      },
      include: {
        athlete: {
          include: {
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
      orderBy: {
        athlete: {
          firstName: 'asc',
        },
      },
    })

    const campers = registrations.map((r) => ({
      athleteId: r.athlete.id,
      athleteName: `${r.athlete.firstName} ${r.athlete.lastName}`,
      athleteFirstName: r.athlete.firstName,
      athleteLastName: r.athlete.lastName,
      grade: r.athlete.grade,
      parentName: [r.athlete.parent?.firstName, r.athlete.parent?.lastName].filter(Boolean).join(' ') || 'Parent',
      parentId: r.athlete.parentId,
    }))

    return { data: campers, error: null }
  } catch (error) {
    console.error('[CampSquads] Failed to get other registered campers:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Request to join another camper's squad or create a squad request.
 */
export async function requestSquadWithCamper(params: {
  campId: string
  tenantId: string
  requestingParentId: string
  requestingAthleteIds: string[]
  targetAthleteId: string
}): Promise<{ data: { requestSent: boolean; squadId?: string } | null; error: Error | null }> {
  try {
    const { campId, tenantId, requestingParentId, requestingAthleteIds, targetAthleteId } = params

    // Get target athlete's parent
    const targetAthlete = await prisma.athlete.findUnique({
      where: { id: targetAthleteId },
      include: { parent: true },
    })

    if (!targetAthlete || !targetAthlete.parent) {
      return { data: null, error: new Error('Target athlete not found') }
    }

    const targetParentId = targetAthlete.parentId

    // Check if target parent already has a squad for this camp
    let squad = await prisma.campFriendSquad.findUnique({
      where: {
        campId_createdByParentId: {
          campId,
          createdByParentId: targetParentId,
        },
      },
    })

    // If not, check if requesting parent has one
    if (!squad) {
      squad = await prisma.campFriendSquad.findUnique({
        where: {
          campId_createdByParentId: {
            campId,
            createdByParentId: requestingParentId,
          },
        },
      })
    }

    // If neither has a squad, create one for the requesting parent
    if (!squad) {
      const requestingParent = await prisma.profile.findUnique({
        where: { id: requestingParentId },
      })
      const label = [requestingParent?.firstName, "'s Squad"].filter(Boolean).join('') || 'New Squad'

      squad = await prisma.campFriendSquad.create({
        data: {
          campId,
          tenantId,
          createdByParentId: requestingParentId,
          label,
        },
      })

      // Add requesting parent's athletes as accepted members
      for (const athleteId of requestingAthleteIds) {
        await prisma.campFriendSquadMember.create({
          data: {
            squadId: squad.id,
            parentId: requestingParentId,
            athleteId,
            status: 'accepted',
            respondedAt: new Date(),
          },
        })
      }
    }

    // Add target athlete as a requested member (pending acceptance by their parent)
    const existingMember = await prisma.campFriendSquadMember.findUnique({
      where: {
        squadId_athleteId: {
          squadId: squad.id,
          athleteId: targetAthleteId,
        },
      },
    })

    if (!existingMember) {
      await prisma.campFriendSquadMember.create({
        data: {
          squadId: squad.id,
          parentId: targetParentId,
          athleteId: targetAthleteId,
          status: 'requested',
        },
      })
    }

    // Send notification to target parent
    const requestingParent = await prisma.profile.findUnique({
      where: { id: requestingParentId },
    })
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
    })

    const requestingName = [requestingParent?.firstName, requestingParent?.lastName].filter(Boolean).join(' ') || 'A parent'

    await createNotification({
      userId: targetParentId,
      tenantId,
      type: 'squad_invite_received',
      title: `${requestingName} wants to squad up!`,
      body: `${requestingName} has requested that ${targetAthlete.firstName} be grouped with their athlete(s) for ${camp?.name || 'camp'}. Accept to keep them together!`,
      category: 'camp',
      severity: 'info',
      actionUrl: `/portal/squads`,
      data: {
        squadId: squad.id,
        campId,
        campName: camp?.name || 'Camp',
      },
    })

    return { data: { requestSent: true, squadId: squad.id }, error: null }
  } catch (error) {
    console.error('[CampSquads] Failed to request squad with camper:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Claim pending squad invites after user signs up.
 * Call this after a new user creates an account.
 */
export async function claimPendingSquadInvites(params: {
  email: string
  userId: string
}): Promise<{ data: { claimed: number } | null; error: Error | null }> {
  try {
    const { email, userId } = params

    // Find pending invites for this email
    const pendingInvites = await prisma.pendingSquadInvite.findMany({
      where: {
        invitedEmail: email.toLowerCase(),
        claimedAt: null,
        expiresAt: { gt: new Date() },
      },
    })

    if (pendingInvites.length === 0) {
      return { data: { claimed: 0 }, error: null }
    }

    // Get user's athletes
    const userAthletes = await prisma.athlete.findMany({
      where: { parentId: userId },
      select: { id: true },
    })

    let claimedCount = 0

    for (const invite of pendingInvites) {
      // Skip invites without a squadId (guest invites that never got linked to a squad)
      if (!invite.squadId) {
        continue
      }

      // Create squad memberships for all user's athletes
      for (const athlete of userAthletes) {
        const existing = await prisma.campFriendSquadMember.findUnique({
          where: {
            squadId_athleteId: {
              squadId: invite.squadId,
              athleteId: athlete.id,
            },
          },
        })

        if (!existing) {
          await prisma.campFriendSquadMember.create({
            data: {
              squadId: invite.squadId,
              parentId: userId,
              athleteId: athlete.id,
              status: 'requested',
              invitedByEmail: email.toLowerCase(),
            },
          })
        }
      }

      // Mark invite as claimed
      await prisma.pendingSquadInvite.update({
        where: { id: invite.id },
        data: {
          claimedAt: new Date(),
          claimedByUserId: userId,
        },
      })

      // Send notification
      await createNotification({
        userId,
        tenantId: invite.tenantId,
        type: 'squad_invite_received',
        title: `You've been invited to join a camp squad!`,
        body: `${invite.invitedByName || 'A parent'} invited you to have your athletes grouped together for ${invite.campName}. Accept the invite to keep the girls together!`,
        category: 'camp',
        severity: 'info',
        actionUrl: `/portal/squads`,
        data: {
          squadId: invite.squadId,
          campId: invite.campId,
          campName: invite.campName,
        },
      })

      claimedCount++
    }

    return { data: { claimed: claimedCount }, error: null }
  } catch (error) {
    console.error('[CampSquads] Failed to claim pending invites:', error)
    return { data: null, error: error as Error }
  }
}
