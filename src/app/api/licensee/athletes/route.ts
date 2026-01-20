/**
 * Licensee Athletes API
 *
 * GET /api/licensee/athletes - List athletes scoped to licensee's tenant
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth/server'
import {
  listAthletesForLicensee,
  getAthleteStats,
  getAvailableGrades,
} from '@/lib/services/athletes-admin'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Licensee owners and directors can access
    const allowedRoles = ['licensee_owner', 'director']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')

    // Get stats for this tenant
    if (action === 'stats') {
      const { data, error } = await getAthleteStats({ tenantId: user.tenantId })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    }

    // Get available grades
    if (action === 'grades') {
      const { data, error } = await getAvailableGrades()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ grades: data })
    }

    // List athletes scoped to tenant
    const params = {
      search: searchParams.get('search') || undefined,
      grade: searchParams.get('grade') || undefined,
      minAge: searchParams.get('minAge') ? parseInt(searchParams.get('minAge')!) : undefined,
      maxAge: searchParams.get('maxAge') ? parseInt(searchParams.get('maxAge')!) : undefined,
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

    const { data, error } = await listAthletesForLicensee(user.tenantId, params)

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
    console.error('[API] GET /api/licensee/athletes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
