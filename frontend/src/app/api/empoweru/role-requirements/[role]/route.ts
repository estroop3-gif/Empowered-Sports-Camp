/**
 * Role-specific Requirements API
 *
 * GET /api/empoweru/role-requirements/[role] - Get requirements for a specific role
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { getRequiredModulesForRole } from '@/lib/services/empoweru'
import { UserRole } from '@/generated/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ role: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { role } = await params

    // Validate role
    const validRoles: UserRole[] = ['coach', 'director', 'licensee_owner', 'cit_volunteer', 'parent', 'hq_admin']
    if (!validRoles.includes(role as UserRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Users can view their own role requirements, or HQ Admin can view any
    if (user.role !== 'hq_admin' && user.role !== role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { data, error } = await getRequiredModulesForRole(role as UserRole)

    if (error) {
      console.error(`[API] GET /api/empoweru/role-requirements/${role} error:`, error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/empoweru/role-requirements/[role] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
