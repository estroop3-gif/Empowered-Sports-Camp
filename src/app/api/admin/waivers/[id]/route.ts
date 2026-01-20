/**
 * Admin Waiver Template API (by ID)
 *
 * GET /api/admin/waivers/[id] - Get a waiver template
 * PUT /api/admin/waivers/[id] - Update a waiver template
 * DELETE /api/admin/waivers/[id] - Delete a waiver template
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  getWaiverTemplateById,
  updateWaiverTemplate,
  deleteWaiverTemplate,
} from '@/lib/services/waivers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { data, error } = await getWaiverTemplateById(id)

    if (error) {
      return NextResponse.json({ error }, { status: error === 'Waiver template not found' ? 404 : 500 })
    }

    // Check tenant access for non-HQ admins
    const userRole = user.role?.toLowerCase() || ''
    if (userRole !== 'hq_admin' && data?.tenantId && data.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ waiver: data })
  } catch (error) {
    console.error('[API] GET /api/admin/waivers/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    // Check ownership
    const { data: existing } = await getWaiverTemplateById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Waiver template not found' }, { status: 404 })
    }

    // Non-HQ admins can only edit their tenant's waivers
    if (userRole !== 'hq_admin' && existing.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Non-HQ admins can't make waivers site-wide mandatory
    const body = await request.json()
    if (body.isMandatorySiteWide && userRole !== 'hq_admin') {
      return NextResponse.json(
        { error: 'Only HQ admins can create site-wide mandatory waivers' },
        { status: 403 }
      )
    }

    const { data, error } = await updateWaiverTemplate(
      id,
      {
        title: body.title,
        description: body.description,
        contentHtml: body.contentHtml,
        isMandatorySiteWide: body.isMandatorySiteWide,
        isActive: body.isActive,
      },
      user.id
    )

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ waiver: data })
  } catch (error) {
    console.error('[API] PUT /api/admin/waivers/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    // Check ownership
    const { data: existing } = await getWaiverTemplateById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Waiver template not found' }, { status: 404 })
    }

    // Non-HQ admins can only delete their tenant's waivers
    if (userRole !== 'hq_admin' && existing.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await deleteWaiverTemplate(id)

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] DELETE /api/admin/waivers/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
