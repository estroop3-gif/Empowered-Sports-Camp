import { NextResponse } from 'next/server'
import { exchangeCodeForTokens } from '@/lib/auth/cognito-server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    try {
      // Exchange the code for Cognito tokens
      const tokens = await exchangeCodeForTokens(code)

      if (tokens) {
        // Set tokens in cookies
        const cookieStore = await cookies()

        // Use 24 hours for session tokens to reduce login friction
        const sessionMaxAge = 24 * 60 * 60 // 24 hours

        cookieStore.set('access_token', tokens.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: sessionMaxAge,
          path: '/',
        })

        cookieStore.set('id_token', tokens.id_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: sessionMaxAge,
          path: '/',
        })

        if (tokens.refresh_token) {
          cookieStore.set('refresh_token', tokens.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60, // 30 days
            path: '/',
          })
        }

        return NextResponse.redirect(`${origin}${next}`)
      }
    } catch (error) {
      console.error('Auth callback error:', error)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
