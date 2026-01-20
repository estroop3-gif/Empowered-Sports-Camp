/**
 * Camp HQ Quick Actions API
 *
 * GET /api/camps/[campId]/hq/actions - Get available quick actions
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCampHqQuickActions } from '@/lib/services/campHq'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const { campId } = await params

    const { data, error } = await getCampHqQuickActions(campId)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('[GET /api/camps/[campId]/hq/actions] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
