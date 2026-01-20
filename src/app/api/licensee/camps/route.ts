/**
 * Licensee Camps API
 *
 * GET /api/licensee/camps - Get camps for the licensee
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { getLicenseeCamps } from '@/lib/services/licensee-dashboard'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['licensee_owner', 'hq_admin']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // HQ admins can see all camps (no tenantId filter)
    // Licensee owners must have a tenantId
    const isHqAdmin = userRole === 'hq_admin'
    if (!isHqAdmin && !user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 })
    }

    const status = request.nextUrl.searchParams.get('status') || undefined
    const limit = request.nextUrl.searchParams.get('limit')
      ? parseInt(request.nextUrl.searchParams.get('limit')!)
      : undefined

    const { data, error } = await getLicenseeCamps({
      tenantId: isHqAdmin ? undefined : user.tenantId!, // HQ admin sees all, licensee sees own
      status,
      limit,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/licensee/camps error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
