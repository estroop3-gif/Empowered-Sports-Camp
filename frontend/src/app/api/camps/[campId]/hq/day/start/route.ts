/**
 * Camp HQ Start Day API
 *
 * POST /api/camps/[campId]/hq/day/start - Start a camp day
 */

import { NextRequest, NextResponse } from 'next/server'
import { startCampDay } from '@/lib/services/campHq'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const { campId } = await params
    const body = await request.json().catch(() => ({}))
    const { date } = body

    const targetDate = date ? new Date(date) : undefined

    const { data, error } = await startCampDay(campId, targetDate)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[POST /api/camps/[campId]/hq/day/start] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
