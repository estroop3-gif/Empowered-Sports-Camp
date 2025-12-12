/**
 * Territories Data Access Layer
 *
 * Handles all Supabase queries for territory management.
 * Territories are geographic regions that can be licensed to operators.
 *
 * Status meanings:
 * - open: Available for licensing, not assigned
 * - reserved: In negotiation with a potential licensee
 * - assigned: Actively licensed to a tenant
 * - closed: No longer available (archived)
 */

import { createClient } from '@/lib/supabase/client'

export type TerritoryStatus = 'open' | 'reserved' | 'assigned' | 'closed'

export interface Territory {
  id: string
  name: string
  description: string | null
  country: string
  state_region: string
  city: string | null
  postal_codes: string | null
  tenant_id: string | null
  status: TerritoryStatus
  notes: string | null
  created_at: string
  updated_at: string
  // Joined from tenants
  tenant_name?: string | null
}

export interface TerritoryWithMetrics extends Territory {
  camp_count: number
  registration_count: number
}

export interface CreateTerritoryInput {
  name: string
  description?: string
  country: string
  state_region: string
  city?: string
  postal_codes?: string
  tenant_id?: string | null
  status?: TerritoryStatus
  notes?: string
}

export interface UpdateTerritoryInput {
  name?: string
  description?: string
  country?: string
  state_region?: string
  city?: string
  postal_codes?: string
  tenant_id?: string | null
  status?: TerritoryStatus
  notes?: string
}

export interface TerritoryFilters {
  status?: TerritoryStatus | ''
  tenant_id?: string | ''
  search?: string
}

export interface TerritoryStats {
  total: number
  open: number
  reserved: number
  assigned: number
  closed: number
}

/**
 * Get all territories with optional filtering
 */
