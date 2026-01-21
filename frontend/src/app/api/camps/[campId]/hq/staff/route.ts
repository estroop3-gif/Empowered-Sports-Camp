/**
 * Camp HQ Staff API
 *
 * GET /api/camps/[campId]/hq/staff - Get staff assignments for a camp
 * POST /api/camps/[campId]/hq/staff - Add a staff assignment or send request
 *   - If userId is provided (existing user): Creates a request for them to accept/decline
 *   - If no userId (ad-hoc staff): Creates direct assignment
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCampHqStaff, addStaffAssignment } from '@/lib/services/campHq'
import { createStaffAssignmentRequest } from '@/lib/services/staffAssignmentRequests'
import { notifyStaffAssignmentRequestReceived } from '@/lib/services/notifications'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import prisma from '@/lib/db/client'

interface RouteParams {
  params: Promise<{ campId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { campId } = await params
    const user = await getAuthenticatedUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await getCampHqStaff(campId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/camps/[campId]/hq/staff error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { campId } = await params
    const user = await getAuthenticatedUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, role, isLead, callTime, endTime, notes, stationName, adHocFirstName, adHocLastName, adHocEmail, adHocPhone } = body

    // If userId is provided, create a request for existing user
    if (userId) {
      const { data, error } = await createStaffAssignmentRequest({
        campId,
        requestedUserId: userId,
        requestedByUserId: user.id,
        role,
        notes,
        isLead,
        callTime,
        endTime,
        stationName,
      })

      if (error) {
        return NextResponse.json({ error }, { status: 400 })
      }

      // Send notification to the requested user
      if (data) {
        notifyStaffAssignmentRequestReceived({
          userId: data.requested_user_id,
          tenantId: data.tenant_id,
          campId: data.camp_id,
          campName: data.camp_name,
          role: data.role,
          requestedByName: data.requested_by_user_name,
        }).catch((err) => console.error('[API] Failed to send notification:', err))
      }

      return NextResponse.json({ data, isRequest: true }, { status: 201 })
    }

    // Otherwise, create direct assignment for ad-hoc staff
    const { data, error } = await addStaffAssignment({
      campId,
      role,
      isLead,
      callTime,
      endTime,
      notes,
      stationName,
      adHocFirstName,
      adHocLastName,
      adHocEmail,
      adHocPhone,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data, isRequest: false }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/camps/[campId]/hq/staff error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
