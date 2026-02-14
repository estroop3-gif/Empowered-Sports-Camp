/**
 * Refresh Auth Tokens API Route
 *
 * POST /api/auth/refresh
 *
 * Uses the refresh_token to get new access and id tokens.
 * Should be called when the current tokens are expired or about to expire.
 */

import { NextRequest, NextResponse } from 'next/server'
import { refreshTokens } from '@/lib/auth/cognito-server'

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie
    const refreshToken = request.cookies.get('refresh_token')?.value

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token available' },
        { status: 401 }
      )
    }

    // Exchange refresh token for new tokens
    const tokens = await refreshTokens(refreshToken)

    if (!tokens) {
      // Refresh token may have expired - user needs to login again
      const response = NextResponse.json(
        { error: 'Session expired. Please login again.' },
        { status: 401 }
      )

      // Clear all auth cookies
      response.cookies.delete('id_token')
      response.cookies.delete('access_token')
      response.cookies.delete('refresh_token')

      return response
    }

    const response = NextResponse.json({ success: true })

    // Use 30 days to match set-tokens — JWT validation still gates every request
    const maxAge = 30 * 24 * 60 * 60

    response.cookies.set('access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    })

    response.cookies.set('id_token', tokens.id_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    })

    return response
  } catch (error) {
    console.error('Token refresh failed:', error)
    return NextResponse.json(
      { error: 'Failed to refresh tokens' },
      { status: 500 }
    )
  }
}
