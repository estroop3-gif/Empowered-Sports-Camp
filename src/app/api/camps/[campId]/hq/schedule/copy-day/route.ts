/**
 * Copy Day Schedule API
 *
 * POST /api/camps/[campId]/hq/schedule/copy-day - Copy schedule from one day to another
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { copyDaySchedule } from '@/lib/services/campSchedule'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const { sourceDayId, targetDayId, replaceExisting = true } = body

    if (!sourceDayId || !targetDayId) {
      return NextResponse.json(
        { error: 'sourceDayId and targetDayId are required' },
        { status: 400 }
      )
    }

    const result = await copyDaySchedule(sourceDayId, targetDayId, replaceExisting)

    return NextResponse.json({
      data: result,
      message: `Copied ${result.blocksCopied} blocks`,
    })
  } catch (error) {
    console.error('[POST /api/camps/[campId]/hq/schedule/copy-day] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
