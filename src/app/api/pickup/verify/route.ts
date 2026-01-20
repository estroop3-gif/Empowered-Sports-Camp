/**
 * Pickup Token Verification API
 *
 * GET /api/pickup/verify?t={token} - Validate a pickup token
 * POST /api/pickup/verify - Use a pickup token (check out athlete)
 */

import { NextRequest, NextResponse } from 'next/server'
import { validatePickupToken, usePickupToken } from '@/lib/services/pickup-tokens'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check role - only staff can verify tokens
    if (!['director', 'coach', 'hq_admin', 'licensee_owner', 'cit_volunteer'].includes(user.role || '')) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    const token = request.nextUrl.searchParams.get('t')
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const { data, error } = await validatePickupToken(token)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[GET /api/pickup/verify] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check role - only staff can use tokens
    if (!['director', 'coach', 'hq_admin', 'licensee_owner', 'cit_volunteer'].includes(user.role || '')) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const { data, error } = await usePickupToken(token, user.id)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[POST /api/pickup/verify] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
