/**
 * Admin Camps Service (Prisma)
 *
 * Handles camp management for admin dashboard.
 */

import prisma from '@/lib/db/client'

export interface CampFormData {
  name: string
  slug: string
  description: string
  sport: string
  location_id: string | null
  venue_id: string | null
  tenant_id: string | null
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
  tenant_id: string | null
  location_id: string | null
  venue_id: string | null
  created_at: string
  updated_at: string
  location?: {
    id: string
    name: string
    city: string | null
    state: string | null
  } | null
  venue?: {
    id: string
    name: string
    short_name: string | null
    city: string
    state: string
    address_line_1: string
    facility_type: string | null
    indoor_outdoor: string | null
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
  city: string | null
  state: string | null
  zip: string | null
  tenant_id: string
}

/**
 * Get current user's role and tenant info
 */
export async function getCurrentUserRole(userId: string): Promise<{
  role: string
  tenant_id: string | null
  user_id: string
} | null> {
  try {
    const roleData = await prisma.userRoleAssignment.findFirst({
      where: {
        userId,
        isActive: true,
      },
      select: { role: true, tenantId: true },
    })

    if (!roleData) return null

    return {
      role: roleData.role,
      tenant_id: roleData.tenantId,
      user_id: userId,
    }
  } catch {
    return null
  }
}

/**
 * Fetch all tenants (for hq_admin dropdown)
 */
export async function fetchTenants(): Promise<Tenant[]> {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { licenseStatus: 'active' },
      select: { id: true, name: true, slug: true, city: true, state: true },
      orderBy: { name: 'asc' },
    })

    return tenants
  } catch (err) {
    console.error('[fetchTenants] Error:', err)
    return []
  }
}

/**
 * Fetch locations for a tenant
 */
export async function fetchLocations(tenantId?: string): Promise<Location[]> {
  try {
    const where: Record<string, unknown> = { active: true }
    if (tenantId) {
      where.tenantId = tenantId
    }

    const locations = await prisma.location.findMany({
      where,
      select: { id: true, name: true, address: true, city: true, state: true, zip: true, tenantId: true },
      orderBy: { name: 'asc' },
    })

    return locations.map(l => ({
      id: l.id,
      name: l.name,
      address: l.address,
      city: l.city,
      state: l.state,
      zip: l.zip,
      tenant_id: l.tenantId,
    }))
  } catch (err) {
    console.error('[fetchLocations] Error:', err)
    return []
  }
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
  const { tenantId, status, page = 1, pageSize = 20 } = options

  try {
    const where: Record<string, unknown> = {}
    if (tenantId) {
      where.tenantId = tenantId
    }
    if (status) {
      where.status = status
    }

    const [camps, total] = await Promise.all([
      prisma.camp.findMany({
        where,
        include: {
          location: { select: { id: true, name: true, city: true, state: true } },
          venue: { select: { id: true, name: true, shortName: true, city: true, state: true, addressLine1: true, facilityType: true, indoorOutdoor: true } },
          tenant: { select: { id: true, name: true, slug: true } },
          _count: {
            select: {
              registrations: {
                where: {
                  status: { in: ['confirmed', 'pending'] },
                },
              },
            },
          },
        },
        orderBy: { startDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.camp.count({ where }),
    ])

    return {
      camps: camps.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        sport: c.sportsOffered?.[0] || c.programType || 'Multi-Sport',
        start_date: c.startDate.toISOString().split('T')[0],
        end_date: c.endDate.toISOString().split('T')[0],
        start_time: c.startTime ? c.startTime.toISOString().slice(11, 16) : null,
        end_time: c.endTime ? c.endTime.toISOString().slice(11, 16) : null,
        age_min: c.minAge ?? 5,
        age_max: c.maxAge ?? 14,
        capacity: c.capacity ?? 60,
        price: c.priceCents,
        early_bird_price: c.earlyBirdPriceCents,
        early_bird_deadline: c.earlyBirdDeadline?.toISOString().split('T')[0] || null,
        status: c.status,
        featured: c.featured,
        image_url: c.imageUrl,
        tenant_id: c.tenantId,
        location_id: c.locationId,
        venue_id: c.venueId,
        created_at: c.createdAt.toISOString(),
        updated_at: c.updatedAt.toISOString(),
        location: c.location ? {
          id: c.location.id,
          name: c.location.name,
          city: c.location.city,
          state: c.location.state,
        } : null,
        venue: c.venue ? {
          id: c.venue.id,
          name: c.venue.name,
          short_name: c.venue.shortName,
          city: c.venue.city,
          state: c.venue.state,
          address_line_1: c.venue.addressLine1,
          facility_type: c.venue.facilityType,
          indoor_outdoor: c.venue.indoorOutdoor,
        } : null,
        tenant: c.tenant ? {
          id: c.tenant.id,
          name: c.tenant.name,
          slug: c.tenant.slug,
        } : null,
        registration_count: c._count?.registrations || 0,
      })),
      total,
    }
  } catch (err) {
    console.error('[fetchAdminCamps] Error:', err)
    throw new Error(`Failed to fetch camps: ${(err as Error).message}`)
  }
}

