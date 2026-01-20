/**
 * Role Invites API
 *
 * POST /api/invites - Create and send a role invite
 * GET /api/invites - List invites sent by the current user
 * GET /api/invites?token=xxx - Get invite details by token (public)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest, getUserRoles } from '@/lib/auth/cognito-server'
import {
  createRoleInvite,
  getInviteByToken,
  listInvitesByUser,
  canInviteRole,
  getInvitableRoles,
  getRoleDisplayName,
  markInviteEmailSent,
} from '@/lib/services/role-invites'
import { sendRoleInviteEmail } from '@/lib/email/role-invites'
import { UserRole } from '@/generated/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    // Public endpoint: Get invite by token
    if (token) {
      const { data, error } = await getInviteByToken(token)

      if (error || !data) {
        return NextResponse.json(
          { data: null, error: error?.message || 'Invite not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        data: {
          ...data,
          roleDisplayName: getRoleDisplayName(data.targetRole),
        },
        error: null,
      })
    }

    // Protected endpoint: List user's sent invites
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    const status = searchParams.get('status') || undefined
    const { data, error } = await listInvitesByUser(user.id, { status })

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, error: null })
  } catch (err) {
    console.error('Error in GET /api/invites:', err)
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email, firstName, lastName, phone, targetRole, tenantId, notes, sendEmail = true } = body

    // Validate required fields
    if (!email || !targetRole) {
      return NextResponse.json(
        { data: null, error: 'email and targetRole are required' },
        { status: 400 }
      )
    }

    // Validate target role
    const validRoles: UserRole[] = ['parent', 'coach', 'director', 'licensee_owner', 'hq_admin', 'cit_volunteer']
    if (!validRoles.includes(targetRole)) {
      return NextResponse.json(
        { data: null, error: 'Invalid target role' },
        { status: 400 }
      )
    }

    // Get user's roles
    const userRoles = await getUserRoles(user.id)
    const userPrimaryRole = userRoles[0]?.role || user.role || 'parent'

    // Check if user can invite this role
    if (!canInviteRole(userPrimaryRole, targetRole)) {
      const invitableRoles = getInvitableRoles(userPrimaryRole)
      return NextResponse.json(
        {
          data: null,
          error: `You cannot invite ${getRoleDisplayName(targetRole)}. You can invite: ${invitableRoles.map(getRoleDisplayName).join(', ') || 'none'}`,
        },
        { status: 403 }
      )
    }

    // Create the invite
    const { data: invite, error } = await createRoleInvite({
      invitedByUserId: user.id,
      invitedByRole: userPrimaryRole,
      email,
      firstName,
      lastName,
      phone,
      targetRole,
      tenantId: tenantId || userRoles[0]?.tenantId,
      notes,
    })

    if (error || !invite) {
      return NextResponse.json(
        { data: null, error: error?.message || 'Failed to create invite' },
        { status: 400 }
      )
    }

    // Send invite email if requested
    if (sendEmail) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || ''
      const inviteUrl = `${baseUrl}/join?token=${invite.token}`

      const emailResult = await sendRoleInviteEmail({
        to: invite.email,
        firstName: invite.firstName || '',
        lastName: invite.lastName || '',
        targetRole: invite.targetRole,
        inviterName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        inviteUrl,
        expiresAt: invite.expiresAt,
      })

      if (emailResult.success) {
        await markInviteEmailSent(invite.id)
      }
    }

    return NextResponse.json({
      data: {
        ...invite,
        roleDisplayName: getRoleDisplayName(invite.targetRole),
      },
      error: null,
    })
  } catch (err) {
    console.error('Error in POST /api/invites:', err)
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
  }
}
