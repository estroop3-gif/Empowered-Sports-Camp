/**
 * Admin Waivers API
 *
 * GET /api/admin/waivers - Get all waiver templates
 * POST /api/admin/waivers - Create a new waiver template
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  getWaiverTemplates,
  createWaiverTemplate,
} from '@/lib/services/waivers'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only HQ admins and licensee owners can access waivers
    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // If not HQ admin, scope to their tenant (but include site-wide)
    const tenantId = userRole === 'hq_admin'
      ? request.nextUrl.searchParams.get('tenantId') || undefined
      : user.tenantId || undefined

    const { data, error } = await getWaiverTemplates(tenantId)

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ waivers: data })
  } catch (error) {
    console.error('[API] GET /api/admin/waivers error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only HQ admins and licensee owners can create waivers
    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.title || !body.contentHtml) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    // Only HQ admins can create site-wide mandatory waivers
    if (body.isMandatorySiteWide && userRole !== 'hq_admin') {
      return NextResponse.json(
        { error: 'Only HQ admins can create site-wide mandatory waivers' },
        { status: 403 }
      )
    }

    // Determine tenant ID
    // HQ admins can create tenant-specific or site-wide (null tenant) waivers
    // Other admins can only create waivers for their tenant
    let tenantId: string | null = null
    if (userRole === 'hq_admin') {
      // HQ admin: use provided tenantId or null for site-wide
      tenantId = body.tenantId || null
    } else {
      // Licensee: must use their tenant
      tenantId = user.tenantId || null
    }

    const { data, error } = await createWaiverTemplate(
      {
        title: body.title,
        description: body.description,
        contentHtml: body.contentHtml,
        isMandatorySiteWide: body.isMandatorySiteWide ?? false,
        isActive: body.isActive ?? true,
      },
      user.id,
      tenantId
    )

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ waiver: data }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/admin/waivers error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
