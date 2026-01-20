import { NextResponse } from 'next/server'
import {
  getAdminRevenueOverview,
  getAdminRevenueTrends,
  getAdminRevenueByLicensee,
  getAdminRevenueByProgram,
  getAdminRevenueSessions,
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
        const { data, error } = await getAdminRevenueOverview({ from, to })
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json(data)
      }

      case 'trends': {
        const { data, error } = await getAdminRevenueTrends({ from, to, granularity })
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json(data)
      }

      case 'by-licensee': {
        const { data, error } = await getAdminRevenueByLicensee({ from, to })
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json(data)
      }

      case 'by-program': {
        const { data, error } = await getAdminRevenueByProgram({ from, to })
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json(data)
      }

      case 'sessions': {
        const { data, error } = await getAdminRevenueSessions({ from, to })
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json(data)
      }

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Admin revenue analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
