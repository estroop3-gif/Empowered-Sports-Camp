/**
 * SHELL: Run Royalty Automation API
 *
 * POST /api/royalties/run
 * Triggers royalty calculation for a camp session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import { runRoyaltyAutomationForSession } from '@/lib/services/revenue'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { campSessionId } = body

    if (!campSessionId) {
      return NextResponse.json(
        { error: 'campSessionId is required' },
        { status: 400 }
      )
    }

    // SHELL: Only HQ admins can trigger royalty calculations
    if (user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await runRoyaltyAutomationForSession({
      campSessionId,
      tenantId: user.tenantId || '',
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] Run royalty automation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