/**
 * Fetch a single camp by ID for editing
 */
export async function fetchCampById(id: string): Promise<AdminCamp | null> {
  try {
    const camp = await prisma.camp.findUnique({
      where: { id },
      include: {
        location: { select: { id: true, name: true, city: true, state: true } },
        venue: { select: { id: true, name: true, shortName: true, city: true, state: true, addressLine1: true, facilityType: true, indoorOutdoor: true } },
        tenant: { select: { id: true, name: true, slug: true } },
      },
    })

    if (!camp) return null

    return {
      id: camp.id,
      name: camp.name,
      slug: camp.slug,
      description: camp.description,
      sport: camp.sportsOffered?.[0] || camp.programType || 'Multi-Sport',
      start_date: camp.startDate.toISOString().split('T')[0],
      end_date: camp.endDate.toISOString().split('T')[0],
      start_time: camp.startTime ? camp.startTime.toISOString().slice(11, 16) : null,
      end_time: camp.endTime ? camp.endTime.toISOString().slice(11, 16) : null,
      age_min: camp.minAge ?? 5,
      age_max: camp.maxAge ?? 14,
      capacity: camp.capacity ?? 60,
      price: camp.priceCents,
      early_bird_price: camp.earlyBirdPriceCents,
      early_bird_deadline: camp.earlyBirdDeadline?.toISOString().split('T')[0] || null,
      status: camp.status,
      featured: camp.featured,
      image_url: camp.imageUrl,
      tenant_id: camp.tenantId,
      location_id: camp.locationId,
      venue_id: camp.venueId,
      created_at: camp.createdAt.toISOString(),
      updated_at: camp.updatedAt.toISOString(),
      location: camp.location ? {
        id: camp.location.id,
        name: camp.location.name,
        city: camp.location.city,
        state: camp.location.state,
      } : null,
      venue: camp.venue ? {
        id: camp.venue.id,
        name: camp.venue.name,
        short_name: camp.venue.shortName,
        city: camp.venue.city,
        state: camp.venue.state,
        address_line_1: camp.venue.addressLine1,
        facility_type: camp.venue.facilityType,
        indoor_outdoor: camp.venue.indoorOutdoor,
      } : null,
      tenant: camp.tenant ? {
        id: camp.tenant.id,
        name: camp.tenant.name,
        slug: camp.tenant.slug,
      } : null,
    }
  } catch (err) {
    console.error('[fetchCampById] Error:', err)
    throw new Error(`Failed to fetch camp: ${(err as Error).message}`)
  }
}

// Map page status values to DB status enum
function mapStatusToDb(status: string): 'draft' | 'published' | 'registration_open' | 'registration_closed' {
  switch (status) {
    case 'open': return 'registration_open'
    case 'closed': return 'registration_closed'
    case 'draft': return 'draft'
    case 'published': return 'published'
    default: return 'draft'
  }
}

// Map DB status to page status
function mapStatusFromDb(status: string): string {
  switch (status) {
    case 'registration_open': return 'open'
    case 'registration_closed': return 'closed'
    default: return status
  }
}

/**
 * Create a new camp
 */
