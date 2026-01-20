/**
 * Admin Athletes API
 *
 * GET /api/admin/athletes - List all athletes with filters
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth/server'
import {
  listAthletesForAdmin,
  getAthleteStats,
  getAvailableGrades,
} from '@/lib/services/athletes-admin'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only HQ admins can access this endpoint
    if (user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')

    // Get stats
    if (action === 'stats') {
      const tenantId = searchParams.get('tenantId') || undefined
      const { data, error } = await getAthleteStats({ tenantId })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    }

    // Get available grades for filter dropdown
    if (action === 'grades') {
      const { data, error } = await getAvailableGrades()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ grades: data })
    }

    // List athletes with filters
    const params = {
      tenantId: searchParams.get('tenantId') || undefined,
      search: searchParams.get('search') || undefined,
      grade: searchParams.get('grade') || undefined,
      minAge: searchParams.get('minAge') ? parseInt(searchParams.get('minAge')!) : undefined,
      maxAge: searchParams.get('maxAge') ? parseInt(searchParams.get('maxAge')!) : undefined,
      city: searchParams.get('city') || undefined,
      state: searchParams.get('state') || undefined,
      campId: searchParams.get('campId') || undefined,
      isActive: searchParams.get('isActive') !== null
        ? searchParams.get('isActive') === 'true'
        : undefined,
      riskFlag: searchParams.get('riskFlag') || undefined,
      limit: parseInt(searchParams.get('limit') || searchParams.get('pageSize') || '50'),
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!)
        : (parseInt(searchParams.get('page') || '1') - 1) * parseInt(searchParams.get('pageSize') || '50'),
    }

    const { data, error } = await listAthletesForAdmin(params)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const page = Math.floor(params.offset / params.limit) + 1

    return NextResponse.json({
      athletes: data!.athletes,
      total: data!.total,
      page,
      pageSize: params.limit,
      totalPages: Math.ceil(data!.total / params.limit),
    })
  } catch (error) {
    console.error('[API] GET /api/admin/athletes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
