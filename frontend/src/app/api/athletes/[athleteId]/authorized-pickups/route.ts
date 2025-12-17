/**
 * Authorized Pickups API
 *
 * GET /api/athletes/[athleteId]/authorized-pickups - Get all authorized pickups for an athlete
 * POST /api/athletes/[athleteId]/authorized-pickups - Add a new authorized pickup person
 * PUT /api/athletes/[athleteId]/authorized-pickups - Update an authorized pickup person
 * DELETE /api/athletes/[athleteId]/authorized-pickups - Remove an authorized pickup person
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import prisma from '@/lib/db/client'

// GET - List all authorized pickups for an athlete
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ athleteId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { athleteId } = await params

    // Verify user has access to this athlete
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      select: { parentId: true },
    })

    if (!athlete) {
      return NextResponse.json(
        { error: 'Athlete not found' },
        { status: 404 }
      )
    }

    // Only parent or staff can view pickups
    const isParent = athlete.parentId === user.id
    const isStaff = ['director', 'coach', 'hq_admin', 'licensee_owner'].includes(user.role || '')

    if (!isParent && !isStaff) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    const pickups = await prisma.authorizedPickup.findMany({
      where: {
        athleteId,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      data: pickups.map(p => ({
        id: p.id,
        name: p.name,
        relationship: p.relationship,
        phone: p.phone,
        photoIdOnFile: p.photoIdOnFile,
        createdAt: p.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('[GET /api/athletes/[athleteId]/authorized-pickups] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Add a new authorized pickup person
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ athleteId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { athleteId } = await params

    // Verify user has access to this athlete
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      select: { parentId: true },
    })

    if (!athlete) {
      return NextResponse.json(
        { error: 'Athlete not found' },
        { status: 404 }
      )
    }

    // Only parent can add pickups
    if (athlete.parentId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to add pickup for this athlete' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, relationship, phone, photoIdOnFile } = body

    if (!name || !relationship) {
      return NextResponse.json(
        { error: 'Name and relationship are required' },
        { status: 400 }
      )
    }

    const pickup = await prisma.authorizedPickup.create({
      data: {
        athleteId,
        parentProfileId: user.id,
        name,
        relationship,
        phone: phone || null,
        photoIdOnFile: photoIdOnFile || false,
      },
    })

    return NextResponse.json({
      data: {
        id: pickup.id,
        name: pickup.name,
        relationship: pickup.relationship,
        phone: pickup.phone,
        photoIdOnFile: pickup.photoIdOnFile,
        createdAt: pickup.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[POST /api/athletes/[athleteId]/authorized-pickups] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update an authorized pickup person
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ athleteId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { athleteId } = await params

    // Verify user has access to this athlete
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      select: { parentId: true },
    })

    if (!athlete) {
      return NextResponse.json(
        { error: 'Athlete not found' },
        { status: 404 }
      )
    }

    // Only parent can update pickups
    if (athlete.parentId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to update pickup for this athlete' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, name, relationship, phone, photoIdOnFile } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Pickup ID is required' },
        { status: 400 }
      )
    }

    // Verify pickup belongs to this athlete
    const existingPickup = await prisma.authorizedPickup.findFirst({
      where: { id, athleteId },
    })

    if (!existingPickup) {
      return NextResponse.json(
        { error: 'Authorized pickup not found' },
        { status: 404 }
      )
    }

    const pickup = await prisma.authorizedPickup.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(relationship !== undefined && { relationship }),
        ...(phone !== undefined && { phone }),
        ...(photoIdOnFile !== undefined && { photoIdOnFile }),
      },
    })

    return NextResponse.json({
      data: {
        id: pickup.id,
        name: pickup.name,
        relationship: pickup.relationship,
        phone: pickup.phone,
        photoIdOnFile: pickup.photoIdOnFile,
        createdAt: pickup.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[PUT /api/athletes/[athleteId]/authorized-pickups] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove an authorized pickup person
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ athleteId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { athleteId } = await params

    // Verify user has access to this athlete
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      select: { parentId: true },
    })

    if (!athlete) {
      return NextResponse.json(
        { error: 'Athlete not found' },
        { status: 404 }
      )
    }

    // Only parent can delete pickups
    if (athlete.parentId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to delete pickup for this athlete' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const pickupId = searchParams.get('id')

    if (!pickupId) {
      return NextResponse.json(
        { error: 'Pickup ID is required' },
        { status: 400 }
      )
    }

    // Verify pickup belongs to this athlete
    const existingPickup = await prisma.authorizedPickup.findFirst({
      where: { id: pickupId, athleteId },
    })

    if (!existingPickup) {
      return NextResponse.json(
        { error: 'Authorized pickup not found' },
        { status: 404 }
      )
    }

    // Soft delete - mark as inactive
    await prisma.authorizedPickup.update({
      where: { id: pickupId },
      data: { isActive: false },
    })

    return NextResponse.json({
      data: { success: true },
    })
  } catch (error) {
    console.error('[DELETE /api/athletes/[athleteId]/authorized-pickups] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
