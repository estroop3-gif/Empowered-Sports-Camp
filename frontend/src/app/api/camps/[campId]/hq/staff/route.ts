/**
 * Camp HQ Staff API
 *
 * GET /api/camps/[campId]/hq/staff - Get staff assignments for a camp
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCampHqStaff } from '@/lib/services/campHq'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'

interface RouteParams {
  params: Promise<{ campId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { campId } = await params
    const user = await getAuthenticatedUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await getCampHqStaff(campId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/camps/[campId]/hq/staff error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
