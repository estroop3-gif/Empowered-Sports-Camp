import { NextResponse } from 'next/server'
import {
  getGlobalAnalyticsOverview,
  getGlobalLicenseeBreakdown,
  getGlobalRevenueTrends,
  getGlobalKpiByProgram,
} from '@/lib/services/analytics'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const type = searchParams.get('type') || 'overview'
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')
  const granularity = (searchParams.get('granularity') || 'week') as 'day' | 'week' | 'month'

  const from = fromParam ? new Date(fromParam) : undefined
  const to = toParam ? new Date(toParam) : undefined

  try {
    switch (type) {
      case 'overview': {
        const { data, error } = await getGlobalAnalyticsOverview({ from, to })
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json(data)
      }

      case 'licensee-breakdown': {
        const { data, error } = await getGlobalLicenseeBreakdown({ from, to })
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json(data)
      }

      case 'revenue-trends': {
        const { data, error } = await getGlobalRevenueTrends({ from, to, granularity })
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json(data)
      }

      case 'program-kpis': {
        const { data, error } = await getGlobalKpiByProgram({ from, to })
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json(data)
      }

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Analytics global error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
