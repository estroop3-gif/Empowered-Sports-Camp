/**
 * Admin Venue Contracts API
 *
 * GET /api/admin/venues/[id]/contracts - List contracts for venue
 * POST /api/admin/venues/[id]/contracts - Create new contract
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth/server'
import { listVenueContracts, createContract } from '@/lib/services/venue-contracts'
import { getVenueById } from '@/lib/services/venues'

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

    const { id: venueId } = await params

    // First verify venue exists and user has access
    const { data: venue, error: venueError } = await getVenueById({
      id: venueId,
      tenant_id: user.role === 'hq_admin' ? undefined : user.tenantId || undefined,
      include_tenant_scope: user.role !== 'hq_admin',
    })

    if (venueError || !venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }

    // Get optional status filter
    const status = request.nextUrl.searchParams.get('status') as
      | 'draft'
      | 'sent'
      | 'signed'
      | 'expired'
      | null

    const { data, error } = await listVenueContracts({
      venue_id: venueId,
      tenant_id: user.role === 'hq_admin' ? undefined : user.tenantId || undefined,
      status: status || undefined,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/admin/venues/[id]/contracts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['hq_admin', 'licensee_owner']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: venueId } = await params
    const body = await request.json()

    // First verify venue exists and user has access
    const { data: venue, error: venueError } = await getVenueById({
      id: venueId,
      tenant_id: user.role === 'hq_admin' ? undefined : user.tenantId || undefined,
      include_tenant_scope: user.role !== 'hq_admin',
    })

    if (venueError || !venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }

    // Validate required fields
    if (!body.rental_rate_cents || !body.contract_start_date || !body.contract_end_date) {
      return NextResponse.json(
        { error: 'Missing required fields: rental_rate_cents, contract_start_date, contract_end_date' },
        { status: 400 }
      )
    }

    const { data, error } = await createContract({
      venue_id: venueId,
      tenant_id: venue.tenant_id,
      rental_rate_cents: body.rental_rate_cents,
      currency: body.currency,
      contract_start_date: body.contract_start_date,
      contract_end_date: body.contract_end_date,
      deposit_cents: body.deposit_cents,
      payment_due_date: body.payment_due_date,
      insurance_requirements: body.insurance_requirements,
      cancellation_policy: body.cancellation_policy,
      setup_time_minutes: body.setup_time_minutes,
      cleanup_time_minutes: body.cleanup_time_minutes,
      special_conditions: body.special_conditions,
      document_url: body.document_url,
      document_name: body.document_name,
      expiration_date: body.expiration_date,
      created_by: user.id,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/admin/venues/[id]/contracts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
