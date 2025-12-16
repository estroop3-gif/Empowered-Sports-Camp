/**
 * Admin Royalties API Routes
 *
 * GET: List all royalty invoices with filtering
 * POST: Generate invoices, bulk operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  getAdminRoyaltyInvoices,
  getAdminRoyaltyLicensees,
  generateRoyaltyInvoiceForSession,
  bulkGenerateRoyaltyInvoices,
  getCampsWithoutRoyaltyInvoices,
  markOverdueInvoices,
} from '@/lib/services/admin-royalties'
import type { RoyaltyInvoiceStatus } from '@/generated/prisma'

export async function GET(request: NextRequest) {
  // Authenticate user
  const user = await getAuthenticatedUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check for admin role - only HQ admins can access royalties
  if (user.role?.toLowerCase() !== 'hq_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action') || 'list'

  try {
    switch (action) {
      case 'list': {
        const from = searchParams.get('from')
        const to = searchParams.get('to')
        const status = searchParams.get('status') as RoyaltyInvoiceStatus | null
        const tenantId = searchParams.get('tenantId')
        const search = searchParams.get('search')
        const sortBy = searchParams.get('sortBy') as 'dueDate' | 'generatedAt' | 'grossRevenue' | 'royaltyAmount' | 'status' | null
        const sortDir = searchParams.get('sortDir') as 'asc' | 'desc' | null
        const limit = searchParams.get('limit')
        const offset = searchParams.get('offset')

        const { data, error } = await getAdminRoyaltyInvoices({
          from: from ? new Date(from) : undefined,
          to: to ? new Date(to) : undefined,
          status: status || undefined,
          tenantId: tenantId || undefined,
          search: search || undefined,
          sortBy: sortBy || undefined,
          sortDir: sortDir || undefined,
          limit: limit ? parseInt(limit) : undefined,
          offset: offset ? parseInt(offset) : undefined,
        })

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data)
      }

      case 'licensees': {
        const { data, error } = await getAdminRoyaltyLicensees()

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ licensees: data })
      }

      case 'camps-without-invoices': {
        const tenantId = searchParams.get('tenantId')
        const from = searchParams.get('from')
        const to = searchParams.get('to')
        const limit = searchParams.get('limit')

        const { data, error } = await getCampsWithoutRoyaltyInvoices({
          tenantId: tenantId || undefined,
          from: from ? new Date(from) : undefined,
          to: to ? new Date(to) : undefined,
          limit: limit ? parseInt(limit) : undefined,
        })

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ camps: data })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Admin royalties GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Authenticate user
  const user = await getAuthenticatedUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check for admin role - only HQ admins can access royalties
  if (user.role?.toLowerCase() !== 'hq_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { action } = body

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 })
    }

    switch (action) {
      case 'generate': {
        const { campId, generatedBy, dueInDays } = body

        if (!campId) {
          return NextResponse.json({ error: 'campId is required' }, { status: 400 })
        }

        const { data, error } = await generateRoyaltyInvoiceForSession({
          campId,
          generatedBy,
          dueInDays,
        })

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ data })
      }

      case 'bulk-generate': {
        const { campIds, generatedBy, dueInDays } = body

        if (!campIds || !Array.isArray(campIds) || campIds.length === 0) {
          return NextResponse.json({ error: 'campIds array is required' }, { status: 400 })
        }

        const { data, error } = await bulkGenerateRoyaltyInvoices({
          campIds,
          generatedBy,
          dueInDays,
        })

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })
      }

      case 'mark-overdue': {
        const { data, error } = await markOverdueInvoices()

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Admin royalties POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
