/**
 * Admin Licensee Applications API Route
 *
 * List and manage franchise/licensee applications.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  listLicenseeApplications,
  getLicenseeApplicationCounts,
} from '@/lib/services/licensee-application'
import type { LicenseeApplicationStatus } from '@/generated/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // If counts requested, return aggregated counts
    if (searchParams.get('counts') === 'true') {
      const { data, error } = await getLicenseeApplicationCounts()

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch counts' },
          { status: 500 }
        )
      }

      return NextResponse.json({ data })
    }

    // Parse query parameters
    const statusParam = searchParams.get('status')
    const state = searchParams.get('state') || undefined
    const search = searchParams.get('search') || undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('limit') || '20', 10)

    const { data, error } = await listLicenseeApplications(
      {
        status: statusParam ? (statusParam as LicenseeApplicationStatus) : undefined,
        state,
        search,
      },
      {
        page,
        page_size: pageSize,
      }
    )

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch applications' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Admin licensee applications list error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
