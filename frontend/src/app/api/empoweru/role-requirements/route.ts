/**
 * Role Requirements API
 *
 * GET /api/empoweru/role-requirements - List all role requirements
 * POST /api/empoweru/role-requirements - Update requirements for a role (HQ Admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { listAllRoleRequirements, setRoleRequirements } from '@/lib/services/empoweru'
import { UserRole } from '@/generated/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Only HQ Admin can view all role requirements
    if (user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { data, error } = await listAllRoleRequirements()

    if (error) {
      console.error('[API] GET /api/empoweru/role-requirements error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/empoweru/role-requirements error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Only HQ Admin can update role requirements
    if (user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { role, moduleIds } = body

    if (!role || !Array.isArray(moduleIds)) {
      return NextResponse.json(
        { error: 'Missing role or moduleIds array' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles: UserRole[] = ['coach', 'director', 'licensee_owner', 'cit_volunteer']
    if (!validRoles.includes(role as UserRole)) {
      return NextResponse.json(
        { error: 'Invalid role. Valid roles: coach, director, licensee_owner, cit_volunteer' },
        { status: 400 }
      )
    }

    const { error } = await setRoleRequirements(role as UserRole, moduleIds, user.id)

    if (error) {
      console.error('[API] POST /api/empoweru/role-requirements error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] POST /api/empoweru/role-requirements error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
