import { NextResponse } from 'next/server'
import {
  getLicenseeAnalyticsOverview,
  getLicenseeSessionAnalytics,
  getLicenseeRevenueTrends,
  getLicenseeProgramBreakdown,
} from '@/lib/services/analytics'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const tenantId = searchParams.get('tenantId')
  const type = searchParams.get('type') || 'overview'
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')
  const granularity = (searchParams.get('granularity') || 'week') as 'day' | 'week' | 'month'

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
  }

  const from = fromParam ? new Date(fromParam) : undefined
  const to = toParam ? new Date(toParam) : undefined

  try {
    switch (type) {
      case 'overview': {
        const { data, error } = await getLicenseeAnalyticsOverview({ tenantId, from, to })
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json(data)
      }

      case 'sessions': {
        const { data, error } = await getLicenseeSessionAnalytics({ tenantId, from, to })
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json(data)
      }

      case 'revenue-trends': {
        const { data, error } = await getLicenseeRevenueTrends({ tenantId, from, to, granularity })
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json(data)
      }

      case 'program-breakdown': {
        const { data, error } = await getLicenseeProgramBreakdown({ tenantId, from, to })
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json(data)
      }

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Analytics licensee error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
