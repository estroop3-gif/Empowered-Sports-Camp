/**
 * Admin Contact Submissions API Route
 *
 * List and manage contact form submissions.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  listContactSubmissions,
  getContactSubmissionCounts,
} from '@/lib/services/contact'
import type { ContactSubmissionStatus } from '@/generated/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // If counts requested, return aggregated counts
    if (searchParams.get('counts') === 'true') {
      const { data, error } = await getContactSubmissionCounts()

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
    const inquiryType = searchParams.get('inquiry_type') || undefined
    const search = searchParams.get('search') || undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('limit') || '20', 10)

    const { data, error } = await listContactSubmissions(
      {
        status: statusParam ? (statusParam as ContactSubmissionStatus) : undefined,
        inquiry_type: inquiryType,
        search,
      },
      {
        page,
        page_size: pageSize,
      }
    )

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Admin contact list error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
