/**
 * EmpowerU Evaluate Unlocks API
 *
 * POST /api/empoweru/unlocks/evaluate - Evaluate and grant new unlocks
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { evaluateUnlocks, PortalType } from '@/lib/services/empoweru'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { portalType } = body

    if (!portalType || !['OPERATIONAL', 'BUSINESS', 'SKILL_STATION'].includes(portalType)) {
      return NextResponse.json(
        { error: 'Invalid or missing portalType parameter' },
        { status: 400 }
      )
    }

    const { data, error } = await evaluateUnlocks({
      userId: user.id,
      role: user.role || '',
      tenantId: user.tenantId,
      portalType: portalType as PortalType,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] POST /api/empoweru/unlocks/evaluate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
