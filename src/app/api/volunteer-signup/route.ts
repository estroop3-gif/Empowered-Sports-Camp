/**
 * Volunteer Sign-Up API Route
 *
 * Handles volunteer sign-up submissions (public, no auth).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createVolunteerSignup } from '@/lib/services/volunteer-signups'

interface VolunteerSignupFormData {
  firstName: string
  lastName: string
  age: number
  incomingGrade: string
  phone: string
  campIds: string[]
  notes?: string
}

export async function POST(request: NextRequest) {
  try {
    const formData: VolunteerSignupFormData = await request.json()

    // Validate required fields
    const errors: string[] = []
    if (!formData.firstName?.trim()) errors.push('firstName')
    if (!formData.lastName?.trim()) errors.push('lastName')
    if (!formData.age || formData.age < 1) errors.push('age')
    if (!formData.incomingGrade?.trim()) errors.push('incomingGrade')
    if (!formData.phone?.trim()) errors.push('phone')
    if (!formData.campIds?.length) errors.push('campIds')

    if (errors.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${errors.join(', ')}` },
        { status: 400 }
      )
    }

    const { data: signup, error } = await createVolunteerSignup({
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      age: formData.age,
      incoming_grade: formData.incomingGrade,
      phone: formData.phone.trim(),
      camp_ids: formData.campIds,
      notes: formData.notes?.trim() || undefined,
    })

    if (error) {
      console.error('Failed to create volunteer signup:', error)
      return NextResponse.json(
        { error: 'Failed to save sign-up. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      signupId: signup?.id,
    })
  } catch (error) {
    console.error('Volunteer signup error:', error)
    return NextResponse.json(
      { error: 'Failed to process volunteer sign-up' },
      { status: 500 }
    )
  }
}
