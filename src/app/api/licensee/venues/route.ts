/**
 * Licensee Venues API
 *
 * GET /api/licensee/venues - List venues for the licensee's tenant
 * POST /api/licensee/venues - Create a new venue for the licensee's tenant
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth/server'
import {
  listVenues,
  createVenue,
  getVenueStats,
  type FacilityType,
  type IndoorOutdoor,
} from '@/lib/services/venues'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // HQ admins can see everything; others are scoped to their tenant
    const tenantId = user.role === 'hq_admin' ? undefined : user.tenantId

    if (!tenantId && user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // Handle stats action
    if (action === 'stats') {
      const { data, error } = await getVenueStats(tenantId || undefined)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ data })
    }

    // Default: list venues
    const filters = {
      tenant_id: tenantId || undefined,
      include_global: true, // Include global venues (read-only for licensees)
      search: searchParams.get('search') || undefined,
      city: searchParams.get('city') || undefined,
      state: searchParams.get('state') || undefined,
      region: searchParams.get('region') || undefined,
      sport: searchParams.get('sport') || undefined,
      facility_type: (searchParams.get('facilityType') as FacilityType) || undefined,
      indoor_outdoor: (searchParams.get('indoorOutdoor') as IndoorOutdoor) || undefined,
      is_active_only: searchParams.get('activeOnly') !== 'false',
    }

    const { data, error } = await listVenues(filters)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/licensee/venues error:', error)
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

    // HQ admins can create for any tenant; licensee owners only for their tenant
    const tenantId = user.role === 'hq_admin' ? undefined : user.tenantId

    if (!tenantId && user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 })
    }

    const body = await request.json()

    const input = {
      tenant_id: tenantId, // Force to user's tenant
      name: body.name,
      short_name: body.short_name,
      address_line_1: body.address_line_1,
      address_line_2: body.address_line_2,
      city: body.city,
      state: body.state,
      postal_code: body.postal_code,
      country: body.country || 'US',
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
    console.error('[API] POST /api/licensee/venues error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
