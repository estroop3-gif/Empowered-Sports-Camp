/**
 * Guest Squad Invite API
 *
 * Allows non-authenticated users to send squad invites during registration.
 * Invites are stored with the inviter's email and claimed when accounts are created.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { sendEmail } from '@/lib/email/ses-client'

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

    // Can't invite yourself
    if (inviterEmail.toLowerCase() === inviteeEmail.toLowerCase()) {
      return NextResponse.json(
        { error: "You can't invite yourself" },
        { status: 400 }
      )
    }

    // Check if invite already exists
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

    // Create pending squad invite
    const invite = await prisma.pendingSquadInvite.create({
      data: {
        inviterEmail: inviterEmail.toLowerCase(),
        invitedByName: inviterName || 'A friend',
        invitedEmail: inviteeEmail.toLowerCase(),
        campId: campId,
        campName: campName || 'Camp',
        tenantId: tenantId,
        athleteNames: athleteNames || [],
        status: 'pending',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    })

    // Get camp details for the email
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: {
        name: true,
        startDate: true,
        endDate: true,
        slug: true,
      },
    })

    // Send invite email
    try {
      const registerUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://empoweredathletes.com'}/register/${camp?.slug || campId}?squadInvite=${invite.id}`

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #000; padding: 20px; text-align: center;">
            <h1 style="color: #CCFF00; margin: 0; font-size: 24px;">EMPOWERED ATHLETES</h1>
          </div>
          <div style="padding: 30px; background: #1a1a1a; color: #fff;">
            <h2 style="color: #CCFF00; margin-top: 0;">You're Invited to Build Her Squad!</h2>
            <p style="color: #ccc; line-height: 1.6;">
              <strong style="color: #fff;">${inviterName || 'A friend'}</strong> is registering their athlete(s) for
              <strong style="color: #CCFF00;">${campName || camp?.name || 'camp'}</strong> and wants your daughter to be in the same group!
            </p>
            ${athleteNames && athleteNames.length > 0 ? `
              <p style="color: #ccc;">Athletes being registered: <strong style="color: #fff;">${athleteNames.join(', ')}</strong></p>
            ` : ''}
            <p style="color: #ccc; line-height: 1.6;">
              When athletes are in the same squad, they'll be placed in the same activity groups during camp.
              Perfect for friends who want to stick together!
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${registerUrl}"
                 style="display: inline-block; background: #CCFF00; color: #000; padding: 15px 30px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                Register & Join Squad
              </a>
            </div>
            <p style="color: #666; font-size: 12px; text-align: center;">
              This invite expires in 30 days.
            </p>
          </div>
          <div style="background: #000; padding: 15px; text-align: center;">
            <p style="color: #666; margin: 0; font-size: 12px;">
              © ${new Date().getFullYear()} Empowered Athletes. All rights reserved.
            </p>
          </div>
        </div>
      `

      const result = await sendEmail({
        to: inviteeEmail,
        subject: `${inviterName || 'A friend'} wants your daughter to join their camp squad!`,
        html: emailHtml,
      })

      if (!result.success) {
        console.error('SES error sending guest squad invite:', result.error)
      }
    } catch (emailError) {
      console.error('Failed to send squad invite email:', emailError)
      // Don't fail the request if email fails - invite is still created
    }

    return NextResponse.json({
      success: true,
      data: {
        id: invite.id,
        inviteeEmail: inviteeEmail,
      },
    })
  } catch (error) {
    console.error('[Guest Squad Invite API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to send invite' },
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
