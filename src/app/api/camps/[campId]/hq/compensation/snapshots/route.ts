/**
 * Daily Compensation Snapshots API
 *
 * GET /api/camps/[campId]/hq/compensation/snapshots - Get all daily snapshots
 * POST /api/camps/[campId]/hq/compensation/snapshots - Capture a daily snapshot
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDailySnapshots, captureDaySnapshot } from '@/lib/services/incentives'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'

interface RouteParams {
  params: Promise<{ campId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { campId } = await params
    const user = await getAuthenticatedUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user.tenantId && user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
    }

    const staffProfileId = request.nextUrl.searchParams.get('staffProfileId')
    if (!staffProfileId) {
      return NextResponse.json({ error: 'staffProfileId required' }, { status: 400 })
    }

    const { data, error } = await getDailySnapshots({
      campId,
      staffProfileId,
      tenantId: user.tenantId || '',
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET compensation/snapshots error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { campId } = await params
    const user = await getAuthenticatedUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins, licensee owners, and directors can capture snapshots
    if (!['hq_admin', 'licensee_owner', 'director'].includes(user.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!user.tenantId && user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
    }

    const body = await request.json()
    const { campDayId, staffProfileId, dayCsatAvgScore, dayGuestSpeakerCount, notes } = body

    if (!campDayId || !staffProfileId) {
      return NextResponse.json(
        { error: 'campDayId and staffProfileId required' },
        { status: 400 }
      )
    }

    const { data, error } = await captureDaySnapshot({
      campDayId,
      staffProfileId,
      tenantId: user.tenantId || '',
      dayCsatAvgScore,
      dayGuestSpeakerCount,
      notes,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] POST compensation/snapshots error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
