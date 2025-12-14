/**
 * Camp Day Pickup Tokens API
 *
 * GET /api/camp-days/[campDayId]/pickup-tokens - Get all pickup tokens for a camp day
 * POST /api/camp-days/[campDayId]/pickup-tokens - Generate pickup tokens for all checked-in athletes
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getPickupTokensForCampDay,
  generatePickupTokens,
  manualCheckout,
} from '@/lib/services/pickup-tokens'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campDayId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check role - only staff can view all tokens
    if (!['director', 'coach', 'hq_admin', 'licensee_owner'].includes(user.role || '')) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    const { campDayId } = await params

    const { data, error } = await getPickupTokensForCampDay(campDayId)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[GET /api/camp-days/[campDayId]/pickup-tokens] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campDayId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check role - only director or admin can generate tokens
    if (!['director', 'hq_admin', 'licensee_owner'].includes(user.role || '')) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    const { campDayId } = await params
    const body = await request.json().catch(() => ({}))

    // Handle manual checkout action
    if (body.action === 'manual_checkout') {
      const { athlete_id, reason } = body

      if (!athlete_id || !reason) {
        return NextResponse.json(
          { error: 'Athlete ID and reason are required for manual checkout' },
          { status: 400 }
        )
      }

      const { data, error } = await manualCheckout({
        campDayId,
        athleteId: athlete_id,
        checkedOutByUserId: user.id,
        reason,
      })

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }

      return NextResponse.json({ data })
    }

    // Default: Generate pickup tokens
    const { data, error } = await generatePickupTokens(campDayId)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[POST /api/camp-days/[campDayId]/pickup-tokens] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
