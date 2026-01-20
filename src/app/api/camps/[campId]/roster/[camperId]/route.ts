/**
 * The Roster API - Camper Detail
 *
 * GET /api/camps/[campId]/roster/[camperId] - Get camper details
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCamperDetail, type RosterRole } from '@/lib/services/roster'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'

const VALID_ROLES: RosterRole[] = ['hq_admin', 'licensee_owner', 'director', 'coach']

export async function GET(
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

    const { data, error } = await getCamperDetail({
      camperId,
      campId,
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
    console.error('[GET /api/camps/[campId]/roster/[camperId]] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
