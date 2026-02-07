/**
 * The Roster API - Update Basic Info
 *
 * PATCH /api/camps/[campId]/roster/[camperId]/basic - Update camper basic info
 */

import { NextRequest, NextResponse } from 'next/server'
import { updateCamperBasicInfo, type RosterRole } from '@/lib/services/roster'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'

const VALID_ROLES: RosterRole[] = ['hq_admin', 'licensee_owner', 'director']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string; camperId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const role = user.role as RosterRole
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: 'Coaches cannot update camper info' },
        { status: 403 }
      )
    }

    const { campId, camperId } = await params
    const body = await request.json()

    // Validate and extract allowed fields
    const updates: Record<string, string | undefined> = {}
    if (body.shirtSize !== undefined) updates.shirtSize = body.shirtSize
    if (body.specialConsiderations !== undefined) updates.specialConsiderations = body.specialConsiderations
    if (body.internalNotes !== undefined) updates.internalNotes = body.internalNotes
    if (body.riskFlag !== undefined) updates.riskFlag = body.riskFlag

    const { data, error } = await updateCamperBasicInfo({
      camperId,
      campId,
      updates,
      role,
      tenantId: user.tenantId || null,
      userId: user.id,
    })

    if (error) {
      const status = error.message.includes('Not authorized') ? 403 :
                     error.message.includes('not found') ? 404 : 500
      return NextResponse.json({ error: error.message }, { status })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[PATCH /api/camps/[campId]/roster/[camperId]/basic] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
