/**
 * Authorization Layer
 *
 * Application-level authorization.
 * Provides tenant filtering and role-based access control.
 */

import { UserRole } from '@/generated/prisma'

export interface AuthContext {
  userId: string
  role: UserRole
  tenantId: string | null
}

/**
 * Get tenant filter based on user role
 *
 * - HQ Admin: Can access all tenants (no filter)
 * - Others: Can only access their assigned tenant
 */
export function withTenantFilter(
  ctx: AuthContext | null,
  fieldName: string = 'tenantId'
): Record<string, string | undefined> {
  if (!ctx) return {}

  // HQ Admin sees all
  if (ctx.role === 'hq_admin') {
    return {}
  }

  // Others see only their tenant
  if (ctx.tenantId) {
    return { [fieldName]: ctx.tenantId }
  }

  return {}
}

/**
 * Check if user can manage a specific tenant
 */
export function canManageTenant(ctx: AuthContext, targetTenantId: string | null): boolean {
  if (ctx.role === 'hq_admin') return true
  if (!targetTenantId) return false
  return ctx.tenantId === targetTenantId
}

/**
 * Check if user can view a specific tenant's data
 */
export function canViewTenant(ctx: AuthContext, targetTenantId: string | null): boolean {
  if (ctx.role === 'hq_admin') return true
  if (!targetTenantId) return true // Global data is visible to all
  return ctx.tenantId === targetTenantId
}

/**
 * Check if user has one of the allowed roles
 */
export function hasRole(ctx: AuthContext, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(ctx.role)
}

/**
 * Check if user is admin (HQ or licensee owner)
 */
export function isAdmin(ctx: AuthContext): boolean {
  return ctx.role === 'hq_admin' || ctx.role === 'licensee_owner'
}

/**
 * Check if user is HQ admin
 */
export function isHqAdmin(ctx: AuthContext): boolean {
  return ctx.role === 'hq_admin'
}

/**
 * Check if user can manage camps (director or above)
 */
export function canManageCamps(ctx: AuthContext): boolean {
  return hasRole(ctx, ['hq_admin', 'licensee_owner', 'director'])
}

/**
 * Check if user can view registrations
 */
export function canViewRegistrations(ctx: AuthContext, parentId?: string): boolean {
  if (ctx.role === 'hq_admin') return true
  if (ctx.role === 'licensee_owner') return true
  if (ctx.role === 'director') return true
  if (ctx.role === 'parent' && parentId === ctx.userId) return true
  return false
}

/**
 * Get where clause for camp visibility
 */
export function getCampVisibilityFilter(ctx: AuthContext | null): object {
  if (!ctx) {
    // Public: only published camps
    return { status: { not: 'draft' } }
  }

  if (ctx.role === 'hq_admin') {
    return {} // All camps
  }

  if (ctx.tenantId) {
    return { tenantId: ctx.tenantId }
  }

  return { status: { not: 'draft' } }
}

/**
 * Get where clause for product visibility
 */
export function getProductVisibilityFilter(ctx: AuthContext | null): object {
  if (!ctx) {
    // Public: only active products
    return { isActive: true }
  }

  if (ctx.role === 'hq_admin') {
    return {} // All products
  }

  if (ctx.role === 'licensee_owner' && ctx.tenantId) {
    // Licensee sees global + their own
    return {
      OR: [{ licenseeId: null }, { licenseeId: ctx.tenantId }],
    }
  }

  return { isActive: true }
}

/**
 * Get where clause for curriculum visibility (global or licensee-specific)
 */
export function getCurriculumVisibilityFilter(ctx: AuthContext | null): object {
  if (!ctx) return {}

  if (ctx.role === 'hq_admin') {
    return {} // All curriculum
  }

  // Others see global + their own
  return {
    OR: [{ isGlobal: true }, { licenseeId: ctx.tenantId }],
  }
}
