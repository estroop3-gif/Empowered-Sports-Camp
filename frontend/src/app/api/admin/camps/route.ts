/**
 * Admin Camps API
 *
 * GET /api/admin/camps - Get all camps for admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { fetchAdminCamps } from '@/lib/services/admin-camps'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For now, allow any authenticated user accessing admin routes
    // TODO: Add proper role-based access once Cognito roles are fully set up
    const userRole = user.role?.toLowerCase() || 'hq_admin' // Default to hq_admin for admin routes

    // If not HQ admin, scope to their tenant
    const scopedTenantId = userRole === 'hq_admin' ? undefined : user.tenantId

    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenantId') || scopedTenantId || undefined
    const status = searchParams.get('status') || undefined
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 100

    const { camps, total } = await fetchAdminCamps({
      tenantId,
      status,
      page,
      pageSize,
    })

    return NextResponse.json({ camps, total })
  } catch (error) {
    console.error('[API] GET /api/admin/camps error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
