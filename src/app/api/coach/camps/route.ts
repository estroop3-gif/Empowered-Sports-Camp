/**
 * Coach Camps API
 *
 * GET /api/coach/camps - Get all camps assigned to the authenticated coach
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { listCoachCamps, getCoachCampDetail } from '@/lib/services/coach-dashboard'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Coaches and higher roles can access
    const allowedRoles = ['coach', 'director', 'licensee_owner', 'hq_admin']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const campId = searchParams.get('campId')
    const status = searchParams.get('status') as 'all' | 'upcoming' | 'in_progress' | 'completed' | null
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100) // Max 100

    // Validate campId if provided
    if (campId && !UUID_REGEX.test(campId)) {
      return NextResponse.json({ error: 'Invalid campId format' }, { status: 400 })
    }

    // Validate pagination params
    if (isNaN(page) || page < 1) {
      return NextResponse.json({ error: 'Invalid page parameter' }, { status: 400 })
    }
    if (isNaN(limit) || limit < 1) {
      return NextResponse.json({ error: 'Invalid limit parameter' }, { status: 400 })
    }

    // If campId is provided, get detailed camp info
    if (campId) {
      const { data, error } = await getCoachCampDetail({
        userId: user.id,
        campId,
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data })
    }

    // Otherwise list all camps with pagination
    const { data, error } = await listCoachCamps({
      userId: user.id,
      status: status || 'all',
      page,
      limit,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/coach/camps error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
