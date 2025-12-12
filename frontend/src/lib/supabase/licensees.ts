/**
 * Licensee Data Access Layer
 *
 * Handles all Supabase queries related to licensee management.
 * These queries are designed to work with RLS policies that
 * ensure only hq_admin can see/manage all licensees.
 *
 * SECURITY:
 * - RLS policies on profiles and user_roles tables enforce access
 * - Only hq_admin role can view all licensee_owner profiles
 * - These functions assume RLS is enabled and configured
 */

import { createClient } from '@/lib/supabase/client'

/**
 * Licensee profile shape
 * Represents a user with role = 'licensee_owner'
 */
export interface Licensee {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  city: string | null
  state: string | null
  created_at: string
  // From user_roles join
  role_id?: string
  tenant_id?: string | null
  is_active?: boolean
  // From tenants join
  tenant_name?: string | null
  territory_name?: string | null
}

/**
 * Shape for creating a new licensee
 */
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
 *
 * This query:
 * 1. Joins profiles with user_roles to filter by role
 * 2. Optionally joins tenants to get territory info
 * 3. Returns data sorted by created_at descending
 *
 * RLS ensures only hq_admin can execute this successfully.
 */
export async function getAllLicensees(): Promise<{
  data: Licensee[] | null
  error: Error | null
}> {
  const supabase = createClient()

  try {
    // First get all user_roles with role = 'licensee_owner'
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        id,
        user_id,
        tenant_id,
        is_active,
        tenants (
          id,
          name
        )
      `)
      .eq('role', 'licensee_owner')
      .eq('is_active', true)

    if (rolesError) {
      console.error('Error fetching licensee roles:', rolesError)
      return { data: null, error: rolesError }
    }

    if (!roles || roles.length === 0) {
      return { data: [], error: null }
    }

    // Get the user_ids
    const userIds = roles.map((r: { user_id: string }) => r.user_id)

    // Fetch profiles for these users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, phone, city, state, created_at')
      .in('id', userIds)
      .order('created_at', { ascending: false })

    if (profilesError) {
      console.error('Error fetching licensee profiles:', profilesError)
      return { data: null, error: profilesError }
    }

    // Define role type for TypeScript
    type RoleData = {
      id: string
      user_id: string
      tenant_id: string | null
      is_active: boolean
      tenants: { id: string; name: string } | null
    }

    // Merge the data
    const licensees: Licensee[] = (profiles || []).map((profile: {
      id: string
      email: string
      first_name: string | null
      last_name: string | null
      phone: string | null
      city: string | null
      state: string | null
      created_at: string
    }) => {
      const roleData = (roles as RoleData[]).find((r: RoleData) => r.user_id === profile.id)
      const tenantData = roleData?.tenants as { id: string; name: string } | null

      return {
        ...profile,
        role_id: roleData?.id,
        tenant_id: roleData?.tenant_id,
        is_active: roleData?.is_active ?? true,
        tenant_name: tenantData?.name || null,
        territory_name: tenantData?.name || null,
      }
    })

    return { data: licensees, error: null }
  } catch (err) {
    console.error('Unexpected error fetching licensees:', err)
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
  const supabase = createClient()

  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, phone, city, state, created_at')
      .eq('id', id)
      .single()

    if (profileError) {
      return { data: null, error: profileError }
    }

    // Get role info
    const { data: roleData } = await supabase
      .from('user_roles')
      .select(`
        id,
        tenant_id,
        is_active,
        tenants (
          id,
          name
        )
      `)
      .eq('user_id', id)
      .eq('role', 'licensee_owner')
      .single()

    const tenantData = roleData?.tenants as { id: string; name: string } | null

    return {
      data: {
        ...profile,
        role_id: roleData?.id,
        tenant_id: roleData?.tenant_id,
        is_active: roleData?.is_active ?? true,
        tenant_name: tenantData?.name || null,
        territory_name: tenantData?.name || null,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

/**
 * Create a new licensee
 *
 * This creates:
 * 1. A profile record
 * 2. A user_roles record with role = 'licensee_owner'
 * 3. Optionally a tenant record for the territory
 *
 * NOTE: This does NOT create an auth user. The licensee will need
 * to complete signup via the application email flow.
 */
export async function createLicensee(input: CreateLicenseeInput): Promise<{
  data: Licensee | null
  error: Error | null
}> {
  const supabase = createClient()

  try {
    // First, create a tenant for this licensee's territory
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: input.territory_name,
        slug: input.territory_name.toLowerCase().replace(/\s+/g, '-'),
        active: input.status === 'active',
      })
      .select()
      .single()

    if (tenantError) {
      console.error('Error creating tenant:', tenantError)
      // Continue without tenant - we can still create the profile
    }

    // Generate a temporary UUID for the profile
    // In a real flow, this would come from Supabase Auth
    const tempId = crypto.randomUUID()

    // Create the profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: tempId,
        email: input.email,
        first_name: input.first_name,
        last_name: input.last_name,
        phone: input.phone || null,
        city: input.city,
        state: input.state,
      })
      .select()
      .single()

    if (profileError) {
      console.error('Error creating profile:', profileError)
      return { data: null, error: profileError }
    }

    // Create the user_role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: profile.id,
        role: 'licensee_owner',
        tenant_id: tenant?.id || null,
        is_active: input.status === 'active',
      })

    if (roleError) {
      console.error('Error creating user_role:', roleError)
      // Rollback profile creation
      await supabase.from('profiles').delete().eq('id', profile.id)
      return { data: null, error: roleError }
    }

    return {
      data: {
        ...profile,
        tenant_id: tenant?.id || null,
        tenant_name: input.territory_name,
        territory_name: input.territory_name,
        is_active: input.status === 'active',
      },
      error: null,
    }
  } catch (err) {
    console.error('Unexpected error creating licensee:', err)
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
  const supabase = createClient()

  try {
    const profileUpdates: Record<string, unknown> = {}
    if (updates.email) profileUpdates.email = updates.email
    if (updates.first_name) profileUpdates.first_name = updates.first_name
    if (updates.last_name) profileUpdates.last_name = updates.last_name
    if (updates.phone !== undefined) profileUpdates.phone = updates.phone
    if (updates.city) profileUpdates.city = updates.city
    if (updates.state) profileUpdates.state = updates.state

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', id)
      .select()
      .single()

    if (profileError) {
      return { data: null, error: profileError }
    }

    return { data: profile as Licensee, error: null }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

/**
 * Delete (deactivate) a licensee
 * We don't actually delete, just set is_active = false
 */
export async function deactivateLicensee(id: string): Promise<{
  success: boolean
  error: Error | null
}> {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('user_roles')
      .update({ is_active: false })
      .eq('user_id', id)
      .eq('role', 'licensee_owner')

    if (error) {
      return { success: false, error }
    }

    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: err as Error }
  }
}
