/**
 * Admin Camps - Locations API
 *
 * GET /api/admin/camps/locations?tenantId=xxx - Get locations for a tenant
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import prisma from '@/lib/db/client'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Allow all camp management roles
    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
    }

    // Non-HQ admins can only view their own tenant's locations
    if (userRole !== 'hq_admin' && user.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const locations = await prisma.location.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      select: { id: true, name: true, address: true, city: true, state: true, zip: true, tenantId: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      locations: locations.map(l => ({
        id: l.id,
        name: l.name,
        address: l.address,
        city: l.city,
        state: l.state,
        zip: l.zip,
        tenant_id: l.tenantId,
      })),
    })
  } catch (error) {
    console.error('[API] GET /api/admin/camps/locations error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
