/**
 * Registration Waivers API
 *
 * GET /api/registrations/[registrationId]/waivers - Get waiver status for a registration
 * POST /api/registrations/[registrationId]/waivers - Sign waivers for a registration
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  getRegistrationWaiverStatus,
  signWaiver,
  getCampWaiverRequirements,
} from '@/lib/services/waivers'
import { prisma } from '@/lib/db/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ registrationId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { registrationId } = await params

    // Get registration to verify ownership or admin access
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        parentId: true,
        campId: true,
        camp: { select: { tenantId: true } },
      },
    })

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    // Check access: parent owns registration, or admin
    const userRole = user.role?.toLowerCase() || ''
    const isAdmin = ['hq_admin', 'licensee_owner', 'director', 'coach'].includes(userRole)
    const isParent = registration.parentId === user.id

    if (!isParent && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await getRegistrationWaiverStatus(registrationId)

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    // Also include the waiver content for display
    const { data: requirements } = await getCampWaiverRequirements(registration.campId)

    return NextResponse.json({
      status: data,
      requirements: requirements?.requirements || [],
    })
  } catch (error) {
    console.error('[API] GET /api/registrations/[registrationId]/waivers error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ registrationId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { registrationId } = await params

    // Get registration to verify ownership
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        parentId: true,
        athleteId: true,
        campId: true,
        camp: { select: { tenantId: true } },
      },
    })

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    // Only the parent can sign waivers for their registration
    if (registration.parentId !== user.id) {
      return NextResponse.json({ error: 'Only the parent can sign waivers' }, { status: 403 })
    }

    const body = await request.json()
    const { waiverTemplateId, signerName, signerEmail, signaturePayload } = body

    if (!waiverTemplateId || !signerName || !signerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: waiverTemplateId, signerName, signerEmail' },
        { status: 400 }
      )
    }

    // Get IP address from request
    const forwardedFor = request.headers.get('x-forwarded-for')
    const signerIpAddress = forwardedFor?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const { data, error } = await signWaiver(
      {
        athleteId: registration.athleteId,
        parentProfileId: registration.parentId,
        waiverTemplateId,
        campId: registration.campId,
        registrationId,
        signerName,
        signerEmail,
        signerIpAddress,
        signaturePayloadJson: signaturePayload || null,
      },
      registration.camp.tenantId
    )

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    // Return updated status
    const { data: status } = await getRegistrationWaiverStatus(registrationId)

    return NextResponse.json({
      signing: data,
      status,
    })
  } catch (error) {
    console.error('[API] POST /api/registrations/[registrationId]/waivers error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
