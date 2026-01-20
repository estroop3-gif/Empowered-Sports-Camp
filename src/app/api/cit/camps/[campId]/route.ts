/**
 * CIT Camp Detail API
 *
 * GET /api/cit/camps/[campId] - Get camp schedule details for CIT
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { getCitCampSchedule } from '@/lib/services/cit-dashboard'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const { campId } = await params
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['cit_volunteer', 'hq_admin']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await getCitCampSchedule({
      userId: user.id,
      campId,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/cit/camps/[campId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
