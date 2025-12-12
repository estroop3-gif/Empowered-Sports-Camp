/**
 * Camp Queries
 *
 * Supabase queries for the Find Camps feature.
 * These queries fetch camp data from the public_camp_cards view.
 */

import { createClient } from '../client'
import type { SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// TYPES
// ============================================================================

export interface PublicCampCard {
  id: string
  slug: string
  name: string
  description: string | null
  program_type: string
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
  highlights: string[] | null
  sports_offered: string[] | null
  featured: boolean
  status: 'draft' | 'published' | 'open' | 'closed'
  tenant_id: string
  // Location fields
  location_id: string | null
  location_name: string | null
  location_address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  latitude: number | null
  longitude: number | null
  indoor: boolean | null
  // Tenant fields
  tenant_name: string | null
  tenant_slug: string | null
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
  page_size: number
  has_more: boolean
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch all published camps with optional filters
 */
export async function fetchPublicCamps(
  filters: CampFilters = {},
  options: { page?: number; pageSize?: number; orderBy?: string; ascending?: boolean } = {}
): Promise<CampSearchResult> {
  const supabase = createClient()
  const { page = 1, pageSize = 12, orderBy = 'start_date', ascending = true } = options

  // Start with base query on the view
  let query = supabase
    .from('public_camp_cards')
    .select('*', { count: 'exact' })

  // Apply filters
  if (filters.city) {
    query = query.ilike('city', `%${filters.city}%`)
  }

  if (filters.state) {
    query = query.ilike('state', filters.state)
  }

  if (filters.zip_code) {
    query = query.eq('zip_code', filters.zip_code)
  }

  if (filters.min_age !== undefined) {
    query = query.gte('max_age', filters.min_age)
  }

  if (filters.max_age !== undefined) {
    query = query.lte('min_age', filters.max_age)
  }

  if (filters.min_grade !== undefined) {
    query = query.gte('max_grade', filters.min_grade)
  }

  if (filters.max_grade !== undefined) {
    query = query.lte('min_grade', filters.max_grade)
  }

  if (filters.program_type) {
    query = query.eq('program_type', filters.program_type)
  }

  if (filters.start_date_from) {
    query = query.gte('start_date', filters.start_date_from)
  }

  if (filters.start_date_to) {
    query = query.lte('start_date', filters.start_date_to)
  }

  if (filters.featured_only) {
    query = query.eq('featured', true)
  }

  if (filters.has_spots) {
    query = query.eq('is_full', false)
  }

  if (filters.tenant_id) {
    query = query.eq('tenant_id', filters.tenant_id)
  }

  if (filters.search) {
    // Search across name, description, city
    query = query.or(
      `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,city.ilike.%${filters.search}%`
    )
  }

  // Order and paginate
  query = query
    .order(orderBy, { ascending })
    .order('featured', { ascending: false }) // Featured camps first
    .range((page - 1) * pageSize, page * pageSize - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('[fetchPublicCamps] Error:', error)
    throw new Error(`Failed to fetch camps: ${error.message}`)
  }

  return {
    camps: (data || []) as PublicCampCard[],
    total: count || 0,
    page,
    page_size: pageSize,
    has_more: count ? page * pageSize < count : false,
  }
}

/**
 * Fetch a single camp by slug
 */
export async function fetchCampBySlug(slug: string): Promise<PublicCampCard | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('public_camp_cards')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null
    }
    console.error('[fetchCampBySlug] Error:', error)
    throw new Error(`Failed to fetch camp: ${error.message}`)
  }

  return data as PublicCampCard
}

/**
 * Fetch a single camp by ID
 */
export async function fetchCampById(id: string): Promise<PublicCampCard | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('public_camp_cards')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('[fetchCampById] Error:', error)
    throw new Error(`Failed to fetch camp: ${error.message}`)
  }

  return data as PublicCampCard
}

/**
 * Fetch featured camps for homepage or promotions
 */
export async function fetchFeaturedCamps(limit: number = 3): Promise<PublicCampCard[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('public_camp_cards')
    .select('*')
    .eq('featured', true)
    .eq('is_full', false)
    .order('start_date', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('[fetchFeaturedCamps] Error:', error)
    throw new Error(`Failed to fetch featured camps: ${error.message}`)
  }

  return (data || []) as PublicCampCard[]
}

/**
 * Fetch camps by location (city/state/zip)
 */
export async function fetchCampsByLocation(
  location: { city?: string; state?: string; zip_code?: string },
  limit: number = 20
): Promise<PublicCampCard[]> {
  const supabase = createClient()

  let query = supabase
    .from('public_camp_cards')
    .select('*')
    .eq('is_full', false)

  if (location.city) {
    query = query.ilike('city', `%${location.city}%`)
  }

  if (location.state) {
    query = query.ilike('state', location.state)
  }

  if (location.zip_code) {
    query = query.eq('zip_code', location.zip_code)
  }

  const { data, error } = await query
    .order('start_date', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('[fetchCampsByLocation] Error:', error)
    throw new Error(`Failed to fetch camps by location: ${error.message}`)
  }

  return (data || []) as PublicCampCard[]
}

/**
 * Get unique cities with camps for location filter dropdown
 */
export async function fetchCampCities(): Promise<string[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('public_camp_cards')
    .select('city')
    .not('city', 'is', null)
    .order('city')

  if (error) {
    console.error('[fetchCampCities] Error:', error)
    return []
  }

  // Get unique cities
  const cities = [...new Set((data || []).map((d: { city: string | null }) => d.city).filter(Boolean))]
  return cities as string[]
}

/**
 * Get unique states with camps for location filter dropdown
 */
export async function fetchCampStates(): Promise<string[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('public_camp_cards')
    .select('state')
    .not('state', 'is', null)
    .order('state')

  if (error) {
    console.error('[fetchCampStates] Error:', error)
    return []
  }

  const states = [...new Set((data || []).map((d: { state: string | null }) => d.state).filter(Boolean))]
  return states as string[]
}

/**
 * Get available program types from published camps
 */
export async function fetchProgramTypes(): Promise<string[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('public_camp_cards')
    .select('program_type')
    .order('program_type')

  if (error) {
    console.error('[fetchProgramTypes] Error:', error)
    return []
  }

  const types = [...new Set((data || []).map((d: { program_type: string | null }) => d.program_type).filter(Boolean))]
  return types as string[]
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
export function formatDateRange(startDate: string, endDate: string): string {
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
 * Get program type display name
 */
export function getProgramTypeLabel(programType: string): string {
  const labels: Record<string, string> = {
    all_girls_sports_camp: 'All-Girls Sports Camp',
    cit_program: 'CIT Program',
    soccer_strength: 'Soccer & Strength',
    basketball_intensive: 'Basketball Intensive',
    volleyball_clinic: 'Volleyball Clinic',
    specialty_camp: 'Specialty Camp',
  }
  return labels[programType] || programType
}
