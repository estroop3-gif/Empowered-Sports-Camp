'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import {
  getCurrentUser,
  getCurrentSession,
  signOut as cognitoSignOut,
  checkAndRefreshSession,
  type AuthUser,
} from './cognito-client'

/**
 * Auth Context (Cognito + Prisma)
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
  | 'cit_volunteer'

interface Tenant {
  id: string
  name: string
  slug: string
  logoUrl?: string
}

interface LmsStatus {
  hasCompletedCore: boolean
  hasCompletedDirector: boolean
  hasCompletedVolunteer: boolean
  // New certification fields
  isCertified: boolean
  certifiedAt?: string | null
  certificateUrl?: string | null
  certificateNumber?: string | null
}

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
}

interface AuthContextType {
  user: User | null
  role: UserRole | null
  actualRole: UserRole | null  // The user's real role (never changes)
  tenant: Tenant | null
  loading: boolean
  // LMS completion status
  lmsStatus: LmsStatus
  // View as role feature (hq_admin only)
  viewingAsRole: UserRole | null
  setViewingAsRole: (role: UserRole | null) => void
  resetViewingRole: () => void  // Reset to actual role
  isViewingAsOtherRole: boolean
  canUseViewAs: boolean  // Whether current user can use View As
  // LMS bypass for admin preview mode
  lmsBypassEnabled: boolean
  toggleLmsBypass: () => void
  // Role checks (based on effective role)
  isHqAdmin: boolean
  isLicenseeOwner: boolean
  isDirector: boolean
  isCoach: boolean
  isParent: boolean
  isVolunteer: boolean
  // Access level helpers (role or higher)
  hasHqAccess: boolean
  hasTenantAccess: boolean
  hasCampManageAccess: boolean
  hasCampViewAccess: boolean
  // LMS gating helpers
  hasCompletedRequiredLms: boolean
  // Legacy compatibility
  isLicensor: boolean
  isLicensee: boolean
  signOut: () => Promise<void>
  // New: refresh auth state
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const VIEWING_AS_ROLE_KEY = 'empowered_viewing_as_role'
const LMS_BYPASS_KEY = 'empowered_lms_bypass'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [actualRole, setActualRole] = useState<UserRole | null>(null)
  const [viewingAsRole, setViewingAsRoleState] = useState<UserRole | null>(null)
  const [lmsBypassEnabled, setLmsBypassEnabled] = useState(false)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const initializedRef = useRef(false)
  const [lmsStatus, setLmsStatus] = useState<LmsStatus>({
    hasCompletedCore: false,
    hasCompletedDirector: false,
    hasCompletedVolunteer: false,
    isCertified: false,
    certifiedAt: null,
    certificateUrl: null,
    certificateNumber: null,
  })

  // Load viewing as role and LMS bypass from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRole = sessionStorage.getItem(VIEWING_AS_ROLE_KEY)
      if (storedRole) {
        setViewingAsRoleState(storedRole as UserRole)
      }
      const storedBypass = sessionStorage.getItem(LMS_BYPASS_KEY)
      if (storedBypass === 'true') {
        setLmsBypassEnabled(true)
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
    setLmsBypassEnabled(false)
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(VIEWING_AS_ROLE_KEY)
      sessionStorage.removeItem(LMS_BYPASS_KEY)
    }
  }, [])

  // Toggle LMS bypass (only works when viewing as another role)
  const toggleLmsBypass = useCallback(() => {
    // Only hq_admin can use this feature
    if (actualRole !== 'hq_admin') {
      console.warn('Only hq_admin can use LMS bypass feature')
      return
    }

    setLmsBypassEnabled((prev) => {
      const newValue = !prev
      if (typeof window !== 'undefined') {
        if (newValue) {
          sessionStorage.setItem(LMS_BYPASS_KEY, 'true')
        } else {
          sessionStorage.removeItem(LMS_BYPASS_KEY)
        }
      }
      return newValue
    })
  }, [actualRole])

  // Fetch user role and tenant from API
  // Also updates user.id to profile ID if it differs from Cognito sub
  const fetchUserRoleAndTenant = async (userId: string) => {
    try {
      const response = await fetch(`/api/auth/user-info?userId=${userId}`)

      if (!response.ok) {
        setActualRole('parent') // Default
        return
      }

      const data = await response.json()

      // Update user.id to profile ID if returned (handles Cognito sub vs Profile ID mismatch)
      if (data.profileId && data.profileId !== userId) {
        setUser((prev) => prev ? { ...prev, id: data.profileId } : null)
      }

      if (data.role) {
        setActualRole(data.role as UserRole)

        // If user is NOT hq_admin but has a viewingAsRole stored, clear it
        if (data.role !== 'hq_admin') {
          setViewingAsRoleState(null)
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem(VIEWING_AS_ROLE_KEY)
          }
        }
      }

      // Set LMS status
      if (data.lmsStatus) {
        setLmsStatus(data.lmsStatus)
      }

      // Set tenant
      if (data.tenant) {
        setTenant(data.tenant)
      }
    } catch {
      setActualRole('parent')
    }
  }

  // Initialize auth state
  const initAuth = useCallback(async (force = false) => {
    // Prevent multiple initializations
    if (initializedRef.current && !force) {
      return
    }

    initializedRef.current = true
    setLoading(true)

    try {
      const cognitoUser = await getCurrentUser()

      if (cognitoUser) {
        setUser({
          id: cognitoUser.id,
          email: cognitoUser.email,
          firstName: cognitoUser.firstName,
          lastName: cognitoUser.lastName,
        })
        await fetchUserRoleAndTenant(cognitoUser.id)
      } else {
        setUser(null)
        setActualRole(null)
        setTenant(null)
      }
    } catch {
      setUser(null)
      setActualRole(null)
      setTenant(null)
    }

    setLoading(false)
  }, [])

  // Initialize on mount only
  useEffect(() => {
    initAuth()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Check and refresh session periodically (every 5 minutes)
  // This keeps the session alive for up to 30 days (refresh token validity)
  useEffect(() => {
    const checkSession = async () => {
      if (!user) return

      // Try to refresh the session if needed
      const refreshed = await checkAndRefreshSession()

      if (!refreshed) {
        // Session couldn't be refreshed - may need to login again
        const session = await getCurrentSession()
        if (!session) {
          // Session completely expired
          setUser(null)
          setActualRole(null)
          setTenant(null)
          setViewingAsRoleState(null)
          initializedRef.current = false
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem(VIEWING_AS_ROLE_KEY)
          }
        }
      }
    }

    // Initial check after a short delay
    const initialCheck = setTimeout(checkSession, 5000) // 5 seconds after mount

    // Then check every 2 minutes to ensure tokens stay fresh
    // This aggressive refresh prevents mid-operation expirations
    const interval = setInterval(checkSession, 2 * 60 * 1000)

    return () => {
      clearTimeout(initialCheck)
      clearInterval(interval)
    }
  }, [user])

  // Public refresh function (forces re-initialization)
  const refreshAuth = useCallback(async () => {
    await initAuth(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    try {
      // Clear server-side cookies
      await fetch('/api/auth/set-tokens', { method: 'DELETE' })
      // Clear Cognito session
      cognitoSignOut()
    } catch (error) {
      console.error('[Auth] Sign out error:', error)
    }

    setUser(null)
    setActualRole(null)
    setTenant(null)
    setViewingAsRoleState(null)
    initializedRef.current = false // Allow re-initialization on next login
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
  const isVolunteer = effectiveRole === 'cit_volunteer'

  // Access level helpers (role or higher)
  const hasHqAccess = isHqAdmin
  const hasTenantAccess = isHqAdmin || isLicenseeOwner
  const hasCampManageAccess = hasTenantAccess || isDirector
  const hasCampViewAccess = hasCampManageAccess || isCoach || isVolunteer

  // LMS completion check based on current role
  // If LMS bypass is enabled (admin preview mode), always return true
  // Uses the new certification system for role-based requirements
  const hasCompletedRequiredLms = (() => {
    // Admin bypass takes priority
    if (actualRole === 'hq_admin' && lmsBypassEnabled) {
      return true
    }

    // HQ Admin and Parent are always exempt
    if (effectiveRole === 'hq_admin' || effectiveRole === 'parent') {
      return true
    }

    // Use the new certification system for all other roles
    // This replaces the old hasCompletedCore/Director/Volunteer checks
    return lmsStatus.isCertified
  })()

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
        // LMS status
        lmsStatus,
        // View as role
        viewingAsRole,
        setViewingAsRole,
        resetViewingRole,
        isViewingAsOtherRole,
        canUseViewAs,
        // LMS bypass
        lmsBypassEnabled,
        toggleLmsBypass,
        // Role checks
        isHqAdmin,
        isLicenseeOwner,
        isDirector,
        isCoach,
        isParent,
        isVolunteer,
        // Access level helpers
        hasHqAccess,
        hasTenantAccess,
        hasCampManageAccess,
        hasCampViewAccess,
        // LMS gating
        hasCompletedRequiredLms,
        // Legacy
        isLicensor,
        isLicensee,
        signOut,
        refreshAuth,
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
 */
