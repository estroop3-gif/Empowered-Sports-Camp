/**
 * Guest Squad Invite API
 *
 * Allows non-authenticated users to send squad invites during registration.
 * Invites are stored with the inviter's email and claimed when accounts are created.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { sendCampInviteEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      inviterEmail,
      inviterName,
      inviteeEmail,
      campId,
      campName,
      tenantId,
      athleteNames, // Names of athletes being registered
    } = body

    // Validate required fields
    if (!inviterEmail || !inviteeEmail || !campId) {
      return NextResponse.json(
        { error: 'inviterEmail, inviteeEmail, and campId are required' },
        { status: 400 }
      )
    }

    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviterEmail) || !emailRegex.test(inviteeEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const isSelfInvite = inviterEmail.toLowerCase() === inviteeEmail.toLowerCase()

    // Check if invite already exists (skip for self-invites so user can re-send)
    if (!isSelfInvite) {
      const existingInvite = await prisma.pendingSquadInvite.findFirst({
        where: {
          inviterEmail: inviterEmail.toLowerCase(),
          invitedEmail: inviteeEmail.toLowerCase(),
          campId: campId,
          status: 'pending',
        },
      })

      if (existingInvite) {
        return NextResponse.json(
          { error: 'You have already sent an invite to this email for this camp' },
          { status: 400 }
        )
      }
    }

    // Get camp details (needed for tenantId fallback and email)
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: {
        name: true,
        tenantId: true,
        startDate: true,
        endDate: true,
        slug: true,
        location: {
          select: {
            name: true,
            city: true,
            state: true,
          },
        },
      },
    })

    // Resolve tenantId: use provided value, fall back to camp's tenantId
    const resolvedTenantId = tenantId || camp?.tenantId
    if (!resolvedTenantId) {
      return NextResponse.json(
        { error: 'Could not determine tenant for this camp' },
        { status: 400 }
      )
    }

    // Create pending squad invite
    const invite = await prisma.pendingSquadInvite.create({
      data: {
        inviterEmail: inviterEmail.toLowerCase(),
        invitedByName: inviterName || 'A friend',
        invitedEmail: inviteeEmail.toLowerCase(),
        campId: campId,
        campName: campName || camp?.name || 'Camp',
        tenantId: resolvedTenantId,
        athleteNames: athleteNames || [],
        status: 'pending',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    })

    // Send branded invite email
    let emailSent = false
    let emailError: string | null = null
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://empoweredathletes.com'
      const registerUrl = `${baseUrl}/register/${camp?.slug || campId}?squadInvite=${invite.id}`

      // Format dates
      const dateOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
      const campDates = camp
        ? `${new Date(camp.startDate).toLocaleDateString('en-US', dateOpts)} – ${new Date(camp.endDate).toLocaleDateString('en-US', dateOpts)}`
        : ''

      const campLocation = camp?.location
        ? `${camp.location.name}${camp.location.city ? `, ${camp.location.city}` : ''}${camp.location.state ? `, ${camp.location.state}` : ''}`
        : null

      const result = await sendCampInviteEmail({
        to: inviteeEmail,
        inviterName: inviterName || 'A friend',
        friendName: '',
        campName: campName || camp?.name || 'Camp',
        campDates,
        campLocation,
        registerUrl,
      })

      emailSent = result.success
      if (!result.success) {
        emailError = result.error || 'Unknown email error'
        console.error('[Guest Squad Invite API] Email send failed:', emailError)
      }
    } catch (err) {
      emailError = err instanceof Error ? err.message : String(err)
      console.error('[Guest Squad Invite API] Email send threw:', emailError)
    }

    return NextResponse.json({
      success: true,
      emailSent,
      emailError: emailSent ? undefined : emailError,
      data: {
        id: invite.id,
        inviteeEmail: inviteeEmail,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Guest Squad Invite API] Error:', message, error)
    return NextResponse.json(
      { error: 'Failed to send invite. Please try again.' },
      { status: 500 }
    )
  }
}

// Get pending invites for an email (used when someone registers)
export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email')
    const campId = request.nextUrl.searchParams.get('campId')

    if (!email) {
      return NextResponse.json(
        { error: 'email is required' },
        { status: 400 }
      )
    }

    const invites = await prisma.pendingSquadInvite.findMany({
      where: {
        invitedEmail: email.toLowerCase(),
        status: 'pending',
        expiresAt: { gt: new Date() },
        ...(campId ? { campId: campId } : {}),
      },
      select: {
        id: true,
        inviterEmail: true,
        invitedByName: true,
        campId: true,
        campName: true,
        athleteNames: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ data: invites })
  } catch (error) {
    console.error('[Guest Squad Invite API] GET Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    )
  }
}
