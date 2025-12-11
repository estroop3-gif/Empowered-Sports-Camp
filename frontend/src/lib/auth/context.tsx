'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

/**
 * Auth Context
 *
 * Provides authentication state and role/tenant information
 * throughout the application.
 */

type UserRole =
  | 'licensor_admin'
  | 'licensor_staff'
  | 'licensee_owner'
  | 'licensee_admin'
  | 'licensee_coach'
  | 'parent'

interface Tenant {
  id: string
  name: string
  slug: string
  logo_url?: string
}

interface AuthContextType {
  user: User | null
  role: UserRole | null
  tenant: Tenant | null
  loading: boolean
  isLicensor: boolean
  isLicensee: boolean
  isParent: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

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
      async (event, session) => {
        setUser(session?.user ?? null)

        if (session?.user) {
          await fetchUserRoleAndTenant(session.user.id)
        } else {
          setRole(null)
          setTenant(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserRoleAndTenant = async (userId: string) => {
    // Get user role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role, tenant_id')
      .eq('user_id', userId)
      .eq('active', true)
      .single()

    if (userRole) {
      setRole(userRole.role as UserRole)

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
    setRole(null)
    setTenant(null)
  }

  const isLicensor = role === 'licensor_admin' || role === 'licensor_staff'
  const isLicensee = role === 'licensee_owner' || role === 'licensee_admin' || role === 'licensee_coach'
  const isParent = role === 'parent'

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        tenant,
        loading,
        isLicensor,
        isLicensee,
        isParent,
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
 */
export function usePermissions() {
  const { role, isLicensor, isLicensee } = useAuth()

  return {
    canManageLicensees: role === 'licensor_admin',
    canViewAllTenants: isLicensor,
    canManageCamps: isLicensor || ['licensee_owner', 'licensee_admin'].includes(role || ''),
    canManageStaff: isLicensor || ['licensee_owner', 'licensee_admin'].includes(role || ''),
    canViewFinancials: isLicensor || ['licensee_owner', 'licensee_admin'].includes(role || ''),
    canManageRegistrations: isLicensor || isLicensee,
    canViewAthletes: isLicensor || isLicensee,
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
