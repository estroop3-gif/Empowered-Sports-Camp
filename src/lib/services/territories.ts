/**
 * Territories Service (Prisma)
 *
 * Handles all database operations for territory management.
 */

import prisma from '@/lib/db/client'

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
  try {
    const where: Record<string, unknown> = {}

    if (filters?.status) {
      where.status = filters.status
    }
    if (filters?.tenant_id) {
      where.tenantId = filters.tenant_id
    }

    const territories = await prisma.territory.findMany({
      where,
      include: {
        tenant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    let result: Territory[] = territories.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      country: t.country,
      state_region: t.stateRegion,
      city: t.city,
      postal_codes: t.postalCodes,
      tenant_id: t.tenantId,
      status: t.status as TerritoryStatus,
      notes: t.notes,
      created_at: t.createdAt.toISOString(),
      updated_at: t.updatedAt.toISOString(),
      tenant_name: t.tenant?.name || null,
    }))

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(t =>
        t.name.toLowerCase().includes(searchLower) ||
        t.city?.toLowerCase().includes(searchLower) ||
        t.state_region.toLowerCase().includes(searchLower) ||
        t.tenant_name?.toLowerCase().includes(searchLower)
      )
    }

    return { data: result, error: null }
  } catch (err) {
    console.error('Error fetching territories:', err)
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
  try {
    const territories = await prisma.territory.findMany({
      select: { status: true },
    })

    const stats: TerritoryStats = {
      total: territories.length,
      open: territories.filter(t => t.status === 'open').length,
      reserved: territories.filter(t => t.status === 'reserved').length,
      assigned: territories.filter(t => t.status === 'assigned').length,
      closed: territories.filter(t => t.status === 'closed').length,
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
  try {
    const territory = await prisma.territory.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true } },
      },
    })

    if (!territory) {
      return { data: null, error: null }
    }

    return {
      data: {
        id: territory.id,
        name: territory.name,
        description: territory.description,
        country: territory.country,
        state_region: territory.stateRegion,
        city: territory.city,
        postal_codes: territory.postalCodes,
        tenant_id: territory.tenantId,
        status: territory.status as TerritoryStatus,
        notes: territory.notes,
        created_at: territory.createdAt.toISOString(),
        updated_at: territory.updatedAt.toISOString(),
        tenant_name: territory.tenant?.name || null,
      },
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
  try {
    let status = input.status || 'open'
    if (input.tenant_id && status === 'open') {
      status = 'assigned'
    }

    const territory = await prisma.territory.create({
      data: {
        name: input.name,
        description: input.description || null,
        country: input.country,
        stateRegion: input.state_region,
        city: input.city || null,
        postalCodes: input.postal_codes || null,
        tenantId: input.tenant_id || null,
        status,
        notes: input.notes || null,
      },
      include: {
        tenant: { select: { id: true, name: true } },
      },
    })

    return {
      data: {
        id: territory.id,
        name: territory.name,
        description: territory.description,
        country: territory.country,
        state_region: territory.stateRegion,
        city: territory.city,
        postal_codes: territory.postalCodes,
        tenant_id: territory.tenantId,
        status: territory.status as TerritoryStatus,
        notes: territory.notes,
        created_at: territory.createdAt.toISOString(),
        updated_at: territory.updatedAt.toISOString(),
        tenant_name: territory.tenant?.name || null,
      },
      error: null,
    }
  } catch (err) {
    console.error('Error creating territory:', err)
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
  try {
    const updates: Record<string, unknown> = {}

    if (input.name !== undefined) updates.name = input.name
    if (input.description !== undefined) updates.description = input.description
    if (input.country !== undefined) updates.country = input.country
    if (input.state_region !== undefined) updates.stateRegion = input.state_region
    if (input.city !== undefined) updates.city = input.city
    if (input.postal_codes !== undefined) updates.postalCodes = input.postal_codes
    if (input.tenant_id !== undefined) updates.tenantId = input.tenant_id
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

    const territory = await prisma.territory.update({
      where: { id },
      data: updates,
      include: {
        tenant: { select: { id: true, name: true } },
      },
    })

    return {
      data: {
        id: territory.id,
        name: territory.name,
        description: territory.description,
        country: territory.country,
        state_region: territory.stateRegion,
        city: territory.city,
        postal_codes: territory.postalCodes,
        tenant_id: territory.tenantId,
        status: territory.status as TerritoryStatus,
        notes: territory.notes,
        created_at: territory.createdAt.toISOString(),
        updated_at: territory.updatedAt.toISOString(),
        tenant_name: territory.tenant?.name || null,
      },
      error: null,
    }
  } catch (err) {
    console.error('Error updating territory:', err)
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
  try {
    await prisma.territory.update({
      where: { id },
      data: { status: 'closed', tenantId: null },
    })
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
  try {
    await prisma.territory.update({
      where: { id },
      data: { status: 'open' },
    })
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
  try {
    await prisma.territory.update({
      where: { id: territoryId },
      data: { tenantId, status: 'assigned' },
    })
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
  try {
    await prisma.territory.update({
      where: { id: territoryId },
      data: { tenantId: null, status: 'open' },
    })
    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: err as Error }
  }
}

/**
 * Check for potential territory conflicts
 */
export async function checkTerritoryConflicts(
  name: string,
  stateRegion: string,
  excludeId?: string
): Promise<{
  data: Territory[] | null
  error: Error | null
}> {
  try {
    const where: Record<string, unknown> = {
      name: { contains: name, mode: 'insensitive' },
      stateRegion: { contains: stateRegion, mode: 'insensitive' },
      status: { not: 'closed' },
    }

    if (excludeId) {
      where.id = { not: excludeId }
    }

    const territories = await prisma.territory.findMany({ where })

    return {
      data: territories.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        country: t.country,
        state_region: t.stateRegion,
        city: t.city,
        postal_codes: t.postalCodes,
        tenant_id: t.tenantId,
        status: t.status as TerritoryStatus,
        notes: t.notes,
        created_at: t.createdAt.toISOString(),
        updated_at: t.updatedAt.toISOString(),
      })),
      error: null,
    }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

/**
 * Get all tenants for the assign dropdown
 * Returns ALL tenants to allow assignment
 */
export async function getTenantsForAssignment(): Promise<{
  data: Array<{ id: string; name: string; licenseStatus: string | null }> | null
  error: Error | null
}> {
  try {
    // Return ALL tenants - no filter on licenseStatus
    const tenants = await prisma.tenant.findMany({
      select: { id: true, name: true, licenseStatus: true },
      orderBy: { name: 'asc' },
    })

    return { data: tenants, error: null }
  } catch (err) {
    console.error('[getTenantsForAssignment] Error:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get all licensees (users with licensee_owner role) for assignment
 */
export async function getLicenseesForAssignment(): Promise<{
  data: Array<{ id: string; name: string; email: string; tenantName: string | null }> | null
  error: Error | null
}> {
  try {
    const roles = await prisma.userRoleAssignment.findMany({
      where: {
        role: 'licensee_owner',
        isActive: true,
      },
      include: {
        profile: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        tenant: {
          select: { name: true },
        },
      },
    })

    const licensees = roles
      .filter(r => r.profile)
      .map(r => ({
        id: r.profile!.id,
        name: `${r.profile!.firstName || ''} ${r.profile!.lastName || ''}`.trim() || r.profile!.email,
        email: r.profile!.email,
        tenantName: r.tenant?.name || null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return { data: licensees, error: null }
  } catch (err) {
    console.error('[getLicenseesForAssignment] Error:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get current territory assignments
 */
export async function getTerritoryAssignments(territoryId: string): Promise<{
  data: {
    tenants: Array<{ id: string; name: string }>
    licensees: Array<{ id: string; name: string; email: string }>
  } | null
  error: Error | null
}> {
  try {
    const assignments = await prisma.territoryAssignment.findMany({
      where: { territoryId },
      include: {
        tenant: { select: { id: true, name: true } },
        licensee: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })

    const tenants = assignments
      .filter(a => a.tenant)
      .map(a => ({ id: a.tenant!.id, name: a.tenant!.name }))

    const licensees = assignments
      .filter(a => a.licensee)
      .map(a => ({
        id: a.licensee!.id,
        name: `${a.licensee!.firstName || ''} ${a.licensee!.lastName || ''}`.trim() || a.licensee!.email,
        email: a.licensee!.email,
      }))

    return { data: { tenants, licensees }, error: null }
  } catch (err) {
    console.error('[getTerritoryAssignments] Error:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Save territory assignments (replaces all existing assignments)
 */
export async function saveTerritoryAssignments(
  territoryId: string,
  tenantIds: string[],
  licenseeIds: string[],
  assignedBy?: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    // Delete all existing assignments
    await prisma.territoryAssignment.deleteMany({
      where: { territoryId },
    })

    // Create new assignments for tenants
    const tenantAssignments = tenantIds.map(tenantId => ({
      territoryId,
      tenantId,
      assignedBy,
    }))

    // Create new assignments for licensees
    const licenseeAssignments = licenseeIds.map(licenseeId => ({
      territoryId,
      licenseeId,
      assignedBy,
    }))

    if (tenantAssignments.length > 0 || licenseeAssignments.length > 0) {
      await prisma.territoryAssignment.createMany({
        data: [...tenantAssignments, ...licenseeAssignments],
      })
    }

    // Update territory status
    const hasAssignments = tenantIds.length > 0 || licenseeIds.length > 0
    await prisma.territory.update({
      where: { id: territoryId },
      data: {
        status: hasAssignments ? 'assigned' : 'open',
        // Keep primary tenant for backward compatibility
        tenantId: tenantIds[0] || null,
      },
    })

    return { success: true, error: null }
  } catch (err) {
    console.error('[saveTerritoryAssignments] Error:', err)
    return { success: false, error: err as Error }
  }
}

/**
 * Get territory metrics
 */
export async function getTerritoryMetrics(territoryId: string): Promise<{
  data: { camp_count: number; registration_count: number } | null
  error: Error | null
}> {
  try {
    // Get the territory to find the tenant
    const territory = await prisma.territory.findUnique({
      where: { id: territoryId },
      select: { tenantId: true },
    })

    if (!territory || !territory.tenantId) {
      return {
        data: { camp_count: 0, registration_count: 0 },
        error: null,
      }
    }

    // Get camp count and registration count for the tenant
    const [campCount, registrationCount] = await Promise.all([
      prisma.camp.count({
        where: { tenantId: territory.tenantId },
      }),
      prisma.registration.count({
        where: {
          camp: { tenantId: territory.tenantId },
          status: { not: 'cancelled' },
        },
      }),
    ])

    return {
      data: { camp_count: campCount, registration_count: registrationCount },
      error: null,
    }
  } catch (err) {
    console.error('[Territories] Failed to get metrics:', err)
    return { data: null, error: err as Error }
  }
}
