/**
 * CIT Camps API
 *
 * GET /api/cit/camps - Get all camps where CIT is assigned
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { listCitCamps } from '@/lib/services/cit-dashboard'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['cit_volunteer', 'hq_admin']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const status = request.nextUrl.searchParams.get('status') as
      | 'all'
      | 'upcoming'
      | 'in_progress'
      | 'completed'
      | null

    const { data, error } = await listCitCamps({
      userId: user.id,
      status: status || 'all',
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/cit/camps error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
