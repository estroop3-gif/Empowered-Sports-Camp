/**
 * Venues Service (Prisma)
 *
 * Handles all database operations for venue management.
 * Venues are reusable facilities that can be attached to camps.
 */

import prisma from '@/lib/db/client'

export type FacilityType =
  | 'school'
  | 'park'
  | 'sports_complex'
  | 'private_gym'
  | 'community_center'
  | 'recreation_center'
  | 'other'

export type IndoorOutdoor = 'indoor' | 'outdoor' | 'both'

export interface Venue {
  id: string
  tenant_id: string | null
  name: string
  short_name: string | null
  address_line_1: string
  address_line_2: string | null
  city: string
  state: string
  postal_code: string
  country: string
  latitude: number | null
  longitude: number | null
  region_label: string | null
  facility_type: FacilityType | null
  indoor_outdoor: IndoorOutdoor | null
  sports_supported: string[]
  max_daily_capacity: number | null
  primary_contact_name: string | null
  primary_contact_email: string | null
  primary_contact_phone: string | null
  notes: string | null
  hero_image_url: string | null
  gallery_image_urls: string[]
  is_active: boolean
  is_global: boolean
  created_at: string
  updated_at: string
  tenant_name?: string | null
  camp_count?: number
}

export interface CreateVenueInput {
  tenant_id?: string | null
  name: string
  short_name?: string
  address_line_1: string
  address_line_2?: string
  city: string
  state: string
  postal_code: string
  country?: string
  latitude?: number
  longitude?: number
  region_label?: string
  facility_type?: FacilityType
  indoor_outdoor?: IndoorOutdoor
  sports_supported?: string[]
  max_daily_capacity?: number
  primary_contact_name?: string
  primary_contact_email?: string
  primary_contact_phone?: string
  notes?: string
  hero_image_url?: string
  gallery_image_urls?: string[]
}

export interface UpdateVenueInput {
  name?: string
  short_name?: string
  address_line_1?: string
  address_line_2?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  latitude?: number | null
  longitude?: number | null
  region_label?: string
  facility_type?: FacilityType
  indoor_outdoor?: IndoorOutdoor
  sports_supported?: string[]
  max_daily_capacity?: number | null
  primary_contact_name?: string
  primary_contact_email?: string
  primary_contact_phone?: string
  notes?: string
  hero_image_url?: string
  gallery_image_urls?: string[]
  is_active?: boolean
}

export interface VenueFilters {
  tenant_id?: string | null
  include_global?: boolean
  search?: string
  city?: string
  state?: string
  region?: string
  sport?: string
  facility_type?: FacilityType
  indoor_outdoor?: IndoorOutdoor
  is_active_only?: boolean
  limit?: number
  offset?: number
}

export interface VenueStats {
  total: number
  active: number
  inactive: number
  by_facility_type: Record<string, number>
  by_indoor_outdoor: Record<string, number>
}

/**
 * Transform a Prisma venue to the API format
 */
function transformVenue(venue: {
  id: string
  tenantId: string | null
  name: string
  shortName: string | null
  addressLine1: string
  addressLine2: string | null
  city: string
  state: string
  postalCode: string
  country: string
  latitude: { toNumber: () => number } | null
  longitude: { toNumber: () => number } | null
  regionLabel: string | null
  facilityType: string | null
  indoorOutdoor: string | null
  sportsSupported: string[]
  maxDailyCapacity: number | null
  primaryContactName: string | null
  primaryContactEmail: string | null
  primaryContactPhone: string | null
  notes: string | null
  heroImageUrl: string | null
  galleryImageUrls: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  tenant?: { name: string } | null
  _count?: { camps: number }
}): Venue {
  return {
    id: venue.id,
    tenant_id: venue.tenantId,
    name: venue.name,
    short_name: venue.shortName,
    address_line_1: venue.addressLine1,
    address_line_2: venue.addressLine2,
    city: venue.city,
    state: venue.state,
    postal_code: venue.postalCode,
    country: venue.country,
    latitude: venue.latitude?.toNumber() ?? null,
    longitude: venue.longitude?.toNumber() ?? null,
    region_label: venue.regionLabel,
    facility_type: venue.facilityType as FacilityType | null,
    indoor_outdoor: venue.indoorOutdoor as IndoorOutdoor | null,
    sports_supported: venue.sportsSupported,
    max_daily_capacity: venue.maxDailyCapacity,
    primary_contact_name: venue.primaryContactName,
    primary_contact_email: venue.primaryContactEmail,
    primary_contact_phone: venue.primaryContactPhone,
    notes: venue.notes,
    hero_image_url: venue.heroImageUrl,
    gallery_image_urls: venue.galleryImageUrls,
    is_active: venue.isActive,
    is_global: venue.tenantId === null,
    created_at: venue.createdAt.toISOString(),
    updated_at: venue.updatedAt.toISOString(),
    tenant_name: venue.tenant?.name ?? null,
    camp_count: venue._count?.camps ?? 0,
  }
}

