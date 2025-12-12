import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

/**
 * Authentication Middleware
 *
 * Handles:
 * - Session refresh
 * - Route protection based on authentication
 * - Role-based access control
 * - Tenant context injection
 */

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/admin',
  '/portal',
]

// Routes that require specific roles (using new 5-tier system)
const roleRoutes: Record<string, string[]> = {
  '/admin': ['hq_admin'],
  '/portal': ['hq_admin', 'licensee_owner', 'director', 'coach'],
  '/dashboard': ['parent', 'coach', 'director', 'licensee_owner', 'hq_admin'],
}

export async function middleware(request: NextRequest) {
  // Bypass auth checks in mock mode
  if (USE_MOCK) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute) {
    if (!user) {
      // Redirect to login with return URL
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Check role-based access
    const requiredRoles = Object.entries(roleRoutes).find(([route]) =>
      pathname.startsWith(route)
    )?.[1]

    if (requiredRoles) {
      // Get user's role from user_roles table
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role, tenant_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      // If no role found and trying to access dashboard, allow it (new users)
      if (!userRole && pathname.startsWith('/dashboard')) {
        response.headers.set('x-user-role', 'parent')
        return response
      }

      if (!userRole || !requiredRoles.includes(userRole.role)) {
        // Redirect based on their actual role
        if (userRole) {
          if (userRole.role === 'hq_admin') {
            return NextResponse.redirect(new URL('/admin', request.url))
          } else if (['licensee_owner', 'director', 'coach'].includes(userRole.role)) {
            return NextResponse.redirect(new URL('/portal', request.url))
          } else {
            return NextResponse.redirect(new URL('/dashboard', request.url))
          }
        }
        // No role found, redirect to dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      // Add tenant_id to headers for downstream use
      if (userRole.tenant_id) {
        response.headers.set('x-tenant-id', userRole.tenant_id)
      }
      response.headers.set('x-user-role', userRole.role)
    }
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === '/login' || pathname === '/signup')) {
    // Check their role to determine where to redirect
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (userRole) {
      if (userRole.role === 'hq_admin') {
        return NextResponse.redirect(new URL('/admin', request.url))
      } else if (['licensee_owner', 'director', 'coach'].includes(userRole.role)) {
        return NextResponse.redirect(new URL('/portal', request.url))
      }
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
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
