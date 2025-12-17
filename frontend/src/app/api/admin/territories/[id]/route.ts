/**
 * Admin Territory Detail API
 *
 * GET /api/admin/territories/[id] - Get single territory
 * PUT /api/admin/territories/[id] - Update territory
 * DELETE /api/admin/territories/[id] - Close territory
 * PATCH /api/admin/territories/[id] - Territory actions (close, reopen, unassign)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth/server'
import {
  getTerritoryById,
  getTerritoryAssignments,
  updateTerritory,
  closeTerritory,
  reopenTerritory,
  unassignTerritory,
  saveTerritoryAssignments,
  UpdateTerritoryInput,
} from '@/lib/services/territories'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['hq_admin', 'licensee_owner']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const [territoryResult, assignmentsResult] = await Promise.all([
      getTerritoryById(id),
      getTerritoryAssignments(id),
    ])

    if (territoryResult.error) {
      return NextResponse.json({ error: territoryResult.error.message }, { status: 500 })
    }

    if (!territoryResult.data) {
      return NextResponse.json({ error: 'Territory not found' }, { status: 404 })
    }

    return NextResponse.json({
      data: territoryResult.data,
      assignments: assignmentsResult.data || { tenants: [], licensees: [] },
    })
  } catch (error) {
    console.error('[API] Get territory error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Forbidden - HQ admin only' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const input: UpdateTerritoryInput = {}
    if (body.name !== undefined) input.name = body.name
    if (body.description !== undefined) input.description = body.description
    if (body.country !== undefined) input.country = body.country
    if (body.state_region !== undefined) input.state_region = body.state_region
    if (body.city !== undefined) input.city = body.city
    if (body.postal_codes !== undefined) input.postal_codes = body.postal_codes
    if (body.tenant_id !== undefined) input.tenant_id = body.tenant_id
    if (body.status !== undefined) input.status = body.status
    if (body.notes !== undefined) input.notes = body.notes

    const { data, error } = await updateTerritory(id, input)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] Update territory error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Forbidden - HQ admin only' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { action } = body

    let result: { success: boolean; error: Error | null }

    switch (action) {
      case 'close':
        result = await closeTerritory(id)
        break
      case 'reopen':
        result = await reopenTerritory(id)
        break
      case 'unassign':
        result = await unassignTerritory(id)
        break
      case 'assign':
        const { tenantIds, licenseeIds } = body
        result = await saveTerritoryAssignments(
          id,
          tenantIds || [],
          licenseeIds || [],
          user.id
        )
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Territory action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Forbidden - HQ admin only' }, { status: 403 })
    }

    const { id } = await params
    const { success, error } = await closeTerritory(id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success })
  } catch (error) {
    console.error('[API] Delete territory error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
