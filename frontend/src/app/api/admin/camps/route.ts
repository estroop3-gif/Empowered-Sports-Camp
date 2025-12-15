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

    // Only HQ admins and licensee owners can access admin camps
    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
