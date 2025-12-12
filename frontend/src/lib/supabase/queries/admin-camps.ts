/**
 * Admin Camp Queries
 *
 * Supabase queries for camp management in the admin dashboard.
 * Handles creation, updates, and listing for hq_admin and licensee_owner roles.
 */

import { createClient } from '../client'

export interface CampFormData {
  name: string
  slug: string
  description: string
  sport: string
  location_id: string | null
  tenant_id: string
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  age_min: number
  age_max: number
  capacity: number
  price: number
  early_bird_price: number | null
  early_bird_deadline: string | null
  status: 'draft' | 'published' | 'open' | 'closed'
  featured: boolean
  image_url: string | null
}

export interface AdminCamp {
  id: string
  name: string
  slug: string
  description: string | null
  sport: string | null
  start_date: string
  end_date: string
  start_time: string | null
  end_time: string | null
  age_min: number
  age_max: number
  capacity: number
  price: number
  early_bird_price: number | null
  early_bird_deadline: string | null
  status: string
  featured: boolean
  image_url: string | null
  tenant_id: string
  location_id: string | null
  created_at: string
  updated_at: string
  location?: {
    id: string
    name: string
    city: string
    state: string
  } | null
  tenant?: {
    id: string
    name: string
    slug: string
  } | null
  registration_count?: number
}

export interface Tenant {
  id: string
  name: string
  slug: string
  city: string | null
  state: string | null
}

export interface Location {
  id: string
  name: string
  address: string | null
  city: string
  state: string
  zip: string | null
  tenant_id: string
}

/**
 * Get current user's role and tenant info
 */
export async function getCurrentUserRole(): Promise<{
  role: string
  tenant_id: string | null
  user_id: string
} | null> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, tenant_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!roleData) return null

  return {
    role: roleData.role,
    tenant_id: roleData.tenant_id,
    user_id: user.id
  }
}

/**
 * Fetch all tenants (for hq_admin dropdown)
 */
export async function fetchTenants(): Promise<Tenant[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tenants')
    .select('id, name, slug, city, state')
    .eq('active', true)
    .order('name')

  if (error) {
    console.error('[fetchTenants] Error:', error)
    return []
  }

  return data || []
}

/**
 * Fetch locations for a tenant
 */
export async function fetchLocations(tenantId?: string): Promise<Location[]> {
  const supabase = createClient()

  let query = supabase
    .from('locations')
    .select('id, name, address, city, state, zip, tenant_id')
    .eq('active', true)
    .order('name')

  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[fetchLocations] Error:', error)
    return []
  }

  return data || []
}

/**
 * Fetch camps for admin listing
 */
export async function fetchAdminCamps(options: {
  tenantId?: string
  status?: string
  page?: number
  pageSize?: number
} = {}): Promise<{ camps: AdminCamp[]; total: number }> {
  const supabase = createClient()
  const { tenantId, status, page = 1, pageSize = 20 } = options

  let query = supabase
    .from('camps')
    .select(`
      *,
      location:locations(id, name, city, state),
      tenant:tenants(id, name, slug)
    `, { count: 'exact' })

  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error, count } = await query
    .order('start_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (error) {
    console.error('[fetchAdminCamps] Error:', error)
    throw new Error(`Failed to fetch camps: ${error.message}`)
  }

  return {
    camps: (data || []) as AdminCamp[],
    total: count || 0
  }
}

/**
 * Fetch a single camp by ID for editing
 */