export function usePermissions() {
  const {
    hasHqAccess,
    hasTenantAccess,
    hasCampManageAccess,
    hasCampViewAccess,
    isParent,
    isVolunteer,
    isDirector,
    hasCompletedRequiredLms,
  } = useAuth()

  return {
    // System administration
    canManageTenants: hasHqAccess,
    canViewAllTenants: hasHqAccess,

    // Tenant management
    canManageStaff: hasTenantAccess,
    canViewFinancials: hasTenantAccess,
    canManageBilling: hasTenantAccess,

    // Camp management (gated by LMS for directors)
    canManageCamps: hasCampManageAccess && (hasCompletedRequiredLms || hasTenantAccess),
    canManageGroups: hasCampManageAccess && (hasCompletedRequiredLms || hasTenantAccess),
    canManageRegistrations: hasCampManageAccess && (hasCompletedRequiredLms || hasTenantAccess),
    canFinalizeGroups: hasCampManageAccess && (hasCompletedRequiredLms || hasTenantAccess),

    // Camp operations
    canViewRosters: hasCampViewAccess,
    canCheckInCampers: hasCampViewAccess && hasCompletedRequiredLms,
    canViewCampDetails: hasCampViewAccess,

    // Curriculum access
    canViewCurriculum: hasCampViewAccess || isVolunteer,
    canContributeCurriculum: hasCampManageAccess || (isVolunteer && hasCompletedRequiredLms),

    // Volunteer-specific
    canUploadCertifications: isVolunteer || hasTenantAccess,
    canReviewCertifications: hasTenantAccess,

    // LMS access
    canAccessLms: true, // Everyone can access their required LMS
    canManageLms: hasHqAccess,

    // Daily operations (gated for directors)
    canAccessDailyRecaps: isDirector && hasCompletedRequiredLms,
    canSendCommunications: (isDirector && hasCompletedRequiredLms) || hasTenantAccess,

    // Parent access
    canRegisterAthletes: isParent || hasCampViewAccess,
    canViewOwnRegistrations: true, // Everyone can view their own
  }
}

