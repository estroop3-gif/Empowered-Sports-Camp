/**
 * Users Service
 *
 * Prisma-based service for user management (admin).
 */

import prisma from '@/lib/db/client'

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
  tenant_name: string | null
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
          select: { name: true },
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
        tenant_name: userRole?.tenant?.name || null,
      }
    })

    return { data: usersWithRoles, error: null }
  } catch (error) {
    console.error('[Users] Failed to fetch users:', error)
    return { data: null, error: error as Error }
  }
}
