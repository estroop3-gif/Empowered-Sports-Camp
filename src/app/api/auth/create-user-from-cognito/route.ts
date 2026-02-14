/**
 * Create User from Cognito API Route
 *
 * POST /api/auth/create-user-from-cognito
 *
 * Fallback endpoint for creating a DB profile when sessionStorage data
 * is unavailable (e.g., user navigated away before verifying email).
 * Pulls user attributes directly from Cognito.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/client'
import { adminGetCognitoUser } from '@/lib/auth/cognito-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Missing required field: email' },
        { status: 400 }
      )
    }

    // Look up the user in Cognito to get their attributes
    const cognitoUser = await adminGetCognitoUser(email)

    if (!cognitoUser) {
      return NextResponse.json(
        { error: 'User not found in Cognito' },
        { status: 404 }
      )
    }

    // Only create profiles for confirmed users
    if (cognitoUser.status !== 'CONFIRMED') {
      return NextResponse.json(
        { error: 'User is not confirmed in Cognito' },
        { status: 400 }
      )
    }

    // Check if profile already exists (by Cognito sub or email)
    const existingById = await prisma.profile.findUnique({
      where: { id: cognitoUser.sub },
    })

    if (existingById) {
      return NextResponse.json({
        message: 'Profile already exists',
        profileId: existingById.id,
      })
    }

    const existingByEmail = await prisma.profile.findFirst({
      where: { email: cognitoUser.email },
    })

    if (existingByEmail) {
      return NextResponse.json({
        message: 'Profile already exists',
        profileId: existingByEmail.id,
      })
    }

    // Create profile and default parent role in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.create({
        data: {
          id: cognitoUser.sub,
          email: cognitoUser.email,
          firstName: cognitoUser.givenName || null,
          lastName: cognitoUser.familyName || null,
        },
      })

      const roleAssignment = await tx.userRoleAssignment.create({
        data: {
          userId: cognitoUser.sub,
          role: 'parent',
          isActive: true,
        },
      })

      return { profile, roleAssignment }
    })

    console.log('[CreateUserFromCognito] Created profile for:', cognitoUser.sub)

    return NextResponse.json({
      success: true,
      profileId: result.profile.id,
      role: result.roleAssignment.role,
    })
  } catch (error) {
    console.error('[CreateUserFromCognito] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create user profile' },
      { status: 500 }
    )
  }
}
