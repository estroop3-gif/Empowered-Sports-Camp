/**
 * Licensee Incentives API
 *
 * GET /api/licensee/incentives - Get staff compensation summary for the territory
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { getLicenseeIncentiveSummary } from '@/lib/services/incentives'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only licensee owners can access this
    if (user.role !== 'licensee_owner') {
      return NextResponse.json(
        { error: 'Only licensee owners can access this endpoint' },
        { status: 403 }
      )
    }

    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
    }

    const { data, error } = await getLicenseeIncentiveSummary(user.tenantId)

    if (error) {
      console.error('[API] GET /api/licensee/incentives error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/licensee/incentives error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
