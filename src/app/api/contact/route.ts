/**
 * Contact Form API Route
 *
 * Handles contact form submissions.
 * Saves to database and sends email notifications.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createContactSubmission } from '@/lib/services/contact'
import { sendTransactionalEmail } from '@/lib/services/email'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ops@empoweredathletes.com'

interface ContactFormData {
  name: string
  email: string
  phone?: string
  inquiryType: string
  athleteInfo?: string
  organization?: string
  location?: string
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const data: ContactFormData = await request.json()

    // Basic validation
    if (!data.name || !data.email || !data.inquiryType || !data.message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Save to database
    const { data: submission, error } = await createContactSubmission({
      name: data.name,
      email: data.email,
      phone: data.phone,
      inquiry_type: data.inquiryType,
      message: data.message,
      athlete_info: data.athleteInfo,
      organization: data.organization,
      location: data.location,
    })

    if (error) {
      console.error('Failed to save contact submission:', error)
      return NextResponse.json(
        { error: 'Failed to save submission. Please try again.' },
        { status: 500 }
      )
    }

    // Log for dev visibility
    console.log('Contact form submission saved:', {
      id: submission?.id,
      name: data.name,
      email: data.email,
      inquiryType: data.inquiryType,
    })

    // Send email notification to admin
    try {
      await sendTransactionalEmail({
        templateCode: 'SYSTEM_ALERT',
        to: ADMIN_EMAIL,
        context: {
          title: `New Contact Form Submission: ${data.inquiryType}`,
          message: `New contact form submission from ${data.name} (${data.email}).\n\nInquiry Type: ${data.inquiryType}\n\nMessage: ${data.message}${data.phone ? `\n\nPhone: ${data.phone}` : ''}${data.organization ? `\n\nOrganization: ${data.organization}` : ''}${data.location ? `\n\nLocation: ${data.location}` : ''}`,
          actionUrl: '/admin/contacts',
        },
      })
    } catch (emailError) {
      // Log but don't fail the request if email fails
      console.error('Failed to send contact notification email:', emailError)
    }

    return NextResponse.json({
      success: true,
      message: 'Contact form submitted successfully',
    })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to process contact form' },
      { status: 500 }
    )
  }
}
