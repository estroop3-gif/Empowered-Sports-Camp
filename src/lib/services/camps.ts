/**
 * Camp Services
 *
 * Prisma-based queries for the Find Camps feature.
 */

import prisma from '@/lib/db/client'
import { Prisma } from '@/generated/prisma'
import { lookupZipCode, haversineDistanceMiles } from '@/lib/geo'
import { getProgramTagMap } from '@/lib/services/program-tags'
import { fetchActiveProgramTags } from '@/lib/services/program-tags'
import type { VenueGroupData, CampProgramData, NearZipSearchResult, CampListingItem, CampBadge, ProgramTypeSection, ProgramTypeGroupedResult } from '@/types'

// ============================================================================
// TYPES
// ============================================================================

export interface PublicCampCard {
  id: string
  slug: string
  name: string
  description: string | null
  program_type: string
  program_type_name: string
  start_date: string
  end_date: string
  daily_start_time: string | null
  daily_end_time: string | null
  min_age: number
  max_age: number
  min_grade: number | null
  max_grade: number | null
  max_capacity: number
  price: number // in cents
  early_bird_price: number | null
  early_bird_deadline: string | null
  image_url: string | null
  highlights: string[]
  sports_offered: string[]
  featured: boolean
  status: string
  tenant_id: string | null
  // Location fields (legacy, populated from location or venue)
  location_id: string | null
  location_name: string | null
  location_address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  indoor: boolean | null
  // Venue fields
  venue_id: string | null
  venue_name: string | null
  venue_short_name: string | null
  facility_type: string | null
  indoor_outdoor: string | null
  // Tenant fields
  tenant_name: string | null
  tenant_slug: string | null
  // Flag / overnight fields
  flag: string | null
  is_overnight: boolean
  dropoff_time: string | null
  pickup_time: string | null
  // Computed fields
  spots_remaining: number
  current_price: number // in cents
  is_full: boolean
}

export interface CampFilters {
  city?: string
  state?: string
  zip_code?: string
  min_age?: number
  max_age?: number
  min_grade?: number
  max_grade?: number
  program_type?: string
  start_date_from?: string
  start_date_to?: string
  featured_only?: boolean
  has_spots?: boolean
  tenant_id?: string
  search?: string
}

