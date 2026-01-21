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
    console.log('[POST /api/camps/[campId]/hq/day/start] Starting day for camp:', campId)

    const body = await request.json().catch(() => ({}))
    const { date } = body

    const targetDate = date ? new Date(date) : undefined

    const { data, error } = await startCampDay(campId, targetDate)

    if (error) {
      console.error('[POST /api/camps/[campId]/hq/day/start] Service error:', error.message)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    console.log('[POST /api/camps/[campId]/hq/day/start] Success:', data)
    return NextResponse.json({ data })
  } catch (error) {
    console.error('[POST /api/camps/[campId]/hq/day/start] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('[POST /api/camps/[campId]/hq/day/start] Stack:', errorStack)
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    )
  }
}
