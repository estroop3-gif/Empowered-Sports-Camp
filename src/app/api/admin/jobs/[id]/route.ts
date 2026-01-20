/**
 * Admin Job Detail API Route
 *
 * Get, update, or archive a single job posting.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  adminGetJobPostingById,
  adminUpdateJobPosting,
  adminDeleteJobPosting,
} from '@/lib/services/jobs'
import type { JobStatus, EmploymentType } from '@/generated/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { data, error } = await adminGetJobPostingById(id)

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
    console.error('Admin job get error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()

    const { data, error } = await adminUpdateJobPosting(id, {
      title: body.title,
      slug: body.slug,
      short_description: body.short_description,
      full_description: body.full_description,
      location_label: body.location_label,
      employment_type: body.employment_type as EmploymentType,
      is_remote_friendly: body.is_remote_friendly,
      min_comp_cents: body.min_comp_cents,
      max_comp_cents: body.max_comp_cents,
      comp_frequency: body.comp_frequency,
      application_instructions: body.application_instructions,
      application_email: body.application_email,
      application_url: body.application_url,
      status: body.status as JobStatus,
      priority: body.priority,
    })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update job posting' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Admin job update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { data, error } = await adminDeleteJobPosting(id)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to archive job posting' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Admin job delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
