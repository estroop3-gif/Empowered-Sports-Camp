/**
 * Notifications Service
 *
 * Production notification system for Empowered Sports Camp.
 * Handles in-app notifications with optional email triggers.
 *
 * All functions return { data, error } pattern and never throw.
 */

import { prisma } from '@/lib/db/client'
import type {
  NotificationType as PrismaNotificationType,
  NotificationCategory as PrismaNotificationCategory,
  NotificationSeverity as PrismaNotificationSeverity,
  Prisma,
} from '@/generated/prisma'
import { sendTransactionalEmail, type EmailTemplateCode } from './email'

// =============================================================================
// Types
// =============================================================================

// Map Prisma types to our service types
export type NotificationType = PrismaNotificationType
export type NotificationCategory = PrismaNotificationCategory
export type NotificationSeverity = PrismaNotificationSeverity

export interface NotificationData {
  id: string
  userId: string
  tenantId: string | null
  type: NotificationType
  category: NotificationCategory
  severity: NotificationSeverity
  title: string
  body: string
  actionUrl: string | null
  data: Record<string, unknown> | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

export interface NotificationCreateParams {
  userId: string
  tenantId?: string | null
  type: NotificationType
  category: NotificationCategory
  title: string
  body: string
  actionUrl?: string
  data?: Record<string, unknown>
  severity?: NotificationSeverity
}

export interface NotificationFeedSummary {
  unreadCount: number
  latest: NotificationData[]
}

export interface NotificationPreferenceData {
  id: string
  userId: string
  tenantId: string | null
  category: NotificationCategory
  enabledInApp: boolean
  enabledEmail: boolean
}

// =============================================================================
// Helper Functions
// =============================================================================

function toNotificationData(notification: {
  id: string
  userId: string
  tenantId: string | null
  type: PrismaNotificationType
  category: PrismaNotificationCategory
  severity: PrismaNotificationSeverity
  title: string
  body: string
  actionUrl: string | null
  data: unknown
  isRead: boolean
  readAt: Date | null
  createdAt: Date
}): NotificationData {
  return {
    id: notification.id,
    userId: notification.userId,
    tenantId: notification.tenantId,
    type: notification.type,
    category: notification.category,
    severity: notification.severity,
    title: notification.title,
    body: notification.body,
    actionUrl: notification.actionUrl,
    data: notification.data as Record<string, unknown> | null,
    isRead: notification.isRead,
    readAt: notification.readAt?.toISOString() || null,
    createdAt: notification.createdAt.toISOString(),
  }
}

// =============================================================================
// Core Service Functions
// =============================================================================

/**
 * Create a new notification for a user
 */
export async function createNotification(
  params: NotificationCreateParams
): Promise<{ data: NotificationData | null; error: Error | null }> {
  try {
    const {
      userId,
      tenantId,
      type,
      category,
      title,
      body,
      actionUrl,
      data,
      severity = 'info',
    } = params

    // Check user preferences for this category (optional, defaults enabled)
    const preference = await prisma.notificationPreference.findFirst({
      where: {
        userId,
        tenantId: tenantId || null,
        category,
      },
    })

    // If user explicitly disabled in-app notifications for this category, skip
    if (preference && !preference.enabledInApp) {
      console.log(
        `[Notifications] Skipping in-app notification for user ${userId} - disabled for category ${category}`
      )
      return { data: null, error: null }
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        tenantId: tenantId || null,
        type,
        category,
        severity,
        title,
        body,
        actionUrl: actionUrl || null,
        data: data ? (data as Prisma.InputJsonValue) : undefined,
        isRead: false,
      },
    })

