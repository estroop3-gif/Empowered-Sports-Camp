/**
 * Camp Session Compensation API
 *
 * GET /api/camps/[campId]/hq/compensation - Get compensation for this camp
 * POST /api/camps/[campId]/hq/compensation - Attach/update compensation plan
 * PATCH /api/camps/[campId]/hq/compensation - Update metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getSessionCompensation,
  attachCompensationPlanToSession,
  updateSessionMetrics,
  CompensationPlanCode,
} from '@/lib/services/incentives'
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

    // Get staffProfileId from query if provided
    const staffProfileId = request.nextUrl.searchParams.get('staffProfileId') || undefined

    const { data, error } = await getSessionCompensation({
      campId,
      staffProfileId,
      tenantId: user.tenantId || '',
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET compensation error:', error)
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

    // Only admins and licensee owners can attach plans
    if (!['hq_admin', 'licensee_owner'].includes(user.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!user.tenantId && user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
    }

    const body = await request.json()
    const { staffProfileId, planCode, tenantId } = body

    if (!staffProfileId || !planCode) {
      return NextResponse.json(
        { error: 'staffProfileId and planCode required' },
        { status: 400 }
      )
    }

    // Validate plan code
    if (!['HIGH', 'MID', 'ENTRY', 'FIXED'].includes(planCode)) {
      return NextResponse.json({ error: 'Invalid plan code' }, { status: 400 })
    }

    const { data, error } = await attachCompensationPlanToSession({
      campId,
      staffProfileId,
      planCode: planCode as CompensationPlanCode,
      tenantId: tenantId || user.tenantId || '',
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] POST compensation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { campId } = await params
    const user = await getAuthenticatedUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    const { data, error } = await updateSessionMetrics({
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
    console.error('[API] PATCH compensation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
