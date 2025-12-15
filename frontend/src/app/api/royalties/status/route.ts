/**
 * SHELL: Royalty Status API
 *
 * GET /api/royalties/status?range=xxx
 * Gets royalty status for a licensee.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import { getRoyaltyStatusForLicensee } from '@/lib/services/revenue'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const range = request.nextUrl.searchParams.get('range')

    // SHELL: Licensees see their own, HQ sees all
    const allowedRoles = ['hq_admin', 'licensee_owner']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await getRoyaltyStatusForLicensee({
      tenantId: user.tenantId || '',
      range: range || undefined,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] Royalty status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
