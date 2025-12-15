/**
 * Server-side Auth Helpers
 *
 * Re-exports and provides simplified auth functions for API routes.
 */

import { getAuthenticatedUser, getAuthenticatedUserFromRequest, type VerifiedUser } from './cognito-server'

export { getAuthenticatedUser, getAuthenticatedUserFromRequest, type VerifiedUser }

/**
 * Simplified auth user type for API routes
 */
export interface AuthUser {
  id: string
  email: string
  role: string
  tenantId: string | null
  firstName?: string
  lastName?: string
}

/**
 * Get authenticated user from cookies (simplified version for API routes)
 *
 * Returns a simplified user object with role defaulting to 'parent' if not set.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const user = await getAuthenticatedUser()

  if (!user) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role || 'parent',
    tenantId: user.tenantId || null,
    firstName: user.firstName,
    lastName: user.lastName,
  }
}

/**
 * Get authenticated user from request (for API routes that receive Request object)
 */
export async function getAuthUserFromRequest(request: Request): Promise<AuthUser | null> {
  const user = await getAuthenticatedUserFromRequest(request)

  if (!user) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role || 'parent',
    tenantId: user.tenantId || null,
    firstName: user.firstName,
    lastName: user.lastName,
  }
}