/**
 * Get all venues with optional filtering
 */
export async function listVenues(filters?: VenueFilters): Promise<{
  data: Venue[] | null
  error: Error | null
}> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {}

    // Tenant scoping
    if (filters?.tenant_id) {
      if (filters.include_global) {
        // Include both tenant-specific and global venues
        where.OR = [{ tenantId: filters.tenant_id }, { tenantId: null }]
      } else {
        where.tenantId = filters.tenant_id
      }
    } else if (filters?.include_global === false) {
      // Only non-global venues
      where.tenantId = { not: null }
    }

    // Active filter
    if (filters?.is_active_only) {
      where.isActive = true
    }

    // City filter
    if (filters?.city) {
      where.city = { equals: filters.city, mode: 'insensitive' }
    }

    // State filter
    if (filters?.state) {
      where.state = { equals: filters.state, mode: 'insensitive' }
    }

    // Region filter
    if (filters?.region) {
      where.regionLabel = { contains: filters.region, mode: 'insensitive' }
    }

    // Facility type filter
    if (filters?.facility_type) {
      where.facilityType = filters.facility_type
    }

    // Indoor/outdoor filter
    if (filters?.indoor_outdoor) {
      where.indoorOutdoor = filters.indoor_outdoor
    }

    // Sport filter
    if (filters?.sport) {
      where.sportsSupported = { has: filters.sport }
    }

    // Search filter
    if (filters?.search) {
      where.OR = [
        ...(where.OR || []),
        { name: { contains: filters.search, mode: 'insensitive' } },
        { shortName: { contains: filters.search, mode: 'insensitive' } },
        { city: { contains: filters.search, mode: 'insensitive' } },
        { regionLabel: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    const venues = await prisma.venue.findMany({
      where,
      include: {
        tenant: { select: { name: true } },
        _count: { select: { camps: true } },
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      take: filters?.limit,
      skip: filters?.offset,
    })

    return {
      data: venues.map(transformVenue),
      error: null,
    }
  } catch (err) {
    console.error('[Venues] Error listing venues:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get a single venue by ID
 */
export async function getVenueById(params: {
  id: string
  tenant_id?: string
  include_tenant_scope?: boolean
}): Promise<{
  data: Venue | null
  error: Error | null
}> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { id: params.id }

    // Optional tenant scoping
    if (params.include_tenant_scope && params.tenant_id) {
      where.OR = [{ tenantId: params.tenant_id }, { tenantId: null }]
    }

    const venue = await prisma.venue.findFirst({
      where,
      include: {
        tenant: { select: { name: true } },
        _count: { select: { camps: true } },
      },
    })

    if (!venue) {
      return { data: null, error: null }
    }

    return { data: transformVenue(venue), error: null }
  } catch (err) {
    console.error('[Venues] Error getting venue:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Create a new venue
 */
export async function createVenue(input: CreateVenueInput): Promise<{
  data: Venue | null
  error: Error | null
}> {
  try {
    const venue = await prisma.venue.create({
      data: {
        tenantId: input.tenant_id ?? null,
        name: input.name,
        shortName: input.short_name ?? null,
        addressLine1: input.address_line_1,
        addressLine2: input.address_line_2 ?? null,
        city: input.city,
        state: input.state,
        postalCode: input.postal_code,
        country: input.country,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        regionLabel: input.region_label ?? null,
        facilityType: input.facility_type ?? 'other',
        indoorOutdoor: input.indoor_outdoor ?? 'both',
        sportsSupported: input.sports_supported ?? [],
        maxDailyCapacity: input.max_daily_capacity ?? null,
        primaryContactName: input.primary_contact_name ?? null,
        primaryContactEmail: input.primary_contact_email ?? null,
        primaryContactPhone: input.primary_contact_phone ?? null,
        notes: input.notes ?? null,
        heroImageUrl: input.hero_image_url ?? null,
        galleryImageUrls: input.gallery_image_urls ?? [],
        isActive: true,
      },
      include: {
        tenant: { select: { name: true } },
        _count: { select: { camps: true } },
      },
    })

    return { data: transformVenue(venue), error: null }
  } catch (err) {
    console.error('[Venues] Error creating venue:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Update an existing venue
 */
export async function updateVenue(params: {
  id: string
  tenant_id?: string | null
  updates: UpdateVenueInput
}): Promise<{
  data: Venue | null
  error: Error | null
}> {
  try {
    // For non-HQ users, verify they own this venue before updating
    if (params.tenant_id !== undefined && params.tenant_id !== null) {
      const existing = await prisma.venue.findFirst({
        where: { id: params.id, tenantId: params.tenant_id },
      })
      if (!existing) {
        return { data: null, error: new Error('Venue not found or access denied') }
      }
    }

    // Build update object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {}

    if (params.updates.name !== undefined) data.name = params.updates.name
    if (params.updates.short_name !== undefined) data.shortName = params.updates.short_name
    if (params.updates.address_line_1 !== undefined) data.addressLine1 = params.updates.address_line_1
    if (params.updates.address_line_2 !== undefined) data.addressLine2 = params.updates.address_line_2
    if (params.updates.city !== undefined) data.city = params.updates.city
    if (params.updates.state !== undefined) data.state = params.updates.state
    if (params.updates.postal_code !== undefined) data.postalCode = params.updates.postal_code
    if (params.updates.country !== undefined) data.country = params.updates.country
    if (params.updates.latitude !== undefined) data.latitude = params.updates.latitude
    if (params.updates.longitude !== undefined) data.longitude = params.updates.longitude
    if (params.updates.region_label !== undefined) data.regionLabel = params.updates.region_label
    if (params.updates.facility_type !== undefined) data.facilityType = params.updates.facility_type
    if (params.updates.indoor_outdoor !== undefined) data.indoorOutdoor = params.updates.indoor_outdoor
    if (params.updates.sports_supported !== undefined) data.sportsSupported = params.updates.sports_supported
    if (params.updates.max_daily_capacity !== undefined) data.maxDailyCapacity = params.updates.max_daily_capacity
    if (params.updates.primary_contact_name !== undefined) data.primaryContactName = params.updates.primary_contact_name
    if (params.updates.primary_contact_email !== undefined) data.primaryContactEmail = params.updates.primary_contact_email
    if (params.updates.primary_contact_phone !== undefined) data.primaryContactPhone = params.updates.primary_contact_phone
    if (params.updates.notes !== undefined) data.notes = params.updates.notes
    if (params.updates.hero_image_url !== undefined) data.heroImageUrl = params.updates.hero_image_url
    if (params.updates.gallery_image_urls !== undefined) data.galleryImageUrls = params.updates.gallery_image_urls
    if (params.updates.is_active !== undefined) data.isActive = params.updates.is_active

    const venue = await prisma.venue.update({
      where: { id: params.id },
      data,
      include: {
        tenant: { select: { name: true } },
        _count: { select: { camps: true } },
      },
    })

    return { data: transformVenue(venue), error: null }
  } catch (err) {
    console.error('[Venues] Error updating venue:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Archive a venue (soft delete by setting is_active to false)
 */
export async function archiveVenue(params: {
  id: string
  tenant_id?: string
}): Promise<{
  success: boolean
  error: Error | null
  has_future_camps?: boolean
}> {
  try {
    // For non-HQ users, verify they own this venue before archiving
    if (params.tenant_id) {
      const existing = await prisma.venue.findFirst({
        where: { id: params.id, tenantId: params.tenant_id },
      })
      if (!existing) {
        return { success: false, error: new Error('Venue not found or access denied') }
      }
    }

    // Check if venue has future camps
    const now = new Date()
    const futureCampsCount = await prisma.camp.count({
      where: {
        venueId: params.id,
        endDate: { gte: now },
      },
    })

    if (futureCampsCount > 0) {
      return {
        success: false,
        error: new Error(`Cannot archive venue: ${futureCampsCount} upcoming camp(s) are using this venue`),
        has_future_camps: true,
      }
    }

    await prisma.venue.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    return { success: true, error: null }
  } catch (err) {
    console.error('[Venues] Error archiving venue:', err)
    return { success: false, error: err as Error }
  }
}

/**
 * Reactivate an archived venue
 */
export async function reactivateVenue(params: {
  id: string
  tenant_id?: string
}): Promise<{
  success: boolean
  error: Error | null
}> {
  try {
    // For non-HQ users, verify they own this venue before reactivating
    if (params.tenant_id) {
      const existing = await prisma.venue.findFirst({
        where: { id: params.id, tenantId: params.tenant_id },
      })
      if (!existing) {
        return { success: false, error: new Error('Venue not found or access denied') }
      }
    }

    await prisma.venue.update({
      where: { id: params.id },
      data: { isActive: true },
    })

    return { success: true, error: null }
  } catch (err) {
    console.error('[Venues] Error reactivating venue:', err)
    return { success: false, error: err as Error }
  }
}

/**
 * Permanently delete a venue
 */
export async function deleteVenue(params: {
  id: string
  tenant_id?: string
}): Promise<{
  success: boolean
  error: Error | null
  has_camps?: boolean
}> {
  try {
    // For non-HQ users, verify they own this venue before deleting
    if (params.tenant_id) {
      const existing = await prisma.venue.findFirst({
        where: { id: params.id, tenantId: params.tenant_id },
      })
      if (!existing) {
        return { success: false, error: new Error('Venue not found or access denied') }
      }
    }

    // Check if venue has any camps (past or future)
    const campsCount = await prisma.camp.count({
      where: { venueId: params.id },
    })

    if (campsCount > 0) {
      // Detach the venue from all camps first
      await prisma.camp.updateMany({
        where: { venueId: params.id },
        data: { venueId: null },
      })
    }

    // Delete the venue
    await prisma.venue.delete({
      where: { id: params.id },
    })

    return { success: true, error: null }
  } catch (err) {
    console.error('[Venues] Error deleting venue:', err)
    return { success: false, error: err as Error }
  }
}

/**
 * Attach a venue to a camp
 */
export async function attachVenueToCamp(params: {
  camp_id: string
  venue_id: string
  tenant_id?: string
}): Promise<{
  success: boolean
  error: Error | null
}> {
  try {
    // Verify the venue exists and optionally belongs to the tenant
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const venueWhere: Record<string, any> = { id: params.venue_id }
    if (params.tenant_id) {
      venueWhere.OR = [{ tenantId: params.tenant_id }, { tenantId: null }]
    }

    const venue = await prisma.venue.findFirst({ where: venueWhere })
    if (!venue) {
      return { success: false, error: new Error('Venue not found or not accessible') }
    }

    // Update the camp with the venue
    await prisma.camp.update({
      where: { id: params.camp_id },
      data: { venueId: params.venue_id },
    })

    return { success: true, error: null }
  } catch (err) {
    console.error('[Venues] Error attaching venue to camp:', err)
    return { success: false, error: err as Error }
  }
}

/**
 * Detach a venue from a camp
 */
export async function detachVenueFromCamp(params: {
  camp_id: string
}): Promise<{
  success: boolean
  error: Error | null
}> {
  try {
    await prisma.camp.update({
      where: { id: params.camp_id },
      data: { venueId: null },
    })

    return { success: true, error: null }
  } catch (err) {
    console.error('[Venues] Error detaching venue from camp:', err)
    return { success: false, error: err as Error }
  }
}

/**
 * Get venue statistics
 */
export async function getVenueStats(tenant_id?: string): Promise<{
  data: VenueStats | null
  error: Error | null
}> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {}
    if (tenant_id) {
      where.OR = [{ tenantId: tenant_id }, { tenantId: null }]
    }

    const venues = await prisma.venue.findMany({
      where,
      select: {
        isActive: true,
        facilityType: true,
        indoorOutdoor: true,
      },
    })

    const stats: VenueStats = {
      total: venues.length,
      active: venues.filter((v) => v.isActive).length,
      inactive: venues.filter((v) => !v.isActive).length,
      by_facility_type: {},
      by_indoor_outdoor: {},
    }

    // Count by facility type
    for (const venue of venues) {
      const ft = venue.facilityType || 'other'
      stats.by_facility_type[ft] = (stats.by_facility_type[ft] || 0) + 1

      const io = venue.indoorOutdoor || 'both'
      stats.by_indoor_outdoor[io] = (stats.by_indoor_outdoor[io] || 0) + 1
    }

    return { data: stats, error: null }
  } catch (err) {
    console.error('[Venues] Error getting stats:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get unique cities from venues (for filter dropdown)
 */
export async function getVenueCities(tenant_id?: string): Promise<{
  data: string[] | null
  error: Error | null
}> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { isActive: true }
    if (tenant_id) {
      where.OR = [{ tenantId: tenant_id }, { tenantId: null }]
    }

    const venues = await prisma.venue.findMany({
      where,
      select: { city: true },
      distinct: ['city'],
      orderBy: { city: 'asc' },
    })

    return {
      data: venues.map((v) => v.city).filter(Boolean),
      error: null,
    }
  } catch (err) {
    console.error('[Venues] Error getting cities:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get unique states from venues (for filter dropdown)
 */
export async function getVenueStates(tenant_id?: string): Promise<{
  data: string[] | null
  error: Error | null
}> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { isActive: true }
    if (tenant_id) {
      where.OR = [{ tenantId: tenant_id }, { tenantId: null }]
    }

    const venues = await prisma.venue.findMany({
      where,
      select: { state: true },
      distinct: ['state'],
      orderBy: { state: 'asc' },
    })

    return {
      data: venues.map((v) => v.state).filter(Boolean),
      error: null,
    }
  } catch (err) {
    console.error('[Venues] Error getting states:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get unique regions from venues (for filter dropdown)
 */
export async function getVenueRegions(tenant_id?: string): Promise<{
  data: string[] | null
  error: Error | null
}> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { isActive: true, regionLabel: { not: null } }
    if (tenant_id) {
      where.OR = [{ tenantId: tenant_id }, { tenantId: null }]
    }

    const venues = await prisma.venue.findMany({
      where,
      select: { regionLabel: true },
      distinct: ['regionLabel'],
      orderBy: { regionLabel: 'asc' },
    })

    return {
      data: venues.map((v) => v.regionLabel).filter((r): r is string => r !== null),
      error: null,
    }
  } catch (err) {
    console.error('[Venues] Error getting regions:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get all unique sports from venues (for filter dropdown)
 */
export async function getVenueSports(tenant_id?: string): Promise<{
  data: string[] | null
  error: Error | null
}> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { isActive: true }
    if (tenant_id) {
      where.OR = [{ tenantId: tenant_id }, { tenantId: null }]
    }

    const venues = await prisma.venue.findMany({
      where,
      select: { sportsSupported: true },
    })

    // Flatten and dedupe
    const allSports = new Set<string>()
    for (const venue of venues) {
      for (const sport of venue.sportsSupported) {
        allSports.add(sport)
      }
    }

    return {
      data: Array.from(allSports).sort(),
      error: null,
    }
  } catch (err) {
    console.error('[Venues] Error getting sports:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get venues for camp creation dropdown
 * If tenant_id is provided, returns tenant-specific + global venues
 * If tenant_id is omitted (HQ admin), returns all active venues
 */
export async function getVenuesForCampCreation(tenant_id?: string): Promise<{
  data: Venue[] | null
  error: Error | null
}> {
  if (tenant_id) {
    return listVenues({
      tenant_id,
      include_global: true,
      is_active_only: true,
    })
  }
  // HQ admin: return all active venues
  return listVenues({
    is_active_only: true,
  })
}
