/**
 * Users Service
 *
 * Prisma-based service for user management (admin).
 */

import { prisma } from '@/lib/db/client'
import { UserRole } from '@/generated/prisma'
import { randomUUID } from 'crypto'

// =============================================================================
// Types
// =============================================================================

export interface UserWithRole {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  created_at: string
  role: string
  role_id: string | null
  tenant_id: string | null
  tenant_name: string | null
  is_active: boolean
}

export interface UserDetails {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  city: string | null
  state: string | null
  avatarUrl: string | null
  createdAt: string
  roles: {
    id: string
    role: string
    tenantId: string | null
    tenantName: string | null
    isActive: boolean
    createdAt: string
  }[]
  athleteCount: number
  registrationCount: number
}

export interface TenantOption {
  id: string
  name: string
  slug: string
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Fetch all users with their roles (for admin)
 */
export async function fetchUsersWithRoles(
  limit: number = 100
): Promise<{ data: UserWithRole[] | null; error: Error | null }> {
  try {
    // Fetch profiles
    const profiles = await prisma.profile.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Fetch active roles for all users
    const userIds = profiles.map((p) => p.id)
    const roles = await prisma.userRoleAssignment.findMany({
      where: {
        userId: { in: userIds },
        isActive: true,
      },
      include: {
        tenant: {
          select: { id: true, name: true },
        },
      },
    })

    // Create a map of user roles
    const roleMap = new Map(roles.map((r) => [r.userId, r]))

    // Merge profiles with roles
    const usersWithRoles: UserWithRole[] = profiles.map((p) => {
      const userRole = roleMap.get(p.id)
      return {
        id: p.id,
        email: p.email,
        first_name: p.firstName,
        last_name: p.lastName,
        created_at: p.createdAt.toISOString(),
        role: userRole?.role || 'parent',
        role_id: userRole?.id || null,
        tenant_id: userRole?.tenant?.id || null,
        tenant_name: userRole?.tenant?.name || null,
        is_active: userRole?.isActive ?? true,
      }
    })

    return { data: usersWithRoles, error: null }
  } catch (error) {
    console.error('[Users] Failed to fetch users:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get detailed user information including all roles
 */
export async function getUserDetails(
  userId: string
): Promise<{ data: UserDetails | null; error: Error | null }> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            tenant: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        athletes: {
          select: { id: true },
        },
        registrations: {
          select: { id: true },
        },
      },
    })

    if (!profile) {
      return { data: null, error: new Error('User not found') }
    }

    const details: UserDetails = {
      id: profile.id,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      city: profile.city,
      state: profile.state,
      avatarUrl: profile.avatarUrl,
      createdAt: profile.createdAt.toISOString(),
      roles: profile.userRoles.map((r) => ({
        id: r.id,
        role: r.role,
        tenantId: r.tenantId,
        tenantName: r.tenant?.name || null,
        isActive: r.isActive,
        createdAt: r.createdAt.toISOString(),
      })),
      athleteCount: profile.athletes.length,
      registrationCount: profile.registrations.length,
    }

