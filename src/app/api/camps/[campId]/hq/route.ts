/**
 * Camp HQ Overview API
 *
 * GET /api/camps/[campId]/hq - Get comprehensive camp HQ overview
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCampHqOverview } from '@/lib/services/campHq'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const { campId } = await params

    const { data, error } = await getCampHqOverview(campId)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Camp not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[GET /api/camps/[campId]/hq] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
