/**
 * User Info API Route
 *
 * GET /api/auth/user-info?userId=xxx
 *
 * Fetches user role, tenant, and LMS status from database.
 * Used by the auth context to populate user info after Cognito login.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import prisma from '@/lib/db/client'

export async function GET(request: NextRequest) {
  // Authenticate the request
  const authUser = await getAuthenticatedUserFromRequest(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = request.nextUrl.searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  try {
    // Find the profile - first try by userId, then by email
    let profile = await prisma.profile.findUnique({
      where: { id: userId },
    })

    // If not found by ID, try by email (handles Cognito sub vs Profile ID mismatch)
    if (!profile && authUser.email) {
      profile = await prisma.profile.findFirst({
        where: { email: authUser.email },
      })
    }

    // Security check: ensure the profile matches the authenticated user's email
    if (!profile || profile.email !== authUser.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use the profile ID for role lookup
    const profileId = profile.id

    // Get user role (only active roles)
    const userRole = await prisma.userRoleAssignment.findFirst({
      where: {
        userId: profileId,
        isActive: true,
      },
      select: {
        role: true,
        tenantId: true,
      },
    })

    if (!userRole) {
      // No role found - return default parent role
      return NextResponse.json({
        role: 'parent',
        tenant: null,
        lmsStatus: {
          hasCompletedCore: false,
          hasCompletedDirector: false,
          hasCompletedVolunteer: false,
        },
      })
    }

    // Get LMS status from the already-fetched profile
    const lmsStatus = {
      hasCompletedCore: profile.hasCompletedLmsCore ?? false,
      hasCompletedDirector: profile.hasCompletedLmsDirector ?? false,
      hasCompletedVolunteer: profile.hasCompletedLmsVolunteer ?? false,
    }

    // Get tenant info if applicable
    let tenant = null
    if (userRole.tenantId) {
      const tenantData = await prisma.tenant.findUnique({
        where: { id: userRole.tenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
        },
      })
      tenant = tenantData
    }

    return NextResponse.json({
      role: userRole.role,
      tenant,
      lmsStatus,
    })
  } catch (error) {
    console.error('Error fetching user info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user info' },
      { status: 500 }
    )
  }
}
