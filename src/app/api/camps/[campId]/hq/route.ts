/**
 * Camp HQ Overview API
 *
 * GET /api/camps/[campId]/hq - Get comprehensive camp HQ overview
 * GET /api/camps/[campId]/hq?action=financial - Get financial overview
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCampHqOverview, getFinancialOverview } from '@/lib/services/campHq'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const { campId } = await params
    const action = request.nextUrl.searchParams.get('action')

    if (action === 'financial') {
      const tenantId = request.nextUrl.searchParams.get('tenantId')
      const { data, error } = await getFinancialOverview({ campId, tenantId })

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ data })
    }

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
