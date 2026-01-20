/**
 * Coach Curriculum API
 *
 * GET /api/coach/curriculum - Get curriculum/drills for the authenticated coach's assigned blocks
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { getCoachCurriculum } from '@/lib/services/coach-dashboard'

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
    const campId = searchParams.get('campId') || undefined

    // Validate campId if provided
    if (campId && !UUID_REGEX.test(campId)) {
      return NextResponse.json({ error: 'Invalid campId format' }, { status: 400 })
    }

    const { data, error } = await getCoachCurriculum({
      userId: user.id,
      campId,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/coach/curriculum error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
