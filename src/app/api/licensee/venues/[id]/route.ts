/**
 * Licensee Venue Detail API
 *
 * GET /api/licensee/venues/[id] - Get single venue
 * PUT /api/licensee/venues/[id] - Update venue (own tenant only)
 * PATCH /api/licensee/venues/[id] - Venue actions (archive, reactivate)
 * DELETE /api/licensee/venues/[id] - Archive venue
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth/server'
import {
  getVenueById,
  updateVenue,
  archiveVenue,
  reactivateVenue,
} from '@/lib/services/venues'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tenantId = user.role === 'hq_admin' ? undefined : user.tenantId

    if (!tenantId && user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 })
    }

    const { id } = await params

    const { data, error } = await getVenueById({
      id,
      tenant_id: tenantId || undefined,
      include_tenant_scope: true,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/licensee/venues/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['hq_admin', 'licensee_owner']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tenantId = user.role === 'hq_admin' ? undefined : user.tenantId

    if (!tenantId && user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 })
    }

    const { id } = await params
    const body = await request.json()

    // First check if this is a venue the licensee can edit (their own, not global)
    const existingVenue = await getVenueById({ id })
    if (!existingVenue.data) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }

    // Licensees can only edit their own venues, not global ones
    if (user.role !== 'hq_admin' && existingVenue.data.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Cannot edit venues owned by other tenants' }, { status: 403 })
    }

    const updates = {
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
      is_active: body.is_active,
    }

    // Remove undefined values
    Object.keys(updates).forEach((key) => {
      if (updates[key as keyof typeof updates] === undefined) {
        delete updates[key as keyof typeof updates]
      }
    })

    const { data, error } = await updateVenue({
      id,
      tenant_id: tenantId || undefined,
      updates,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] PUT /api/licensee/venues/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['hq_admin', 'licensee_owner']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tenantId = user.role === 'hq_admin' ? undefined : user.tenantId

    if (!tenantId && user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 })
    }

    const { id } = await params
    const body = await request.json()
    const { action } = body

    // Check venue ownership for non-HQ admins
    if (user.role !== 'hq_admin') {
      const existingVenue = await getVenueById({ id })
      if (!existingVenue.data) {
        return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
      }
      if (existingVenue.data.tenant_id !== tenantId) {
        return NextResponse.json({ error: 'Cannot modify venues owned by other tenants' }, { status: 403 })
      }
    }

    switch (action) {
      case 'archive': {
        const result = await archiveVenue({ id, tenant_id: tenantId || undefined })
        if (result.error) {
          return NextResponse.json(
            { error: result.error.message, has_future_camps: result.has_future_camps },
            { status: 400 }
          )
        }
        return NextResponse.json({ success: true })
      }

      case 'reactivate': {
        const result = await reactivateVenue({ id, tenant_id: tenantId || undefined })
        if (result.error) {
          return NextResponse.json({ error: result.error.message }, { status: 500 })
        }
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[API] PATCH /api/licensee/venues/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['hq_admin', 'licensee_owner']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tenantId = user.role === 'hq_admin' ? undefined : user.tenantId

    if (!tenantId && user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 })
    }

    const { id } = await params

    // Check venue ownership for non-HQ admins
    if (user.role !== 'hq_admin') {
      const existingVenue = await getVenueById({ id })
      if (!existingVenue.data) {
        return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
      }
      if (existingVenue.data.tenant_id !== tenantId) {
        return NextResponse.json({ error: 'Cannot archive venues owned by other tenants' }, { status: 403 })
      }
    }

    const result = await archiveVenue({ id, tenant_id: tenantId || undefined })

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message, has_future_camps: result.has_future_camps },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] DELETE /api/licensee/venues/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
