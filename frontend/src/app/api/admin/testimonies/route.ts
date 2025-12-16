/**
 * Admin Testimonies API
 *
 * GET /api/admin/testimonies - List all testimonies for admin inbox
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { listAdminTestimonies, getTestimonyCounts } from '@/lib/services/testimonies'
import type { TestimonyStatus, TestimonyRole } from '@/generated/prisma'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    // Check for admin role
    const allowedRoles = ['hq_admin', 'licensee_owner']
    if (!allowedRoles.includes(user.role?.toLowerCase() || '')) {
      return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)

    // Check if requesting counts only
    if (searchParams.get('counts') === 'true') {
      // For licensee_owner, filter by their tenant
      const tenantId = user.role === 'licensee_owner' ? user.tenantId : undefined
      const { data, error } = await getTestimonyCounts(tenantId)

      if (error) {
        return NextResponse.json({ data: null, error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data, error: null })
    }

    // Parse filters
    const statusParam = searchParams.get('status')
    const roleParam = searchParams.get('role') as TestimonyRole | null
    const featuredParam = searchParams.get('featured')
    const searchParam = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    // Build filters
    const filters: {
      status?: TestimonyStatus | TestimonyStatus[]
      author_role?: TestimonyRole
      is_featured?: boolean
      tenant_id?: string
      search?: string
    } = {}

    if (statusParam && statusParam !== 'all') {
      filters.status = statusParam as TestimonyStatus
    }

    if (roleParam) {
      filters.author_role = roleParam
    }

    if (featuredParam !== null) {
      filters.is_featured = featuredParam === 'true'
    }

    if (searchParam) {
      filters.search = searchParam
    }

    // For licensee_owner, filter by their tenant
    if (user.role === 'licensee_owner' && user.tenantId) {
      filters.tenant_id = user.tenantId
    }

    const { data, error } = await listAdminTestimonies(filters, {
      page,
      page_size: limit,
    })

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, error: null })
  } catch (err) {
    console.error('Error in GET /api/admin/testimonies:', err)
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
