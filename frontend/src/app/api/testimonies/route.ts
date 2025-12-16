/**
 * Public Testimonies API
 *
 * GET  /api/testimonies - List approved testimonies for public display
 * POST /api/testimonies - Submit a new testimony (public submission)
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  listPublicTestimonies,
  createPublicTestimonySubmission,
  type CreatePublicTestimonyInput,
} from '@/lib/services/testimonies'
import { notifyTestimonySubmitted } from '@/lib/services/notifications'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const featuredOnly = searchParams.get('featured') === 'true'

    const { data, error } = await listPublicTestimonies({
      limit,
      featured_only: featuredOnly,
    })

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, error: null })
  } catch (err) {
    console.error('Error in GET /api/testimonies:', err)
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.author_name || !body.author_role || !body.body) {
      return NextResponse.json(
        { data: null, error: 'Missing required fields: author_name, author_role, body' },
        { status: 400 }
      )
    }

    // Validate author_role enum
    const validRoles = ['parent', 'athlete', 'coach', 'licensee', 'cit', 'volunteer', 'other']
    if (!validRoles.includes(body.author_role)) {
      return NextResponse.json(
        { data: null, error: `Invalid author_role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      )
    }

    const input: CreatePublicTestimonyInput = {
      author_name: body.author_name,
      author_email: body.author_email,
      author_role: body.author_role,
      author_relationship: body.author_relationship,
      headline: body.headline,
      body: body.body,
      photo_url: body.photo_url,
      video_url: body.video_url,
      camp_session_id: body.camp_session_id,
      program_type: body.program_type,
      tenant_id: body.tenant_id,
      created_by_user_id: body.created_by_user_id,
    }

    const { data, error } = await createPublicTestimonySubmission(input)

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }

    // Send notification to HQ admins about new testimony submission
    if (data) {
      try {
        await notifyTestimonySubmitted(data.id, data.author_name, data.headline || undefined)
      } catch (notifyErr) {
        console.error('Failed to send testimony submission notification:', notifyErr)
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({ data, error: null }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/testimonies:', err)
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
