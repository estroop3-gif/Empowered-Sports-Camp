/**
 * Notifications Service
 *
 * SHELL: In-app notification system
 *
 * Handles:
 * - Creating notifications for various events
 * - Listing user notifications
 * - Marking notifications as read
 * - Notification preferences
 */

import { prisma } from '@/lib/db/client'

// =============================================================================
// Types
// =============================================================================

export type NotificationType =
  | 'CAMP_REMINDER'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'REGISTRATION_CONFIRMED'
  | 'MESSAGE_RECEIVED'
  | 'CERTIFICATION_APPROVED'
  | 'CERTIFICATION_REJECTED'
  | 'CAMP_DAY_COMPLETE'
  | 'REPORT_READY'
  | 'ROYALTY_DUE'
  | 'STAFF_ASSIGNED'
  | 'SCHEDULE_CHANGED'
  | 'SYSTEM_ALERT'

export interface NotificationData {
  id: string
  userId: string
  tenantId: string | null
  type: NotificationType
  title: string
  body: string
  actionUrl: string | null
  isRead: boolean
  createdAt: string
}

export interface NotificationCreateParams {
  userId: string
  type: NotificationType
  title: string
  body: string
  actionUrl?: string
  tenantId: string
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * SHELL: Create a new notification for a user
 */
export async function createNotification(
  params: NotificationCreateParams
): Promise<{ data: NotificationData | null; error: Error | null }> {
  try {
    const { userId, type, title, body, actionUrl, tenantId } = params

    // SHELL: Insert notification into database
    // TODO: Implement after notifications table is created
    /*
    const notification = await prisma.notification.create({
      data: {
        userId,
        tenantId,
        type,
        title,
        body,
        actionUrl,
        isRead: false,
      },
    })
    */

    console.log('[Notifications] SHELL: Would create notification:', {
      userId,
      type,
      title,
    })

    // SHELL: Return created notification
    const mockNotification: NotificationData = {
      id: `notif_${Date.now()}`,
      userId,
      tenantId,
      type,
      title,
      body,
      actionUrl: actionUrl || null,
      isRead: false,
      createdAt: new Date().toISOString(),
    }

    // SHELL: Optionally trigger real-time push via WebSocket/SSE
    // TODO: Implement real-time notification delivery

    return {
      data: mockNotification,
      error: null,
    }
  } catch (error) {
    console.error('[Notifications] Failed to create notification:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: List notifications for a user
 */
export async function listNotifications(params: {
  userId: string
  tenantId: string
  unreadOnly?: boolean
  limit?: number
  offset?: number
}): Promise<{
  data: { notifications: NotificationData[]; unreadCount: number } | null
  error: Error | null
}> {
  try {
    const { userId, tenantId, unreadOnly = false, limit = 50, offset = 0 } = params

    // SHELL: Query notifications from database
    // TODO: Implement after notifications table is created
    /*
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        tenantId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        tenantId,
        isRead: false,
      },
    })
    */

    console.log('[Notifications] SHELL: Would list notifications for user:', userId)

    // SHELL: Return mock data for now
    const mockNotifications: NotificationData[] = [
      {
        id: 'notif_1',
        userId,
        tenantId,
        type: 'CAMP_REMINDER',
        title: 'Camp Starts Tomorrow!',
        body: 'Summer Basketball Camp begins tomorrow at 9:00 AM.',
        actionUrl: '/portal/camps',
        isRead: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'notif_2',
        userId,
        tenantId,
        type: 'REGISTRATION_CONFIRMED',
        title: 'Registration Confirmed',
        body: 'Your registration for Soccer Camp has been confirmed.',
        actionUrl: '/portal/camps/123',
        isRead: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ]

    return {
      data: {
        notifications: mockNotifications,
        unreadCount: mockNotifications.filter((n) => !n.isRead).length,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Notifications] Failed to list notifications:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: Mark a notification as read
 */
export async function markNotificationRead(params: {
  notificationId: string
  userId: string
  tenantId: string
}): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const { notificationId, userId, tenantId } = params

    // SHELL: Update notification in database
    // TODO: Implement after notifications table is created
    /*
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
        tenantId,
      },
      data: {
        isRead: true,
      },
    })
    */

    console.log('[Notifications] SHELL: Would mark notification as read:', notificationId)

    return {
      data: { success: true },
      error: null,
    }
  } catch (error) {
    console.error('[Notifications] Failed to mark notification as read:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: Mark all notifications as read for a user
 */
export async function markAllNotificationsRead(params: {
  userId: string
  tenantId: string
}): Promise<{ data: { count: number } | null; error: Error | null }> {
  try {
    const { userId, tenantId } = params

    // SHELL: Update all notifications for user
    // TODO: Implement after notifications table is created
    /*
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        tenantId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    })
    */

    console.log('[Notifications] SHELL: Would mark all notifications as read for user:', userId)

    return {
      data: { count: 0 },
      error: null,
    }
  } catch (error) {
    console.error('[Notifications] Failed to mark all notifications as read:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: Delete old notifications (cleanup job)
 */
export async function cleanupOldNotifications(params: {
  olderThanDays: number
}): Promise<{ data: { deleted: number } | null; error: Error | null }> {
  try {
    const { olderThanDays } = params

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    // SHELL: Delete old read notifications
    // TODO: Implement after notifications table is created
    /*
    const result = await prisma.notification.deleteMany({
      where: {
        isRead: true,
        createdAt: {
          lt: cutoffDate,
        },
      },
    })
    */

    console.log('[Notifications] SHELL: Would cleanup notifications older than:', olderThanDays, 'days')

    return {
      data: { deleted: 0 },
      error: null,
    }
  } catch (error) {
    console.error('[Notifications] Failed to cleanup notifications:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Notification Trigger Helpers
// =============================================================================

/**
 * SHELL: Trigger notification for camp reminder (day before)
 */
export async function notifyCampReminder(params: {
  campId: string
  tenantId: string
}): Promise<void> {
  // SHELL: Find all registered campers' parents and create notifications
  // TODO: Implement
  console.log('[Notifications] SHELL: Would send camp reminder notifications for camp:', params.campId)
}

/**
 * SHELL: Trigger notification for payment received
 */
export async function notifyPaymentReceived(params: {
  userId: string
  amount: number
  resourceType: string
  resourceId: string
  tenantId: string
}): Promise<void> {
  await createNotification({
    userId: params.userId,
    type: 'PAYMENT_RECEIVED',
    title: 'Payment Received',
    body: `Your payment of $${params.amount.toFixed(2)} has been received.`,
    actionUrl: params.resourceType === 'REGISTRATION' ? `/portal/camps/${params.resourceId}` : `/shop/orders/${params.resourceId}`,
    tenantId: params.tenantId,
  })
}

/**
 * SHELL: Trigger notification for message received
 */
export async function notifyMessageReceived(params: {
  userId: string
  senderName: string
  messagePreview: string
  threadId: string
  tenantId: string
}): Promise<void> {
  await createNotification({
    userId: params.userId,
    type: 'MESSAGE_RECEIVED',
    title: `New message from ${params.senderName}`,
    body: params.messagePreview.substring(0, 100),
    actionUrl: `/messaging?thread=${params.threadId}`,
    tenantId: params.tenantId,
  })
}

/**
 * SHELL: Trigger notification for certification status change
 */
export async function notifyCertificationStatus(params: {
  userId: string
  certificationName: string
  status: 'approved' | 'rejected'
  tenantId: string
}): Promise<void> {
  const isApproved = params.status === 'approved'
  await createNotification({
    userId: params.userId,
    type: isApproved ? 'CERTIFICATION_APPROVED' : 'CERTIFICATION_REJECTED',
    title: isApproved ? 'Certification Approved' : 'Certification Needs Attention',
    body: isApproved
      ? `Your ${params.certificationName} has been approved.`
      : `Your ${params.certificationName} was not approved. Please review and resubmit.`,
    actionUrl: '/volunteer/certifications',
    tenantId: params.tenantId,
  })
}
