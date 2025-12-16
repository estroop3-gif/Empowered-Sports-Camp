/**
 * Coach Single Athlete API
 *
 * GET /api/coach/athletes/[athleteId] - Get athlete details (read-only for coaches)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth/server'
import prisma from '@/lib/db/client'

interface RouteParams {
  params: Promise<{ athleteId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'coach') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!user.id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
    }

    const { athleteId } = await params

    // Verify coach has access to this athlete (through their camps)
    const coachAssignments = await prisma.campStaffAssignment.findMany({
      where: {
        userId: user.id,
        role: 'coach',
      },
      select: { campId: true },
    })

    const campIds = coachAssignments.map((a: { campId: string }) => a.campId)

    if (campIds.length === 0) {
      return NextResponse.json({ error: 'No camps assigned' }, { status: 403 })
    }

    // Check if athlete has registration in any of coach's camps
    const registration = await prisma.registration.findFirst({
      where: {
        athleteId,
        campId: { in: campIds },
        status: { not: 'cancelled' },
      },
    })

    if (!registration) {
      return NextResponse.json({ error: 'Athlete not in your camps' }, { status: 403 })
    }

    // Fetch athlete with limited info (no internal notes for coaches)
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      include: {
        parent: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        registrations: {
          where: { campId: { in: campIds } },
          include: {
            camp: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!athlete) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 })
    }

    // Transform for response - exclude internal notes for coaches
    const athleteData = {
      id: athlete.id,
      first_name: athlete.firstName,
      last_name: athlete.lastName,
      date_of_birth: athlete.dateOfBirth.toISOString().split('T')[0],
      gender: athlete.gender,
      grade: athlete.grade,
      school: athlete.school,
      medical_notes: athlete.medicalNotes,
      allergies: athlete.allergies,
      emergency_contact_name: athlete.emergencyContactName,
      emergency_contact_phone: athlete.emergencyContactPhone,
      emergency_contact_relationship: athlete.emergencyContactRelationship,
      t_shirt_size: athlete.tShirtSize,
      primary_sport_interest: athlete.primarySportInterest,
      secondary_sport_interest: athlete.secondarySportInterest,
      pickup_notes: athlete.pickupNotes,
      is_active: athlete.isActive,
      // Risk flag visible to coaches for safety
      risk_flag: athlete.riskFlag,
      // Internal notes NOT visible to coaches
      parent: athlete.parent ? {
        id: athlete.parent.id,
        email: athlete.parent.email,
        first_name: athlete.parent.firstName,
        last_name: athlete.parent.lastName,
        phone: athlete.parent.phone,
      } : null,
    }

    const registrations = athlete.registrations.map(reg => ({
      id: reg.id,
      camp_id: reg.campId,
      camp_name: reg.camp.name,
      camp_start_date: reg.camp.startDate.toISOString().split('T')[0],
      camp_end_date: reg.camp.endDate.toISOString().split('T')[0],
      status: reg.status,
    }))

    return NextResponse.json({
      athlete: athleteData,
      registrations,
    })
  } catch (error) {
    console.error('[API] GET /api/coach/athletes/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
