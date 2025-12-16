/**
 * Tax Settings API
 *
 * GET/PUT tax configuration for tenants.
 * Tax rate is stored directly on the Tenant model.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { prisma } from '@/lib/db/client'

const ALLOWED_ROLES = ['hq_admin', 'licensee_owner']

/**
 * GET /api/admin/settings/taxes
 *
 * Get tax settings for a tenant
 * Query params:
 * - tenantId: Tenant ID (required for hq_admin, optional for licensee_owner)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = user.role?.toLowerCase() || ''
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    let tenantId = searchParams.get('tenantId')

    // Licensee owners can only access their own tenant
    if (userRole === 'licensee_owner') {
      if (!user.tenantId) {
        return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 })
      }
      tenantId = user.tenantId
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        taxRatePercent: true,
      },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        tenantId: tenant.id,
        tenantName: tenant.name,
        taxRatePercent: tenant.taxRatePercent ? Number(tenant.taxRatePercent) : 0,
      },
    })
  } catch (error) {
    console.error('[API] GET /api/admin/settings/taxes error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/settings/taxes
 *
 * Update tax settings for a tenant
 * Body: { tenantId: string, taxRatePercent: number }
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = user.role?.toLowerCase() || ''
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    let { tenantId, taxRatePercent } = body

    // Licensee owners can only update their own tenant
    if (userRole === 'licensee_owner') {
      if (!user.tenantId) {
        return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 })
      }
      tenantId = user.tenantId
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    // Validate tax rate
    const rate = parseFloat(taxRatePercent)
    if (isNaN(rate) || rate < 0 || rate > 25) {
      return NextResponse.json(
        { error: 'Tax rate must be between 0 and 25 percent' },
        { status: 400 }
      )
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: { taxRatePercent: rate },
      select: {
        id: true,
        name: true,
        taxRatePercent: true,
      },
    })

    return NextResponse.json({
      data: {
        tenantId: updated.id,
        tenantName: updated.name,
        taxRatePercent: updated.taxRatePercent ? Number(updated.taxRatePercent) : 0,
      },
    })
  } catch (error) {
    console.error('[API] PUT /api/admin/settings/taxes error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
