/**
 * Licensee Royalties API
 *
 * GET /api/licensee/royalties - Get royalty summary for the licensee
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { getLicenseeRoyaltySummary } from '@/lib/services/licensee-royalties'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['licensee_owner', 'hq_admin']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 })
    }

    const startDate = request.nextUrl.searchParams.get('startDate') || undefined
    const endDate = request.nextUrl.searchParams.get('endDate') || undefined
    const period = request.nextUrl.searchParams.get('period') || undefined

    const { data, error } = await getLicenseeRoyaltySummary({
      tenantId: user.tenantId,
      period,
      startDate,
      endDate,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/licensee/royalties error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