/**
 * Role display configuration
 */
export const ROLE_CONFIG: Record<UserRole, {
  label: string
  description: string
  portalPath: string
  color: string
}> = {
  hq_admin: {
    label: 'Licensor Admin',
    description: 'Full system access and control',
    portalPath: '/portal',
    color: 'neon',
  },
  licensee_owner: {
    label: 'Licensee Owner',
    description: 'Full access within your franchise territory',
    portalPath: '/portal',
    color: 'purple',
  },
  director: {
    label: 'Camp Director',
    description: 'Manage camps and daily operations',
    portalPath: '/director',
    color: 'magenta',
  },
  coach: {
    label: 'Coach',
    description: 'View rosters and assist with camp operations',
    portalPath: '/coach',
    color: 'blue',
  },
  cit_volunteer: {
    label: 'CIT / Volunteer',
    description: 'Training, certifications, and curriculum access',
    portalPath: '/volunteer',
    color: 'orange',
  },
  parent: {
    label: 'Parent / Guardian',
    description: 'Register athletes and view camp information',
    portalPath: '/dashboard',
    color: 'white',
  },
}

/**
 * Get the appropriate portal path for a role
 */
export function getPortalPathForRole(role: UserRole | null): string {
  if (!role) return '/login'
  return ROLE_CONFIG[role]?.portalPath || '/dashboard'
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