export async function createCamp(formData: CampFormData): Promise<AdminCamp> {
  const slug = formData.slug || formData.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  try {
    // Handle empty string tenant_id as null
    const tenantId = formData.tenant_id && formData.tenant_id.trim() !== ''
      ? formData.tenant_id
      : null

    const camp = await prisma.camp.create({
      data: {
        name: formData.name,
        slug,
        description: formData.description || null,
        sportsOffered: formData.sport ? [formData.sport] : [],
        programType: 'all_girls_sports_camp',
        locationId: formData.location_id || null,
        venueId: formData.venue_id || null,
        tenantId,
        startDate: new Date(formData.start_date),
        endDate: new Date(formData.end_date),
        startTime: formData.start_time ? new Date(`1970-01-01T${formData.start_time}:00Z`) : null,
        endTime: formData.end_time ? new Date(`1970-01-01T${formData.end_time}:00Z`) : null,
        minAge: formData.age_min,
        maxAge: formData.age_max,
        capacity: formData.capacity,
        priceCents: Math.round(formData.price * 100),
        earlyBirdPriceCents: formData.early_bird_price
          ? Math.round(formData.early_bird_price * 100)
          : null,
        earlyBirdDeadline: formData.early_bird_deadline
          ? new Date(formData.early_bird_deadline)
          : null,
        status: mapStatusToDb(formData.status),
        featured: formData.featured,
        imageUrl: formData.image_url || null,
      },
      include: {
        location: { select: { id: true, name: true, city: true, state: true } },
        venue: { select: { id: true, name: true, shortName: true, city: true, state: true, addressLine1: true, facilityType: true, indoorOutdoor: true } },
        tenant: tenantId ? { select: { id: true, name: true, slug: true } } : false,
      },
    })

    return {
      id: camp.id,
      name: camp.name,
      slug: camp.slug,
      description: camp.description,
      sport: camp.sportsOffered?.[0] || camp.programType || 'Multi-Sport',
      start_date: camp.startDate.toISOString().split('T')[0],
      end_date: camp.endDate.toISOString().split('T')[0],
      start_time: camp.startTime ? camp.startTime.toISOString().slice(11, 16) : null,
      end_time: camp.endTime ? camp.endTime.toISOString().slice(11, 16) : null,
      age_min: camp.minAge ?? 5,
      age_max: camp.maxAge ?? 14,
      capacity: camp.capacity ?? 60,
      price: camp.priceCents,
      early_bird_price: camp.earlyBirdPriceCents,
      early_bird_deadline: camp.earlyBirdDeadline?.toISOString().split('T')[0] || null,
      status: camp.status,
      featured: camp.featured,
      image_url: camp.imageUrl,
      tenant_id: camp.tenantId,
      location_id: camp.locationId,
      venue_id: camp.venueId,
      created_at: camp.createdAt.toISOString(),
      updated_at: camp.updatedAt.toISOString(),
      location: camp.location ? {
        id: camp.location.id,
        name: camp.location.name,
        city: camp.location.city,
        state: camp.location.state,
      } : null,
      venue: camp.venue ? {
        id: camp.venue.id,
        name: camp.venue.name,
        short_name: camp.venue.shortName,
        city: camp.venue.city,
        state: camp.venue.state,
        address_line_1: camp.venue.addressLine1,
        facility_type: camp.venue.facilityType,
        indoor_outdoor: camp.venue.indoorOutdoor,
      } : null,
      tenant: camp.tenant ? {
        id: camp.tenant.id,
        name: camp.tenant.name,
        slug: camp.tenant.slug,
      } : null,
    }
  } catch (err) {
    console.error('[createCamp] Error:', err)
    throw new Error(`Failed to create camp: ${(err as Error).message}`)
  }
}

/**
 * Update an existing camp
 */