export interface CampSearchResult {
  camps: PublicCampCard[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Transform Prisma camp data to PublicCampCard format
 * Supports both legacy location and new venue fields
 */
function transformCampToCard(camp: Prisma.CampGetPayload<{
  include: { location: true; venue: true; tenant: true; registrations: { select: { id: true } } }
}>, tagMap?: Map<string, string>): PublicCampCard {
  const registrationCount = camp.registrations?.length || 0
  const maxCapacity = camp.capacity || 60
  const spotsRemaining = Math.max(0, maxCapacity - registrationCount)
  const now = new Date()
  const isEarlyBird = camp.earlyBirdDeadline && new Date(camp.earlyBirdDeadline) > now
  const currentPrice = isEarlyBird && camp.earlyBirdPriceCents ? camp.earlyBirdPriceCents : camp.priceCents

  // Use venue data if available, fallback to location data
  const hasVenue = !!camp.venue
  const hasLocation = !!camp.location

  // Get location-style fields from venue or location
  const locationName = hasVenue ? camp.venue!.name : (hasLocation ? camp.location!.name : null)
  const locationAddress = hasVenue ? camp.venue!.addressLine1 : (hasLocation ? camp.location!.address : null)
  const city = hasVenue ? camp.venue!.city : (hasLocation ? camp.location!.city : null)
  const state = hasVenue ? camp.venue!.state : (hasLocation ? camp.location!.state : null)
  const zipCode = hasVenue ? camp.venue!.postalCode : (hasLocation ? camp.location!.zip : null)
  const country = hasVenue ? camp.venue!.country : 'US'
  const latitude = hasVenue && camp.venue!.latitude ? Number(camp.venue!.latitude) : (hasLocation && camp.location!.latitude ? Number(camp.location!.latitude) : null)
  const longitude = hasVenue && camp.venue!.longitude ? Number(camp.venue!.longitude) : (hasLocation && camp.location!.longitude ? Number(camp.location!.longitude) : null)

  // Indoor/outdoor logic
  let indoor: boolean | null = null
  if (hasVenue) {
    indoor = camp.venue!.indoorOutdoor === 'indoor' ? true : camp.venue!.indoorOutdoor === 'outdoor' ? false : null
  } else if (hasLocation) {
    indoor = camp.location!.indoorOutdoor === 'indoor' ? true : camp.location!.indoorOutdoor === 'outdoor' ? false : null
  }

  return {
    id: camp.id,
    slug: camp.slug,
    name: camp.name,
    description: camp.description,
    program_type: camp.programType,
    program_type_name: tagMap?.get(camp.programType) || camp.programType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    start_date: camp.startDate.toISOString(),
    end_date: camp.endDate.toISOString(),
    daily_start_time: camp.startTime?.toISOString().slice(11, 16) || null,
    daily_end_time: camp.endTime?.toISOString().slice(11, 16) || null,
    min_age: camp.minAge || 5,
    max_age: camp.maxAge || 14,
    min_grade: camp.minGrade,
    max_grade: camp.maxGrade,
    max_capacity: maxCapacity,
    price: camp.priceCents,
    early_bird_price: camp.earlyBirdPriceCents,
    early_bird_deadline: camp.earlyBirdDeadline?.toISOString() || null,
    image_url: camp.imageUrl,
    highlights: camp.highlights || [],
    sports_offered: camp.sportsOffered || [],
    featured: camp.featured,
    status: camp.status,
    tenant_id: camp.tenantId,
    // Location fields (populated from venue or location)
    location_id: camp.locationId,
    location_name: locationName,
    location_address: locationAddress,
    city: city,
    state: state,
    zip_code: zipCode,
    country: country,
    latitude: latitude,
    longitude: longitude,
    indoor: indoor,
    // Venue fields
    venue_id: camp.venueId,
    venue_name: camp.venue?.name || null,
    venue_short_name: camp.venue?.shortName || null,
    facility_type: camp.venue?.facilityType || null,
    indoor_outdoor: camp.venue?.indoorOutdoor || null,
    // Tenant fields
    tenant_name: camp.tenant?.name || null,
    tenant_slug: camp.tenant?.slug || null,
    // Flag / overnight fields
    flag: camp.flag || null,
    is_overnight: camp.isOvernight,
    dropoff_time: camp.dropoffTime?.toISOString().slice(11, 16) || null,
    pickup_time: camp.pickupTime?.toISOString().slice(11, 16) || null,
    // Computed fields
    spots_remaining: spotsRemaining,
    current_price: currentPrice,
    is_full: spotsRemaining <= 0,
  }
}

/**
 * Fetch all published camps with optional filters
 * Automatically excludes:
 * - Camps where end_date has passed
 * - Camps where registration_close date has passed (if set)
 * - Camps that have been concluded (concludedAt is set)
 */
export async function fetchPublicCamps(
  filters: CampFilters = {},
  options: { page?: number; pageSize?: number; orderBy?: string; ascending?: boolean } = {}
): Promise<CampSearchResult> {
  const { page = 1, pageSize = 12, orderBy = 'startDate', ascending = true } = options
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Build the where clause
  const where: Prisma.CampWhereInput = {
    status: { in: ['published', 'registration_open'] },
    // Exclude camps that have started (registration closes when camp begins)
    startDate: { gt: today },
    // Exclude camps that have been concluded
    concludedAt: null,
    // Exclude camps where registration has closed (if registrationClose is set and in the past)
    // Uses AND to combine with other filters
    AND: [
      {
        OR: [
          { registrationClose: null },
          { registrationClose: { gte: today } },
        ],
      },
    ],
  }

  // Location/venue filters (support both legacy location and venue)
  if (filters.city || filters.state || filters.zip_code) {
    const locationFilter: Prisma.LocationWhereInput = {}
    const venueFilter: Prisma.VenueWhereInput = {}

    if (filters.city) {
      locationFilter.city = { contains: filters.city, mode: 'insensitive' }
      venueFilter.city = { contains: filters.city, mode: 'insensitive' }
    }
    if (filters.state) {
      locationFilter.state = { equals: filters.state, mode: 'insensitive' }
      venueFilter.state = { equals: filters.state, mode: 'insensitive' }
    }
    if (filters.zip_code) {
      locationFilter.zip = filters.zip_code
      venueFilter.postalCode = filters.zip_code
    }

    // Add location/venue filter as an AND condition
    ;(where.AND as Prisma.CampWhereInput[]).push({
      OR: [
        { location: locationFilter },
        { venue: venueFilter },
      ],
    })
  }

  // Age filters
  if (filters.min_age !== undefined) {
    where.maxAge = { gte: filters.min_age }
  }
  if (filters.max_age !== undefined) {
    where.minAge = { lte: filters.max_age }
  }

  // Grade filters
  if (filters.min_grade !== undefined) {
    where.maxGrade = { gte: filters.min_grade }
  }
  if (filters.max_grade !== undefined) {
    where.minGrade = { lte: filters.max_grade }
  }

  // Program type
  if (filters.program_type) {
    where.programType = filters.program_type
  }

  // Date filters
  if (filters.start_date_from) {
    where.startDate = { ...(where.startDate as object || {}), gte: new Date(filters.start_date_from) }
  }
  if (filters.start_date_to) {
    where.startDate = { ...(where.startDate as object || {}), lte: new Date(filters.start_date_to) }
  }

  // Featured only
  if (filters.featured_only) {
    where.featured = true
  }

  // Tenant filter
  if (filters.tenant_id) {
    where.tenantId = filters.tenant_id
  }

  // Search filter
  if (filters.search) {
    const searchTerms = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { location: { city: { contains: filters.search, mode: 'insensitive' } } },
      { venue: { city: { contains: filters.search, mode: 'insensitive' } } },
      { venue: { name: { contains: filters.search, mode: 'insensitive' } } },
    ] as Prisma.CampWhereInput[]

    // Add search filter as an AND condition with OR for each search term
    ;(where.AND as Prisma.CampWhereInput[]).push({ OR: searchTerms })
  }

  // Get total count
  const total = await prisma.camp.count({ where })

  // Fetch camps with relations
  const camps = await prisma.camp.findMany({
    where,
    include: {
      location: true,
      venue: true,
      tenant: true,
      registrations: { select: { id: true } },
    },
    orderBy: [
      { featured: 'desc' },
      { [orderBy]: ascending ? 'asc' : 'desc' },
    ],
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  // Load tag map for display names
  const tagMap = await getProgramTagMap()

  // Transform to PublicCampCard format
  let transformedCamps = camps.map(c => transformCampToCard(c, tagMap))

  // Filter by has spots (post-query filter since it's computed)
  if (filters.has_spots) {
    transformedCamps = transformedCamps.filter(c => !c.is_full)
  }

  return {
    camps: transformedCamps,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  }
}

/**
 * Fetch a single camp by slug
 */
export async function fetchCampBySlug(slug: string): Promise<PublicCampCard | null> {
  const camp = await prisma.camp.findFirst({
    where: {
      slug,
      status: { in: ['published', 'registration_open'] },
    },
    include: {
      location: true,
      venue: true,
      tenant: true,
      registrations: { select: { id: true } },
    },
    orderBy: [
      { tenantId: 'asc' },   // nulls last — camps with a real tenant come first
      { createdAt: 'desc' }, // newest first as tiebreaker
    ],
  })

  if (!camp) return null
  const tagMap = await getProgramTagMap()
  return transformCampToCard(camp, tagMap)
}

/**
 * Fetch a single camp by ID
 */
export async function fetchCampById(id: string): Promise<PublicCampCard | null> {
  const camp = await prisma.camp.findUnique({
    where: { id },
    include: {
      location: true,
      venue: true,
      tenant: true,
      registrations: { select: { id: true } },
    },
  })

  if (!camp) return null
  const tagMap = await getProgramTagMap()
  return transformCampToCard(camp, tagMap)
}

/**
 * Fetch featured camps for homepage or promotions
 * Excludes started, concluded, and registration-closed camps
 */
export async function fetchFeaturedCamps(limit: number = 3): Promise<PublicCampCard[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const camps = await prisma.camp.findMany({
    where: {
      featured: true,
      status: { in: ['published', 'registration_open'] },
      // Registration closes when camp starts
      startDate: { gt: today },
      concludedAt: null,
      OR: [
        { registrationClose: null },
        { registrationClose: { gte: today } },
      ],
    },
    include: {
      location: true,
      venue: true,
      tenant: true,
      registrations: { select: { id: true } },
    },
    orderBy: { startDate: 'asc' },
    take: limit,
  })

  const tagMap = await getProgramTagMap()
  const transformedCamps = camps.map(c => transformCampToCard(c, tagMap))
  return transformedCamps.filter(c => !c.is_full)
}

/**
 * Fetch camps by location (city/state/zip)
 * Searches both legacy location and venue data
 * Excludes started, concluded, and registration-closed camps
 */
export async function fetchCampsByLocation(
  location: { city?: string; state?: string; zipCode?: string },
  limit: number = 20
): Promise<PublicCampCard[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const where: Prisma.CampWhereInput = {
    status: { in: ['published', 'registration_open'] },
    // Registration closes when camp starts
    startDate: { gt: today },
    concludedAt: null,
    // Registration close filter: allow if not set or if not yet closed
    AND: [
      {
        OR: [
          { registrationClose: null },
          { registrationClose: { gte: today } },
        ],
      },
    ],
  }

  if (location.city || location.state || location.zipCode) {
    const locationFilter: Prisma.LocationWhereInput = {}
    const venueFilter: Prisma.VenueWhereInput = {}

    if (location.city) {
      locationFilter.city = { contains: location.city, mode: 'insensitive' }
      venueFilter.city = { contains: location.city, mode: 'insensitive' }
    }
    if (location.state) {
      locationFilter.state = { equals: location.state, mode: 'insensitive' }
      venueFilter.state = { equals: location.state, mode: 'insensitive' }
    }
    if (location.zipCode) {
      locationFilter.zip = location.zipCode
      venueFilter.postalCode = location.zipCode
    }

    // Add location/venue filter as an AND condition
    ;(where.AND as Prisma.CampWhereInput[]).push({
      OR: [
        { location: locationFilter },
        { venue: venueFilter },
      ],
    })
  }

  const camps = await prisma.camp.findMany({
    where,
    include: {
      location: true,
      venue: true,
      tenant: true,
      registrations: { select: { id: true } },
    },
    orderBy: { startDate: 'asc' },
    take: limit,
  })

  const tagMap = await getProgramTagMap()
  const transformedCamps = camps.map(c => transformCampToCard(c, tagMap))
  return transformedCamps.filter(c => !c.is_full)
}

/**
 * Helper to get active camp filter criteria
 * Used for filtering cities, states, and program types
 * Excludes camps that:
 * - Have already started (registration closes when camp begins)
 * - Have ended
 * - Have been concluded
 * - Have passed registration close date
 */
function getActiveCampFilter(): Prisma.CampWhereInput {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return {
    status: { in: ['published', 'registration_open'] },
    // Camp hasn't started yet (registration closes when camp starts)
    startDate: { gt: today },
    concludedAt: null,
    OR: [
      { registrationClose: null },
      { registrationClose: { gte: today } },
    ],
  }
}

/**
 * Get unique cities with camps for location filter dropdown
 * Includes cities from both locations and venues
 * Only includes cities with active camps (not past/concluded)
 */
export async function fetchCampCities(): Promise<string[]> {
  const activeCampFilter = getActiveCampFilter()

  // Get cities from locations
  const locations = await prisma.location.findMany({
    where: {
      camps: {
        some: activeCampFilter,
      },
    },
    select: { city: true },
    distinct: ['city'],
    orderBy: { city: 'asc' },
  })

  // Get cities from venues
  const venues = await prisma.venue.findMany({
    where: {
      camps: {
        some: activeCampFilter,
      },
    },
    select: { city: true },
    distinct: ['city'],
    orderBy: { city: 'asc' },
  })

  // Combine and dedupe cities
  const citySet = new Set<string>()
  locations.forEach(l => { if (l.city) citySet.add(l.city) })
  venues.forEach(v => { if (v.city) citySet.add(v.city) })

  return Array.from(citySet).sort()
}

/**
 * Get unique states with camps for location filter dropdown
 * Includes states from both locations and venues
 * Only includes states with active camps (not past/concluded)
 */
export async function fetchCampStates(): Promise<string[]> {
  const activeCampFilter = getActiveCampFilter()

  // Get states from locations
  const locations = await prisma.location.findMany({
    where: {
      camps: {
        some: activeCampFilter,
      },
    },
    select: { state: true },
    distinct: ['state'],
    orderBy: { state: 'asc' },
  })

  // Get states from venues
  const venues = await prisma.venue.findMany({
    where: {
      camps: {
        some: activeCampFilter,
      },
    },
    select: { state: true },
    distinct: ['state'],
    orderBy: { state: 'asc' },
  })

  // Combine and dedupe states
  const stateSet = new Set<string>()
  locations.forEach(l => { if (l.state) stateSet.add(l.state) })
  venues.forEach(v => { if (v.state) stateSet.add(v.state) })

  return Array.from(stateSet).sort()
}

/**
 * Get available program types from active camps
 * Only includes program types with active camps (not past/concluded)
 * Returns {slug, name}[] with display names from ProgramTag table
 */
export async function fetchProgramTypes(): Promise<{ slug: string; name: string }[]> {
  const activeCampFilter = getActiveCampFilter()

  const camps = await prisma.camp.findMany({
    where: activeCampFilter,
    select: { programType: true },
    distinct: ['programType'],
    orderBy: { programType: 'asc' },
  })

  const tagMap = await getProgramTagMap()
  return camps.map(c => ({
    slug: c.programType,
    name: tagMap.get(c.programType) || c.programType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
  }))
}

// ============================================================================
// ZIP CODE SEARCH (VENUE-GROUPED)
// ============================================================================

interface NearZipFilters {
  programType?: string
  minAge?: number
  maxAge?: number
  search?: string
}

interface NearZipOptions {
  sortBy?: 'distance' | 'startDate'
  maxDistanceMiles?: number
}

/**
 * Fetch camps near a zip code, grouped by venue, with distance sorting.
 * Returns venue groups with nested program listings.
 */
export async function fetchCampsNearZip(
  zipCode: string,
  filters: NearZipFilters = {},
  options: NearZipOptions = {}
): Promise<NearZipSearchResult> {
  const { sortBy = 'distance', maxDistanceMiles = 200 } = options

  // 1. Look up zip coordinates
  const zipInfo = await lookupZipCode(zipCode)
  if (!zipInfo) {
    throw new Error('Invalid zip code')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 2. Build where clause (same active-camp filters as fetchPublicCamps)
  const where: Prisma.CampWhereInput = {
    status: { in: ['published', 'registration_open'] },
    startDate: { gt: today },
    concludedAt: null,
    AND: [
      {
        OR: [
          { registrationClose: null },
          { registrationClose: { gte: today } },
        ],
      },
    ],
  }

  if (filters.programType) {
    where.programType = filters.programType
  }
  if (filters.minAge !== undefined) {
    where.maxAge = { gte: filters.minAge }
  }
  if (filters.maxAge !== undefined) {
    where.minAge = { lte: filters.maxAge }
  }
  if (filters.search) {
    ;(where.AND as Prisma.CampWhereInput[]).push({
      OR: [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { venue: { name: { contains: filters.search, mode: 'insensitive' } } },
        { venue: { city: { contains: filters.search, mode: 'insensitive' } } },
      ],
    })
  }

  // 3. Fetch all active camps with venue, tenant, territory join
  const camps = await prisma.camp.findMany({
    where,
    include: {
      location: true,
      venue: true,
      tenant: {
        include: {
          territoryAssignments: {
            include: {
              territory: { select: { name: true } },
            },
            take: 1,
          },
        },
      },
      registrations: { select: { id: true } },
    },
    orderBy: { startDate: 'asc' },
  })

  // 4. Load tag map for display names, then calculate distance and build venue groups
  const tagMap = await getProgramTagMap()
  const venueMap = new Map<string, VenueGroupData>()

  for (const camp of camps) {
    // Get coordinates from venue or location
    const hasVenue = !!camp.venue
    const hasLocation = !!camp.location
    const lat = hasVenue && camp.venue!.latitude
      ? Number(camp.venue!.latitude)
      : (hasLocation && camp.location!.latitude ? Number(camp.location!.latitude) : null)
    const lng = hasVenue && camp.venue!.longitude
      ? Number(camp.venue!.longitude)
      : (hasLocation && camp.location!.longitude ? Number(camp.location!.longitude) : null)

    // Calculate distance
    let distanceMiles: number | null = null
    if (lat !== null && lng !== null) {
      distanceMiles = Math.round(haversineDistanceMiles(zipInfo.latitude, zipInfo.longitude, lat, lng) * 10) / 10
    }

    // Skip camps beyond max distance (but keep those without coordinates)
    if (distanceMiles !== null && distanceMiles > maxDistanceMiles) {
      continue
    }

    // Build venue key
    const venueKey = camp.venueId || camp.locationId || `no-venue-${camp.id}`
    const venueName = hasVenue
      ? camp.venue!.name
      : (hasLocation ? camp.location!.name : 'Location TBD')
    const territoryName = camp.tenant?.territoryAssignments?.[0]?.territory?.name || null

    // Build program data
    const registrationCount = camp.registrations?.length || 0
    const maxCapacity = camp.capacity || 60
    const spotsRemaining = Math.max(0, maxCapacity - registrationCount)
    const now = new Date()
    const isEarlyBird = camp.earlyBirdDeadline && new Date(camp.earlyBirdDeadline) > now
    const currentPrice = isEarlyBird && camp.earlyBirdPriceCents ? camp.earlyBirdPriceCents : camp.priceCents

    const program: CampProgramData = {
      id: camp.id,
      slug: camp.slug,
      name: camp.name,
      programType: camp.programType,
      programTypeName: tagMap.get(camp.programType) || camp.programType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      startDate: camp.startDate.toISOString(),
      endDate: camp.endDate.toISOString(),
      dailyStartTime: camp.startTime?.toISOString().slice(11, 16) || null,
      dailyEndTime: camp.endTime?.toISOString().slice(11, 16) || null,
      minAge: camp.minAge || 5,
      maxAge: camp.maxAge || 14,
      price: camp.priceCents,
      currentPrice,
      earlyBirdPrice: camp.earlyBirdPriceCents,
      earlyBirdDeadline: camp.earlyBirdDeadline?.toISOString() || null,
      sportsOffered: camp.sportsOffered || [],
      spotsRemaining,
      maxCapacity,
      isFull: spotsRemaining <= 0,
      status: camp.status,
    }

    if (venueMap.has(venueKey)) {
      venueMap.get(venueKey)!.programs.push(program)
    } else {
      venueMap.set(venueKey, {
        venueId: camp.venueId || camp.locationId || null,
        venueName,
        territoryName,
        addressLine1: hasVenue ? camp.venue!.addressLine1 : (hasLocation ? camp.location!.address : null),
        addressLine2: hasVenue ? (camp.venue!.addressLine2 || null) : null,
        city: hasVenue ? camp.venue!.city : (hasLocation ? camp.location!.city : null),
        state: hasVenue ? camp.venue!.state : (hasLocation ? camp.location!.state : null),
        postalCode: hasVenue ? camp.venue!.postalCode : (hasLocation ? camp.location!.zip : null),
        distanceMiles,
        latitude: lat,
        longitude: lng,
        programs: [program],
      })
    }
  }

  // 5. Sort venue groups
  let venues = Array.from(venueMap.values())

  if (sortBy === 'distance') {
    venues.sort((a, b) => {
      // Null distances go to end
      if (a.distanceMiles === null && b.distanceMiles === null) return 0
      if (a.distanceMiles === null) return 1
      if (b.distanceMiles === null) return -1
      return a.distanceMiles - b.distanceMiles
    })
  } else {
    // Sort by earliest start date in each venue group
    venues.sort((a, b) => {
      const aEarliest = a.programs.reduce((min, p) => p.startDate < min ? p.startDate : min, a.programs[0]?.startDate || '')
      const bEarliest = b.programs.reduce((min, p) => p.startDate < min ? p.startDate : min, b.programs[0]?.startDate || '')
      return aEarliest.localeCompare(bEarliest)
    })
  }

  const totalPrograms = venues.reduce((sum, v) => sum + v.programs.length, 0)

  return {
    venues,
    total: totalPrograms,
    searchedLocation: {
      zip: zipInfo.zip,
      city: zipInfo.city,
      state: zipInfo.state,
      latitude: zipInfo.latitude,
      longitude: zipInfo.longitude,
    },
  }
}

/**
 * Fetch ALL active public camps grouped by venue (no zip/distance filter).
 * Used for the "Show All Camps" toggle.
 */
export async function fetchAllPublicCamps(
  filters: NearZipFilters = {},
  options: { sortBy?: 'startDate' } = {}
): Promise<{ venues: VenueGroupData[]; total: number }> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const where: Prisma.CampWhereInput = {
    status: { in: ['published', 'registration_open'] },
    startDate: { gt: today },
    concludedAt: null,
    AND: [
      {
        OR: [
          { registrationClose: null },
          { registrationClose: { gte: today } },
        ],
      },
    ],
  }

  if (filters.programType) {
    where.programType = filters.programType
  }
  if (filters.minAge !== undefined) {
    where.maxAge = { gte: filters.minAge }
  }
  if (filters.maxAge !== undefined) {
    where.minAge = { lte: filters.maxAge }
  }
  if (filters.search) {
    ;(where.AND as Prisma.CampWhereInput[]).push({
      OR: [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { venue: { name: { contains: filters.search, mode: 'insensitive' } } },
        { venue: { city: { contains: filters.search, mode: 'insensitive' } } },
      ],
    })
  }

  const camps = await prisma.camp.findMany({
    where,
    include: {
      location: true,
      venue: true,
      tenant: {
        include: {
          territoryAssignments: {
            include: {
              territory: { select: { name: true } },
            },
            take: 1,
          },
        },
      },
      registrations: { select: { id: true } },
    },
    orderBy: { startDate: 'asc' },
  })

  const tagMap = await getProgramTagMap()
  const venueMap = new Map<string, VenueGroupData>()

  for (const camp of camps) {
    const hasVenue = !!camp.venue
    const hasLocation = !!camp.location
    const lat = hasVenue && camp.venue!.latitude
      ? Number(camp.venue!.latitude)
      : (hasLocation && camp.location!.latitude ? Number(camp.location!.latitude) : null)
    const lng = hasVenue && camp.venue!.longitude
      ? Number(camp.venue!.longitude)
      : (hasLocation && camp.location!.longitude ? Number(camp.location!.longitude) : null)

    const venueKey = camp.venueId || camp.locationId || `no-venue-${camp.id}`
    const venueName = hasVenue
      ? camp.venue!.name
      : (hasLocation ? camp.location!.name : 'Location TBD')
    const territoryName = camp.tenant?.territoryAssignments?.[0]?.territory?.name || null

    const registrationCount = camp.registrations?.length || 0
    const maxCapacity = camp.capacity || 60
    const spotsRemaining = Math.max(0, maxCapacity - registrationCount)
    const now = new Date()
    const isEarlyBird = camp.earlyBirdDeadline && new Date(camp.earlyBirdDeadline) > now
    const currentPrice = isEarlyBird && camp.earlyBirdPriceCents ? camp.earlyBirdPriceCents : camp.priceCents

    const program: CampProgramData = {
      id: camp.id,
      slug: camp.slug,
      name: camp.name,
      programType: camp.programType,
      programTypeName: tagMap.get(camp.programType) || camp.programType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      startDate: camp.startDate.toISOString(),
      endDate: camp.endDate.toISOString(),
      dailyStartTime: camp.startTime?.toISOString().slice(11, 16) || null,
      dailyEndTime: camp.endTime?.toISOString().slice(11, 16) || null,
      minAge: camp.minAge || 5,
      maxAge: camp.maxAge || 14,
      price: camp.priceCents,
      currentPrice,
      earlyBirdPrice: camp.earlyBirdPriceCents,
      earlyBirdDeadline: camp.earlyBirdDeadline?.toISOString() || null,
      sportsOffered: camp.sportsOffered || [],
      spotsRemaining,
      maxCapacity,
      isFull: spotsRemaining <= 0,
      status: camp.status,
    }

    if (venueMap.has(venueKey)) {
      venueMap.get(venueKey)!.programs.push(program)
    } else {
      venueMap.set(venueKey, {
        venueId: camp.venueId || camp.locationId || null,
        venueName,
        territoryName,
        addressLine1: hasVenue ? camp.venue!.addressLine1 : (hasLocation ? camp.location!.address : null),
        addressLine2: hasVenue ? (camp.venue!.addressLine2 || null) : null,
        city: hasVenue ? camp.venue!.city : (hasLocation ? camp.location!.city : null),
        state: hasVenue ? camp.venue!.state : (hasLocation ? camp.location!.state : null),
        postalCode: hasVenue ? camp.venue!.postalCode : (hasLocation ? camp.location!.zip : null),
        distanceMiles: null,
        latitude: lat,
        longitude: lng,
        programs: [program],
      })
    }
  }

  // Sort by earliest start date
  const venues = Array.from(venueMap.values())
  venues.sort((a, b) => {
    const aEarliest = a.programs.reduce((min, p) => p.startDate < min ? p.startDate : min, a.programs[0]?.startDate || '')
    const bEarliest = b.programs.reduce((min, p) => p.startDate < min ? p.startDate : min, b.programs[0]?.startDate || '')
    return aEarliest.localeCompare(bEarliest)
  })

  const total = venues.reduce((sum, v) => sum + v.programs.length, 0)
  return { venues, total }
}

// ============================================================================
// PROGRAM-TYPE GROUPED (redesigned /camps page)
// ============================================================================

interface GroupedByTypeFilters {
  zip?: string
  programType?: string
  minAge?: number
  maxAge?: number
  search?: string
}

/**
 * Compute desirability score for a camp.
 * Higher = more compelling to show first.
 */
function computeDesirabilityScore(camp: {
  featured: boolean
  earlyBirdDeadline: string | null
  registrationCount: number
  maxCapacity: number
  startDate: string
  createdAt: string
  isFull: boolean
}): number {
  let score = 0
  const now = Date.now()

  // Featured boost
  if (camp.featured) score += 50

  // Early bird active
  if (camp.earlyBirdDeadline && new Date(camp.earlyBirdDeadline).getTime() > now) {
    score += 15
  }

  // Fill rate (0–30 pts)
  const fillRate = camp.maxCapacity > 0 ? camp.registrationCount / camp.maxCapacity : 0
  score += Math.round(fillRate * 30)

  // Start date timing
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const weeksUntilStart = (new Date(camp.startDate).getTime() - now) / msPerWeek
  if (weeksUntilStart >= 2 && weeksUntilStart <= 8) {
    score += 20 // sweet spot
  } else if (weeksUntilStart < 2) {
    score += 10 // urgent
  } else if (weeksUntilStart <= 16) {
    score += 15 // moderately far
  } else {
    score += 5  // very far out
  }

  // Recency bonus
  const daysSinceCreated = (now - new Date(camp.createdAt).getTime()) / (24 * 60 * 60 * 1000)
  if (daysSinceCreated <= 14) score += 10

  // Sold out penalty
  if (camp.isFull) score -= 100

  return score
}

/**
 * Fetch all active camps grouped by program type with desirability scoring and badges.
 * Replaces the ZIP-gated hero approach with an immediate listing.
 */
export async function fetchCampsGroupedByProgramType(
  filters: GroupedByTypeFilters = {}
): Promise<ProgramTypeGroupedResult> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Build where clause (same active-camp filters)
  const where: Prisma.CampWhereInput = {
    status: { in: ['published', 'registration_open'] },
    startDate: { gt: today },
    concludedAt: null,
    AND: [
      {
        OR: [
          { registrationClose: null },
          { registrationClose: { gte: today } },
        ],
      },
    ],
  }

  if (filters.programType) {
    where.programType = filters.programType
  }
  if (filters.minAge !== undefined) {
    where.maxAge = { gte: filters.minAge }
  }
  if (filters.maxAge !== undefined) {
    where.minAge = { lte: filters.maxAge }
  }
  if (filters.search) {
    ;(where.AND as Prisma.CampWhereInput[]).push({
      OR: [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { venue: { name: { contains: filters.search, mode: 'insensitive' } } },
        { venue: { city: { contains: filters.search, mode: 'insensitive' } } },
      ],
    })
  }

  // Fetch all matching camps
  const camps = await prisma.camp.findMany({
    where,
    include: {
      location: true,
      venue: true,
      tenant: true,
      registrations: { select: { id: true } },
    },
    orderBy: { startDate: 'asc' },
  })

  // Resolve ZIP coordinates if provided
  let zipInfo: Awaited<ReturnType<typeof lookupZipCode>> = null
  if (filters.zip) {
    zipInfo = await lookupZipCode(filters.zip)
    // Gracefully skip distance if invalid ZIP
  }

  // Load tag map + active tags (for sort order)
  const [tagMap, activeTags] = await Promise.all([
    getProgramTagMap(),
    fetchActiveProgramTags(),
  ])

  // Build sort-order lookup from program_tags table
  const tagSortOrder = new Map<string, number>()
  for (const tag of activeTags) {
    tagSortOrder.set(tag.slug, tag.sortOrder)
  }

  // Group camps into sections
  const sectionMap = new Map<string, CampListingItem[]>()

  for (const camp of camps) {
    const hasVenue = !!camp.venue
    const hasLocation = !!camp.location

    // Coordinates
    const lat = hasVenue && camp.venue!.latitude
      ? Number(camp.venue!.latitude)
      : (hasLocation && camp.location!.latitude ? Number(camp.location!.latitude) : null)
    const lng = hasVenue && camp.venue!.longitude
      ? Number(camp.venue!.longitude)
      : (hasLocation && camp.location!.longitude ? Number(camp.location!.longitude) : null)

    // Distance
    let distanceMiles: number | null = null
    if (zipInfo && lat !== null && lng !== null) {
      distanceMiles = Math.round(haversineDistanceMiles(zipInfo.latitude, zipInfo.longitude, lat, lng) * 10) / 10
    }

    // Computed fields
    const registrationCount = camp.registrations?.length || 0
    const maxCapacity = camp.capacity || 60
    const spotsRemaining = Math.max(0, maxCapacity - registrationCount)
    const isFull = spotsRemaining <= 0
    const now = new Date()
    const isEarlyBird = camp.earlyBirdDeadline && new Date(camp.earlyBirdDeadline) > now
    const currentPrice = isEarlyBird && camp.earlyBirdPriceCents ? camp.earlyBirdPriceCents : camp.priceCents
    const fillRate = maxCapacity > 0 ? registrationCount / maxCapacity : 0

    const desirabilityScore = computeDesirabilityScore({
      featured: camp.featured,
      earlyBirdDeadline: camp.earlyBirdDeadline?.toISOString() || null,
      registrationCount,
      maxCapacity,
      startDate: camp.startDate.toISOString(),
      createdAt: camp.createdAt.toISOString(),
      isFull,
    })

    // Badge: NEW! or EARLY BIRD (per-camp, MOST POPULAR assigned post-hoc)
    const daysSinceCreated = (Date.now() - camp.createdAt.getTime()) / (24 * 60 * 60 * 1000)
    let badge: CampBadge = null
    if (daysSinceCreated <= 14 && !isFull) {
      badge = 'NEW!'
    } else if (isEarlyBird && !isFull) {
      badge = 'EARLY BIRD'
    }

    const venueName = hasVenue ? camp.venue!.name : (hasLocation ? camp.location!.name : 'Location TBD')
    const venueCity = hasVenue ? camp.venue!.city : (hasLocation ? camp.location!.city : null)
    const venueState = hasVenue ? camp.venue!.state : (hasLocation ? camp.location!.state : null)
    const venueCountry = hasVenue ? camp.venue!.country : 'US'

    const item: CampListingItem = {
      id: camp.id,
      slug: camp.slug,
      name: camp.name,
      programType: camp.programType,
      programTypeName: tagMap.get(camp.programType) || camp.programType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      venueName,
      venueCity,
      venueState,
      venueCountry,
      distanceMiles,
      startDate: camp.startDate.toISOString(),
      endDate: camp.endDate.toISOString(),
      dailyStartTime: camp.startTime?.toISOString().slice(11, 16) || null,
      dailyEndTime: camp.endTime?.toISOString().slice(11, 16) || null,
      minAge: camp.minAge || 5,
      maxAge: camp.maxAge || 14,
      price: camp.priceCents,
      currentPrice,
      earlyBirdPrice: camp.earlyBirdPriceCents,
      earlyBirdDeadline: camp.earlyBirdDeadline?.toISOString() || null,
      sportsOffered: camp.sportsOffered || [],
      highlights: camp.highlights || [],
      spotsRemaining,
      maxCapacity,
      isFull,
      featured: camp.featured,
      status: camp.status,
      createdAt: camp.createdAt.toISOString(),
      desirabilityScore,
      fillRate,
      badge,
      flag: camp.flag || null,
      isOvernight: camp.isOvernight,
      dropoffTime: camp.dropoffTime?.toISOString().slice(11, 16) || null,
      pickupTime: camp.pickupTime?.toISOString().slice(11, 16) || null,
    }

    const key = camp.programType
    if (!sectionMap.has(key)) {
      sectionMap.set(key, [])
    }
    sectionMap.get(key)!.push(item)
  }

  // Build sections, sort camps within each by desirability, assign MOST POPULAR badge
  const sections: ProgramTypeSection[] = []
  for (const [slug, campItems] of sectionMap) {
    // Sort by desirability descending
    campItems.sort((a, b) => b.desirabilityScore - a.desirabilityScore)

    // Post-hoc: assign MOST POPULAR to highest fill rate camp (>50%) without an existing badge
    let bestFillIdx = -1
    let bestFill = 0
    for (let i = 0; i < campItems.length; i++) {
      if (campItems[i].badge === null && campItems[i].fillRate > 0.5 && campItems[i].fillRate > bestFill && !campItems[i].isFull) {
        bestFill = campItems[i].fillRate
        bestFillIdx = i
      }
    }
    if (bestFillIdx >= 0) {
      campItems[bestFillIdx].badge = 'MOST POPULAR'
    }

    // Nearest distance in section
    const distances = campItems.map(c => c.distanceMiles).filter((d): d is number => d !== null)
    const nearestDistanceMiles = distances.length > 0 ? Math.min(...distances) : null

    sections.push({
      slug,
      name: tagMap.get(slug) || slug.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      sortOrder: tagSortOrder.get(slug) ?? 999,
      campCount: campItems.length,
      nearestDistanceMiles,
      camps: campItems,
    })
  }

  // Sort sections by ProgramTag sortOrder
  sections.sort((a, b) => a.sortOrder - b.sortOrder)

  const totalCamps = sections.reduce((sum, s) => sum + s.campCount, 0)

  return {
    sections,
    totalCamps,
    searchedLocation: zipInfo ? {
      zip: zipInfo.zip,
      city: zipInfo.city,
      state: zipInfo.state,
      latitude: zipInfo.latitude,
      longitude: zipInfo.longitude,
    } : null,
  }
}

// ============================================================================
// DIRECTOR QUERIES
// ============================================================================

export interface DirectorCamp {
  id: string
  name: string
  start_date: string
  end_date: string
  location_name: string | null
  capacity: number | null
}

export interface DirectorCampDetail {
  id: string
  name: string
  slug: string
  start_date: string
  end_date: string
  start_time: string | null
  end_time: string | null
  capacity: number
  min_age: number
  max_age: number
  status: string
  grouping_status: string
  location: {
    name: string
    city: string
  } | null
}

/**
 * Fetch upcoming camps for director dashboard
 * Returns camps where end_date >= today, ordered by start_date
 */
export async function fetchUpcomingCampsForDirector(
  limit: number = 10
): Promise<{ data: DirectorCamp[] | null; error: Error | null }> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const camps = await prisma.camp.findMany({
      where: {
        endDate: { gte: today },
      },
      include: {
        location: {
          select: { name: true },
        },
      },
      orderBy: { startDate: 'asc' },
      take: limit,
    })

    return {
      data: camps.map((c) => ({
        id: c.id,
        name: c.name,
        start_date: c.startDate.toISOString().split('T')[0],
        end_date: c.endDate.toISOString().split('T')[0],
        location_name: c.location?.name || null,
        capacity: c.capacity,
      })),
      error: null,
    }
  } catch (error) {
    console.error('[Camps] Failed to fetch director camps:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Fetch currently active camps (start <= today <= end)
 */
export async function fetchActiveCamps(): Promise<{ data: DirectorCamp[] | null; error: Error | null }> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const camps = await prisma.camp.findMany({
      where: {
        startDate: { lte: today },
        endDate: { gte: today },
      },
      include: {
        location: {
          select: { name: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return {
      data: camps.map((c) => ({
        id: c.id,
        name: c.name,
        start_date: c.startDate.toISOString().split('T')[0],
        end_date: c.endDate.toISOString().split('T')[0],
        location_name: c.location?.name || null,
        capacity: c.capacity,
      })),
      error: null,
    }
  } catch (error) {
    console.error('[Camps] Failed to fetch active camps:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Fetch all camps with details for director camps list
 */
export async function fetchCampsForDirector(): Promise<{ data: DirectorCampDetail[] | null; error: Error | null }> {
  try {
    const camps = await prisma.camp.findMany({
      include: {
        location: {
          select: { name: true, city: true },
        },
      },
      orderBy: { startDate: 'asc' },
    })

    return {
      data: camps.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        start_date: c.startDate.toISOString().split('T')[0],
        end_date: c.endDate.toISOString().split('T')[0],
        start_time: c.startTime ? c.startTime.toISOString().slice(11, 16) : null,
        end_time: c.endTime ? c.endTime.toISOString().slice(11, 16) : null,
        capacity: c.capacity || 60,
        min_age: c.minAge || 5,
        max_age: c.maxAge || 14,
        status: c.status,
        grouping_status: c.groupingStatus,
        location: c.location ? { name: c.location.name, city: c.location.city || '' } : null,
      })),
      error: null,
    }
  } catch (error) {
    console.error('[Camps] Failed to fetch camps for director:', error)
    return { data: null, error: error as Error }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format price from cents to display string
 */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

/**
 * Format date range for display
 */
export function formatDateRange(startDate: Date | string, endDate: Date | string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  }

  if (start.getFullYear() !== end.getFullYear()) {
    return `${start.toLocaleDateString('en-US', { ...options, year: 'numeric' })} - ${end.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`
  }

  if (start.getMonth() === end.getMonth()) {
    return `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`
  }

  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}, ${start.getFullYear()}`
}

/**
 * Format age range for display
 */
export function formatAgeRange(minAge: number, maxAge: number): string {
  if (minAge === maxAge) {
    return `Age ${minAge}`
  }
  return `Ages ${minAge}-${maxAge}`
}

/**
 * Get program type display name from ProgramTag cache
 */
export async function getProgramTypeLabel(programType: string): Promise<string> {
  const tagMap = await getProgramTagMap()
  return tagMap.get(programType) || programType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}
