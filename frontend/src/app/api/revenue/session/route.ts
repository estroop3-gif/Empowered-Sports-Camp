/**
 * SHELL: Session Revenue Dashboard API
 *
 * GET /api/revenue/session?campSessionId=xxx
 * Gets real-time revenue dashboard for a camp session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import { getSessionRevenueDashboard } from '@/lib/services/revenue'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const campSessionId = request.nextUrl.searchParams.get('campSessionId')

    if (!campSessionId) {
      return NextResponse.json(
        { error: 'campSessionId is required' },
        { status: 400 }
      )
    }

    // SHELL: Only admins and licensees can view revenue data
    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await getSessionRevenueDashboard({
      campSessionId,
      tenantId: user.tenantId || '',
      role: user.role,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] Session revenue error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
