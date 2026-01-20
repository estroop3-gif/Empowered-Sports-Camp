/**
 * Incentive Overview API
 *
 * GET /api/incentives/overview - Get incentive overview based on role
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getGlobalIncentiveOverview,
  getTenantIncentiveOverview,
  getDirectorIncentiveOverview,
  getPersonCompensationHistory,
} from '@/lib/services/incentives'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import prisma from '@/lib/db/client'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get role from database (source of truth) if not in JWT
    let role = user.role || ''
    let tenantId = user.tenantId

    if (!role) {
      const userRole = await prisma.userRoleAssignment.findFirst({
        where: {
          userId: user.id,
          isActive: true,
        },
        select: {
          role: true,
          tenantId: true,
        },
      })

      if (userRole) {
        role = userRole.role
        tenantId = userRole.tenantId || tenantId
      }
    }
    const staffProfileId = request.nextUrl.searchParams.get('staffProfileId')
    const mode = request.nextUrl.searchParams.get('mode') || 'overview'

    // If requesting specific staff history
    if (mode === 'history' && staffProfileId) {
      // Directors can only view their own history
      if (role === 'director' && staffProfileId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Licensee owners can view staff within their tenant
      // HQ admins can view anyone

      const { data, error } = await getPersonCompensationHistory({
        staffProfileId,
        tenantId: tenantId || undefined,
        role,
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data })
    }

    // Overview mode based on role
    if (role === 'hq_admin') {
      const { data, error } = await getGlobalIncentiveOverview()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data })
    }

    if (role === 'licensee_owner') {
      if (!tenantId) {
        return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
      }

      const { data, error } = await getTenantIncentiveOverview(tenantId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data })
    }

    if (role === 'director') {
      if (!tenantId) {
        return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
      }

      const { data, error } = await getDirectorIncentiveOverview({
        staffProfileId: user.id,
        tenantId,
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: 'Role not authorized for incentive overview' }, { status: 403 })
  } catch (error) {
    console.error('[API] GET /api/incentives/overview error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
