/**
 * EmpowerU Unlocks API
 *
 * GET /api/empoweru/unlocks - Get user's current unlocks
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { getUserUnlocks } from '@/lib/services/empoweru'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data, error } = await getUserUnlocks({
      userId: user.id,
      role: user.role || '',
      tenantId: user.tenantId,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/empoweru/unlocks error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
