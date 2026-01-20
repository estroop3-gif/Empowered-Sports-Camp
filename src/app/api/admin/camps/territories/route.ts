/**
 * Admin Camps - Territories API
 *
 * GET /api/admin/camps/territories - Get all territories for camp assignment
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

    // Only HQ admins and licensee owners can view territories
    const allowedRoles = ['hq_admin', 'licensee_owner']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get query params for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Build where clause
    const where: Record<string, unknown> = {}

    // Filter by status if provided, otherwise show open and assigned territories
    if (status) {
      where.status = status
    } else {
      where.status = { in: ['open', 'assigned'] }
    }

    // For licensee owners, only show territories assigned to their tenant
    if (userRole === 'licensee_owner' && user.tenantId) {
      where.tenantId = user.tenantId
    }

    const territories = await prisma.territory.findMany({
      where,
      select: {
        id: true,
        name: true,
        country: true,
        stateRegion: true,
        city: true,
        status: true,
        tenantId: true,
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { stateRegion: 'asc' },
        { name: 'asc' },
      ],
    })

    // Format response
    const formattedTerritories = territories.map((t) => ({
      id: t.id,
      name: t.name,
      country: t.country,
      state_region: t.stateRegion,
      city: t.city,
      status: t.status,
      tenant_id: t.tenantId,
      tenant_name: t.tenant?.name || null,
    }))

    return NextResponse.json({ territories: formattedTerritories })
  } catch (error) {
    console.error('[API] GET /api/admin/camps/territories error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
