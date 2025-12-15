import { NextResponse, type NextRequest } from 'next/server'
import { jwtDecode } from 'jwt-decode'

/**
 * Authentication Proxy (Cognito)
 *
 * Handles:
 * - Route protection based on authentication (via JWT cookies)
 * - Redirect unauthenticated users to login
 * - Redirect authenticated users away from auth pages
 *
 * Note: Full role-based access control is handled client-side
 * in the auth context. Proxy does basic auth checks only.
 */

interface CognitoIdToken {
  sub: string
  email: string
  'cognito:username': string
  exp: number
  iat: number
}

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/admin',
  '/portal',
  '/director',
  '/coach',
  '/volunteer',
]

// Auth routes (redirect away if authenticated)
const authRoutes = ['/login', '/signup']

function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwtDecode<CognitoIdToken>(token)
    const now = Math.floor(Date.now() / 1000)
    return decoded.exp < now
  } catch {
    return true
  }
}

function getUserIdFromToken(token: string): string | null {
  try {
    const decoded = jwtDecode<CognitoIdToken>(token)
    return decoded.sub
  } catch {
    return null
  }
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Get auth token from cookies
  const idToken = request.cookies.get('id_token')?.value

  // Check if user is authenticated (has valid, non-expired token)
  const isAuthenticated = idToken && !isTokenExpired(idToken)
  const userId = isAuthenticated ? getUserIdFromToken(idToken) : null

  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !isAuthenticated) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && isAuthenticated) {
    // Default redirect to dashboard - client-side auth context
    // will handle role-based redirect if needed
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Add user info to headers for server components
  const response = NextResponse.next()
  if (userId) {
    response.headers.set('x-user-id', userId)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|images|api).*)',
  ],
}
