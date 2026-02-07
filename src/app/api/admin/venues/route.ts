/**
 * Admin Venues API
 *
 * GET /api/admin/venues - List all venues with filters
 * POST /api/admin/venues - Create a new venue
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth/server'
import {
  listVenues,
  createVenue,
  getVenueStats,
  getVenueCities,
  getVenueStates,
  getVenueRegions,
  getVenueSports,
  type FacilityType,
  type IndoorOutdoor,
} from '@/lib/services/venues'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['hq_admin', 'licensee_owner']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // Handle different actions
    if (action === 'stats') {
      const tenantId = user.role === 'hq_admin' ? undefined : user.tenantId || undefined
      const { data, error } = await getVenueStats(tenantId)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ data })
    }

    if (action === 'cities') {
      const tenantId = user.role === 'hq_admin' ? undefined : user.tenantId || undefined
      const { data, error } = await getVenueCities(tenantId)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ data })
    }

    if (action === 'states') {
      const tenantId = user.role === 'hq_admin' ? undefined : user.tenantId || undefined
      const { data, error } = await getVenueStates(tenantId)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ data })
    }

    if (action === 'regions') {
      const tenantId = user.role === 'hq_admin' ? undefined : user.tenantId || undefined
      const { data, error } = await getVenueRegions(tenantId)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ data })
    }

    if (action === 'sports') {
      const tenantId = user.role === 'hq_admin' ? undefined : user.tenantId || undefined
      const { data, error } = await getVenueSports(tenantId)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ data })
    }

    // Default: list venues
    // HQ admins see ALL venues by default (no tenant filtering)
    // Non-HQ admins see their tenant's venues + global venues
    const isHqAdmin = user.role === 'hq_admin'
    const requestedTenantId = searchParams.get('tenantId')

    const filters = {
      // HQ admin: only filter by tenant if explicitly requested
      // Non-HQ admin: always filter by their tenant
      tenant_id: isHqAdmin ? (requestedTenantId || undefined) : (user.tenantId || undefined),
      // HQ admin without tenant filter: don't set include_global (see all)
      // HQ admin with tenant filter: include global venues
      // Non-HQ admin: always include global venues
      include_global: isHqAdmin ? (requestedTenantId ? true : undefined) : true,
      search: searchParams.get('search') || undefined,
      city: searchParams.get('city') || undefined,
      state: searchParams.get('state') || undefined,
      region: searchParams.get('region') || undefined,
      sport: searchParams.get('sport') || undefined,
      facility_type: (searchParams.get('facilityType') as FacilityType) || undefined,
      indoor_outdoor: (searchParams.get('indoorOutdoor') as IndoorOutdoor) || undefined,
      is_active_only: searchParams.get('activeOnly') !== 'false',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
    }

    const { data, error } = await listVenues(filters)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/admin/venues error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['hq_admin', 'licensee_owner']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // For licensee owners, force tenant_id to their own tenant
    // For HQ admins, allow setting any tenant_id or null (global)
    let tenantId = body.tenant_id
    if (user.role === 'licensee_owner') {
      tenantId = user.tenantId
    }

    const input = {
      tenant_id: tenantId,
      name: body.name,
      short_name: body.short_name,
      address_line_1: body.address_line_1,
      address_line_2: body.address_line_2,
      city: body.city,
      state: body.state,
      postal_code: body.postal_code,
      country: body.country,
      latitude: body.latitude,
      longitude: body.longitude,
      region_label: body.region_label,
      facility_type: body.facility_type,
      indoor_outdoor: body.indoor_outdoor,
      sports_supported: body.sports_supported,
      max_daily_capacity: body.max_daily_capacity,
      primary_contact_name: body.primary_contact_name,
      primary_contact_email: body.primary_contact_email,
      primary_contact_phone: body.primary_contact_phone,
      notes: body.notes,
      hero_image_url: body.hero_image_url,
      gallery_image_urls: body.gallery_image_urls,
    }

    const { data, error } = await createVenue(input)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] POST /api/admin/venues error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
