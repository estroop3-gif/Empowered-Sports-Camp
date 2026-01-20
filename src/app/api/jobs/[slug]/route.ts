/**
 * Public Job Detail API Route
 *
 * Get a single job posting by slug for the public career detail page.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getJobPostingBySlug } from '@/lib/services/jobs'

interface RouteParams {
  params: Promise<{ slug: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const { data, error } = await getJobPostingBySlug(slug)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch job posting' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Job posting not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Public job detail error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