export async function getAllTerritories(filters?: TerritoryFilters): Promise<{
  data: Territory[] | null
  error: Error | null
}> {
  const supabase = createClient()

  try {
    let query = supabase
      .from('territories')
      .select(`
        id,
        name,
        description,
        country,
        state_region,
        city,
        postal_codes,
        tenant_id,
        status,
        notes,
        created_at,
        updated_at,
        tenants (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })

    // Apply status filter
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    // Apply tenant filter
    if (filters?.tenant_id) {
      query = query.eq('tenant_id', filters.tenant_id)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching territories:', error)
      return { data: null, error }
    }

    // Transform data to include tenant_name
    const territories: Territory[] = (data || []).map((t: {
      id: string
      name: string
      description: string | null
      country: string
      state_region: string
      city: string | null
      postal_codes: string | null
      tenant_id: string | null
      status: TerritoryStatus
      notes: string | null
      created_at: string
      updated_at: string
      tenants: { id: string; name: string } | null
    }) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      country: t.country,
      state_region: t.state_region,
      city: t.city,
      postal_codes: t.postal_codes,
      tenant_id: t.tenant_id,
      status: t.status,
      notes: t.notes,
      created_at: t.created_at,
      updated_at: t.updated_at,
      tenant_name: t.tenants?.name || null,
    }))

    // Apply search filter (client-side for simplicity)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      return {
        data: territories.filter(t =>
          t.name.toLowerCase().includes(searchLower) ||
          t.city?.toLowerCase().includes(searchLower) ||
          t.state_region.toLowerCase().includes(searchLower) ||
          t.tenant_name?.toLowerCase().includes(searchLower)
        ),
        error: null
      }
    }

    return { data: territories, error: null }
  } catch (err) {
    console.error('Unexpected error fetching territories:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get territory statistics
 */
export async function getTerritoryStats(): Promise<{
  data: TerritoryStats | null
  error: Error | null
}> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('territories')
      .select('status')

    if (error) {
      return { data: null, error }
    }

    const stats: TerritoryStats = {
      total: data?.length || 0,
      open: data?.filter((t: { status: string }) => t.status === 'open').length || 0,
      reserved: data?.filter((t: { status: string }) => t.status === 'reserved').length || 0,
      assigned: data?.filter((t: { status: string }) => t.status === 'assigned').length || 0,
      closed: data?.filter((t: { status: string }) => t.status === 'closed').length || 0,
    }

    return { data: stats, error: null }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

/**
 * Get a single territory by ID
 */
export async function getTerritoryById(id: string): Promise<{
  data: Territory | null
  error: Error | null
}> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('territories')
      .select(`
        id,
        name,
        description,
        country,
        state_region,
        city,
        postal_codes,
        tenant_id,
        status,
        notes,
        created_at,
        updated_at,
        tenants (
          id,
          name
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      return { data: null, error }
    }

    const tenantData = data.tenants as { id: string; name: string } | null

    return {
      data: {
        ...data,
        tenant_name: tenantData?.name || null,
      } as Territory,
      error: null,
    }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

/**
 * Create a new territory
 */
export async function createTerritory(input: CreateTerritoryInput): Promise<{
  data: Territory | null
  error: Error | null
}> {
  const supabase = createClient()

  try {
    // Determine status based on tenant assignment
    let status = input.status || 'open'
    if (input.tenant_id && status === 'open') {
      status = 'assigned'
    }

    const { data, error } = await supabase
      .from('territories')
      .insert({
        name: input.name,
        description: input.description || null,
        country: input.country,
        state_region: input.state_region,
        city: input.city || null,
        postal_codes: input.postal_codes || null,
        tenant_id: input.tenant_id || null,
        status,
        notes: input.notes || null,
      })
      .select(`
        id,
        name,
        description,
        country,
        state_region,
        city,
        postal_codes,
        tenant_id,
        status,
        notes,
        created_at,
        updated_at,
        tenants (
          id,
          name
        )
      `)
      .single()

    if (error) {
      console.error('Error creating territory:', error)
      return { data: null, error }
    }

    const tenantData = data.tenants as { id: string; name: string } | null

    return {
      data: {
        ...data,
        tenant_name: tenantData?.name || null,
      } as Territory,
      error: null,
    }
  } catch (err) {
    console.error('Unexpected error creating territory:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Update a territory
 */
export async function updateTerritory(
  id: string,
  input: UpdateTerritoryInput
): Promise<{
  data: Territory | null
  error: Error | null
}> {
  const supabase = createClient()

  try {
    const updates: Record<string, unknown> = {}

    if (input.name !== undefined) updates.name = input.name
    if (input.description !== undefined) updates.description = input.description
    if (input.country !== undefined) updates.country = input.country
    if (input.state_region !== undefined) updates.state_region = input.state_region
    if (input.city !== undefined) updates.city = input.city
    if (input.postal_codes !== undefined) updates.postal_codes = input.postal_codes
    if (input.tenant_id !== undefined) updates.tenant_id = input.tenant_id
    if (input.status !== undefined) updates.status = input.status
    if (input.notes !== undefined) updates.notes = input.notes

    // Auto-update status if tenant is being assigned/unassigned
    if (input.tenant_id !== undefined) {
      if (input.tenant_id && !input.status) {
        updates.status = 'assigned'
      } else if (!input.tenant_id && !input.status) {
        updates.status = 'open'
      }
    }

    const { data, error } = await supabase
      .from('territories')
      .update(updates)
      .eq('id', id)
      .select(`
        id,
        name,
        description,
        country,
        state_region,
        city,
        postal_codes,
        tenant_id,
        status,
        notes,
        created_at,
        updated_at,
        tenants (
          id,
          name
        )
      `)
      .single()

    if (error) {
      console.error('Error updating territory:', error)
      return { data: null, error }
    }

    const tenantData = data.tenants as { id: string; name: string } | null

    return {
      data: {
        ...data,
        tenant_name: tenantData?.name || null,
      } as Territory,
      error: null,
    }
  } catch (err) {
    console.error('Unexpected error updating territory:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Close/archive a territory (soft delete)
 */
export async function closeTerritory(id: string): Promise<{
  success: boolean
  error: Error | null
}> {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('territories')
      .update({ status: 'closed', tenant_id: null })
      .eq('id', id)

    if (error) {
      return { success: false, error }
    }

    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: err as Error }
  }
}

/**
 * Reopen a closed territory
 */
export async function reopenTerritory(id: string): Promise<{
  success: boolean
  error: Error | null
}> {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('territories')
      .update({ status: 'open' })
      .eq('id', id)

    if (error) {
      return { success: false, error }
    }

    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: err as Error }
  }
}

/**
 * Assign a territory to a tenant (licensee)
 */
export async function assignTerritory(
  territoryId: string,
  tenantId: string
): Promise<{
  success: boolean
  error: Error | null
}> {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('territories')
      .update({
        tenant_id: tenantId,
        status: 'assigned',
      })
      .eq('id', territoryId)

    if (error) {
      return { success: false, error }
    }

    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: err as Error }
  }
}

/**
 * Unassign a territory from its tenant
 */
export async function unassignTerritory(territoryId: string): Promise<{
  success: boolean
  error: Error | null
}> {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('territories')
      .update({
        tenant_id: null,
        status: 'open',
      })
      .eq('id', territoryId)

    if (error) {
      return { success: false, error }
    }

    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: err as Error }
  }
}

/**
 * Check for potential territory conflicts
 * Returns territories with same name and state
 */
export async function checkTerritoryConflicts(
  name: string,
  stateRegion: string,
  excludeId?: string
): Promise<{
  data: Territory[] | null
  error: Error | null
}> {
  const supabase = createClient()

  try {
    let query = supabase
      .from('territories')
      .select('id, name, state_region, status, tenant_id')
      .ilike('name', name)
      .ilike('state_region', stateRegion)
      .neq('status', 'closed')

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query

    if (error) {
      return { data: null, error }
    }

    return { data: data as Territory[], error: null }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

/**
 * Get all tenants for the assign dropdown
 */
export async function getTenantsForAssignment(): Promise<{
  data: Array<{ id: string; name: string }> | null
  error: Error | null
}> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('active', true)
      .order('name')

    if (error) {
      return { data: null, error }
    }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

/**
 * Get territory metrics (camp count, etc.)
 * Stub for now - will be expanded when camp-territory relationship is defined
 */
export async function getTerritoryMetrics(territoryId: string): Promise<{
  data: { camp_count: number; registration_count: number } | null
  error: Error | null
}> {
  // TODO: Implement actual metrics query when camps have territory relationship
  // For now, return zeros
  return {
    data: { camp_count: 0, registration_count: 0 },
    error: null,
  }
}
