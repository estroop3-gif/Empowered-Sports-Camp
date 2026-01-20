/**
 * Camp Days API
 *
 * GET /api/camp-days?date={date}&tenantId={tenantId}
 *
 * Returns camp days for a specific date, used by director's "Today's Camps" view.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCampDaysForDate } from '@/lib/services/camp-days'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Parse query params
    const dateParam = request.nextUrl.searchParams.get('date')
    const tenantId = request.nextUrl.searchParams.get('tenantId')

    const date = dateParam ? new Date(dateParam) : new Date()

    // Determine access based on role
    let directorId: string | undefined
    if (user.role === 'director' || user.role === 'coach') {
      directorId = user.id
    }

    // Get camp days
    const { data, error } = await getCampDaysForDate({
      date,
      directorId,
      tenantId: tenantId || user.tenantId || undefined,
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[GET /api/camp-days] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
