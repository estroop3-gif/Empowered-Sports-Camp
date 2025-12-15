/**
 * Email Service
 *
 * SHELL: Email integration and send utilities
 *
 * Handles:
 * - Transactional emails via Resend
 * - Camp confirmation emails
 * - Daily recap emails
 * - Post-camp follow-up emails
 * - Staff messaging email notifications
 */

import { prisma } from '@/lib/db/client'

// =============================================================================
// Types
// =============================================================================

export type EmailTemplateCode =
  | 'CAMP_CONFIRMATION'
  | 'CAMP_REMINDER'
  | 'DAILY_RECAP'
  | 'POST_CAMP'
  | 'STAFF_MESSAGE'
  | 'PASSWORD_RESET'
  | 'WELCOME'
  | 'PAYMENT_RECEIPT'
  | 'PAYMENT_FAILED'

export interface EmailResult {
  success: boolean
  messageId: string | null
  sentAt: string | null
}

export interface EmailContext {
  [key: string]: string | number | boolean | null | undefined
}

// =============================================================================
// Configuration
// =============================================================================

// SHELL: Configure Resend API key from environment
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@empoweredsportscamp.com'

// SHELL: Email template mappings
// TODO: Create actual email templates in Resend dashboard or as React Email components
const EMAIL_TEMPLATES: Record<EmailTemplateCode, { subject: string; templateId?: string }> = {
  CAMP_CONFIRMATION: {
    subject: 'Your Camp Registration is Confirmed!',
    // templateId: 're_xxx', // SHELL: Add Resend template ID
  },
  CAMP_REMINDER: {
    subject: 'Camp Starts Tomorrow!',
  },
  DAILY_RECAP: {
    subject: "Today's Camp Recap",
  },
  POST_CAMP: {
    subject: 'Thanks for Joining Us at Camp!',
  },
  STAFF_MESSAGE: {
    subject: 'New Message from Empowered Sports Camp',
  },
  PASSWORD_RESET: {
    subject: 'Reset Your Password',
  },
  WELCOME: {
    subject: 'Welcome to Empowered Sports Camp!',
  },
  PAYMENT_RECEIPT: {
    subject: 'Payment Receipt',
  },
  PAYMENT_FAILED: {
    subject: 'Payment Issue - Action Required',
  },
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * SHELL: Send a transactional email using Resend
 */
export async function sendTransactionalEmail(params: {
  templateCode: EmailTemplateCode
  to: string
  context: EmailContext
  tenantId: string
}): Promise<{ data: EmailResult | null; error: Error | null }> {
  try {
    const { templateCode, to, context, tenantId } = params

    const template = EMAIL_TEMPLATES[templateCode]
    if (!template) {
      return { data: null, error: new Error(`Unknown email template: ${templateCode}`) }
    }

    // SHELL: Build email content
    // TODO: Use React Email components or Resend templates
    const emailContent = buildEmailContent(templateCode, context)

    // SHELL: Send via Resend API
    // TODO: Implement actual Resend integration
    /*
    const resend = new Resend(RESEND_API_KEY)
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: template.subject,
      html: emailContent,
    })
    */

    console.log('[Email] SHELL: Would send email:', {
      templateCode,
      to,
      subject: template.subject,
      context,
    })

    // SHELL: Log email send for tracking
    // TODO: Store in email_logs table

    return {
      data: {
        success: true,
        messageId: null, // SHELL: Return actual Resend message ID
        sentAt: new Date().toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[Email] Failed to send transactional email:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: Send camp confirmation email after successful registration + payment
 */
export async function sendCampConfirmationEmail(params: {
  registrationId: string
  tenantId: string
}): Promise<{ data: EmailResult | null; error: Error | null }> {
  try {
    const { registrationId, tenantId } = params

    // SHELL: Fetch registration data
    const registration = await prisma.registration.findFirst({
      where: {
        id: registrationId,
        tenantId,
      },
      include: {
        camp: {
          include: {
            location: true,
          },
        },
        athlete: true,
        parent: true,
      },
    })

    if (!registration) {
      return { data: null, error: new Error('Registration not found') }
    }

    // SHELL: Build context for email template
    const context: EmailContext = {
      parentName: registration.parent?.firstName || 'Parent',
      athleteName: registration.athlete?.firstName || 'Athlete',
      campName: registration.camp.name,
      campStartDate: registration.camp.startDate.toLocaleDateString(),
      campEndDate: registration.camp.endDate.toLocaleDateString(),
      campLocation: registration.camp.location?.name || '',
      campAddress: registration.camp.location?.address || '',
      // SHELL: Add more context as needed
    }

    // SHELL: Get parent email
    const toEmail = registration.parent?.email
    if (!toEmail) {
      return { data: null, error: new Error('No parent email found for registration') }
    }

    return sendTransactionalEmail({
      templateCode: 'CAMP_CONFIRMATION',
      to: toEmail,
      context,
      tenantId,
    })
  } catch (error) {
    console.error('[Email] Failed to send camp confirmation:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: Send daily recap email to parents after each camp day
 */
export async function sendDailyRecapEmail(params: {
  campDayId: string
  tenantId: string
}): Promise<{ data: { sent: number; failed: number } | null; error: Error | null }> {
  try {
    const { campDayId, tenantId } = params

    // SHELL: Fetch camp day and attendance data
    const campDay = await prisma.campDay.findFirst({
      where: {
        id: campDayId,
        camp: { tenantId },
      },
      include: {
        camp: true,
        attendance: {
          include: {
            athlete: true,
            parentProfile: true,
          },
        },
      },
    })

    if (!campDay) {
      return { data: null, error: new Error('Camp day not found') }
    }

    // SHELL: Send recap to each parent with checked-in camper
    let sent = 0
    let failed = 0

    // TODO: Implement batch email sending
    // For each parent of checked-in campers:
    // - Build personalized context (photos, activities, notes)
    // - Send email via sendTransactionalEmail
    // - Track success/failure

    console.log('[Email] SHELL: Would send daily recap emails for camp day:', campDayId)

    return {
      data: { sent, failed },
      error: null,
    }
  } catch (error) {
    console.error('[Email] Failed to send daily recap emails:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: Send post-camp follow-up email after session ends
 */
export async function sendPostCampEmail(params: {
  campSessionId: string
  tenantId: string
}): Promise<{ data: { sent: number; failed: number } | null; error: Error | null }> {
  try {
    const { campSessionId, tenantId } = params

    // SHELL: Fetch camp and all registrations
    const camp = await prisma.camp.findFirst({
      where: {
        id: campSessionId,
        tenantId,
      },
      include: {
        registrations: {
          where: { status: 'confirmed' },
          include: {
            parent: true,
            athlete: true,
          },
        },
      },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp not found') }
    }

    let sent = 0
    let failed = 0

    // SHELL: Send post-camp email to each parent
    // TODO: Include:
    // - Thank you message
    // - Feedback/survey link
    // - Photos from camp (if available)
    // - Invitation to register for future camps
    // - Referral program info

    console.log('[Email] SHELL: Would send post-camp emails for session:', campSessionId)

    return {
      data: { sent, failed },
      error: null,
    }
  } catch (error) {
    console.error('[Email] Failed to send post-camp emails:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: Send email notification when a staff member receives a message
 */
export async function sendStaffMessageEmail(params: {
  fromProfileId: string
  toProfileId: string
  messageId: string
  tenantId: string
}): Promise<{ data: EmailResult | null; error: Error | null }> {
  try {
    const { fromProfileId, toProfileId, messageId, tenantId } = params

    // SHELL: Fetch sender, recipient, and message
    const [fromProfile, toProfile] = await Promise.all([
      prisma.profile.findUnique({ where: { id: fromProfileId } }),
      prisma.profile.findUnique({ where: { id: toProfileId } }),
    ])

    if (!fromProfile || !toProfile) {
      return { data: null, error: new Error('Profile not found') }
    }

    // SHELL: Fetch message content
    // TODO: Query messages table after it's created
    const message = { subject: 'New Message', body: '' } // Placeholder

    const context: EmailContext = {
      recipientName: toProfile.firstName || 'Team Member',
      senderName: `${fromProfile.firstName} ${fromProfile.lastName}`,
      messagePreview: message.body.substring(0, 100),
      messageUrl: `/messaging?id=${messageId}`,
    }

    return sendTransactionalEmail({
      templateCode: 'STAFF_MESSAGE',
      to: toProfile.email,
      context,
      tenantId,
    })
  } catch (error) {
    console.error('[Email] Failed to send staff message email:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: Send a broadcast email to multiple recipients
 */
export async function sendBroadcastEmail(params: {
  recipients: string[]
  subject: string
  body: string
  tenantId: string
  senderId: string
}): Promise<{ data: { sent: number; failed: number } | null; error: Error | null }> {
  try {
    const { recipients, subject, body, tenantId, senderId } = params

    // SHELL: Validate sender has permission to send broadcasts
    // TODO: Check role permissions

    let sent = 0
    let failed = 0

    // SHELL: Send to each recipient
    // TODO: Use Resend batch API for efficiency
    // TODO: Implement rate limiting
    // TODO: Track email sends in audit log

    console.log('[Email] SHELL: Would send broadcast to', recipients.length, 'recipients')

    return {
      data: { sent, failed },
      error: null,
    }
  } catch (error) {
    console.error('[Email] Failed to send broadcast:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * SHELL: Build email HTML content from template and context
 */
function buildEmailContent(templateCode: EmailTemplateCode, context: EmailContext): string {
  // SHELL: Replace with React Email components or Resend templates
  // TODO: Create proper email templates with Empowered Sports branding

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .header { background: #000; color: #fff; padding: 20px; }
        .content { padding: 20px; }
        .footer { background: #f5f5f5; padding: 20px; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Empowered Sports Camp</h1>
      </div>
      <div class="content">
        <p>Template: ${templateCode}</p>
        <p>Context: ${JSON.stringify(context)}</p>
        <p><em>SHELL: Replace with actual email template content</em></p>
      </div>
      <div class="footer">
        <p>Empowered Sports Camp | empoweredsportscamp.com</p>
      </div>
    </body>
    </html>
  `
}
