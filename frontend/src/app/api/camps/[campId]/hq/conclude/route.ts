/**
 * Camp Conclusion API
 *
 * GET /api/camps/[campId]/hq/conclude - Get conclusion overview and validation
 * POST /api/camps/[campId]/hq/conclude - Conclude the camp
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  getCampConclusionOverview,
  validateCampForConclusion,
  concludeCamp,
} from '@/lib/services/camp-conclusion'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check role - only director, admin, or licensee owner can view
    if (!['director', 'hq_admin', 'licensee_owner'].includes(user.role || '')) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    const { campId } = await params

    // Get overview and validation in parallel
    const [overviewResult, validationResult] = await Promise.all([
      getCampConclusionOverview(campId),
      validateCampForConclusion(campId),
    ])

    if (overviewResult.error) {
      return NextResponse.json(
        { error: overviewResult.error.message },
        { status: 500 }
      )
    }

    if (!overviewResult.data) {
      return NextResponse.json(
        { error: 'Camp not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      data: {
        overview: overviewResult.data,
        validation: validationResult.data,
      },
    })
  } catch (error) {
    console.error('[GET /api/camps/[campId]/hq/conclude] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check role - only director, admin, or licensee owner can conclude
    if (!['director', 'hq_admin', 'licensee_owner'].includes(user.role || '')) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    const { campId } = await params
    const body = await request.json()

    const { data, error } = await concludeCamp(campId, user.id, {
      lock_camp: body.lock_camp ?? true,
      send_final_emails: body.send_final_emails ?? true,
      generate_report: body.generate_report ?? true,
      force: body.force ?? false,
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[POST /api/camps/[campId]/hq/conclude] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
