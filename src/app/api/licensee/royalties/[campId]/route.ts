/**
 * Licensee Camp Royalty API
 *
 * GET /api/licensee/royalties/[campId] - Get royalty details for a specific camp
 * POST /api/licensee/royalties/[campId] - Generate invoice or mark as paid
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  getLicenseeCampRevenue,
  getCampRoyaltyStatus,
  generateRoyaltyInvoice,
  markCampRoyaltyPaid,
} from '@/lib/services/licensee-royalties'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const { campId } = await params
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['licensee_owner', 'hq_admin']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 })
    }

    // Get both revenue breakdown and status
    const [revenueResult, statusResult] = await Promise.all([
      getLicenseeCampRevenue({ tenantId: user.tenantId, campId }),
      getCampRoyaltyStatus({ tenantId: user.tenantId, campId }),
    ])

    if (revenueResult.error) {
      return NextResponse.json({ error: revenueResult.error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        revenue: revenueResult.data,
        status: statusResult.data,
      },
    })
  } catch (error) {
    console.error('[API] GET /api/licensee/royalties/[campId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const { campId } = await params
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['licensee_owner', 'hq_admin']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 })
    }

    const body = await request.json()
    const { action, paymentMethod, paymentReference } = body

    if (action === 'generate_invoice') {
      const { data, error } = await generateRoyaltyInvoice({
        tenantId: user.tenantId,
        campId,
        generatedBy: user.id,
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data })
    }

    if (action === 'mark_paid') {
      const { data, error } = await markCampRoyaltyPaid({
        tenantId: user.tenantId,
        campId,
        paymentMethod,
        paymentReference,
        paidBy: user.id,
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[API] POST /api/licensee/royalties/[campId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
