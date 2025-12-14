'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { ROLE_HOME_ROUTES, UserRole } from '@/lib/roles/config'
import { Loader2 } from 'lucide-react'

/**
 * RoleDashboardRouter
 *
 * This component handles automatic routing based on the user's viewingRole.
 * When viewingRole changes (via View As control), it redirects to the
 * appropriate dashboard for that role.
 *
 * SECURITY NOTE:
 * This only affects navigation/UI. The actual route protection is handled by:
 * - Middleware (checks real role from user_roles table)
 * - Supabase RLS policies (use real user identity)
 *
 * Even if an admin is "viewing as parent", they still have admin-level
 * data access because their real Supabase session is unchanged.
 */

interface RoleDashboardRouterProps {
  children: React.ReactNode
}

export function RoleDashboardRouter({ children }: RoleDashboardRouterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { role, viewingAsRole, actualRole, loading, isViewingAsOtherRole } = useAuth()

  // When viewingAsRole changes, redirect to the appropriate dashboard
  useEffect(() => {
    if (loading) return

    // Determine the effective role for routing
    const effectiveRole = (actualRole === 'hq_admin' && viewingAsRole)
      ? viewingAsRole
      : actualRole

    if (!effectiveRole) return

    // Get the home route for this role
    const targetHome = ROLE_HOME_ROUTES[effectiveRole]

    // Check if we need to redirect
    // We redirect when:
    // 1. User is at a dashboard root that doesn't match their viewing role
    // 2. User just changed their viewing role
    const dashboardRoots = ['/dashboard', '/admin', '/portal', '/director', '/volunteer']
    const isAtDashboardRoot = dashboardRoots.some(root => pathname === root)

    // Only redirect at root dashboard pages to avoid disrupting deep navigation
    if (isAtDashboardRoot && !pathname.startsWith(targetHome)) {
      router.push(targetHome)
    }
  }, [viewingAsRole, actualRole, loading, pathname, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neon" />
      </div>
    )
  }

  return <>{children}</>
}

/**
 * Hook to get the home route for the current viewing role
 */
export function useRoleHomeRoute(): string {
  const { role } = useAuth()
  if (!role) return '/dashboard'
  return ROLE_HOME_ROUTES[role] || '/dashboard'
}

/**
 * Hook to navigate to the correct dashboard based on viewingRole
 */
export function useNavigateToRoleDashboard() {
  const router = useRouter()
  const { role } = useAuth()

  return () => {
    if (!role) {
      router.push('/dashboard')
      return
    }
    router.push(ROLE_HOME_ROUTES[role])
  }
}
