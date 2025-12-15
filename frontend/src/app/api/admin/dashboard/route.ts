import { NextResponse } from 'next/server'
import {
  getAdminDashboardData,
  getAdminDashboardComparison,
} from '@/lib/services/admin-dashboard'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')

  const from = fromParam ? new Date(fromParam) : undefined
  const to = toParam ? new Date(toParam) : undefined

  try {
    // Fetch main dashboard data and comparison metrics in parallel
    const [dashboardResult, comparisonResult] = await Promise.all([
      getAdminDashboardData({ from, to }),
      getAdminDashboardComparison({ from, to }),
    ])

    if (dashboardResult.error) {
      return NextResponse.json(
        { error: dashboardResult.error.message },
        { status: 500 }
      )
    }

    // Merge comparison data into response
    const response = {
      ...dashboardResult.data,
      comparison: comparisonResult.data || { revenueChange: 0, registrationChange: 0 },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[API] Admin dashboard error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
