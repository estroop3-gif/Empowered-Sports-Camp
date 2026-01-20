/**
 * Coach Athletes API
 *
 * GET /api/coach/athletes - List athletes from coach's assigned camps
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth/server'
import { listAthletesForCoach } from '@/lib/services/athletes-admin'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only coaches can access
    if (user.role !== 'coach') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!user.id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams

    const params = {
      search: searchParams.get('search') || undefined,
      grade: searchParams.get('grade') || undefined,
      minAge: searchParams.get('minAge') ? parseInt(searchParams.get('minAge')!) : undefined,
      maxAge: searchParams.get('maxAge') ? parseInt(searchParams.get('maxAge')!) : undefined,
      campId: searchParams.get('campId') || undefined,
      isActive: searchParams.get('isActive') !== null
        ? searchParams.get('isActive') === 'true'
        : undefined,
      limit: parseInt(searchParams.get('limit') || searchParams.get('pageSize') || '50'),
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!)
        : (parseInt(searchParams.get('page') || '1') - 1) * parseInt(searchParams.get('pageSize') || '50'),
    }

    const { data, error } = await listAthletesForCoach(user.id, params)

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
    console.error('[API] GET /api/coach/athletes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
