/**
 * Set Auth Tokens API Route
 *
 * POST /api/auth/set-tokens
 *
 * Stores Cognito tokens in HTTP-only cookies for server-side auth.
 * Called after successful Cognito login from the client.
 */

import { NextRequest, NextResponse } from 'next/server'

interface SetTokensRequest {
  idToken: string
  accessToken: string
  refreshToken?: string
  expiresIn: number // seconds
}

export async function POST(request: NextRequest) {
  try {
    const body: SetTokensRequest = await request.json()

    const { idToken, accessToken, refreshToken, expiresIn } = body

    if (!idToken || !accessToken) {
      return NextResponse.json({ error: 'Missing tokens' }, { status: 400 })
    }

    const response = NextResponse.json({ success: true })

    // Set cookies with secure options
    // Use 30 days for all tokens so cookies persist as long as the refresh token.
    // The JWT inside is still validated server-side on every request, so expired
    // JWTs trigger a server-side refresh using the refresh_token cookie.
    const maxAge = 30 * 24 * 60 * 60 // 30 days

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge,
    }

    response.cookies.set('id_token', idToken, cookieOptions)
    response.cookies.set('access_token', accessToken, cookieOptions)

    if (refreshToken) {
      response.cookies.set('refresh_token', refreshToken, cookieOptions)
    }

    return response
  } catch (error) {
    console.error('Failed to set tokens:', error)
    return NextResponse.json({ error: 'Failed to set tokens' }, { status: 500 })
  }
}

/**
 * DELETE /api/auth/set-tokens
 *
 * Clears auth cookies on logout.
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true })

  // Clear all auth cookies
  response.cookies.delete('id_token')
  response.cookies.delete('access_token')
  response.cookies.delete('refresh_token')

  return response
}
