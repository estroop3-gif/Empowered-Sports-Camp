/**
 * Ensure Parent Role API Route
 *
 * POST /api/auth/ensure-parent-role
 *
 * Ensures the authenticated user has a "parent" role assignment.
 * If they already have one, this is a no-op. If not, one is added.
 * This does NOT replace their existing role — it adds an additional assignment.
 *
 * Used during registration login: non-parent users (e.g., coaches) who log in
 * during camp registration need the parent role added to register campers.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import prisma from '@/lib/db/client'

export async function POST(request: NextRequest) {
  const authUser = await getAuthenticatedUserFromRequest(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Find profile by email (handles Cognito sub vs Profile ID mismatch)
    const profile = await prisma.profile.findFirst({
      where: { email: authUser.email },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check if they already have an active parent role
    const existingParentRole = await prisma.userRoleAssignment.findFirst({
      where: {
        userId: profile.id,
        role: 'parent',
        isActive: true,
      },
    })

    if (existingParentRole) {
      return NextResponse.json({ added: false, message: 'Parent role already exists' })
    }

    // Add parent role (no tenantId — parent role is global)
    await prisma.userRoleAssignment.create({
      data: {
        userId: profile.id,
        role: 'parent',
        isActive: true,
      },
    })

    console.log('[EnsureParentRole] Added parent role for user:', profile.id)

    return NextResponse.json({ added: true })
  } catch (error) {
    console.error('[EnsureParentRole] Error:', error)
    return NextResponse.json(
      { error: 'Failed to ensure parent role' },
      { status: 500 }
    )
  }
}
