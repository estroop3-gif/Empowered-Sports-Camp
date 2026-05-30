/**
 * Admin Alert Subscriptions Service
 *
 * Central dispatch for admin event notifications.
 * Sends branded emails to subscribed admins + in-app notifications to all admin users.
 */

import { prisma } from '@/lib/db/client'
import { sendEmail, logEmail } from '@/lib/email/resend-client'
import { brandWrap } from '@/lib/email/brand-layout'
import { createNotificationsForUsers } from './notifications'
import type { NotificationType, NotificationCategory } from './notifications'
import type { AlertEmailContent } from '@/lib/email/admin-alerts'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ops@empoweredathletes.com'
const FROM_ADDRESS = 'Empowered Sports Camp <info@empoweredsportscamp.com>'

// ============================================================================
// Subscription CRUD
// ============================================================================

export interface AdminAlertSubscription {
  id: string
  userId: string
  forwardingEmail: string
  enabledCategories: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export async function getAdminAlertSubscription(
  userId: string
): Promise<{ data: AdminAlertSubscription | null; error: Error | null }> {
  try {
    const sub = await prisma.$queryRaw<Array<{
      id: string
      user_id: string
      forwarding_email: string
      enabled_categories: string[]
      is_active: boolean
      created_at: Date
      updated_at: Date
    }>>`
      SELECT * FROM admin_alert_subscriptions WHERE user_id = ${userId}::uuid LIMIT 1
    `

    if (!sub.length) return { data: null, error: null }

    const row = sub[0]
    return {
      data: {
        id: row.id,
        userId: row.user_id,
        forwardingEmail: row.forwarding_email,
        enabledCategories: row.enabled_categories,
        isActive: row.is_active,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[AdminAlerts] Failed to get subscription:', error)
    return { data: null, error: error as Error }
  }
}

export async function upsertAdminAlertSubscription(params: {
  userId: string
  forwardingEmail: string
  enabledCategories: string[]
  isActive: boolean
}): Promise<{ data: AdminAlertSubscription | null; error: Error | null }> {
  try {
    const { userId, forwardingEmail, enabledCategories, isActive } = params

    const result = await prisma.$queryRaw<Array<{
      id: string
      user_id: string
      forwarding_email: string
      enabled_categories: string[]
      is_active: boolean
      created_at: Date
      updated_at: Date
    }>>`
      INSERT INTO admin_alert_subscriptions (user_id, forwarding_email, enabled_categories, is_active)
      VALUES (${userId}::uuid, ${forwardingEmail}, ${enabledCategories}::text[], ${isActive})
      ON CONFLICT (user_id) DO UPDATE SET
        forwarding_email = EXCLUDED.forwarding_email,
        enabled_categories = EXCLUDED.enabled_categories,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      RETURNING *
    `

    const row = result[0]
    return {
      data: {
        id: row.id,
        userId: row.user_id,
        forwardingEmail: row.forwarding_email,
        enabledCategories: row.enabled_categories,
        isActive: row.is_active,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[AdminAlerts] Failed to upsert subscription:', error)
    return { data: null, error: error as Error }
  }
}

// ============================================================================
// Central Dispatch
// ============================================================================

interface NotifyParams {
  category: string
  notificationType: NotificationType
  title: string
  body: string
  emailContent: AlertEmailContent
  actionUrl: string
}

/**
 * Notify all subscribed admins via branded email + in-app notifications for all admin users.
 * Also sends to ADMIN_EMAIL env as fallback.
 */
export async function notifyAdminSubscribers(params: NotifyParams): Promise<void> {
  const { category, notificationType, title, body, emailContent, actionUrl } = params

  try {
    // 1. Get all active subscribers for this category
    const subscribers = await prisma.$queryRaw<Array<{
      id: string
      user_id: string
      forwarding_email: string
    }>>`
      SELECT id, user_id, forwarding_email
      FROM admin_alert_subscriptions
      WHERE is_active = TRUE
        AND ${category} = ANY(enabled_categories)
    `

    const wrappedHtml = brandWrap(emailContent.bodyHtml)
    const subscriberEmails = new Set(subscribers.map(s => s.forwarding_email.toLowerCase()))

    // 2. Always send to hardcoded ADMIN_EMAIL as fallback
    if (!subscriberEmails.has(ADMIN_EMAIL.toLowerCase())) {
      try {
        const result = await sendEmail({
          to: ADMIN_EMAIL,
          subject: emailContent.subject,
          html: wrappedHtml,
          from: FROM_ADDRESS,
        })

        await logEmail({
          toEmail: ADMIN_EMAIL,
          fromEmail: FROM_ADDRESS,
          subject: emailContent.subject,
          emailType: 'system_alert',
          status: result.success ? 'sent' : 'failed',
          providerMessageId: result.messageId,
          errorMessage: result.error,
          payload: { category, alertType: 'admin_fallback' },
        })
      } catch (err) {
        console.error('[AdminAlerts] Failed to send fallback email:', err)
      }
    }

    // 3. Send to each subscriber
    for (const sub of subscribers) {
      try {
        const result = await sendEmail({
          to: sub.forwarding_email,
          subject: emailContent.subject,
          html: wrappedHtml,
          from: FROM_ADDRESS,
        })

        await logEmail({
          userId: sub.user_id,
          toEmail: sub.forwarding_email,
          fromEmail: FROM_ADDRESS,
          subject: emailContent.subject,
          emailType: 'system_alert',
          status: result.success ? 'sent' : 'failed',
          providerMessageId: result.messageId,
          errorMessage: result.error,
          payload: { category, alertType: 'admin_subscription' },
        })
      } catch (err) {
        console.error(`[AdminAlerts] Failed to send to ${sub.forwarding_email}:`, err)
      }
    }

    // 4. Create in-app notifications for all admin-role users
    try {
      const adminUsers = await prisma.userRoleAssignment.findMany({
        where: {
          role: { in: ['hq_admin', 'licensee_owner', 'director'] },
          isActive: true,
        },
        select: { userId: true },
      })

      const adminUserIds = [...new Set(adminUsers.map(u => u.userId))]

      if (adminUserIds.length > 0) {
        await createNotificationsForUsers({
          userIds: adminUserIds,
          type: notificationType,
          category: category as NotificationCategory,
          title,
          body,
          actionUrl,
          severity: 'info',
        })
      }
    } catch (err) {
      console.error('[AdminAlerts] Failed to create in-app notifications:', err)
    }
  } catch (error) {
    console.error('[AdminAlerts] notifyAdminSubscribers failed:', error)
  }
}
