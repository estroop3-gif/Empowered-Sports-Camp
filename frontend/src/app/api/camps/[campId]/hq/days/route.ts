/**
 * Camp HQ Days API
 *
 * GET /api/camps/[campId]/hq/days - Get all camp days for the session
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCampHqDays } from '@/lib/services/campHq'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const { campId } = await params

    const { data, error } = await getCampHqDays(campId)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('[GET /api/camps/[campId]/hq/days] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
