/**
 * Camp Schedule Day API
 *
 * GET /api/camps/[campId]/hq/schedule/[dayId] - Get a single schedule day
 * PUT /api/camps/[campId]/hq/schedule/[dayId] - Update a schedule day
 * DELETE /api/camps/[campId]/hq/schedule/[dayId] - Delete a schedule day
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  getCampScheduleDay,
  updateCampSessionDay,
  deleteCampSessionDay,
  UpdateDayInput,
} from '@/lib/services/campSchedule'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string; dayId: string }> }
) {
  try {
    const { dayId } = await params

    const day = await getCampScheduleDay(dayId)

    if (!day) {
      return NextResponse.json({ error: 'Day not found' }, { status: 404 })
    }

    return NextResponse.json({ data: day })
  } catch (error) {
    console.error('[GET /api/camps/[campId]/hq/schedule/[dayId]] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string; dayId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { dayId } = await params
    const body = await request.json()

    const input: UpdateDayInput = {}
    if (body.title !== undefined) input.title = body.title
    if (body.theme !== undefined) input.theme = body.theme
    if (body.notes !== undefined) input.notes = body.notes
    if (body.status !== undefined) input.status = body.status

    const day = await updateCampSessionDay(dayId, input)

    return NextResponse.json({ data: day })
  } catch (error) {
    console.error('[PUT /api/camps/[campId]/hq/schedule/[dayId]] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string; dayId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { dayId } = await params

    await deleteCampSessionDay(dayId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/camps/[campId]/hq/schedule/[dayId]] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
