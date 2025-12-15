/**
 * Public Host a Camp Application API Route
 *
 * Handles public submissions for licensee/franchise applications.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createLicenseeApplication } from '@/lib/services/licensee-application'
import { sendTransactionalEmail } from '@/lib/services/email'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ops@empoweredathletes.com'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const requiredFields = ['first_name', 'last_name', 'email', 'territory_interest', 'why_interested']
    for (const field of requiredFields) {
      if (!body[field]?.trim()) {
        return NextResponse.json(
          { error: `${field.replace(/_/g, ' ')} is required` },
          { status: 400 }
        )
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      )
    }

    // Create the application
    const { data, error } = await createLicenseeApplication({
      first_name: body.first_name.trim(),
      last_name: body.last_name.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone?.trim() || undefined,
      company_name: body.company_name?.trim() || undefined,
      website: body.website?.trim() || undefined,
      city: body.city?.trim() || undefined,
      state: body.state?.trim() || undefined,
      territory_interest: body.territory_interest.trim(),
      business_experience: body.business_experience?.trim() || undefined,
      sports_background: body.sports_background?.trim() || undefined,
      why_interested: body.why_interested.trim(),
      investment_capacity: body.investment_capacity?.trim() || undefined,
      how_heard: body.how_heard?.trim() || undefined,
    })

    if (error) {
      console.error('Failed to create licensee application:', error)
      return NextResponse.json(
        { error: 'Failed to submit application. Please try again.' },
        { status: 500 }
      )
    }

    // Send email notifications
    try {
      // Notify admin of new application
      await sendTransactionalEmail({
        templateCode: 'LICENSEE_APPLICATION',
        to: ADMIN_EMAIL,
        context: {
          applicantName: `${body.first_name} ${body.last_name}`,
          city: body.city || 'Not specified',
          state: body.state || 'Not specified',
          applicationId: data?.id,
        },
      })

      // Send confirmation to applicant
      await sendTransactionalEmail({
        templateCode: 'LICENSEE_STATUS_UPDATE',
        to: body.email,
        context: {
          applicantName: body.first_name,
          status: 'received',
        },
      })
    } catch (emailError) {
      // Log but don't fail the request if email fails
      console.error('Failed to send application notification emails:', emailError)
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data?.id,
        message: 'Application submitted successfully',
      },
    })
  } catch (error) {
    console.error('Host a Camp application error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