export async function updateCamp(id: string, formData: Partial<CampFormData>): Promise<AdminCamp> {
  try {
    const updateData: Record<string, unknown> = {}

    if (formData.name !== undefined) updateData.name = formData.name
    if (formData.slug !== undefined) updateData.slug = formData.slug
    if (formData.description !== undefined) updateData.description = formData.description || null
    if (formData.sport !== undefined) updateData.sportsOffered = formData.sport ? [formData.sport] : []
    if (formData.location_id !== undefined) {
      updateData.location = formData.location_id
        ? { connect: { id: formData.location_id } }
        : { disconnect: true }
    }
    if (formData.venue_id !== undefined) {
      updateData.venue = formData.venue_id
        ? { connect: { id: formData.venue_id } }
        : { disconnect: true }
    }
    if (formData.start_date !== undefined) updateData.startDate = new Date(formData.start_date)
    if (formData.end_date !== undefined) updateData.endDate = new Date(formData.end_date)
    if (formData.start_time !== undefined) {
      updateData.startTime = formData.start_time ? new Date(`1970-01-01T${formData.start_time}:00Z`) : null
    }
    if (formData.end_time !== undefined) {
      updateData.endTime = formData.end_time ? new Date(`1970-01-01T${formData.end_time}:00Z`) : null
    }
    if (formData.age_min !== undefined) updateData.minAge = formData.age_min
    if (formData.age_max !== undefined) updateData.maxAge = formData.age_max
    if (formData.capacity !== undefined) updateData.capacity = formData.capacity
    if (formData.featured !== undefined) updateData.featured = formData.featured
    if (formData.image_url !== undefined) updateData.imageUrl = formData.image_url || null

    if (formData.price !== undefined) {
      updateData.priceCents = Math.round(formData.price * 100)
    }
    if (formData.early_bird_price !== undefined) {
      updateData.earlyBirdPriceCents = formData.early_bird_price
        ? Math.round(formData.early_bird_price * 100)
        : null
    }
    if (formData.early_bird_deadline !== undefined) {
      updateData.earlyBirdDeadline = formData.early_bird_deadline
        ? new Date(formData.early_bird_deadline)
        : null
    }

    if (formData.status !== undefined) {
      updateData.status = mapStatusToDb(formData.status)
      updateData.registrationOpen = formData.status === 'open' ? new Date() : null
    }

    const camp = await prisma.camp.update({
      where: { id },
      data: updateData,
      include: {
        location: { select: { id: true, name: true, city: true, state: true } },
        venue: { select: { id: true, name: true, shortName: true, city: true, state: true, addressLine1: true, facilityType: true, indoorOutdoor: true } },
        tenant: { select: { id: true, name: true, slug: true } },
      },
    })

    return {
      id: camp.id,
      name: camp.name,
      slug: camp.slug,
      description: camp.description,
      sport: camp.sportsOffered?.[0] || camp.programType || 'Multi-Sport',
      start_date: camp.startDate.toISOString().split('T')[0],
      end_date: camp.endDate.toISOString().split('T')[0],
      start_time: camp.startTime ? camp.startTime.toISOString().slice(11, 16) : null,
      end_time: camp.endTime ? camp.endTime.toISOString().slice(11, 16) : null,
      age_min: camp.minAge ?? 5,
      age_max: camp.maxAge ?? 14,
      capacity: camp.capacity ?? 60,
      price: camp.priceCents,
      early_bird_price: camp.earlyBirdPriceCents,
      early_bird_deadline: camp.earlyBirdDeadline?.toISOString().split('T')[0] || null,
      status: camp.status,
      featured: camp.featured,
      image_url: camp.imageUrl,
      tenant_id: camp.tenantId,
      location_id: camp.locationId,
      venue_id: camp.venueId,
      created_at: camp.createdAt.toISOString(),
      updated_at: camp.updatedAt.toISOString(),
      location: camp.location ? {
        id: camp.location.id,
        name: camp.location.name,
        city: camp.location.city,
        state: camp.location.state,
      } : null,
      venue: camp.venue ? {
        id: camp.venue.id,
        name: camp.venue.name,
        short_name: camp.venue.shortName,
        city: camp.venue.city,
        state: camp.venue.state,
        address_line_1: camp.venue.addressLine1,
        facility_type: camp.venue.facilityType,
        indoor_outdoor: camp.venue.indoorOutdoor,
      } : null,
      tenant: camp.tenant ? {
        id: camp.tenant.id,
        name: camp.tenant.name,
        slug: camp.tenant.slug,
      } : null,
    }
  } catch (err) {
    console.error('[updateCamp] Error:', err)
    throw new Error(`Failed to update camp: ${(err as Error).message}`)
  }
}

/**
 * Delete a camp
 */
export async function deleteCamp(id: string): Promise<void> {
  try {
    await prisma.camp.delete({ where: { id } })
  } catch (err) {
    console.error('[deleteCamp] Error:', err)
    throw new Error(`Failed to delete camp: ${(err as Error).message}`)
  }
}

/**
 * Duplicate a camp
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
    venue_id: existing.venue_id,
    tenant_id: existing.tenant_id,
    start_date: existing.start_date,
    end_date: existing.end_date,
    start_time: existing.start_time || '09:00',
    end_time: existing.end_time || '15:00',
    age_min: existing.age_min,
    age_max: existing.age_max,
    capacity: existing.capacity,
    price: existing.price / 100,
    early_bird_price: existing.early_bird_price ? existing.early_bird_price / 100 : null,
    early_bird_deadline: existing.early_bird_deadline,
    status: 'draft',
    featured: false,
    image_url: existing.image_url,
  }

  return createCamp(newCamp)
}
