/**
 * Admin CIT API Route
 *
 * Handles admin operations for CIT applications.
 * Access restricted to hq_admin and licensee_owner roles.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  listCitApplications,
  getCitApplicationCounts,
} from '@/lib/services/cit'
import type { CitApplicationStatus } from '@/generated/prisma'

/**
 * GET /api/admin/cit
 *
 * List CIT applications with optional filters
 * Query params:
 * - status: filter by status
 * - search: search by name or email
 * - page: page number (default 1)
 * - limit: items per page (default 20)
 * - counts: if 'true', return status counts instead of list
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // If counts requested, return aggregated counts
    if (searchParams.get('counts') === 'true') {
      const { data, error } = await getCitApplicationCounts()

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch application counts' },
          { status: 500 }
        )
      }

      return NextResponse.json({ data })
    }

    // Parse query parameters
    const statusParam = searchParams.get('status')
    const search = searchParams.get('search') || undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('limit') || '20', 10)

    const { data, error } = await listCitApplications(
      {
        status: statusParam ? (statusParam as CitApplicationStatus) : undefined,
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
    console.error('Admin CIT list error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
