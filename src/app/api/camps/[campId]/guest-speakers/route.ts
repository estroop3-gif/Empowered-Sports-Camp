/**
 * Guest Speakers API
 *
 * GET /api/camps/[campId]/guest-speakers - List all guest speakers for a camp
 * POST /api/camps/[campId]/guest-speakers - Add a new guest speaker
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import prisma from '@/lib/db/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { campId } = await params

    // Get the camp to verify it exists and get tenant context
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: { id: true, tenantId: true, name: true },
    })

    if (!camp) {
      return NextResponse.json({ error: 'Camp not found' }, { status: 404 })
    }

    // Check authorization - allow HQ admins and licensee owners/directors for their camps
    const allowedRoles = ['hq_admin', 'licensee_owner', 'camp_director']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // For non-HQ admins, verify they have access to this camp's tenant
    if (userRole !== 'hq_admin' && camp.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const speakers = await prisma.guestSpeaker.findMany({
      where: { campId },
      orderBy: { speakerDate: 'asc' },
    })

    return NextResponse.json({ data: speakers })
  } catch (error) {
    console.error('[GET /api/camps/[campId]/guest-speakers] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { campId } = await params
    const body = await request.json()

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Get the camp to verify it exists and get tenant context
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: { id: true, tenantId: true, name: true },
    })

    if (!camp) {
      return NextResponse.json({ error: 'Camp not found' }, { status: 404 })
    }

    if (!camp.tenantId) {
      return NextResponse.json({ error: 'Camp has no tenant' }, { status: 400 })
    }

    // Check authorization
    const allowedRoles = ['hq_admin', 'licensee_owner', 'camp_director']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // For non-HQ admins, verify they have access to this camp's tenant
    if (userRole !== 'hq_admin' && camp.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const speaker = await prisma.guestSpeaker.create({
      data: {
        campId,
        tenantId: camp.tenantId,
        name: body.name.trim(),
        title: body.title?.trim() || null,
        organization: body.organization?.trim() || null,
        topic: body.topic?.trim() || null,
        speakerDate: body.speakerDate ? new Date(body.speakerDate) : null,
        isHighProfile: body.isHighProfile !== false, // Default to true
        notes: body.notes?.trim() || null,
      },
    })

    return NextResponse.json({ data: speaker }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/camps/[campId]/guest-speakers] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
