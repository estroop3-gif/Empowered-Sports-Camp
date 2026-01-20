/**
 * The Roster API - List Campers
 *
 * GET /api/camps/[campId]/roster - List campers for a camp session
 */

import { NextRequest, NextResponse } from 'next/server'
import { listCampersForSession, getCampGroups, type RosterRole } from '@/lib/services/roster'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'

const VALID_ROLES: RosterRole[] = ['hq_admin', 'licensee_owner', 'director', 'coach']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
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

    const { campId } = await params
    const searchParams = request.nextUrl.searchParams

    // Parse filters from query params
    const filters = {
      search: searchParams.get('search') || undefined,
      groupId: searchParams.get('groupId') || undefined,
      checkInStatus: (searchParams.get('checkInStatus') || undefined) as
        | 'all'
        | 'checked_in'
        | 'not_arrived'
        | 'checked_out'
        | 'absent'
        | undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50,
    }

    const { data, error } = await listCampersForSession({
      campId,
      role,
      tenantId: user.tenantId || null,
      userId: user.id,
      filters,
    })

    if (error) {
      const status = error.message.includes('Not authorized') ? 403 : 500
      return NextResponse.json({ error: error.message }, { status })
    }

    // Also fetch groups for filter dropdown
    const { data: groups } = await getCampGroups(campId)

    return NextResponse.json({
      data,
      groups: groups || [],
    })
  } catch (error) {
    console.error('[GET /api/camps/[campId]/roster] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
