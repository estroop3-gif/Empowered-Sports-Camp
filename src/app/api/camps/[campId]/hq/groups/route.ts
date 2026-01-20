/**
 * Camp HQ Groups API
 *
 * GET /api/camps/[campId]/hq/groups - Get groups overview for the camp
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCampHqGroups } from '@/lib/services/campHq'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const { campId } = await params

    const { data, error } = await getCampHqGroups(campId)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('[GET /api/camps/[campId]/hq/groups] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