    return {
      data: toNotificationData(notification),
      error: null,
    }
  } catch (error) {
    console.error('[Notifications] Failed to create notification:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Create notifications for multiple users
 */
export async function createNotificationsForUsers(
  params: {
    userIds: string[]
    tenantId?: string | null
    type: NotificationType
    category: NotificationCategory
    title: string
    body: string
    actionUrl?: string
    data?: Record<string, unknown>
    severity?: NotificationSeverity
  }
): Promise<{ data: { created: number } | null; error: Error | null }> {
  try {
    const {
      userIds,
      tenantId,
      type,
      category,
      title,
      body,
      actionUrl,
      data,
      severity = 'info',
    } = params

    if (userIds.length === 0) {
      return { data: { created: 0 }, error: null }
    }

    const result = await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        tenantId: tenantId || null,
        type,
        category,
        severity,
        title,
        body,
        actionUrl: actionUrl || null,
        data: data ? (data as Prisma.InputJsonValue) : undefined,
        isRead: false,
      })),
    })

    return {
      data: { created: result.count },
      error: null,
    }
  } catch (error) {
    console.error('[Notifications] Failed to create bulk notifications:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * List notifications for a user with filtering and pagination
 */
export async function listNotifications(params: {
  userId: string
  tenantId?: string | null
  category?: NotificationCategory
  onlyUnread?: boolean
  limit?: number
  offset?: number
}): Promise<{
  data: { notifications: NotificationData[]; total: number; unreadCount: number } | null
  error: Error | null
}> {
  try {
    const {
      userId,
      tenantId,
      category,
      onlyUnread = false,
      limit = 50,
      offset = 0,
    } = params

    const where: {
      userId: string
      tenantId?: string | null
      category?: NotificationCategory
      isRead?: boolean
    } = {
      userId,
    }

    // For HQ admin users with null tenant, show all their notifications
    // For tenant users, filter by tenant
    if (tenantId) {
      where.tenantId = tenantId
    }

    if (category) {
      where.category = category
    }

    if (onlyUnread) {
      where.isRead = false
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          userId,
          tenantId: tenantId || undefined,
          isRead: false,
        },
      }),
    ])

    return {
      data: {
        notifications: notifications.map(toNotificationData),
        total,
        unreadCount,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Notifications] Failed to list notifications:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get notification feed summary (for bell icon dropdown)
 */
export async function getNotificationFeedSummary(params: {
  userId: string
  tenantId?: string | null
  latestCount?: number
}): Promise<{ data: NotificationFeedSummary | null; error: Error | null }> {
  try {
    const { userId, tenantId, latestCount = 10 } = params

    const where: { userId: string; tenantId?: string | null } = { userId }
    if (tenantId) {
      where.tenantId = tenantId
    }

    const [unreadCount, latest] = await Promise.all([
      prisma.notification.count({
        where: {
          ...where,
          isRead: false,
        },
      }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: latestCount,
      }),
    ])

    return {
      data: {
        unreadCount,
        latest: latest.map(toNotificationData),
      },
      error: null,
    }
  } catch (error) {
    console.error('[Notifications] Failed to get feed summary:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationRead(params: {
  notificationId: string
  userId: string
}): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const { notificationId, userId } = params

    // Only mark if belongs to the user (security check)
    const result = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return {
      data: { success: result.count > 0 },
      error: null,
    }
  } catch (error) {
    console.error('[Notifications] Failed to mark notification as read:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsRead(params: {
  userId: string
  tenantId?: string | null
  category?: NotificationCategory
}): Promise<{ data: { count: number } | null; error: Error | null }> {
  try {
    const { userId, tenantId, category } = params

    const where: {
      userId: string
      tenantId?: string | null
      category?: NotificationCategory
      isRead: boolean
    } = {
      userId,
      isRead: false,
    }

    if (tenantId) {
      where.tenantId = tenantId
    }

    if (category) {
      where.category = category
    }

    const result = await prisma.notification.updateMany({
      where,
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return {
      data: { count: result.count },
      error: null,
    }
  } catch (error) {
    console.error('[Notifications] Failed to mark all notifications as read:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(params: {
  notificationId: string
  userId: string
}): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const { notificationId, userId } = params

    const result = await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    })

    return {
      data: { success: result.count > 0 },
      error: null,
    }
  } catch (error) {
    console.error('[Notifications] Failed to delete notification:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Cleanup old read notifications (for maintenance jobs)
 */
export async function cleanupOldNotifications(params: {
  olderThanDays: number
}): Promise<{ data: { deleted: number } | null; error: Error | null }> {
  try {
    const { olderThanDays } = params

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const result = await prisma.notification.deleteMany({
      where: {
        isRead: true,
        createdAt: {
          lt: cutoffDate,
        },
      },
    })

    console.log(`[Notifications] Cleaned up ${result.count} old notifications`)

    return {
      data: { deleted: result.count },
      error: null,
    }
  } catch (error) {
    console.error('[Notifications] Failed to cleanup notifications:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Notification Preferences
// =============================================================================

/**
 * Get user's notification preferences
 */
export async function getNotificationPreferences(params: {
  userId: string
  tenantId?: string | null
}): Promise<{ data: NotificationPreferenceData[] | null; error: Error | null }> {
  try {
    const { userId, tenantId } = params

    const preferences = await prisma.notificationPreference.findMany({
      where: {
        userId,
        tenantId: tenantId || null,
      },
    })

    return {
      data: preferences.map((p) => ({
        id: p.id,
        userId: p.userId,
        tenantId: p.tenantId,
        category: p.category,
        enabledInApp: p.enabledInApp,
        enabledEmail: p.enabledEmail,
      })),
      error: null,
    }
  } catch (error) {
    console.error('[Notifications] Failed to get preferences:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update a notification preference
 */
export async function updateNotificationPreference(params: {
  userId: string
  tenantId?: string | null
  category: NotificationCategory
  enabledInApp?: boolean
  enabledEmail?: boolean
}): Promise<{ data: NotificationPreferenceData | null; error: Error | null }> {
  try {
    const { userId, tenantId, category, enabledInApp, enabledEmail } = params

    // Handle the composite key - Prisma needs proper null handling
    const tenantIdValue = tenantId ?? null

    const preference = await prisma.notificationPreference.upsert({
      where: {
        userId_tenantId_category: {
          userId,
          tenantId: tenantIdValue as string,
          category,
        },
      },
      create: {
        userId,
        tenantId: tenantIdValue,
        category,
        enabledInApp: enabledInApp ?? true,
        enabledEmail: enabledEmail ?? true,
      },
      update: {
        ...(enabledInApp !== undefined && { enabledInApp }),
        ...(enabledEmail !== undefined && { enabledEmail }),
      },
    })

    return {
      data: {
        id: preference.id,
        userId: preference.userId,
        tenantId: preference.tenantId,
        category: preference.category,
        enabledInApp: preference.enabledInApp,
        enabledEmail: preference.enabledEmail,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Notifications] Failed to update preference:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Helper: Get Admin User IDs
// =============================================================================

/**
 * Get all HQ admin user IDs (for global notifications)
 */
export async function getHqAdminUserIds(): Promise<{
  data: string[] | null
  error: Error | null
}> {
  try {
    const admins = await prisma.userRoleAssignment.findMany({
      where: {
        role: 'hq_admin',
        isActive: true,
      },
      select: {
        userId: true,
      },
    })

    return {
      data: admins.map((a) => a.userId),
      error: null,
    }
  } catch (error) {
    console.error('[Notifications] Failed to get HQ admin IDs:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get licensee owner user IDs for a tenant
 */
export async function getLicenseeOwnerUserIds(tenantId: string): Promise<{
  data: string[] | null
  error: Error | null
}> {
  try {
    const owners = await prisma.userRoleAssignment.findMany({
      where: {
        tenantId,
        role: 'licensee_owner',
        isActive: true,
      },
      select: {
        userId: true,
      },
    })

    return {
      data: owners.map((o) => o.userId),
      error: null,
    }
  } catch (error) {
    console.error('[Notifications] Failed to get licensee owner IDs:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get director user IDs for a tenant
 */
export async function getDirectorUserIds(tenantId: string): Promise<{
  data: string[] | null
  error: Error | null
}> {
  try {
    const directors = await prisma.userRoleAssignment.findMany({
      where: {
        tenantId,
        role: 'director',
        isActive: true,
      },
      select: {
        userId: true,
      },
    })

    return {
      data: directors.map((d) => d.userId),
      error: null,
    }
  } catch (error) {
    console.error('[Notifications] Failed to get director IDs:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Notification Trigger Helpers - Specific Event Types
// =============================================================================

/**
 * Notify about new licensee application (to HQ admins)
 */
export async function notifyLicenseeApplicationCreated(params: {
  applicationId: string
  applicantName: string
  city: string
  state: string
}): Promise<void> {
  const { applicationId, applicantName, city, state } = params

  const { data: adminIds } = await getHqAdminUserIds()
  if (!adminIds || adminIds.length === 0) return

  await createNotificationsForUsers({
    userIds: adminIds,
    type: 'licensee_application_created',
    category: 'licensee',
    severity: 'info',
    title: 'New Licensee Application',
    body: `${applicantName} from ${city}, ${state} has submitted a licensee application.`,
    actionUrl: `/admin/licensee-applications/${applicationId}`,
    data: { applicationId, applicantName, city, state },
  })
}

/**
 * Notify applicant about licensee application status change
 */
export async function notifyLicenseeApplicationStatusChanged(params: {
  userId: string
  applicationId: string
  newStatus: string
  applicantName: string
}): Promise<void> {
  const { userId, applicationId, newStatus, applicantName } = params

  const statusLabels: Record<string, string> = {
    pending: 'Pending Review',
    under_review: 'Under Review',
    approved: 'Approved',
    rejected: 'Rejected',
    on_hold: 'On Hold',
  }

  const statusLabel = statusLabels[newStatus] || newStatus
  const isPositive = newStatus === 'approved'

  await createNotification({
    userId,
    type: 'licensee_application_status_changed',
    category: 'licensee',
    severity: isPositive ? 'success' : 'info',
    title: 'Licensee Application Status Updated',
    body: `Your licensee application status has been updated to: ${statusLabel}.`,
    actionUrl: `/host-a-camp`,
    data: { applicationId, newStatus },
  })
}

/**
 * Notify about new CIT application
 */
export async function notifyCitApplicationCreated(params: {
  applicationId: string
  applicantName: string
  tenantId: string
}): Promise<void> {
  const { applicationId, applicantName, tenantId } = params

  // Notify licensee owners
  const { data: ownerIds } = await getLicenseeOwnerUserIds(tenantId)
  if (ownerIds && ownerIds.length > 0) {
    await createNotificationsForUsers({
      userIds: ownerIds,
      tenantId,
      type: 'cit_application_created',
      category: 'certification',
      severity: 'info',
      title: 'New CIT Application',
      body: `${applicantName} has submitted a CIT/Volunteer application.`,
      actionUrl: `/admin/cit/${applicationId}`,
      data: { applicationId, applicantName },
    })
  }

  // Also notify HQ admins
  const { data: adminIds } = await getHqAdminUserIds()
  if (adminIds && adminIds.length > 0) {
    await createNotificationsForUsers({
      userIds: adminIds,
      type: 'cit_application_created',
      category: 'certification',
      severity: 'info',
      title: 'New CIT Application',
      body: `${applicantName} has submitted a CIT/Volunteer application.`,
      actionUrl: `/admin/cit/${applicationId}`,
      data: { applicationId, applicantName, tenantId },
    })
  }
}

/**
 * Notify about CIT application status change
 */
export async function notifyCitApplicationStatusChanged(params: {
  userId: string
  applicationId: string
  newStatus: string
  tenantId?: string
}): Promise<void> {
  const { userId, applicationId, newStatus, tenantId } = params

  const isApproved = newStatus === 'approved'

  await createNotification({
    userId,
    tenantId,
    type: 'cit_application_status_changed',
    category: 'certification',
    severity: isApproved ? 'success' : 'info',
    title: isApproved ? 'CIT Application Approved!' : 'CIT Application Status Updated',
    body: isApproved
      ? 'Congratulations! Your CIT application has been approved. Welcome to the team!'
      : `Your CIT application status has been updated to: ${newStatus}.`,
    actionUrl: '/volunteer',
    data: { applicationId, newStatus },
  })
}

/**
 * Notify parent about camp registration completion
 */
export async function notifyCampRegistrationCompleted(params: {
  userId: string
  tenantId: string
  registrationId: string
  campName: string
  athleteName: string
  campId: string
}): Promise<void> {
  const { userId, tenantId, registrationId, campName, athleteName, campId } = params

  await createNotification({
    userId,
    tenantId,
    type: 'camp_registration_completed',
    category: 'camp',
    severity: 'success',
    title: `Registration Confirmed!`,
    body: `${athleteName} is now registered for ${campName}. See you at camp!`,
    actionUrl: `/portal/camps/${campId}`,
    data: { registrationId, campName, athleteName, campId },
  })
}

/**
 * Notify licensee about payment confirmation
 */
export async function notifyPaymentConfirmed(params: {
  tenantId: string
  registrationId: string
  campName: string
  athleteName: string
  amountCents: number
  campId: string
}): Promise<void> {
  const { tenantId, registrationId, campName, athleteName, amountCents, campId } = params

  const { data: ownerIds } = await getLicenseeOwnerUserIds(tenantId)
  if (!ownerIds || ownerIds.length === 0) return

  const amount = (amountCents / 100).toFixed(2)

  await createNotificationsForUsers({
    userIds: ownerIds,
    tenantId,
    type: 'payment_confirmed',
    category: 'camp',
    severity: 'success',
    title: 'New Registration Payment',
    body: `${athleteName} registered for ${campName} ($${amount}).`,
    actionUrl: `/licensee/camps/${campId}`,
    data: { registrationId, campName, athleteName, amountCents, campId },
  })
}

/**
 * Notify about camp day status change
 */
export async function notifyCampDayStatusChanged(params: {
  tenantId: string
  campId: string
  campDayId: string
  campName: string
  dayNumber: number
  newStatus: string
}): Promise<void> {
  const { tenantId, campId, campDayId, campName, dayNumber, newStatus } = params

  const { data: ownerIds } = await getLicenseeOwnerUserIds(tenantId)
  const { data: directorIds } = await getDirectorUserIds(tenantId)

  const allIds = [...(ownerIds || []), ...(directorIds || [])]
  if (allIds.length === 0) return

  await createNotificationsForUsers({
    userIds: [...new Set(allIds)],
    tenantId,
    type: 'camp_day_status_changed',
    category: 'camp',
    severity: 'info',
    title: `Camp Day Status Updated`,
    body: `Day ${dayNumber} of ${campName} is now: ${newStatus}.`,
    actionUrl: `/admin/camps/${campId}/hq`,
    data: { campId, campDayId, dayNumber, newStatus },
  })
}

/**
 * Notify about daily recap submission
 */
export async function notifyCampDayRecapSubmitted(params: {
  tenantId: string
  campId: string
  campDayId: string
  campName: string
  dayNumber: number
  directorName: string
}): Promise<void> {
  const { tenantId, campId, campDayId, campName, dayNumber, directorName } = params

  const { data: ownerIds } = await getLicenseeOwnerUserIds(tenantId)
  if (!ownerIds || ownerIds.length === 0) return

  await createNotificationsForUsers({
    userIds: ownerIds,
    tenantId,
    type: 'camp_day_recap_submitted',
    category: 'camp',
    severity: 'success',
    title: 'Daily Recap Submitted',
    body: `${directorName} submitted the recap for Day ${dayNumber} of ${campName}.`,
    actionUrl: `/admin/camps/${campId}/hq`,
    data: { campId, campDayId, dayNumber, directorName },
  })
}

/**
 * Notify about incident logged
 */
export async function notifyCampDayIncidentLogged(params: {
  tenantId: string
  campId: string
  campName: string
  dayNumber: number
  incidentType: string
  severity: 'warning' | 'error'
}): Promise<void> {
  const { tenantId, campId, campName, dayNumber, incidentType, severity } = params

  const { data: ownerIds } = await getLicenseeOwnerUserIds(tenantId)
  const { data: adminIds } = await getHqAdminUserIds()

  // For serious incidents, notify HQ admins too
  const allIds = severity === 'error'
    ? [...(ownerIds || []), ...(adminIds || [])]
    : ownerIds || []

  if (allIds.length === 0) return

  await createNotificationsForUsers({
    userIds: [...new Set(allIds)],
    tenantId,
    type: 'camp_day_incident_logged',
    category: 'camp',
    severity,
    title: 'Incident Reported',
    body: `An incident (${incidentType}) was logged for Day ${dayNumber} of ${campName}.`,
    actionUrl: `/admin/camps/${campId}/hq`,
    data: { campId, dayNumber, incidentType },
  })
}

/**
 * Notify about grouping algorithm issues
 */
export async function notifyGroupingAlert(params: {
  tenantId: string
  campId: string
  campName: string
  issueType: string
  message: string
}): Promise<void> {
  const { tenantId, campId, campName, issueType, message } = params

  const { data: directorIds } = await getDirectorUserIds(tenantId)
  if (!directorIds || directorIds.length === 0) return

  await createNotificationsForUsers({
    userIds: directorIds,
    tenantId,
    type: 'grouping_alert',
    category: 'camp',
    severity: 'warning',
    title: 'Grouping Requires Attention',
    body: `${campName}: ${message}`,
    actionUrl: `/admin/camps/${campId}/grouping`,
    data: { campId, issueType, message },
  })
}

/**
 * Notify staff about incentive earned
 */
export async function notifyIncentiveEarned(params: {
  userId: string
  tenantId: string
  campName: string
  bonusType: string
  amount: number
}): Promise<void> {
  const { userId, tenantId, campName, bonusType, amount } = params

  await createNotification({
    userId,
    tenantId,
    type: 'incentive_earned',
    category: 'incentive',
    severity: 'success',
    title: 'Performance Bonus Earned!',
    body: `You earned a ${bonusType} bonus of $${amount.toFixed(2)} for ${campName}.`,
    actionUrl: '/director/incentives',
    data: { campName, bonusType, amount },
  })
}

/**
 * Notify about LMS module assigned
 */
export async function notifyLmsModuleAssigned(params: {
  userId: string
  tenantId?: string
  moduleName: string
  moduleSlug: string
}): Promise<void> {
  const { userId, tenantId, moduleName, moduleSlug } = params

  await createNotification({
    userId,
    tenantId,
    type: 'lms_module_assigned',
    category: 'lms',
    severity: 'info',
    title: 'New Training Module Available',
    body: `A new training module "${moduleName}" has been assigned to you.`,
    actionUrl: `/admin/empoweru/module/${moduleSlug}`,
    data: { moduleName, moduleSlug },
  })
}

/**
 * Notify about LMS module completed
 */
export async function notifyLmsModuleCompleted(params: {
  userId: string
  tenantId?: string
  moduleName: string
}): Promise<void> {
  const { userId, tenantId, moduleName } = params

  await createNotification({
    userId,
    tenantId,
    type: 'lms_module_completed',
    category: 'lms',
    severity: 'success',
    title: 'Training Module Completed!',
    body: `Congratulations! You've completed the "${moduleName}" training module.`,
    actionUrl: '/admin/empoweru',
    data: { moduleName },
  })
}

/**
 * Notify about LMS quiz passed
 */
export async function notifyLmsQuizPassed(params: {
  userId: string
  tenantId?: string
  moduleName: string
  score: number
}): Promise<void> {
  const { userId, tenantId, moduleName, score } = params

  await createNotification({
    userId,
    tenantId,
    type: 'lms_quiz_passed',
    category: 'lms',
    severity: 'success',
    title: 'Quiz Passed!',
    body: `You passed the quiz for "${moduleName}" with a score of ${score}%.`,
    actionUrl: '/admin/empoweru',
    data: { moduleName, score },
  })
}

/**
 * Notify about message received
 */
export async function notifyMessageReceived(params: {
  userId: string
  tenantId?: string
  senderName: string
  messagePreview: string
  threadId: string
}): Promise<void> {
  const { userId, tenantId, senderName, messagePreview, threadId } = params

  await createNotification({
    userId,
    tenantId,
    type: 'message_received',
    category: 'message',
    severity: 'info',
    title: `New message from ${senderName}`,
    body: messagePreview.length > 100 ? messagePreview.substring(0, 100) + '...' : messagePreview,
    actionUrl: `/messaging?thread=${threadId}`,
    data: { senderName, threadId },
  })
}

/**
 * Notify licensee about royalty invoice created
 */
export async function notifyRoyaltyInvoiceCreated(params: {
  tenantId: string
  invoiceId: string
  invoiceNumber: string
  amountDue: number
  dueDate: string
  campName: string
}): Promise<void> {
  const { tenantId, invoiceId, invoiceNumber, amountDue, dueDate, campName } = params

  const { data: ownerIds } = await getLicenseeOwnerUserIds(tenantId)
  if (!ownerIds || ownerIds.length === 0) return

  await createNotificationsForUsers({
    userIds: ownerIds,
    tenantId,
    type: 'royalty_invoice_created',
    category: 'royalty',
    severity: 'info',
    title: 'Royalty Invoice Generated',
    body: `Invoice ${invoiceNumber} for ${campName}: $${amountDue.toFixed(2)} due by ${dueDate}.`,
    actionUrl: `/licensee/reports/royalties`,
    data: { invoiceId, invoiceNumber, amountDue, dueDate, campName },
  })
}

/**
 * Notify about royalty invoice status change
 */
export async function notifyRoyaltyInvoiceStatusChanged(params: {
  tenantId: string
  invoiceId: string
  invoiceNumber: string
  newStatus: string
}): Promise<void> {
  const { tenantId, invoiceId, invoiceNumber, newStatus } = params

  const { data: ownerIds } = await getLicenseeOwnerUserIds(tenantId)
  if (!ownerIds || ownerIds.length === 0) return

  const statusLabels: Record<string, { label: string; severity: NotificationSeverity }> = {
    invoiced: { label: 'Invoiced', severity: 'info' },
    paid: { label: 'Paid', severity: 'success' },
    overdue: { label: 'Overdue', severity: 'warning' },
    disputed: { label: 'Disputed', severity: 'warning' },
    waived: { label: 'Waived', severity: 'info' },
  }

  const { label, severity } = statusLabels[newStatus] || { label: newStatus, severity: 'info' as NotificationSeverity }

  await createNotificationsForUsers({
    userIds: ownerIds,
    tenantId,
    type: 'royalty_invoice_status_changed',
    category: 'royalty',
    severity,
    title: `Royalty Invoice ${label}`,
    body: `Invoice ${invoiceNumber} status updated to: ${label}.`,
    actionUrl: `/licensee/reports/royalties`,
    data: { invoiceId, invoiceNumber, newStatus },
  })
}

/**
 * Notify about job posted
 */
export async function notifyJobPosted(params: {
  tenantId: string
  jobId: string
  jobTitle: string
  location: string
}): Promise<void> {
  const { tenantId, jobId, jobTitle, location } = params

  const { data: ownerIds } = await getLicenseeOwnerUserIds(tenantId)
  const { data: directorIds } = await getDirectorUserIds(tenantId)

  const allIds = [...(ownerIds || []), ...(directorIds || [])]
  if (allIds.length === 0) return

  await createNotificationsForUsers({
    userIds: [...new Set(allIds)],
    tenantId,
    type: 'job_posted',
    category: 'job',
    severity: 'info',
    title: 'New Job Posted',
    body: `New position available: ${jobTitle} in ${location}.`,
    actionUrl: `/admin/jobs/${jobId}`,
    data: { jobId, jobTitle, location },
  })
}

/**
 * Notify applicant about job application status
 */
export async function notifyJobApplicationStatusChanged(params: {
  userId: string
  tenantId?: string
  jobId: string
  jobTitle: string
  newStatus: string
}): Promise<void> {
  const { userId, tenantId, jobId, jobTitle, newStatus } = params

  const statusLabels: Record<string, { label: string; severity: NotificationSeverity }> = {
    submitted: { label: 'Submitted', severity: 'info' },
    reviewing: { label: 'Under Review', severity: 'info' },
    interview: { label: 'Interview Scheduled', severity: 'success' },
    accepted: { label: 'Accepted', severity: 'success' },
    rejected: { label: 'Not Selected', severity: 'info' },
  }

  const { label, severity } = statusLabels[newStatus] || { label: newStatus, severity: 'info' as NotificationSeverity }

  await createNotification({
    userId,
    tenantId,
    type: 'job_application_status_changed',
    category: 'job',
    severity,
    title: 'Job Application Update',
    body: `Your application for "${jobTitle}" is now: ${label}.`,
    actionUrl: `/admin/jobs/${jobId}`,
    data: { jobId, jobTitle, newStatus },
  })
}

/**
 * Notify about certification status (approved/rejected)
 */
export async function notifyCertificationStatus(params: {
  userId: string
  tenantId?: string
  certificationName: string
  status: 'approved' | 'rejected'
}): Promise<void> {
  const { userId, tenantId, certificationName, status } = params

  const isApproved = status === 'approved'

  await createNotification({
    userId,
    tenantId,
    type: isApproved ? 'certification_approved' : 'certification_rejected',
    category: 'certification',
    severity: isApproved ? 'success' : 'warning',
    title: isApproved ? 'Certification Approved' : 'Certification Needs Attention',
    body: isApproved
      ? `Your ${certificationName} has been approved.`
      : `Your ${certificationName} was not approved. Please review and resubmit.`,
    actionUrl: '/volunteer/certifications',
    data: { certificationName, status },
  })
}

/**
 * Send welcome notification to new user
 */
export async function notifyWelcome(params: {
  userId: string
  tenantId?: string
  userName: string
  role: string
}): Promise<void> {
  const { userId, tenantId, userName, role } = params

  const portalPaths: Record<string, string> = {
    hq_admin: '/admin',
    licensee_owner: '/licensee/dashboard',
    director: '/director/dashboard',
    coach: '/coach',
    cit_volunteer: '/volunteer',
    parent: '/portal',
  }

  await createNotification({
    userId,
    tenantId,
    type: 'welcome',
    category: 'system',
    severity: 'success',
    title: 'Welcome to Empowered Sports Camp!',
    body: `Hi ${userName}! Your account is all set up. Start exploring your dashboard.`,
    actionUrl: portalPaths[role] || '/portal',
    data: { userName, role },
  })
}

/**
 * Send system alert notification
 */
export async function notifySystemAlert(params: {
  userId: string
  tenantId?: string
  title: string
  message: string
  severity: NotificationSeverity
  actionUrl?: string
}): Promise<void> {
  const { userId, tenantId, title, message, severity, actionUrl } = params

  await createNotification({
    userId,
    tenantId,
    type: 'system_alert',
    category: 'system',
    severity,
    title,
    body: message,
    actionUrl,
  })
}

// =============================================================================
// Email Notification Helpers
// =============================================================================

/**
 * Check if user has email notifications enabled for a category
 */
async function shouldSendEmail(
  userId: string,
  tenantId: string | null,
  category: NotificationCategory
): Promise<boolean> {
  try {
    const preference = await prisma.notificationPreference.findFirst({
      where: {
        userId,
        tenantId: tenantId || null,
        category,
      },
    })

    // Default to enabled if no preference exists
    return preference?.enabledEmail ?? true
  } catch {
    return true // Default to enabled on error
  }
}

/**
 * Get user email by userId
 */
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { email: true },
    })
    return profile?.email || null
  } catch {
    return null
  }
}

/**
 * Send email notification for camp registration confirmation
 */
export async function sendRegistrationConfirmationEmail(params: {
  registrationId: string
  tenantId: string
  userId: string
  athleteName: string
  campName: string
  startDate: string
}): Promise<void> {
  const { registrationId, tenantId, userId, athleteName, campName, startDate } = params

  const shouldSend = await shouldSendEmail(userId, tenantId, 'camp')
  if (!shouldSend) return

  const email = await getUserEmail(userId)
  if (!email) return

  sendTransactionalEmail({
    templateCode: 'CAMP_CONFIRMATION',
    to: email,
    context: {
      athleteName,
      campName,
      startDate,
      registrationId,
    },
    tenantId,
  }).catch((err) => console.error('[Notifications] Failed to send registration email:', err))
}

/**
 * Send email notification for royalty invoice
 */
export async function sendRoyaltyInvoiceEmail(params: {
  tenantId: string
  invoiceNumber: string
  amountDue: number
  dueDate: string
  campName: string
}): Promise<void> {
  const { tenantId, invoiceNumber, amountDue, dueDate, campName } = params

  const { data: ownerIds } = await getLicenseeOwnerUserIds(tenantId)
  if (!ownerIds || ownerIds.length === 0) return

  for (const userId of ownerIds) {
    const shouldSend = await shouldSendEmail(userId, tenantId, 'royalty')
    if (!shouldSend) continue

    const email = await getUserEmail(userId)
    if (!email) continue

    // Use PAYMENT_RECEIPT as a similar template (royalty invoice notification)
    sendTransactionalEmail({
      templateCode: 'PAYMENT_RECEIPT',
      to: email,
      context: {
        invoiceNumber,
        amount: amountDue.toFixed(2),
        dueDate,
        campName,
        type: 'royalty_invoice',
      },
      tenantId,
    }).catch((err) => console.error('[Notifications] Failed to send royalty invoice email:', err))
  }
}

/**
 * Send email for daily recap to licensee
 */
export async function sendDailyRecapEmail(params: {
  tenantId: string
  campName: string
  dayNumber: number
  summary: string
}): Promise<void> {
  const { tenantId, campName, dayNumber, summary } = params

  const { data: ownerIds } = await getLicenseeOwnerUserIds(tenantId)
  if (!ownerIds || ownerIds.length === 0) return

  for (const userId of ownerIds) {
    const shouldSend = await shouldSendEmail(userId, tenantId, 'camp')
    if (!shouldSend) continue

    const email = await getUserEmail(userId)
    if (!email) continue

    sendTransactionalEmail({
      templateCode: 'DAILY_RECAP',
      to: email,
      context: {
        campName,
        dayNumber,
        summary,
      },
      tenantId,
    }).catch((err) => console.error('[Notifications] Failed to send daily recap email:', err))
  }
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(params: {
  userId: string
  tenantId?: string
  userName: string
  role: string
}): Promise<void> {
  const { userId, tenantId, userName, role } = params

  const shouldSend = await shouldSendEmail(userId, tenantId || null, 'system')
  if (!shouldSend) return

  const email = await getUserEmail(userId)
  if (!email) return

  sendTransactionalEmail({
    templateCode: 'WELCOME',
    to: email,
    context: {
      userName,
      role,
    },
    tenantId: tenantId || '',
  }).catch((err) => console.error('[Notifications] Failed to send welcome email:', err))
}

// =============================================================================
// Testimony Notification Helpers
// =============================================================================

/**
 * Notify HQ admins when a new testimony is submitted
 */
export async function notifyTestimonySubmitted(
  testimonyId: string,
  authorName: string,
  headline?: string
): Promise<void> {
  const { data: adminIds } = await getHqAdminUserIds()
  if (!adminIds || adminIds.length === 0) return

  await createNotificationsForUsers({
    userIds: adminIds,
    type: 'testimony_submitted',
    category: 'marketing',
    severity: 'info',
    title: 'New Testimony Submitted',
    body: headline
      ? `${authorName} submitted a testimony: "${headline}"`
      : `${authorName} submitted a new testimony for review.`,
    actionUrl: `/admin/contact?tab=testimonies&id=${testimonyId}`,
    data: { testimonyId, authorName, headline },
  })
}

/**
 * Notify submitter when their testimony is approved
 */
export async function notifyTestimonyApproved(
  testimonyId: string,
  authorName: string,
  userId?: string,
  authorEmail?: string
): Promise<void> {
  // Only notify if we have a user ID (logged-in submitter)
  if (!userId) return

  await createNotification({
    userId,
    type: 'testimony_approved',
    category: 'marketing',
    severity: 'success',
    title: 'Testimony Approved!',
    body: 'Your testimony has been approved and may now appear on our Testimonies page. Thank you for sharing your story!',
    actionUrl: '/testimonies',
    data: { testimonyId, authorName },
  })

  // Optionally send email if we have their email
  if (authorEmail) {
    sendTransactionalEmail({
      templateCode: 'SYSTEM_ALERT',
      to: authorEmail,
      context: {
        title: 'Testimony Approved',
        message: 'Your testimony has been approved and may now appear on our Testimonies page. Thank you for sharing your experience with Empowered Sports Camp!',
        authorName,
      },
      tenantId: '',
    }).catch((err) => console.error('[Notifications] Failed to send testimony approval email:', err))
  }
}

/**
 * Notify submitter when their testimony is rejected
 */
export async function notifyTestimonyRejected(
  testimonyId: string,
  authorName: string,
  userId?: string,
  authorEmail?: string,
  reviewNotes?: string
): Promise<void> {
  // Only notify if we have a user ID (logged-in submitter)
  if (!userId) return

  await createNotification({
    userId,
    type: 'testimony_rejected',
    category: 'marketing',
    severity: 'info',
    title: 'Testimony Submission Update',
    body: reviewNotes
      ? `Thank you for sharing your story. ${reviewNotes}`
      : 'Thank you for taking the time to share your experience. Unfortunately, we are unable to publish your submission at this time.',
    actionUrl: '/testimonies/submit',
    data: { testimonyId, authorName },
  })

  // Optionally send email if we have their email
  if (authorEmail) {
    sendTransactionalEmail({
      templateCode: 'SYSTEM_ALERT',
      to: authorEmail,
      context: {
        title: 'Testimony Submission Update',
        message: reviewNotes
          ? `Thank you for sharing your experience with Empowered Sports Camp. ${reviewNotes}`
          : 'Thank you for taking the time to share your experience with Empowered Sports Camp. Unfortunately, we are unable to publish your submission at this time.',
        authorName,
      },
      tenantId: '',
    }).catch((err) => console.error('[Notifications] Failed to send testimony rejection email:', err))
  }
}

// =============================================================================
// Squad Notification Helpers (Build Her Squad Feature)
// =============================================================================

/**
 * Notify parent when they receive a squad invite
 */
export async function notifySquadInviteReceived(params: {
  userId: string
  tenantId: string
  squadId: string
  inviterName: string
  campName: string
  campId: string
}): Promise<void> {
  const { userId, tenantId, squadId, inviterName, campName, campId } = params

  await createNotification({
    userId,
    tenantId,
    type: 'squad_invite_received',
    category: 'camp',
    severity: 'info',
    title: 'Squad Invitation',
    body: `${inviterName} invited you to join their squad for ${campName}. Accept to have your athletes grouped together!`,
    actionUrl: `/portal/squads?campId=${campId}`,
    data: { squadId, inviterName, campName, campId },
  })

  // Also send email notification
  const email = await getUserEmail(userId)
  if (email) {
    sendTransactionalEmail({
      templateCode: 'SYSTEM_ALERT',
      to: email,
      context: {
        title: 'You\'ve Been Invited to Join a Squad!',
        message: `${inviterName} wants your athletes to be grouped with theirs at ${campName}. Log in to accept or decline this invitation.`,
      },
      tenantId,
    }).catch((err) => console.error('[Notifications] Failed to send squad invite email:', err))
  }
}

/**
 * Notify squad creator when someone accepts their invite
 */
export async function notifySquadInviteAccepted(params: {
  userId: string
  tenantId: string
  squadId: string
  accepterName: string
  athleteName: string
  campName: string
}): Promise<void> {
  const { userId, tenantId, squadId, accepterName, athleteName, campName } = params

  await createNotification({
    userId,
    tenantId,
    type: 'squad_invite_accepted',
    category: 'camp',
    severity: 'success',
    title: 'Squad Invitation Accepted!',
    body: `${accepterName} accepted your squad invitation. ${athleteName} will be grouped with your athlete at ${campName}!`,
    actionUrl: `/portal/squads`,
    data: { squadId, accepterName, athleteName, campName },
  })
}

/**
 * Notify squad creator when someone declines their invite
 */
export async function notifySquadInviteDeclined(params: {
  userId: string
  tenantId: string
  squadId: string
  declinerName: string
  campName: string
}): Promise<void> {
  const { userId, tenantId, squadId, declinerName, campName } = params

  await createNotification({
    userId,
    tenantId,
    type: 'squad_invite_declined',
    category: 'camp',
    severity: 'info',
    title: 'Squad Invitation Declined',
    body: `${declinerName} declined your squad invitation for ${campName}.`,
    actionUrl: `/portal/squads`,
    data: { squadId, declinerName, campName },
  })
}

// =============================================================================
// Staff Assignment Request Notifications
// =============================================================================

/**
 * Notify a user when they receive a staff assignment request
 */
export async function notifyStaffAssignmentRequestReceived(params: {
  userId: string
  tenantId: string | null
  campId: string
  campName: string
  role: string
  requestedByName: string
}): Promise<void> {
  const { userId, tenantId, campId, campName, role, requestedByName } = params

  await createNotification({
    userId,
    tenantId,
    type: 'staff_assignment_request_received',
    category: 'camp',
    severity: 'info',
    title: 'Staff Assignment Request',
    body: `${requestedByName} has invited you to work at ${campName} as a ${role}. Review and respond to this invitation.`,
    actionUrl: `/coach`,
    data: { campId, campName, role, requestedByName },
  })

  // Also send email notification
  const email = await getUserEmail(userId)
  if (email) {
    sendTransactionalEmail({
      templateCode: 'SYSTEM_ALERT',
      to: email,
      context: {
        title: 'You\'ve Been Invited to Staff a Camp!',
        message: `${requestedByName} has invited you to join the team at ${campName} as a ${role}. Log in to accept or decline this invitation.`,
      },
      tenantId: tenantId || undefined,
    }).catch((err) => console.error('[Notifications] Failed to send staff request email:', err))
  }
}

/**
 * Notify the requester when a staff member accepts their assignment request
 */
export async function notifyStaffAssignmentRequestAccepted(params: {
  userId: string
  tenantId: string | null
  campId: string
  campName: string
  staffName: string
  role: string
}): Promise<void> {
  const { userId, tenantId, campId, campName, staffName, role } = params

  await createNotification({
    userId,
    tenantId,
    type: 'staff_assignment_request_accepted',
    category: 'camp',
    severity: 'success',
    title: 'Staff Request Accepted!',
    body: `${staffName} accepted your invitation to work at ${campName} as a ${role}.`,
    actionUrl: `/director/camps/${campId}/hq?tab=staffing`,
    data: { campId, campName, staffName, role },
  })
}

/**
 * Notify the requester when a staff member declines their assignment request
 */
export async function notifyStaffAssignmentRequestDeclined(params: {
  userId: string
  tenantId: string | null
  campId: string
  campName: string
  staffName: string
  role: string
}): Promise<void> {
  const { userId, tenantId, campId, campName, staffName, role } = params

  await createNotification({
    userId,
    tenantId,
    type: 'staff_assignment_request_declined',
    category: 'camp',
    severity: 'info',
    title: 'Staff Request Declined',
    body: `${staffName} declined your invitation to work at ${campName} as a ${role}.`,
    actionUrl: `/director/camps/${campId}/hq?tab=staffing`,
    data: { campId, campName, staffName, role },
  })
}
