/**
 * Admin Single Camp API
 *
 * GET /api/admin/camps/[campId] - Get a single camp by ID
 * PUT /api/admin/camps/[campId] - Update a camp
 * DELETE /api/admin/camps/[campId] - Delete a camp
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { fetchCampById, updateCamp, deleteCamp, type CampFormData } from '@/lib/services/admin-camps'

interface RouteContext {
  params: Promise<{ campId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
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

    const { campId } = await context.params
    const camp = await fetchCampById(campId)

    if (!camp) {
      return NextResponse.json({ error: 'Camp not found' }, { status: 404 })
    }

    // Non-HQ admins can only view their own tenant's camps
    if (userRole !== 'hq_admin' && user.tenantId !== camp.tenant_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ camp })
  } catch (error) {
    console.error('[API] GET /api/admin/camps/[campId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
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

    const { campId } = await context.params

    // Check if camp exists and user has permission
    const existingCamp = await fetchCampById(campId)
    if (!existingCamp) {
      return NextResponse.json({ error: 'Camp not found' }, { status: 404 })
    }

    // Non-HQ admins can only update their own tenant's camps
    if (userRole !== 'hq_admin' && user.tenantId !== existingCamp.tenant_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const formData: Partial<CampFormData> = body

    const camp = await updateCamp(campId, formData)
    return NextResponse.json({ camp })
  } catch (error) {
    console.error('[API] PUT /api/admin/camps/[campId] error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
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

    const { campId } = await context.params

    // Check if camp exists and user has permission
    const existingCamp = await fetchCampById(campId)
    if (!existingCamp) {
      return NextResponse.json({ error: 'Camp not found' }, { status: 404 })
    }

    // Non-HQ admins can only delete their own tenant's camps
    if (userRole !== 'hq_admin' && user.tenantId !== existingCamp.tenant_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await deleteCamp(campId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] DELETE /api/admin/camps/[campId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
