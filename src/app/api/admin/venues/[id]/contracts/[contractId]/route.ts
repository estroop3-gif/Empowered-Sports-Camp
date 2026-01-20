/**
 * Admin Venue Contract Detail API
 *
 * GET /api/admin/venues/[id]/contracts/[contractId] - Get contract details
 * PUT /api/admin/venues/[id]/contracts/[contractId] - Update contract
 * DELETE /api/admin/venues/[id]/contracts/[contractId] - Delete contract
 * PATCH /api/admin/venues/[id]/contracts/[contractId] - Actions: mark_sent, mark_signed, upload_document
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth/server'
import {
  getContractById,
  updateContract,
  deleteContract,
  markContractAsSent,
  markContractAsSigned,
  uploadContractDocument,
} from '@/lib/services/venue-contracts'
import { getVenueById } from '@/lib/services/venues'

interface RouteParams {
  params: Promise<{ id: string; contractId: string }>
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

    const { id: venueId, contractId } = await params

    const { data, error } = await getContractById({
      id: contractId,
      venue_id: venueId,
      tenant_id: user.role === 'hq_admin' ? undefined : user.tenantId || undefined,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/admin/venues/[id]/contracts/[contractId] error:', error)
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

    const { id: venueId, contractId } = await params
    const body = await request.json()

    const { data, error } = await updateContract({
      id: contractId,
      venue_id: venueId,
      tenant_id: user.role === 'hq_admin' ? undefined : user.tenantId || undefined,
      updates: {
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
        status: body.status,
      },
    })

    if (error) {
      if (error.message === 'Contract not found') {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] PUT /api/admin/venues/[id]/contracts/[contractId] error:', error)
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

    const { id: venueId, contractId } = await params

    const { success, error } = await deleteContract({
      id: contractId,
      venue_id: venueId,
      tenant_id: user.role === 'hq_admin' ? undefined : user.tenantId || undefined,
    })

    if (error) {
      if (error.message === 'Contract not found') {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success })
  } catch (error) {
    console.error('[API] DELETE /api/admin/venues/[id]/contracts/[contractId] error:', error)
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

    const { id: venueId, contractId } = await params
    const body = await request.json()
    const { action } = body

    const tenantId = user.role === 'hq_admin' ? undefined : user.tenantId || undefined

    switch (action) {
      case 'mark_sent': {
        // Get venue to retrieve contact email
        const { data: venue } = await getVenueById({
          id: venueId,
          tenant_id: tenantId,
          include_tenant_scope: user.role !== 'hq_admin',
        })

        const sentToEmail = body.sent_to_email || venue?.primary_contact_email
        if (!sentToEmail) {
          return NextResponse.json(
            { error: 'No email address provided and venue has no contact email' },
            { status: 400 }
          )
        }

        const { data, error } = await markContractAsSent({
          id: contractId,
          venue_id: venueId,
          tenant_id: tenantId,
          sent_to_email: sentToEmail,
        })

        if (error) {
          if (error.message === 'Contract not found') {
            return NextResponse.json({ error: error.message }, { status: 404 })
          }
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })
      }

      case 'mark_signed': {
        const { data, error } = await markContractAsSigned({
          id: contractId,
          venue_id: venueId,
          tenant_id: tenantId,
        })

        if (error) {
          if (error.message === 'Contract not found') {
            return NextResponse.json({ error: error.message }, { status: 404 })
          }
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })
      }

      case 'upload_document': {
        if (!body.document_url || !body.document_name) {
          return NextResponse.json(
            { error: 'document_url and document_name are required' },
            { status: 400 }
          )
        }

        const { data, error } = await uploadContractDocument({
          id: contractId,
          venue_id: venueId,
          tenant_id: tenantId,
          document_url: body.document_url,
          document_name: body.document_name,
        })

        if (error) {
          if (error.message === 'Contract not found') {
            return NextResponse.json({ error: error.message }, { status: 404 })
          }
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[API] PATCH /api/admin/venues/[id]/contracts/[contractId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
