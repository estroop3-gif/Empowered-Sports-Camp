/**
 * Camp Waitlist API
 *
 * GET /api/camps/[campId]/waitlist — Get waitlist data for Camp HQ
 */

import { NextRequest, NextResponse } from 'next/server'
import { getWaitlistForCamp } from '@/lib/services/waitlist'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const { campId } = await params

    const entries = await getWaitlistForCamp(campId)

    return NextResponse.json({
      data: {
        entries,
        totalCount: entries.length,
      },
    })
  } catch (error) {
    console.error('[GET /api/camps/[campId]/waitlist] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
