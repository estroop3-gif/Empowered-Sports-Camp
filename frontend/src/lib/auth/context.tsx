'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js'

/**
 * Auth Context
 *
 * Provides authentication state and role/tenant information
 * throughout the application.
 *
 * Includes "view as role" feature for hq_admin to preview the app
 * as different user roles.
 */

export type UserRole =
  | 'parent'
  | 'coach'
  | 'director'
  | 'licensee_owner'
  | 'hq_admin'

interface Tenant {
  id: string
  name: string
  slug: string
  logo_url?: string
}

interface AuthContextType {
  user: User | null
  role: UserRole | null
  actualRole: UserRole | null  // The user's real role (never changes)
  tenant: Tenant | null
  loading: boolean
  // View as role feature (hq_admin only)
  viewingAsRole: UserRole | null
  setViewingAsRole: (role: UserRole | null) => void
  resetViewingRole: () => void  // Reset to actual role
  isViewingAsOtherRole: boolean
  canUseViewAs: boolean  // Whether current user can use View As
  // Role checks (based on effective role)
  isHqAdmin: boolean
  isLicenseeOwner: boolean
  isDirector: boolean
  isCoach: boolean
  isParent: boolean
  // Access level helpers (role or higher)
  hasHqAccess: boolean
  hasTenantAccess: boolean
  hasCampManageAccess: boolean
  hasCampViewAccess: boolean
  // Legacy compatibility
  isLicensor: boolean
  isLicensee: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const VIEWING_AS_ROLE_KEY = 'empowered_viewing_as_role'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [actualRole, setActualRole] = useState<UserRole | null>(null)
  const [viewingAsRole, setViewingAsRoleState] = useState<UserRole | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  // Load viewing as role from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(VIEWING_AS_ROLE_KEY)
      if (stored) {
        setViewingAsRoleState(stored as UserRole)
      }
    }
  }, [])

  // Setter for viewing as role that also persists to sessionStorage
  const setViewingAsRole = useCallback((role: UserRole | null) => {
    // Only hq_admin can use this feature
    if (actualRole !== 'hq_admin' && role !== null) {
      console.warn('Only hq_admin can use view-as-role feature')
      return
    }

    setViewingAsRoleState(role)
    if (typeof window !== 'undefined') {
      if (role) {
        sessionStorage.setItem(VIEWING_AS_ROLE_KEY, role)
      } else {
        sessionStorage.removeItem(VIEWING_AS_ROLE_KEY)
      }
    }
  }, [actualRole])

  // Reset viewing role back to actual role
  const resetViewingRole = useCallback(() => {
    setViewingAsRoleState(null)
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(VIEWING_AS_ROLE_KEY)
    }
  }, [])

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)

      if (session?.user) {
        await fetchUserRoleAndTenant(session.user.id)
      }
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null)

        if (session?.user) {
          await fetchUserRoleAndTenant(session.user.id)
        } else {
          setActualRole(null)
          setTenant(null)
          // Clear viewing as role on logout
          setViewingAsRoleState(null)
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem(VIEWING_AS_ROLE_KEY)
          }
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserRoleAndTenant = async (userId: string) => {
    // Get user role (only active roles)
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role, tenant_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (roleError) {
      console.error('Error fetching user role:', roleError)
      console.error('Error code:', roleError.code, 'Message:', roleError.message)
      // Default to parent if role fetch fails (likely RLS issue)
      setActualRole('parent')
      return
    }

    console.log('Fetched user role:', userRole?.role, 'tenant_id:', userRole?.tenant_id)

    if (userRole) {
      setActualRole(userRole.role as UserRole)

      // Get tenant info if applicable
      if (userRole.tenant_id) {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('id, name, slug, logo_url')
          .eq('id', userRole.tenant_id)
          .single()

        if (tenantData) {
          setTenant(tenantData)
        }
      }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setActualRole(null)
    setTenant(null)
    setViewingAsRoleState(null)
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(VIEWING_AS_ROLE_KEY)
    }
  }

  // Effective role: viewingAsRole if set by hq_admin, otherwise actualRole
  const effectiveRole = (actualRole === 'hq_admin' && viewingAsRole)
    ? viewingAsRole
    : actualRole

  // Role hierarchy helpers (based on effective role)
  const isHqAdmin = effectiveRole === 'hq_admin'
  const isLicenseeOwner = effectiveRole === 'licensee_owner'
  const isDirector = effectiveRole === 'director'
  const isCoach = effectiveRole === 'coach'
  const isParent = effectiveRole === 'parent'

  // Access level helpers (role or higher)
  const hasHqAccess = isHqAdmin
  const hasTenantAccess = isHqAdmin || isLicenseeOwner
  const hasCampManageAccess = hasTenantAccess || isDirector
  const hasCampViewAccess = hasCampManageAccess || isCoach

  // Legacy compatibility
  const isLicensor = isHqAdmin
  const isLicensee = isLicenseeOwner || isDirector || isCoach

  // Is viewing as another role (for showing indicator)
  const isViewingAsOtherRole = actualRole === 'hq_admin' && viewingAsRole !== null

  // Whether current user can use View As feature
  const canUseViewAs = actualRole === 'hq_admin'

  return (
    <AuthContext.Provider
      value={{
        user,
        role: effectiveRole,
        actualRole,
        tenant,
        loading,
        // View as role
        viewingAsRole,
        setViewingAsRole,
        resetViewingRole,
        isViewingAsOtherRole,
        canUseViewAs,
        // Role checks
        isHqAdmin,
        isLicenseeOwner,
        isDirector,
        isCoach,
        isParent,
        // Access level helpers
        hasHqAccess,
        hasTenantAccess,
        hasCampManageAccess,
        hasCampViewAccess,
        // Legacy
        isLicensor,
        isLicensee,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/**
 * Hook for checking permissions
 *
 * Permission matrix:
 * - parent: View own registrations only
 * - coach: View camp rosters, check-in campers
 * - director: Manage camps, groups, registrations for assigned camps
 * - licensee_owner: Full access within their tenant
 * - hq_admin: Full system access
 */
export function usePermissions() {
  const {
    hasHqAccess,
    hasTenantAccess,
    hasCampManageAccess,
    hasCampViewAccess,
    isParent,
  } = useAuth()

  return {
    // System administration
    canManageTenants: hasHqAccess,
    canViewAllTenants: hasHqAccess,

    // Tenant management
    canManageStaff: hasTenantAccess,
    canViewFinancials: hasTenantAccess,
    canManageBilling: hasTenantAccess,

    // Camp management
    canManageCamps: hasCampManageAccess,
    canManageGroups: hasCampManageAccess,
    canManageRegistrations: hasCampManageAccess,
    canFinalizeGroups: hasCampManageAccess,

    // Camp operations
    canViewRosters: hasCampViewAccess,
    canCheckInCampers: hasCampViewAccess,
    canViewCampDetails: hasCampViewAccess,

    // Parent access
    canRegisterAthletes: isParent || hasCampViewAccess,
    canViewOwnRegistrations: true, // Everyone can view their own
  }
}

/**
 * Server-side helper to get tenant context from headers
 */
export function getTenantFromHeaders(headers: Headers) {
  return {
    tenantId: headers.get('x-tenant-id'),
    userRole: headers.get('x-user-role'),
  }
}
