/**
 * Admin Royalty Invoice Detail API Routes
 *
 * GET: Get invoice details
 * PATCH: Update invoice status, add adjustments
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getAdminRoyaltyInvoiceById,
  markRoyaltyInvoiceStatus,
  addRoyaltyInvoiceAdjustment,
} from '@/lib/services/admin-royalties'
import type { RoyaltyInvoiceStatus } from '@/generated/prisma'

type RouteParams = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const { data, error } = await getAdminRoyaltyInvoiceById({ id })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] Admin royalty detail GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action } = body

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 })
    }

    switch (action) {
      case 'update-status': {
        const { status, paidAt, paidAmountCents, paymentMethod, paymentReference, notes, updatedBy } = body

        if (!status) {
          return NextResponse.json({ error: 'status is required' }, { status: 400 })
        }

        const validStatuses: RoyaltyInvoiceStatus[] = [
          'pending',
          'invoiced',
          'paid',
          'overdue',
          'disputed',
          'waived',
        ]

        if (!validStatuses.includes(status)) {
          return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
        }

        const { data, error } = await markRoyaltyInvoiceStatus({
          id,
          status: status as RoyaltyInvoiceStatus,
          paidAt: paidAt ? new Date(paidAt) : undefined,
          paidAmountCents,
          paymentMethod,
          paymentReference,
          notes,
          updatedBy,
        })

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ data })
      }

      case 'add-adjustment': {
        const { adjustmentAmountDollars, notes, updatedBy } = body

        if (adjustmentAmountDollars === undefined || adjustmentAmountDollars === null) {
          return NextResponse.json({ error: 'adjustmentAmountDollars is required' }, { status: 400 })
        }

        if (!notes) {
          return NextResponse.json({ error: 'notes is required for adjustments' }, { status: 400 })
        }

        const { data, error } = await addRoyaltyInvoiceAdjustment({
          id,
          adjustmentAmountDollars: parseFloat(adjustmentAmountDollars),
          notes,
          updatedBy,
        })

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ data })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Admin royalty detail PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
