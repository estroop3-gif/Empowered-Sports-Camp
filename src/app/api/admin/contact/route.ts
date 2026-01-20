/**
 * Admin Contact Submissions API Route
 *
 * List and manage contact form submissions.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  listContactSubmissions,
  getContactSubmissionCounts,
} from '@/lib/services/contact'
import type { ContactSubmissionStatus } from '@/generated/prisma'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    // Check for admin role
    const allowedRoles = ['hq_admin', 'licensee_owner']
    if (!allowedRoles.includes(user.role?.toLowerCase() || '')) {
      return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)

    // If counts requested, return aggregated counts
    if (searchParams.get('counts') === 'true') {
      const { data, error } = await getContactSubmissionCounts()

      if (error) {
        return NextResponse.json(
          { data: null, error: 'Failed to fetch counts' },
          { status: 500 }
        )
      }

      return NextResponse.json({ data, error: null })
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
        { data: null, error: 'Failed to fetch submissions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, error: null })
  } catch (error) {
    console.error('Admin contact list error:', error)
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
