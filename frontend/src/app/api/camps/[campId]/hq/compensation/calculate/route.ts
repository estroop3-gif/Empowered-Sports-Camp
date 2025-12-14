/**
 * Calculate Session Compensation API
 *
 * POST /api/camps/[campId]/hq/compensation/calculate - Calculate and finalize compensation
 */

import { NextRequest, NextResponse } from 'next/server'
import { calculateSessionCompensation } from '@/lib/services/incentives'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'

interface RouteParams {
  params: Promise<{ campId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { campId } = await params
    const user = await getAuthenticatedUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins, licensee owners, and directors can calculate
    if (!['hq_admin', 'licensee_owner', 'director'].includes(user.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!user.tenantId && user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
    }

    const body = await request.json()
    const {
      staffProfileId,
      budgetPreapprovedTotal,
      budgetActualTotal,
      csatAvgScore,
      guestSpeakerCount,
    } = body

    if (!staffProfileId) {
      return NextResponse.json({ error: 'staffProfileId required' }, { status: 400 })
    }

    const { data, error } = await calculateSessionCompensation({
      campId,
      staffProfileId,
      tenantId: user.tenantId || '',
      budgetPreapprovedTotal,
      budgetActualTotal,
      csatAvgScore,
      guestSpeakerCount,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] POST compensation/calculate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
