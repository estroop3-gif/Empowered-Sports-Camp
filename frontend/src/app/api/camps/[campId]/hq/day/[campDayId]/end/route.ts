/**
 * Camp HQ End Day API
 *
 * POST /api/camps/[campId]/hq/day/[campDayId]/end - End a camp day
 */

import { NextRequest, NextResponse } from 'next/server'
import { endCampDay } from '@/lib/services/campHq'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string; campDayId: string }> }
) {
  try {
    const { campDayId } = await params
    const body = await request.json()
    const { userId, notes } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const { data, error } = await endCampDay(campDayId, userId, notes)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[POST /api/camps/[campId]/hq/day/[campDayId]/end] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
