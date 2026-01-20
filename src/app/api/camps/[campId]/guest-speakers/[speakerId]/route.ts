/**
 * Guest Speaker Individual API
 *
 * GET /api/camps/[campId]/guest-speakers/[speakerId] - Get a single guest speaker
 * PUT /api/camps/[campId]/guest-speakers/[speakerId] - Update a guest speaker
 * DELETE /api/camps/[campId]/guest-speakers/[speakerId] - Delete a guest speaker
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import prisma from '@/lib/db/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string; speakerId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { campId, speakerId } = await params

    const speaker = await prisma.guestSpeaker.findUnique({
      where: { id: speakerId },
      include: {
        camp: {
          select: { id: true, tenantId: true, name: true },
        },
      },
    })

    if (!speaker || speaker.campId !== campId) {
      return NextResponse.json({ error: 'Guest speaker not found' }, { status: 404 })
    }

    // Check authorization
    const allowedRoles = ['hq_admin', 'licensee_owner', 'camp_director']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // For non-HQ admins, verify they have access to this camp's tenant
    if (userRole !== 'hq_admin' && speaker.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ data: speaker })
  } catch (error) {
    console.error('[GET /api/camps/[campId]/guest-speakers/[speakerId]] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string; speakerId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { campId, speakerId } = await params
    const body = await request.json()

    // Find the existing speaker
    const existingSpeaker = await prisma.guestSpeaker.findUnique({
      where: { id: speakerId },
    })

    if (!existingSpeaker || existingSpeaker.campId !== campId) {
      return NextResponse.json({ error: 'Guest speaker not found' }, { status: 404 })
    }

    // Check authorization
    const allowedRoles = ['hq_admin', 'licensee_owner', 'camp_director']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // For non-HQ admins, verify they have access to this speaker's tenant
    if (userRole !== 'hq_admin' && existingSpeaker.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate name if provided
    if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim() === '')) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    }

    const speaker = await prisma.guestSpeaker.update({
      where: { id: speakerId },
      data: {
        name: body.name?.trim() ?? existingSpeaker.name,
        title: body.title !== undefined ? (body.title?.trim() || null) : existingSpeaker.title,
        organization: body.organization !== undefined ? (body.organization?.trim() || null) : existingSpeaker.organization,
        topic: body.topic !== undefined ? (body.topic?.trim() || null) : existingSpeaker.topic,
        speakerDate: body.speakerDate !== undefined
          ? (body.speakerDate ? new Date(body.speakerDate) : null)
          : existingSpeaker.speakerDate,
        isHighProfile: body.isHighProfile !== undefined ? body.isHighProfile : existingSpeaker.isHighProfile,
        notes: body.notes !== undefined ? (body.notes?.trim() || null) : existingSpeaker.notes,
      },
    })

    return NextResponse.json({ data: speaker })
  } catch (error) {
    console.error('[PUT /api/camps/[campId]/guest-speakers/[speakerId]] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string; speakerId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { campId, speakerId } = await params

    // Find the existing speaker
    const existingSpeaker = await prisma.guestSpeaker.findUnique({
      where: { id: speakerId },
    })

    if (!existingSpeaker || existingSpeaker.campId !== campId) {
      return NextResponse.json({ error: 'Guest speaker not found' }, { status: 404 })
    }

    // Check authorization
    const allowedRoles = ['hq_admin', 'licensee_owner', 'camp_director']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // For non-HQ admins, verify they have access to this speaker's tenant
    if (userRole !== 'hq_admin' && existingSpeaker.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.guestSpeaker.delete({
      where: { id: speakerId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/camps/[campId]/guest-speakers/[speakerId]] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
