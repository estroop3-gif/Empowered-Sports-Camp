/**
 * Admin Territories API
 *
 * GET /api/admin/territories - List all territories with stats, tenants, and licensees
 * POST /api/admin/territories - Create new territory
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth/server'
import {
  getAllTerritories,
  getTerritoryStats,
  getTenantsForAssignment,
  getLicenseesForAssignment,
  createTerritory,
  CreateTerritoryInput,
} from '@/lib/services/territories'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['hq_admin', 'licensee_owner']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const tenantId = searchParams.get('tenantId') || undefined
    const search = searchParams.get('search') || undefined

    // Fetch all data in parallel
    const [territoriesResult, statsResult, tenantsResult, licenseesResult] = await Promise.all([
      getAllTerritories({ status: status as any, tenant_id: tenantId, search }),
      getTerritoryStats(),
      getTenantsForAssignment(),
      getLicenseesForAssignment(),
    ])

    if (territoriesResult.error) {
      return NextResponse.json(
        { error: territoriesResult.error.message || 'Failed to load territories' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        territories: territoriesResult.data || [],
        stats: statsResult.data || { total: 0, open: 0, reserved: 0, assigned: 0, closed: 0 },
        tenants: tenantsResult.data || [],
        licensees: licenseesResult.data || [],
      },
    })
  } catch (error) {
    console.error('[API] Territories error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Forbidden - HQ admin only' }, { status: 403 })
    }

    const body = await request.json()
    const input: CreateTerritoryInput = {
      name: body.name,
      description: body.description,
      country: body.country,
      state_region: body.state_region,
      city: body.city,
      postal_codes: body.postal_codes,
      tenant_id: body.tenant_id,
      status: body.status,
      notes: body.notes,
    }

    const { data, error } = await createTerritory(input)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] Create territory error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
