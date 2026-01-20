/**
 * Create User API Route
 *
 * POST /api/auth/create-user
 *
 * Creates a user profile and default role assignment in the database
 * after Cognito signup. Called from the signup page.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      email,
      firstName,
      lastName,
      phone,
      city,
      state,
      zipCode,
    } = body

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and email' },
        { status: 400 }
      )
    }

    // Check if profile already exists
    const existingProfile = await prisma.profile.findUnique({
      where: { id: userId },
    })

    if (existingProfile) {
      return NextResponse.json(
        { message: 'Profile already exists', profileId: existingProfile.id },
        { status: 200 }
      )
    }

    // Create profile and default role in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the profile
      const profile = await tx.profile.create({
        data: {
          id: userId,
          email,
          firstName: firstName || null,
          lastName: lastName || null,
          phone: phone || null,
          city: city || null,
          state: state || null,
          zipCode: zipCode || null,
        },
      })

      // Create default parent role assignment
      const roleAssignment = await tx.userRoleAssignment.create({
        data: {
          userId,
          role: 'parent',
          isActive: true,
        },
      })

      return { profile, roleAssignment }
    })

    console.log('[CreateUser] Created profile and role for:', userId)

    return NextResponse.json({
      success: true,
      profileId: result.profile.id,
      role: result.roleAssignment.role,
    })
  } catch (error) {
    console.error('[CreateUser] Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user profile' },
      { status: 500 }
    )
  }
}
