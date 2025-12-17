/**
 * Camp Schedule Blocks Reorder API
 *
 * POST /api/camps/[campId]/hq/schedule/[dayId]/blocks/reorder - Reorder blocks
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { reorderScheduleBlocks } from '@/lib/services/campSchedule'

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

    // Expecting body.blockOrder: [{ id: string, orderIndex: number }]
    if (!Array.isArray(body.blockOrder)) {
      return NextResponse.json(
        { error: 'blockOrder must be an array' },
        { status: 400 }
      )
    }

    await reorderScheduleBlocks(dayId, body.blockOrder)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[POST /api/camps/[campId]/hq/schedule/[dayId]/blocks/reorder] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