    return { data: details, error: null }
  } catch (error) {
    console.error('[Users] Failed to get user details:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Fetch all tenants for assignment dropdown
 */
export async function fetchTenants(): Promise<{
  data: TenantOption[] | null
  error: Error | null
}> {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { licenseStatus: 'active' },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: { name: 'asc' },
    })

    return { data: tenants, error: null }
  } catch (error) {
    console.error('[Users] Failed to fetch tenants:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Update a user's role
 */
export async function updateUserRole(params: {
  userId: string
  newRole: UserRole
  tenantId?: string | null
}): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const { userId, newRole, tenantId } = params

    // Deactivate existing active roles for this user
    await prisma.userRoleAssignment.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    })

    // Check if this exact role assignment already exists
    const existingRole = await prisma.userRoleAssignment.findFirst({
      where: {
        userId,
        role: newRole,
        tenantId: tenantId || null,
      },
    })

    if (existingRole) {
      // Reactivate existing role
      await prisma.userRoleAssignment.update({
        where: { id: existingRole.id },
        data: { isActive: true },
      })
    } else {
      // Create new role assignment
      await prisma.userRoleAssignment.create({
        data: {
          userId,
          role: newRole,
          tenantId: tenantId || null,
          isActive: true,
        },
      })
    }

    return { data: { success: true }, error: null }
  } catch (error) {
    console.error('[Users] Failed to update user role:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Assign user to a tenant
 */
export async function assignUserToTenant(params: {
  userId: string
  tenantId: string
}): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const { userId, tenantId } = params

    // Get current active role
    const currentRole = await prisma.userRoleAssignment.findFirst({
      where: {
        userId,
        isActive: true,
      },
    })

    const role = currentRole?.role || 'parent'

    // Deactivate current role
    if (currentRole) {
      await prisma.userRoleAssignment.update({
        where: { id: currentRole.id },
        data: { isActive: false },
      })
    }

    // Check if role with this tenant exists
    const existingTenantRole = await prisma.userRoleAssignment.findFirst({
      where: {
        userId,
        role,
        tenantId,
      },
    })

    if (existingTenantRole) {
      await prisma.userRoleAssignment.update({
        where: { id: existingTenantRole.id },
        data: { isActive: true },
      })
    } else {
      await prisma.userRoleAssignment.create({
        data: {
          userId,
          role,
          tenantId,
          isActive: true,
        },
      })
    }

    return { data: { success: true }, error: null }
  } catch (error) {
    console.error('[Users] Failed to assign user to tenant:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Remove user from tenant (set tenant to null)
 */
export async function removeUserFromTenant(params: {
  userId: string
}): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const { userId } = params

    // Get current active role
    const currentRole = await prisma.userRoleAssignment.findFirst({
      where: {
        userId,
        isActive: true,
      },
    })

    if (!currentRole) {
      return { data: { success: true }, error: null }
    }

    const role = currentRole.role

    // Deactivate current role
    await prisma.userRoleAssignment.update({
      where: { id: currentRole.id },
      data: { isActive: false },
    })

    // Check if role without tenant exists
    const existingNoTenantRole = await prisma.userRoleAssignment.findFirst({
      where: {
        userId,
        role,
        tenantId: null,
      },
    })

    if (existingNoTenantRole) {
      await prisma.userRoleAssignment.update({
        where: { id: existingNoTenantRole.id },
        data: { isActive: true },
      })
    } else {
      await prisma.userRoleAssignment.create({
        data: {
          userId,
          role,
          tenantId: null,
          isActive: true,
        },
      })
    }

    return { data: { success: true }, error: null }
  } catch (error) {
    console.error('[Users] Failed to remove user from tenant:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Deactivate a user's role (soft delete)
 */
export async function deactivateUserRole(params: {
  userId: string
}): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const { userId } = params

    await prisma.userRoleAssignment.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    })

    return { data: { success: true }, error: null }
  } catch (error) {
    console.error('[Users] Failed to deactivate user role:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Delete a user completely from the database.
 * Removes FK-restricted records (CampAttendance, PickupToken) first, then the Profile.
 * All other relations have onDelete: Cascade and will be cleaned up automatically.
 */
export async function deleteUser(params: {
  userId: string
}): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const { userId } = params

    await prisma.$transaction(async (tx) => {
      // Delete records with required FK to Profile (no cascade)
      await tx.campAttendance.deleteMany({
        where: { parentProfileId: userId },
      })

      await tx.pickupToken.deleteMany({
        where: { parentProfileId: userId },
      })

      // Delete the profile — all other relations cascade
      await tx.profile.delete({
        where: { id: userId },
      })
    })

    return { data: { success: true }, error: null }
  } catch (error) {
    console.error('[Users] Failed to delete user:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(params: {
  userId: string
  firstName?: string
  lastName?: string
  phone?: string
}): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const { userId, firstName, lastName, phone } = params

    await prisma.profile.update({
      where: { id: userId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(phone !== undefined && { phone }),
      },
    })

    return { data: { success: true }, error: null }
  } catch (error) {
    console.error('[Users] Failed to update user profile:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Create a new user (admin-only)
 * Creates a profile and assigns a role
 */
export async function createUser(params: {
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  role: UserRole
  tenantId?: string | null
}): Promise<{ data: { userId: string } | null; error: Error | null }> {
  try {
    const { email, firstName, lastName, phone, role, tenantId } = params

    // Check if user already exists
    const existing = await prisma.profile.findFirst({
      where: { email },
    })

    if (existing) {
      return { data: null, error: new Error('A user with this email already exists') }
    }

    // Create profile and role assignment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Generate UUID for the new profile (since Profile.id doesn't auto-generate)
      const profileId = randomUUID()

      // Create the profile
      const profile = await tx.profile.create({
        data: {
          id: profileId,
          email,
          firstName: firstName || null,
          lastName: lastName || null,
          phone: phone || null,
        },
      })

      // Create role assignment
      await tx.userRoleAssignment.create({
        data: {
          userId: profile.id,
          role,
          tenantId: tenantId || null,
          isActive: true,
        },
      })

      return profile
    })

    return { data: { userId: result.id }, error: null }
  } catch (error) {
    console.error('[Users] Failed to create user:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Parent Role Management
// =============================================================================

/**
 * Ensure a user has an active parent role assignment.
 * No-op if they already have one. Does NOT replace existing roles.
 *
 * Call this whenever a registration is created or confirmed to guarantee
 * the parent can access the parent dashboard.
 */
export async function ensureParentRole(userId: string): Promise<boolean> {
  try {
    const existing = await prisma.userRoleAssignment.findFirst({
      where: { userId, role: 'parent', isActive: true },
      select: { id: true },
    })

    if (existing) return false

    await prisma.userRoleAssignment.create({
      data: { userId, role: 'parent', isActive: true },
    })

    console.log('[Users] Added parent role for user:', userId)
    return true
  } catch (error) {
    // Swallow duplicate key errors (race condition between webhook + client)
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Unique constraint')) return false
    console.error('[Users] Failed to ensure parent role:', error)
    return false
  }
}
