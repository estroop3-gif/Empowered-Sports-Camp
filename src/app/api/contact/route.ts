/**
 * Contact Form API Route
 *
 * Handles contact form submissions.
 * Saves to database and sends email notifications.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createContactSubmission } from '@/lib/services/contact'
import { notifyAdminSubscribers } from '@/lib/services/admin-alerts'
import { buildContactFormAlertEmail } from '@/lib/email/admin-alerts'

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

    // Notify admin subscribers (branded email + in-app notifications)
    try {
      await notifyAdminSubscribers({
        category: 'system',
        notificationType: 'system_alert',
        title: `New Contact: ${data.inquiryType}`,
        body: `New contact form from ${data.name} (${data.email})`,
        emailContent: buildContactFormAlertEmail(data),
        actionUrl: '/admin/contact',
      })
    } catch (emailError) {
      // Log but don't fail the request if email fails
      console.error('Failed to send contact notification:', emailError)
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
