/**
 * Camp Check-In API
 *
 * POST /api/camp-checkin
 *
 * Performs check-in for one or more athletes.
 * Used by parent QR check-in flow and director manual check-in.
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkInAthlete, completeOnboarding } from '@/lib/services/attendance'
import { getOrCreateCampDay } from '@/lib/services/camp-days'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'

interface CheckInRequest {
  camp_id: string
  athletes: {
    athlete_id: string
    registration_id: string
  }[]
  onboarding?: {
    athlete_id: string
    emergency_contact_confirmed: boolean
    medical_info_confirmed: boolean
    pickup_auth_confirmed: boolean
    waiver_accepted: boolean
  }[]
}

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body: CheckInRequest = await request.json()
    const { camp_id, athletes, onboarding } = body

    if (!camp_id || !athletes?.length) {
      return NextResponse.json(
        { error: 'Camp ID and at least one athlete are required' },
        { status: 400 }
      )
    }

    // Get or create camp day for today
    const { data: campDay, error: dayError } = await getOrCreateCampDay(
      camp_id,
      new Date()
    )

    if (dayError || !campDay) {
      return NextResponse.json(
        { error: dayError?.message || 'Failed to get camp day' },
        { status: 400 }
      )
    }

    // Process onboarding first if provided
    if (onboarding?.length) {
      for (const ob of onboarding) {
        await completeOnboarding({
          parentProfileId: user.id,
          campId: camp_id,
          athleteId: ob.athlete_id,
          emergencyContactConfirmed: ob.emergency_contact_confirmed,
          medicalInfoConfirmed: ob.medical_info_confirmed,
          pickupAuthConfirmed: ob.pickup_auth_confirmed,
          waiverAccepted: ob.waiver_accepted,
        })
      }
    }

    // Check in each athlete
    const results = []
    const errors = []

    for (const athlete of athletes) {
      const { data, error } = await checkInAthlete({
        campDayId: campDay.id,
        athleteId: athlete.athlete_id,
        parentProfileId: user.id,
        registrationId: athlete.registration_id,
        method: 'qr',
        checkedInByUserId: user.id,
      })

      if (error) {
        errors.push({
          athlete_id: athlete.athlete_id,
          error: error.message,
        })
      } else if (data) {
        results.push(data)
      }
    }

    if (errors.length > 0 && results.length === 0) {
      return NextResponse.json(
        { error: 'Failed to check in athletes', details: errors },
        { status: 400 }
      )
    }

    return NextResponse.json({
      data: {
        checked_in: results.length,
        camp_day_id: campDay.id,
        results,
        errors: errors.length > 0 ? errors : undefined,
      },
    })
  } catch (error) {
    console.error('[POST /api/camp-checkin] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
