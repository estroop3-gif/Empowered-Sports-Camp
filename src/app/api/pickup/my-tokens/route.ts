/**
 * Parent Pickup Tokens API
 *
 * GET /api/pickup/my-tokens - Get pickup tokens for current parent's athletes
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPickupTokenForParent, generatePickupTokenForAthlete } from '@/lib/services/pickup-tokens'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import prisma from '@/lib/db/client'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get today's date
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find all camp days for today where the parent has checked-in athletes
    const attendanceRecords = await prisma.campAttendance.findMany({
      where: {
        parentProfileId: user.id,
        status: 'checked_in',
        campDay: {
          date: today,
        },
      },
      include: {
        athlete: true,
        campDay: {
          include: {
            camp: true,
          },
        },
      },
    })

    // Get or generate tokens for each attendance
    const tokens = []

    for (const attendance of attendanceRecords) {
      // Try to get existing token
      let { data: token } = await getPickupTokenForParent({
        campDayId: attendance.campDayId,
        athleteId: attendance.athleteId,
        parentProfileId: user.id,
      })

      // If no token exists, try to generate one
      if (!token) {
        const generated = await generatePickupTokenForAthlete({
          campDayId: attendance.campDayId,
          athleteId: attendance.athleteId,
          parentProfileId: user.id,
        })

        if (generated.data) {
          // Re-fetch with details
          const refreshed = await getPickupTokenForParent({
            campDayId: attendance.campDayId,
            athleteId: attendance.athleteId,
            parentProfileId: user.id,
          })
          token = refreshed.data
        }
      }

      if (token) {
        tokens.push(token)
      } else {
        // Return basic info if token not yet available
        tokens.push({
          athlete: {
            id: attendance.athlete.id,
            first_name: attendance.athlete.firstName,
            last_name: attendance.athlete.lastName,
            photo_url: attendance.athlete.photoUrl,
          },
          camp: {
            id: attendance.campDay.camp.id,
            name: attendance.campDay.camp.name,
          },
          camp_day: {
            id: attendance.campDay.id,
            date: attendance.campDay.date.toISOString().split('T')[0],
            day_number: attendance.campDay.dayNumber,
          },
          status: 'checked_in',
          token_available: false,
          message: 'Pickup codes will be available when dismissal begins',
        })
      }
    }

    return NextResponse.json({ data: tokens })
  } catch (error) {
    console.error('[GET /api/pickup/my-tokens] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
