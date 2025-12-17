/**
 * Admin Camps - Tenants API
 *
 * GET /api/admin/camps/tenants - Get all active tenants (for HQ admin dropdown)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import prisma from '@/lib/db/client'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only HQ admins can view all tenants
    const allowedRoles = ['hq_admin']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tenants = await prisma.tenant.findMany({
      // Include all tenants (active, suspended) - exclude only terminated
      where: {
        licenseStatus: { not: 'terminated' }
      },
      select: { id: true, name: true, slug: true, city: true, state: true, licenseStatus: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ tenants })
  } catch (error) {
    console.error('[API] GET /api/admin/camps/tenants error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
