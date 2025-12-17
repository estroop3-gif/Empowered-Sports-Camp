/**
 * Camp Schedule Block API
 *
 * PUT /api/camps/[campId]/hq/schedule/[dayId]/blocks/[blockId] - Update a block
 * DELETE /api/camps/[campId]/hq/schedule/[dayId]/blocks/[blockId] - Delete a block
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  updateScheduleBlock,
  deleteScheduleBlock,
  UpdateBlockInput,
} from '@/lib/services/campSchedule'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string; dayId: string; blockId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { blockId } = await params
    const body = await request.json()

    const input: UpdateBlockInput = {}
    if (body.startTime !== undefined) input.startTime = body.startTime
    if (body.endTime !== undefined) input.endTime = body.endTime
    if (body.label !== undefined) input.label = body.label
    if (body.description !== undefined) input.description = body.description
    if (body.curriculumBlockId !== undefined) input.curriculumBlockId = body.curriculumBlockId
    if (body.location !== undefined) input.location = body.location
    if (body.assignedStaffNotes !== undefined) input.assignedStaffNotes = body.assignedStaffNotes
    if (body.orderIndex !== undefined) input.orderIndex = body.orderIndex
    if (body.blockType !== undefined) input.blockType = body.blockType
    if (body.colorCode !== undefined) input.colorCode = body.colorCode

    const block = await updateScheduleBlock(blockId, input)

    return NextResponse.json({ data: block })
  } catch (error) {
    console.error('[PUT /api/camps/[campId]/hq/schedule/[dayId]/blocks/[blockId]] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string; dayId: string; blockId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { blockId } = await params

    await deleteScheduleBlock(blockId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/camps/[campId]/hq/schedule/[dayId]/blocks/[blockId]] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
