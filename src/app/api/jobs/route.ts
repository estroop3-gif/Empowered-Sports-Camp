/**
 * Public Jobs API Route
 *
 * List open job postings for the public careers page.
 */

import { NextRequest, NextResponse } from 'next/server'
import { listPublicJobPostings } from '@/lib/services/jobs'
import type { EmploymentType } from '@/generated/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const location = searchParams.get('location') || undefined
    const employmentType = searchParams.get('employment_type') as EmploymentType | undefined

    const { data, error } = await listPublicJobPostings({
      location,
      employment_type: employmentType,
    })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch job postings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Public jobs list error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
