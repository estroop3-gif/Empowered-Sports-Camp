/**
 * Admin Jobs API Route
 *
 * List and create job postings for admin management.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  adminListJobPostings,
  adminCreateJobPosting,
  getJobPostingCounts,
} from '@/lib/services/jobs'
import type { JobStatus, EmploymentType } from '@/generated/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // If counts requested, return aggregated counts
    if (searchParams.get('counts') === 'true') {
      const tenantId = searchParams.get('tenant_id') || undefined
      const { data, error } = await getJobPostingCounts(tenantId)

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
    const tenantId = searchParams.get('tenant_id') || undefined
    const search = searchParams.get('search') || undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('limit') || '20', 10)

    const { data, error } = await adminListJobPostings(
      {
        status: statusParam ? (statusParam as JobStatus) : undefined,
        tenant_id: tenantId,
        search,
      },
      {
        page,
        page_size: pageSize,
      }
    )

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch job postings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Admin jobs list error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.title || !body.short_description || !body.full_description || !body.location_label) {
      return NextResponse.json(
        { error: 'Missing required fields: title, short_description, full_description, location_label' },
        { status: 400 }
      )
    }

    if (!body.created_by_user_id) {
      return NextResponse.json(
        { error: 'created_by_user_id is required' },
        { status: 400 }
      )
    }

    const { data, error } = await adminCreateJobPosting({
      title: body.title,
      slug: body.slug,
      short_description: body.short_description,
      full_description: body.full_description,
      location_label: body.location_label,
      employment_type: (body.employment_type as EmploymentType) || 'seasonal',
      is_remote_friendly: body.is_remote_friendly ?? false,
      min_comp_cents: body.min_comp_cents,
      max_comp_cents: body.max_comp_cents,
      comp_frequency: body.comp_frequency,
      application_instructions: body.application_instructions,
      application_email: body.application_email,
      application_url: body.application_url,
      status: (body.status as JobStatus) || 'draft',
      priority: body.priority ?? 0,
      tenant_id: body.tenant_id,
      created_by_user_id: body.created_by_user_id,
    })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create job posting' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Admin jobs create error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
