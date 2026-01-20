/**
 * Licensee Sales Report API
 *
 * GET /api/licensee/reports/sales - Get detailed sales report for the licensee's territory
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { getLicenseeSalesReport } from '@/lib/services/licensee-dashboard'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Must be a licensee owner
    if (user.role !== 'licensee_owner') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant assigned' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'season'

    const { data, error } = await getLicenseeSalesReport({
      tenantId: user.tenantId,
      period,
    })

    if (error) {
      console.error('[GET /api/licensee/reports/sales] Error:', error)
      return NextResponse.json({ error: 'Failed to load sales report' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[GET /api/licensee/reports/sales] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
