/**
 * The Roster API - Update Check-in Status
 *
 * PATCH /api/camps/[campId]/roster/[camperId]/status - Update camper check-in/out status
 */

import { NextRequest, NextResponse } from 'next/server'
import { updateCamperStatus, type RosterRole } from '@/lib/services/roster'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'

const VALID_ROLES: RosterRole[] = ['hq_admin', 'licensee_owner', 'director', 'coach']
const VALID_STATUSES = ['checked_in', 'checked_out', 'not_arrived', 'absent']

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
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { campId, camperId } = await params
    const body = await request.json()

    // Validate status
    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: checked_in, checked_out, not_arrived, or absent' },
        { status: 400 }
      )
    }

    const { data, error } = await updateCamperStatus({
      camperId,
      campId,
      status: body.status,
      notes: body.notes,
      role,
      tenantId: user.tenantId || null,
      userId: user.id,
      // Pickup person info for checkout
      pickupPersonName: body.pickupPersonName,
      pickupPersonRelationship: body.pickupPersonRelationship,
      pickupPersonId: body.pickupPersonId,
      // Verification tracking for authorized pickup
      verificationMethod: body.verificationMethod,
      verificationTypedName: body.verificationTypedName,
    })

    if (error) {
      const status = error.message.includes('Not authorized') ? 403 :
                     error.message.includes('not found') ? 404 : 500
      return NextResponse.json({ error: error.message }, { status })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[PATCH /api/camps/[campId]/roster/[camperId]/status] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
