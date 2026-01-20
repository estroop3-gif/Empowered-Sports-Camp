/**
 * Camp Schedule Days API
 *
 * GET /api/camps/[campId]/hq/schedule - Get all schedule days
 * POST /api/camps/[campId]/hq/schedule - Create a new schedule day
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  getCampScheduleDays,
  createCampSessionDay,
  CreateDayInput,
} from '@/lib/services/campSchedule'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const { campId } = await params

    const days = await getCampScheduleDays(campId)

    return NextResponse.json({ data: days })
  } catch (error) {
    console.error('[GET /api/camps/[campId]/hq/schedule] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { campId } = await params
    const body = await request.json()

    const input: CreateDayInput = {
      dayNumber: body.dayNumber,
      actualDate: body.actualDate,
      title: body.title || `Day ${body.dayNumber}`,
      theme: body.theme,
      notes: body.notes,
    }

    const day = await createCampSessionDay(campId, input)

    return NextResponse.json({ data: day }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/camps/[campId]/hq/schedule] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
