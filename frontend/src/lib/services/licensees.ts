/**
 * Licensees Service (Prisma)
 *
 * Handles all database operations for licensee management.
 * Migrated from Supabase to Prisma.
 */

import prisma from '@/lib/db/client'

export interface Licensee {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  city: string | null
  state: string | null
  created_at: string
  role_id?: string
  tenant_id?: string | null
  is_active?: boolean
  tenant_name?: string | null
  territory_name?: string | null
}

export interface CreateLicenseeInput {
  email: string
  first_name: string
  last_name: string
  phone?: string
  territory_name: string
  city: string
  state: string
  status?: 'pending' | 'active' | 'inactive'
}

/**
 * Fetch all licensees (profiles with role = 'licensee_owner')
 */
export async function getAllLicensees(): Promise<{
  data: Licensee[] | null
  error: Error | null
}> {
  try {
    // Get all user_roles with role = 'licensee_owner'
    const roles = await prisma.userRoleAssignment.findMany({
      where: {
        role: 'licensee_owner',
        isActive: true,
      },
      include: {
        profile: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            city: true,
            state: true,
            createdAt: true,
          },
        },
        tenant: {
          select: { id: true, name: true },
        },
      },
    })

    const licensees: Licensee[] = roles
      .filter(r => r.profile)
      .map(r => ({
        id: r.profile!.id,
        email: r.profile!.email,
        first_name: r.profile!.firstName,
        last_name: r.profile!.lastName,
        phone: r.profile!.phone,
        city: r.profile!.city,
        state: r.profile!.state,
        created_at: r.profile!.createdAt.toISOString(),
        role_id: r.id,
        tenant_id: r.tenantId,
        is_active: r.isActive,
        tenant_name: r.tenant?.name || null,
        territory_name: r.tenant?.name || null,
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return { data: licensees, error: null }
  } catch (err) {
    console.error('Error fetching licensees:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get a single licensee by ID
 */
export async function getLicenseeById(id: string): Promise<{
  data: Licensee | null
  error: Error | null
}> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        city: true,
        state: true,
        createdAt: true,
      },
    })

    if (!profile) {
      return { data: null, error: null }
    }

    const roleData = await prisma.userRoleAssignment.findFirst({
      where: {
        userId: id,
        role: 'licensee_owner',
      },
      include: {
        tenant: { select: { id: true, name: true } },
      },
    })

    return {
      data: {
        id: profile.id,
        email: profile.email,
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone: profile.phone,
        city: profile.city,
        state: profile.state,
        created_at: profile.createdAt.toISOString(),
        role_id: roleData?.id,
        tenant_id: roleData?.tenantId,
        is_active: roleData?.isActive ?? true,
        tenant_name: roleData?.tenant?.name || null,
        territory_name: roleData?.tenant?.name || null,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

/**
 * Create a new licensee
 */
export async function createLicensee(input: CreateLicenseeInput): Promise<{
  data: Licensee | null
  error: Error | null
}> {
  try {
    // Create a tenant for this licensee's territory
    let tenant = null
    try {
      tenant = await prisma.tenant.create({
        data: {
          name: input.territory_name,
          slug: input.territory_name.toLowerCase().replace(/\s+/g, '-'),
          licenseStatus: input.status === 'active' ? 'active' : 'suspended',
        },
      })
    } catch (e) {
      console.error('Error creating tenant:', e)
    }

    // Generate a temporary UUID for the profile
    const tempId = crypto.randomUUID()

    // Create the profile
    const profile = await prisma.profile.create({
      data: {
        id: tempId,
        email: input.email,
        firstName: input.first_name,
        lastName: input.last_name,
        phone: input.phone || null,
        city: input.city,
        state: input.state,
      },
    })

    // Create the user_role
    await prisma.userRoleAssignment.create({
      data: {
        userId: profile.id,
        role: 'licensee_owner',
        tenantId: tenant?.id || null,
        isActive: input.status === 'active',
      },
    })

    return {
      data: {
        id: profile.id,
        email: profile.email,
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone: profile.phone,
        city: profile.city,
        state: profile.state,
        created_at: profile.createdAt.toISOString(),
        tenant_id: tenant?.id || null,
        tenant_name: input.territory_name,
        territory_name: input.territory_name,
        is_active: input.status === 'active',
      },
      error: null,
    }
  } catch (err) {
    console.error('Error creating licensee:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Update a licensee's profile
 */
export async function updateLicensee(
  id: string,
  updates: Partial<CreateLicenseeInput>
): Promise<{
  data: Licensee | null
  error: Error | null
}> {
  try {
    const profileUpdates: Record<string, unknown> = {}
    if (updates.email) profileUpdates.email = updates.email
    if (updates.first_name) profileUpdates.firstName = updates.first_name
    if (updates.last_name) profileUpdates.lastName = updates.last_name
    if (updates.phone !== undefined) profileUpdates.phone = updates.phone
    if (updates.city) profileUpdates.city = updates.city
    if (updates.state) profileUpdates.state = updates.state

    const profile = await prisma.profile.update({
      where: { id },
      data: profileUpdates,
    })

    return {
      data: {
        id: profile.id,
        email: profile.email,
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone: profile.phone,
        city: profile.city,
        state: profile.state,
        created_at: profile.createdAt.toISOString(),
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

/**
 * Deactivate a licensee
 */
export async function deactivateLicensee(id: string): Promise<{
  success: boolean
  error: Error | null
}> {
  try {
    await prisma.userRoleAssignment.updateMany({
      where: {
        userId: id,
        role: 'licensee_owner',
      },
      data: { isActive: false },
    })

    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: err as Error }
  }
}

/**
 * Activate a licensee
 */
export async function activateLicensee(id: string): Promise<{
  success: boolean
  error: Error | null
}> {
  try {
    await prisma.userRoleAssignment.updateMany({
      where: {
        userId: id,
        role: 'licensee_owner',
      },
      data: { isActive: true },
    })

    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: err as Error }
  }
}
