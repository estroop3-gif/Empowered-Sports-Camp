/**
 * Squads API Routes
 *
 * Handles "Build Her Squad" friend grouping for camp registrations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth/server'
import {
  createOrGetSquad,
  addOwnAthletesToSquad,
  sendSquadInvite,
  getSquadInvitesForParent,
  respondToSquadInvite,
  getSquadsForParent,
  claimPendingSquadInvites,
  getOtherRegisteredCampers,
  requestSquadWithCamper,
} from '@/lib/services/campSquads'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const action = request.nextUrl.searchParams.get('action') || 'list'
    const campId = request.nextUrl.searchParams.get('campId')

    switch (action) {
      case 'list': {
        const { data, error } = await getSquadsForParent({
          parentId: user.id,
          campId: campId || undefined,
        })

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })
      }

      case 'invites': {
        const { data, error } = await getSquadInvitesForParent({
          parentId: user.id,
          campId: campId || undefined,
        })

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })
      }

      case 'otherCampers': {
        if (!campId) {
          return NextResponse.json({ error: 'campId required' }, { status: 400 })
        }

        const { data, error } = await getOtherRegisteredCampers({
          campId,
          excludeParentId: user.id,
        })

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[Squads API] GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'create': {
        const { campId, tenantId, label, athleteIds } = body

        if (!campId || !tenantId) {
          return NextResponse.json({ error: 'campId and tenantId required' }, { status: 400 })
        }

        // Create or get existing squad
        const { data: squad, error: squadError } = await createOrGetSquad({
          campId,
          tenantId,
          parentId: user.id,
          label,
        })

        if (squadError || !squad) {
          return NextResponse.json({ error: squadError?.message || 'Failed to create squad' }, { status: 500 })
        }

        // Add own athletes if provided
        if (athleteIds && athleteIds.length > 0) {
          const { error: addError } = await addOwnAthletesToSquad({
            squadId: squad.id,
            parentId: user.id,
            athleteIds,
          })

          if (addError) {
            return NextResponse.json({ error: addError.message }, { status: 500 })
          }
        }

        return NextResponse.json({ data: squad })
      }

      case 'addAthletes': {
        const { squadId, athleteIds } = body

        if (!squadId || !athleteIds || athleteIds.length === 0) {
          return NextResponse.json({ error: 'squadId and athleteIds required' }, { status: 400 })
        }

        const { data, error } = await addOwnAthletesToSquad({
          squadId,
          parentId: user.id,
          athleteIds,
        })

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })
      }

      case 'invite': {
        const { squadId, inviteeEmail, inviterName, campName, campId, tenantId } = body

        if (!squadId || !inviteeEmail) {
          return NextResponse.json({ error: 'squadId and inviteeEmail required' }, { status: 400 })
        }

        const { data, error } = await sendSquadInvite({
          squadId,
          inviteeEmail,
          inviterName,
          inviterParentId: user.id,
          campName: campName || 'Camp',
          campId: campId || '',
          tenantId: tenantId || '',
        })

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })
      }

      case 'respond': {
        const { memberId, response } = body

        if (!memberId || !response) {
          return NextResponse.json({ error: 'memberId and response required' }, { status: 400 })
        }

        if (!['accepted', 'declined'].includes(response)) {
          return NextResponse.json({ error: 'response must be accepted or declined' }, { status: 400 })
        }

        const { data, error } = await respondToSquadInvite({
          memberId,
          parentId: user.id,
          response,
        })

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })
      }

      case 'claimInvites': {
        const { email } = body

        if (!email) {
          return NextResponse.json({ error: 'email required' }, { status: 400 })
        }

        const { data, error } = await claimPendingSquadInvites({
          email,
          userId: user.id,
        })

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })
      }

      case 'requestSquad': {
        const { campId, tenantId, athleteIds, targetAthleteId } = body

        if (!campId || !tenantId || !targetAthleteId) {
          return NextResponse.json(
            { error: 'campId, tenantId, and targetAthleteId required' },
            { status: 400 }
          )
        }

        const { data, error } = await requestSquadWithCamper({
          campId,
          tenantId,
          requestingParentId: user.id,
          requestingAthleteIds: athleteIds || [],
          targetAthleteId,
        })

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[Squads API] POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
