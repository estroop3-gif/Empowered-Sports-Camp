/**
 * Admin Camp Venues API
 *
 * GET /api/admin/camps/venues - Get venues for camp creation
 * Supports optional tenantId query param for filtering by tenant
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth/server'
import { getVenuesForCampCreation } from '@/lib/services/venues'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId') || undefined

    // For non-HQ admins, scope to their tenant if no tenantId specified
    const effectiveTenantId = user.role === 'hq_admin'
      ? tenantId
      : user.tenantId || tenantId

    console.log('[venues API] effectiveTenantId:', effectiveTenantId)
    const { data, error } = await getVenuesForCampCreation(effectiveTenantId)
    console.log('[venues API] Result:', { dataLength: data?.length, error: error?.message })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[venues API] Returning venues:', data?.map(v => v.name))
    return NextResponse.json({ venues: data })
  } catch (error) {
    console.error('[API] GET /api/admin/camps/venues error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
