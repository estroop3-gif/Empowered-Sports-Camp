/**
 * Camp Shares API
 *
 * POST /api/shares - Share a camp with another user (creates notification)
 * GET /api/shares - Get shares received by the current user
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { prisma } from '@/lib/db/client'

/**
 * POST - Share a camp with another user
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { recipientId, campSlug, campName, message } = body

    if (!recipientId || !campSlug || !campName) {
      return NextResponse.json(
        { error: 'Missing required fields: recipientId, campSlug, campName' },
        { status: 400 }
      )
    }

    // Verify recipient exists
    const recipient = await prisma.profile.findUnique({
      where: { id: recipientId },
      select: { id: true, firstName: true },
    })

    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
    }

    // Get sender info
    const sender = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { firstName: true, lastName: true },
    })

    const senderName = sender
      ? `${sender.firstName} ${sender.lastName}`
      : 'Someone'

    // Create notification for recipient
    const notification = await prisma.notification.create({
      data: {
        userId: recipientId,
        type: 'camp_shared',
        category: 'camp',
        title: `${senderName} shared a camp with you`,
        body: message || `Check out ${campName}!`,
        actionUrl: `/camps/${campSlug}`,
        data: {
          senderId: user.id,
          senderName,
          campSlug,
          campName,
          message,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        notificationId: notification.id,
        recipientName: recipient.firstName,
      },
    })
  } catch (error) {
    console.error('[API] POST /api/shares error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET - Get camp shares received by the current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const shares = await prisma.notification.findMany({
      where: {
        userId: user.id,
        type: 'camp_shared',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({
      data: shares.map((s) => ({
        id: s.id,
        title: s.title,
        body: s.body,
        actionUrl: s.actionUrl,
        isRead: s.isRead,
        createdAt: s.createdAt.toISOString(),
        data: s.data,
      })),
    })
  } catch (error) {
    console.error('[API] GET /api/shares error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
