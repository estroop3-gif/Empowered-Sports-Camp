/**
 * Camp Schedule Blocks API
 *
 * GET /api/camps/[campId]/hq/schedule/[dayId]/blocks - Get all blocks for a day
 * POST /api/camps/[campId]/hq/schedule/[dayId]/blocks - Create a new block
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  getCampScheduleDay,
  createScheduleBlock,
  CreateBlockInput,
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

    return NextResponse.json({ data: day.scheduleBlocks })
  } catch (error) {
    console.error('[GET /api/camps/[campId]/hq/schedule/[dayId]/blocks] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
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

    const input: CreateBlockInput = {
      startTime: body.startTime,
      endTime: body.endTime,
      label: body.label,
      description: body.description,
      curriculumBlockId: body.curriculumBlockId,
      location: body.location,
      assignedStaffNotes: body.assignedStaffNotes,
      orderIndex: body.orderIndex,
      blockType: body.blockType,
      colorCode: body.colorCode,
    }

    const block = await createScheduleBlock(dayId, input)

    return NextResponse.json({ data: block }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/camps/[campId]/hq/schedule/[dayId]/blocks] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
