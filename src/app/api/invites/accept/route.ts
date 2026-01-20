/**
 * Accept Invite API
 *
 * POST /api/invites/accept - Accept an invite and assign role
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { acceptInvite, getInviteByToken } from '@/lib/services/role-invites'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ data: null, error: 'Token is required' }, { status: 400 })
    }

    // Get the invite first to check if email matches
    const { data: invite, error: getError } = await getInviteByToken(token)
    if (getError || !invite) {
      return NextResponse.json(
        { data: null, error: getError?.message || 'Invalid invite' },
        { status: 400 }
      )
    }

    // Verify the email matches (case-insensitive)
    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json(
        {
          data: null,
          error: `This invite was sent to ${invite.email}. Please sign in with that email address.`,
        },
        { status: 403 }
      )
    }

    // Accept the invite
    const { data, error } = await acceptInvite(token, user.id)

    if (error || !data) {
      return NextResponse.json(
        { data: null, error: error?.message || 'Failed to accept invite' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      data: {
        success: true,
        role: invite.targetRole,
        message: `Welcome! You have been assigned the ${invite.targetRole} role.`,
      },
      error: null,
    })
  } catch (err) {
    console.error('Error in POST /api/invites/accept:', err)
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
  }
}
