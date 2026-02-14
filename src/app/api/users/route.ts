/**
 * Users API Routes
 *
 * Admin-only routes for user management.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  fetchUsersWithRoles,
  getUserDetails,
  fetchTenants,
  updateUserRole,
  assignUserToTenant,
  removeUserFromTenant,
  deactivateUserRole,
  updateUserProfile,
  createUser,
  deleteUser,
} from '@/lib/services/users'
import { adminDeleteCognitoUser } from '@/lib/auth/cognito-admin'
import { UserRole } from '@/generated/prisma'

export async function GET(request: NextRequest) {
  // Authenticate user - only HQ admins can access user management
  const user = await getAuthenticatedUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role?.toLowerCase() !== 'hq_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const action = request.nextUrl.searchParams.get('action') || 'withRoles'
  const userId = request.nextUrl.searchParams.get('userId')
  const limit = request.nextUrl.searchParams.get('limit')

  try {
    switch (action) {
      case 'withRoles': {
        const { data, error } = await fetchUsersWithRoles(limit ? parseInt(limit) : undefined)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'details': {
        if (!userId) {
          return NextResponse.json({ error: 'userId is required' }, { status: 400 })
        }
        const { data, error } = await getUserDetails(userId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'tenants': {
        const { data, error } = await fetchTenants()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Users GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Authenticate user - only HQ admins can access user management
  const user = await getAuthenticatedUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role?.toLowerCase() !== 'hq_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { action, userId, role, tenantId, firstName, lastName, phone, email } = body

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 })
    }

    // createUser doesn't require userId
    if (action !== 'createUser' && !userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    switch (action) {
      case 'createUser': {
        if (!email) {
          return NextResponse.json({ error: 'email is required' }, { status: 400 })
        }
        if (!role) {
          return NextResponse.json({ error: 'role is required' }, { status: 400 })
        }

        // Validate role
        const validRoles: UserRole[] = ['parent', 'coach', 'director', 'licensee_owner', 'hq_admin', 'cit_volunteer']
        if (!validRoles.includes(role)) {
          return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
        }

        const { data, error } = await createUser({
          email,
          firstName,
          lastName,
          phone,
          role: role as UserRole,
          tenantId: tenantId || null,
        })

        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        return NextResponse.json({ data })
      }
      case 'updateRole': {
        if (!role) {
          return NextResponse.json({ error: 'role is required' }, { status: 400 })
        }

        // Validate role is a valid UserRole enum
        const validRoles: UserRole[] = ['parent', 'coach', 'director', 'licensee_owner', 'hq_admin', 'cit_volunteer']
        if (!validRoles.includes(role)) {
          return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
        }

        const { data, error } = await updateUserRole({
          userId,
          newRole: role as UserRole,
          tenantId: tenantId || null,
        })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'assignTenant': {
        if (!tenantId) {
          return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
        }

        const { data, error } = await assignUserToTenant({ userId, tenantId })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'removeTenant': {
        const { data, error } = await removeUserFromTenant({ userId })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'deactivate': {
        const { data, error } = await deactivateUserRole({ userId })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'deleteUser': {
        if (!email) {
          return NextResponse.json({ error: 'email is required for deletion' }, { status: 400 })
        }

        // Prevent self-deletion
        if (user.email === email) {
          return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
        }

        // Delete from Cognito (handle gracefully if not found)
        try {
          await adminDeleteCognitoUser(email)
        } catch (cognitoErr) {
          console.error('[API] Failed to delete Cognito user:', cognitoErr)
          // Continue with DB deletion even if Cognito fails
        }

        // Delete from database
        const { data: deleteData, error: deleteError } = await deleteUser({ userId })
        if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
        return NextResponse.json({ data: deleteData })
      }

      case 'updateProfile': {
        const { data, error } = await updateUserProfile({
          userId,
          firstName,
          lastName,
          phone,
        })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Users POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
