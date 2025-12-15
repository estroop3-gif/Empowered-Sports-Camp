/**
 * Coach Incentives API
 *
 * GET /api/coach/incentives - Get incentives/compensation snapshot for the authenticated coach
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { getCoachIncentiveSnapshot } from '@/lib/services/coach-dashboard'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Coaches and higher roles can access
    const allowedRoles = ['coach', 'director', 'licensee_owner', 'hq_admin']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await getCoachIncentiveSnapshot({
      userId: user.id,
      tenantId: user.tenantId,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/coach/incentives error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
