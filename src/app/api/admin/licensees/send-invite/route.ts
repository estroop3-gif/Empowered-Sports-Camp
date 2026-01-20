/**
 * Send Licensee Invite API
 * POST /api/admin/licensees/send-invite
 *
 * Sends or resends a licensee application invite email.
 * Requires HQ Admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { getLicenseeById } from '@/lib/services/licensees'
import { sendLicenseeApplicationEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    // Only HQ admins can send licensee invites
    if (user.role?.toLowerCase() !== 'hq_admin') {
      return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { licenseeId } = body

    if (!licenseeId) {
      return NextResponse.json({ data: null, error: 'licenseeId required' }, { status: 400 })
    }

    // Get licensee data
    const { data: licensee, error: fetchError } = await getLicenseeById(licenseeId)
    if (fetchError || !licensee) {
      return NextResponse.json(
        { data: null, error: fetchError?.message || 'Licensee not found' },
        { status: 404 }
      )
    }

    // Generate application URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || ''
    const applicationUrl = `${baseUrl}/apply/licensee?token=${licenseeId}`

    // Send the email
    const result = await sendLicenseeApplicationEmail({
      to: licensee.email,
      subject: `Complete Your Licensee Application - ${licensee.territory_name || 'Empowered Sports Camp'}`,
      firstName: licensee.first_name || '',
      lastName: licensee.last_name || '',
      territoryName: licensee.territory_name || 'Your Territory',
      applicationUrl,
    })

    if (!result.success) {
      return NextResponse.json(
        { data: null, error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        success: true,
        messageId: result.messageId,
        sentTo: licensee.email,
      },
      error: null,
    })
  } catch (err) {
    console.error('Error in POST /api/admin/licensees/send-invite:', err)
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
