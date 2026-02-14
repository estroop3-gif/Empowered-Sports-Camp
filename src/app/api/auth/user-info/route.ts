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
import { getCertificationStatus } from '@/lib/services/empoweru'
import { UserRole } from '@/generated/prisma'

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

    // If no profile exists but the user is authenticated in Cognito, auto-create one
    if (!profile && authUser.email) {
      try {
        const newProfile = await prisma.$transaction(async (tx) => {
          const p = await tx.profile.create({
            data: {
              id: authUser.id,
              email: authUser.email,
              firstName: authUser.firstName || null,
              lastName: authUser.lastName || null,
            },
          })

          await tx.userRoleAssignment.create({
            data: {
              userId: authUser.id,
              role: 'parent',
              isActive: true,
            },
          })

          return p
        })

        console.log('[UserInfo] Auto-created profile for authenticated user:', authUser.id)
        profile = newProfile
      } catch (autoCreateErr) {
        console.error('[UserInfo] Failed to auto-create profile:', autoCreateErr)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Security check: ensure the profile matches the authenticated user's email
    if (!profile || profile.email !== authUser.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use the profile ID for role lookup
    const profileId = profile.id

    // Get user role (only active roles) - highest priority role
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

    // Check if user also has a parent role (for users whose primary role is something else)
    let hasParentRole = false
    if (userRole && userRole.role !== 'parent') {
      const parentRoleAssignment = await prisma.userRoleAssignment.findFirst({
        where: {
          userId: profileId,
          role: 'parent',
          isActive: true,
        },
        select: { id: true },
      })
      hasParentRole = !!parentRoleAssignment
    } else if (userRole?.role === 'parent') {
      hasParentRole = true
    }

    if (!userRole) {
      // No role found - return default parent role
      return NextResponse.json({
        profileId: profileId, // Return profile ID so client can use it for queries
        role: 'parent',
        hasParentRole: true,
        tenant: null,
        lmsStatus: {
          hasCompletedCore: false,
          hasCompletedDirector: false,
          hasCompletedVolunteer: false,
          isCertified: true, // Parents don't need certification
          certifiedAt: null,
          certificateUrl: null,
          certificateNumber: null,
        },
      })
    }

    // Get legacy LMS status from the already-fetched profile
    const legacyLmsStatus = {
      hasCompletedCore: profile.hasCompletedLmsCore ?? false,
      hasCompletedDirector: profile.hasCompletedLmsDirector ?? false,
      hasCompletedVolunteer: profile.hasCompletedLmsVolunteer ?? false,
    }

    // Get certification status for the user's role
    const role = userRole.role as UserRole
    const tenantId = userRole.tenantId || undefined

    // HQ Admin and Parent don't need certification
    let certStatus = {
      isCertified: true,
      certifiedAt: null as string | null,
      certificateUrl: null as string | null,
      certificateNumber: null as string | null,
    }

    if (role !== 'hq_admin' && role !== 'parent') {
      const { data } = await getCertificationStatus(profileId, role, tenantId)
      if (data) {
        certStatus = data
      } else {
        certStatus.isCertified = false
      }
    }

    // Combine legacy and new certification status
    const lmsStatus = {
      ...legacyLmsStatus,
      ...certStatus,
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
      profileId: profileId, // Return profile ID so client can use it for queries
      role: userRole.role,
      hasParentRole,
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
