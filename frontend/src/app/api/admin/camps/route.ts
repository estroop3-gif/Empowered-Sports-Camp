/**
 * Admin Camps API
 *
 * GET /api/admin/camps - Get all camps for admin dashboard
 * POST /api/admin/camps?action=duplicate&id=xxx - Duplicate a camp
 * DELETE /api/admin/camps?id=xxx - Delete a camp
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { fetchAdminCamps, duplicateCamp, deleteCamp } from '@/lib/services/admin-camps'

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

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')
    const id = searchParams.get('id')

    if (action === 'duplicate' && id) {
      const camp = await duplicateCamp(id)
      return NextResponse.json({ camp })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[API] POST /api/admin/camps error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Camp ID required' }, { status: 400 })
    }

    await deleteCamp(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] DELETE /api/admin/camps error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
