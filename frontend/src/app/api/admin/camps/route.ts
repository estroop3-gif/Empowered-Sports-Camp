/**
 * Admin Camps API
 *
 * GET /api/admin/camps - Get all camps for admin dashboard
 * POST /api/admin/camps?action=duplicate&id=xxx - Duplicate a camp
 * POST /api/admin/camps?action=create - Create a new camp (with JSON body)
 * PUT /api/admin/camps?id=xxx - Update an existing camp
 * DELETE /api/admin/camps?id=xxx - Delete a camp
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { fetchAdminCamps, duplicateCamp, deleteCamp, createCamp, updateCamp, type CampFormData } from '@/lib/services/admin-camps'

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

    if (action === 'create') {
      const body = await request.json()
      const formData: CampFormData = body

      // Validate required fields - tenant_id only required for non-HQ admins
      if (!formData.name || !formData.start_date || !formData.end_date) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      // Non-HQ admins must provide a tenant_id
      if (userRole !== 'hq_admin' && !formData.tenant_id) {
        return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
      }

      // For non-HQ admins, ensure they're creating camps for their own tenant
      if (userRole !== 'hq_admin' && user.tenantId !== formData.tenant_id) {
        return NextResponse.json({ error: 'Cannot create camps for other tenants' }, { status: 403 })
      }

      const camp = await createCamp(formData)
      return NextResponse.json({ camp })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[API] POST /api/admin/camps error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const camp = await updateCamp(id, body)
    return NextResponse.json({ camp })
  } catch (error) {
    console.error('[API] PUT /api/admin/camps error:', error)
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
