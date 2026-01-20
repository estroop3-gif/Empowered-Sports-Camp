/**
 * SHELL: Revenue Trends API
 *
 * GET /api/revenue/trends?range=season|ytd|custom&startDate=xxx&endDate=xxx
 * Gets revenue trend data for visualization.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import { getSessionRevenueTrends } from '@/lib/services/revenue'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const range = searchParams.get('range') || 'season'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // SHELL: Only admins and licensees can view revenue trends
    const allowedRoles = ['hq_admin', 'licensee_owner']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await getSessionRevenueTrends({
      tenantId: user.tenantId || '',
      role: user.role,
      range: range as 'season' | 'ytd' | 'custom',
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] Revenue trends error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
