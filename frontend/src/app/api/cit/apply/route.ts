/**
 * CIT Application API Route
 *
 * Handles CIT program application submissions.
 * - Saves application to database
 * - Sends confirmation email to applicant
 * - Sends notification email to admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { createCitApplication } from '@/lib/services/cit'
import {
  sendCitApplicantConfirmationEmail,
  sendCitAdminNotificationEmail,
} from '@/lib/email'

interface CITApplicationFormData {
  // Applicant Info
  firstName: string
  lastName: string
  email: string
  phone?: string
  city?: string
  state?: string

  // School Info
  schoolName?: string
  gradeLevel?: string
  graduationYear?: string

  // Sports Experience
  sportsPlayed?: string
  experienceSummary?: string

  // Parent/Guardian Info
  parentName?: string
  parentEmail?: string
  parentPhone?: string

  // Availability
  availabilityNotes?: string

  // Essays
  whyCit?: string
  leadershipExperience?: string

  // Additional
  howHeard?: string
}

export async function POST(request: NextRequest) {
  try {
    const formData: CITApplicationFormData = await request.json()

    // Basic validation
    const requiredFields = ['firstName', 'lastName', 'email']

    const missingFields = requiredFields.filter(
      (field) => !formData[field as keyof CITApplicationFormData]
    )

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }
    if (formData.parentEmail && !emailRegex.test(formData.parentEmail)) {
      return NextResponse.json(
        { error: 'Invalid parent/guardian email format' },
        { status: 400 }
      )
    }

    // Create application in database
    const { data: application, error } = await createCitApplication({
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      city: formData.city,
      state: formData.state,
      school_name: formData.schoolName,
      grade_level: formData.gradeLevel,
      graduation_year: formData.graduationYear,
      sports_played: formData.sportsPlayed,
      experience_summary: formData.experienceSummary,
      why_cit: formData.whyCit,
      leadership_experience: formData.leadershipExperience,
      availability_notes: formData.availabilityNotes,
      parent_name: formData.parentName,
      parent_email: formData.parentEmail,
      parent_phone: formData.parentPhone,
      how_heard: formData.howHeard,
    })

    if (error) {
      console.error('Failed to create CIT application:', error)
      return NextResponse.json(
        { error: 'Failed to save application. Please try again.' },
        { status: 500 }
      )
    }

    // Send confirmation email to applicant (don't fail if email fails)
    const applicantEmailResult = await sendCitApplicantConfirmationEmail({
      to: formData.email,
      applicantName: formData.firstName,
    })

    if (!applicantEmailResult.success) {
      console.error(
        'Failed to send applicant confirmation email:',
        applicantEmailResult.error
      )
    }

    // Send notification email to admin (don't fail if email fails)
    const adminEmailResult = await sendCitAdminNotificationEmail({
      application: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        schoolName: formData.schoolName,
        gradeLevel: formData.gradeLevel,
        sportsPlayed: formData.sportsPlayed,
        whyCit: formData.whyCit,
        parentName: formData.parentName,
        parentEmail: formData.parentEmail,
      },
    })

    if (!adminEmailResult.success) {
      console.error(
        'Failed to send admin notification email:',
        adminEmailResult.error
      )
    }

    return NextResponse.json({
      success: true,
      message: 'CIT application submitted successfully',
      applicationId: application?.id,
    })
  } catch (error) {
    console.error('CIT application error:', error)
    return NextResponse.json(
      { error: 'Failed to process CIT application' },
      { status: 500 }
    )
  }
}