export async function fetchCampById(id: string): Promise<AdminCamp | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('camps')
    .select(`
      *,
      location:locations(id, name, city, state),
      tenant:tenants(id, name, slug)
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('[fetchCampById] Error:', error)
    throw new Error(`Failed to fetch camp: ${error.message}`)
  }

  return data as AdminCamp
}

/**
 * Create a new camp
 */
export async function createCamp(formData: CampFormData): Promise<AdminCamp> {
  const supabase = createClient()

  // Generate slug if not provided
  const slug = formData.slug || formData.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const campData = {
    name: formData.name,
    slug: slug,
    description: formData.description || null,
    sport: formData.sport || null,
    location_id: formData.location_id || null,
    tenant_id: formData.tenant_id,
    start_date: formData.start_date,
    end_date: formData.end_date,
    start_time: formData.start_time,
    end_time: formData.end_time,
    age_min: formData.age_min,
    age_max: formData.age_max,
    capacity: formData.capacity,
    price: Math.round(formData.price * 100), // Convert dollars to cents
    early_bird_price: formData.early_bird_price
      ? Math.round(formData.early_bird_price * 100)
      : null,
    early_bird_deadline: formData.early_bird_deadline || null,
    status: formData.status,
    featured: formData.featured,
    image_url: formData.image_url || null,
    registration_open: formData.status === 'open',
    published_at: formData.status !== 'draft' ? new Date().toISOString() : null,
  }

  const { data, error } = await supabase
    .from('camps')
    .insert(campData)
    .select(`
      *,
      location:locations(id, name, city, state),
      tenant:tenants(id, name, slug)
    `)
    .single()

  if (error) {
    console.error('[createCamp] Error:', error)
    throw new Error(`Failed to create camp: ${error.message}`)
  }

  return data as AdminCamp
}

/**
 * Update an existing camp
 */
export async function updateCamp(id: string, formData: Partial<CampFormData>): Promise<AdminCamp> {
  const supabase = createClient()

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }

  if (formData.name !== undefined) updateData.name = formData.name
  if (formData.slug !== undefined) updateData.slug = formData.slug
  if (formData.description !== undefined) updateData.description = formData.description
  if (formData.sport !== undefined) updateData.sport = formData.sport
  if (formData.location_id !== undefined) updateData.location_id = formData.location_id
  if (formData.start_date !== undefined) updateData.start_date = formData.start_date
  if (formData.end_date !== undefined) updateData.end_date = formData.end_date
  if (formData.start_time !== undefined) updateData.start_time = formData.start_time
  if (formData.end_time !== undefined) updateData.end_time = formData.end_time
  if (formData.age_min !== undefined) updateData.age_min = formData.age_min
  if (formData.age_max !== undefined) updateData.age_max = formData.age_max
  if (formData.capacity !== undefined) updateData.capacity = formData.capacity
  if (formData.featured !== undefined) updateData.featured = formData.featured
  if (formData.image_url !== undefined) updateData.image_url = formData.image_url

  if (formData.price !== undefined) {
    updateData.price = Math.round(formData.price * 100)
  }
  if (formData.early_bird_price !== undefined) {
    updateData.early_bird_price = formData.early_bird_price
      ? Math.round(formData.early_bird_price * 100)
      : null
  }
  if (formData.early_bird_deadline !== undefined) {
    updateData.early_bird_deadline = formData.early_bird_deadline
  }

  if (formData.status !== undefined) {
    updateData.status = formData.status
    updateData.registration_open = formData.status === 'open'
    if (formData.status !== 'draft') {
      updateData.published_at = new Date().toISOString()
    }
  }

  const { data, error } = await supabase
    .from('camps')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      location:locations(id, name, city, state),
      tenant:tenants(id, name, slug)
    `)
    .single()

  if (error) {
    console.error('[updateCamp] Error:', error)
    throw new Error(`Failed to update camp: ${error.message}`)
  }

  return data as AdminCamp
}

/**
 * Delete a camp
 */
export async function deleteCamp(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('camps')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[deleteCamp] Error:', error)
    throw new Error(`Failed to delete camp: ${error.message}`)
  }
}

/**
 * Duplicate a camp (for creating similar sessions)
 */
export async function duplicateCamp(id: string): Promise<AdminCamp> {
  const existing = await fetchCampById(id)
  if (!existing) throw new Error('Camp not found')

  const newCamp: CampFormData = {
    name: `${existing.name} (Copy)`,
    slug: `${existing.slug}-copy-${Date.now()}`,
    description: existing.description || '',
    sport: existing.sport || '',
    location_id: existing.location_id,
    tenant_id: existing.tenant_id,
    start_date: existing.start_date,
    end_date: existing.end_date,
    start_time: existing.start_time || '09:00',
    end_time: existing.end_time || '15:00',
    age_min: existing.age_min,
    age_max: existing.age_max,
    capacity: existing.capacity,
    price: existing.price / 100, // Convert cents back to dollars
    early_bird_price: existing.early_bird_price ? existing.early_bird_price / 100 : null,
    early_bird_deadline: existing.early_bird_deadline,
    status: 'draft',
    featured: false,
    image_url: existing.image_url,
  }

  return createCamp(newCamp)
}
