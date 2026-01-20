/**
 * Compensation Plans API
 *
 * GET /api/incentives/plans - List all active compensation plans
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCompensationPlans } from '@/lib/services/incentives'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins and licensee owners can view plans
    if (!['hq_admin', 'licensee_owner', 'director'].includes(user.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await getCompensationPlans()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/incentives/plans error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
