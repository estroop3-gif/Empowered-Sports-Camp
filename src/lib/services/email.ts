/**
 * Email Service
 *
 * Production-ready email integration via Resend with email logging.
 *
 * Handles:
 * - Transactional emails via Resend
 * - Parent-facing camp communications (registration, reminders, recaps)
 * - Seasonal follow-up campaigns
 * - Application notifications
 * - System alerts
 * - Email logging for observability
 */

import { sendEmail as sesSendEmail, isEmailConfigured } from '@/lib/email/resend-client'
import { brandWrap, BRAND, emailLabel, emailHeading, emailSubheading, emailParagraph, emailButton, emailDetailsCard, emailHighlight, emailCallout } from '@/lib/email/brand-layout'
import { prisma } from '@/lib/db/client'
import type { EmailType, EmailStatus, Prisma, EmailTemplate } from '@/generated/prisma'

// =============================================================================
// Types
// =============================================================================

// Map internal template codes to Prisma EmailType enum
export type EmailTemplateCode =
  // Parent-facing camp communications
  | 'REGISTRATION_CONFIRMATION'
  | 'CAMP_TWO_WEEKS_OUT'
  | 'CAMP_TWO_DAYS_BEFORE'
  | 'CAMP_DAILY_RECAP'
  | 'CAMP_SESSION_RECAP'
  // Seasonal follow-ups
  | 'SEASON_FOLLOWUP_JAN'
  | 'SEASON_FOLLOWUP_FEB'
  | 'SEASON_FOLLOWUP_MAR'
  | 'SEASON_FOLLOWUP_APR'
  | 'SEASON_FOLLOWUP_MAY'
  // Legacy/existing types
  | 'CAMP_CONFIRMATION'
  | 'CAMP_REMINDER'
  | 'DAILY_RECAP'
  | 'POST_CAMP'
  | 'STAFF_MESSAGE'
  | 'PASSWORD_RESET'
  | 'WELCOME'
  | 'PAYMENT_RECEIPT'
  | 'PAYMENT_FAILED'
  // Applications
  | 'LICENSEE_APPLICATION'
  | 'LICENSEE_STATUS_UPDATE'
  | 'CIT_APPLICATION'
  | 'CIT_STATUS_UPDATE'
  // Royalties & Admin
  | 'ROYALTY_INVOICE'
  | 'ROYALTY_STATUS_UPDATE'
  // LMS
  | 'LMS_COMPLETION'
  | 'CERTIFICATION_UPDATE'
  | 'INCENTIVE_UPDATE'
  | 'JOB_APPLICATION'
  // System
  | 'SYSTEM_ALERT'
  | 'BROADCAST'
  // Reports
  | 'WEEKLY_REPORT'

// Map template codes to Prisma EmailType values
const templateToEmailType: Record<EmailTemplateCode, EmailType> = {
  REGISTRATION_CONFIRMATION: 'registration_confirmation',
  CAMP_TWO_WEEKS_OUT: 'camp_two_weeks_out',
  CAMP_TWO_DAYS_BEFORE: 'camp_two_days_before',
  CAMP_DAILY_RECAP: 'camp_daily_recap',
  CAMP_SESSION_RECAP: 'camp_session_recap',
  SEASON_FOLLOWUP_JAN: 'season_followup_jan',
  SEASON_FOLLOWUP_FEB: 'season_followup_feb',
  SEASON_FOLLOWUP_MAR: 'season_followup_mar',
  SEASON_FOLLOWUP_APR: 'season_followup_apr',
  SEASON_FOLLOWUP_MAY: 'season_followup_may',
  CAMP_CONFIRMATION: 'camp_confirmation',
  CAMP_REMINDER: 'camp_reminder',
  DAILY_RECAP: 'daily_recap',
  POST_CAMP: 'post_camp',
  STAFF_MESSAGE: 'staff_message',
  PASSWORD_RESET: 'password_reset',
  WELCOME: 'welcome',
  PAYMENT_RECEIPT: 'payment_receipt',
  PAYMENT_FAILED: 'payment_failed',
  LICENSEE_APPLICATION: 'licensee_application',
  LICENSEE_STATUS_UPDATE: 'licensee_status_update',
  CIT_APPLICATION: 'cit_application',
  CIT_STATUS_UPDATE: 'cit_status_update',
  ROYALTY_INVOICE: 'royalty_invoice',
  ROYALTY_STATUS_UPDATE: 'royalty_status_update',
  LMS_COMPLETION: 'daily_recap', // Map to closest
  CERTIFICATION_UPDATE: 'system_alert',
  INCENTIVE_UPDATE: 'system_alert',
  JOB_APPLICATION: 'system_alert',
  SYSTEM_ALERT: 'system_alert',
  BROADCAST: 'broadcast',
  WEEKLY_REPORT: 'weekly_report',
}

export interface EmailResult {
  success: boolean
  messageId: string | null
  sentAt: string | null
  emailLogId?: string
}

export interface EmailContext {
  [key: string]: string | number | boolean | null | undefined | string[]
}

export interface SendEmailParams {
  templateCode: EmailTemplateCode
  to: string
  context: EmailContext
  tenantId?: string | null
  userId?: string | null
  from?: string
  replyTo?: string
}

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_FROM_EMAIL = process.env.FROM_EMAIL || 'Empowered Sports Camp <noreply@empoweredsportscamp.com>'
const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production'

// Template cache (in-memory, refreshes on server restart)
let templateCache: Map<EmailType, EmailTemplate> | null = null
let templateCacheTime: number = 0
const TEMPLATE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// =============================================================================
// Template Fetching
// =============================================================================

/**
 * Fetch email template from database with caching
 * Returns null if not found, allowing fallback to hardcoded templates
 */
async function getTemplateFromDatabase(emailType: EmailType, tenantId?: string | null): Promise<EmailTemplate | null> {
  try {
    // Check cache validity
    const now = Date.now()
    if (!templateCache || now - templateCacheTime > TEMPLATE_CACHE_TTL) {
      // Refresh cache
      const templates = await prisma.emailTemplate.findMany({
        where: { isActive: true },
      })
      templateCache = new Map()
      for (const t of templates) {
        // Store tenant-specific templates with tenant prefix
        const key = t.tenantId ? `${t.tenantId}:${t.emailType}` : t.emailType
        templateCache.set(key as EmailType, t)
      }
      templateCacheTime = now
    }

    // Try tenant-specific template first
    if (tenantId) {
      const tenantKey = `${tenantId}:${emailType}` as EmailType
      const tenantTemplate = templateCache.get(tenantKey)
      if (tenantTemplate) return tenantTemplate
    }

    // Fall back to global template
    return templateCache.get(emailType) || null
  } catch (error) {
    console.error('[Email] Failed to fetch template from database:', error)
    return null
  }
}

/**
 * Invalidate the template cache to force re-fetching from database
 * Call this when templates are created, updated, or deleted
 */
export function invalidateTemplateCache(): void {
  templateCache = null
  templateCacheTime = 0
  console.log('[Email] Template cache invalidated')
}

/**
 * Replace template variables in subject and body
 * Variables are in format {{variableName}}
 */
function replaceTemplateVariables(template: string, context: EmailContext): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = context[key]
    if (value === undefined || value === null) return match
    if (Array.isArray(value)) return value.join(', ')
    return String(value)
  })
}

/**
 * Get email content from database template or fall back to hardcoded
 */
async function getEmailContent(
  templateCode: EmailTemplateCode,
  context: EmailContext,
  tenantId?: string | null
): Promise<{ subject: string; html: string }> {
  const emailType = templateToEmailType[templateCode]

  // Try to get template from database
  const dbTemplate = await getTemplateFromDatabase(emailType, tenantId)

  if (dbTemplate && dbTemplate.bodyHtml) {
    // Use database template
    return {
      subject: replaceTemplateVariables(dbTemplate.subject, context),
      html: replaceTemplateVariables(dbTemplate.bodyHtml, context),
    }
  }

  // Fall back to hardcoded templates
  return {
    subject: getEmailSubject(templateCode, context),
    html: buildEmailContent(templateCode, context),
  }
}

// =============================================================================
// Email Logging
// =============================================================================

async function logEmail(params: {
  tenantId?: string | null
  userId?: string | null
  toEmail: string
  fromEmail: string
  subject: string
  emailType: EmailType
  payload: EmailContext
  providerMessageId?: string | null
  status: EmailStatus
  errorMessage?: string | null
}): Promise<string | null> {
  try {
    const log = await prisma.emailLog.create({
      data: {
        tenantId: params.tenantId || null,
        userId: params.userId || null,
        toEmail: params.toEmail,
        fromEmail: params.fromEmail,
        subject: params.subject,
        emailType: params.emailType,
        payload: params.payload as Prisma.InputJsonValue,
        providerMessageId: params.providerMessageId || null,
        status: params.status,
        errorMessage: params.errorMessage || null,
      },
    })
    return log.id
  } catch (err) {
    console.error('[Email] Failed to log email:', err)
    return null
  }
}

// =============================================================================
// Main Email Service
// =============================================================================

/**
 * Send a transactional email using Resend with logging
 */
export async function sendTransactionalEmail(params: SendEmailParams): Promise<{ data: EmailResult | null; error: Error | null }> {
  const { templateCode, to, context, tenantId, userId, from, replyTo } = params

  try {
    // Get email content from database or fallback to hardcoded
    const { subject, html } = await getEmailContent(templateCode, context, tenantId)
    const emailType = templateToEmailType[templateCode]
    const fromEmail = from || DEFAULT_FROM_EMAIL

    // In development without Resend key, log and return success
    if (IS_DEVELOPMENT && !isEmailConfigured()) {
      console.log('[Email] Would send email:', {
        templateCode,
        to,
        subject,
        from: fromEmail,
      })

      const emailLogId = await logEmail({
        tenantId,
        userId,
        toEmail: to,
        fromEmail,
        subject,
        emailType,
        payload: context,
        providerMessageId: `dev-${Date.now()}`,
        status: 'sent',
      })

      return {
        data: {
          success: true,
          messageId: `dev-${Date.now()}`,
          sentAt: new Date().toISOString(),
          emailLogId: emailLogId || undefined,
        },
        error: null,
      }
    }

    // Send via Resend
    const result = await sesSendEmail({
      from: fromEmail,
      to,
      subject,
      html,
      replyTo,
    })

    if (!result.success) {
      console.error('[Email] Resend error:', result.error)

      await logEmail({
        tenantId,
        userId,
        toEmail: to,
        fromEmail,
        subject,
        emailType,
        payload: context,
        status: 'failed',
        errorMessage: result.error,
      })

      return { data: null, error: new Error(result.error) }
    }

    // Log successful send
    const emailLogId = await logEmail({
      tenantId,
      userId,
      toEmail: to,
      fromEmail,
      subject,
      emailType,
      payload: context,
      providerMessageId: result.messageId || null,
      status: 'sent',
    })

    return {
      data: {
        success: true,
        messageId: result.messageId || null,
        sentAt: new Date().toISOString(),
        emailLogId: emailLogId || undefined,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Email] Failed to send transactional email:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Subject Line Generator
// =============================================================================

function getEmailSubject(templateCode: EmailTemplateCode, context: EmailContext): string {
  switch (templateCode) {
    // Parent-facing camp communications
    case 'REGISTRATION_CONFIRMATION':
      return `You're All Set! Confirmation of Your ${context.campName || 'Camp'} Registration!`
    case 'CAMP_TWO_WEEKS_OUT':
      return `Two Weeks to Go! Get Ready for ${context.campName || 'Camp'}`
    case 'CAMP_TWO_DAYS_BEFORE':
      return `Final Countdown: Your ${context.campName || 'Camp'} Checklist`
    case 'CAMP_DAILY_RECAP':
      return `${context.campName || 'Camp'} Day ${context.dayNumber || ''} Recap: ${context.wordOfTheDay || 'Great Day'}!`
    case 'CAMP_SESSION_RECAP':
      return `Thank You for a Great ${context.campName || 'Camp'} Session!`

    // Seasonal follow-ups
    case 'SEASON_FOLLOWUP_JAN':
      return 'New Year, New Camp Dates!'
    case 'SEASON_FOLLOWUP_FEB':
      return 'Early Bird Registration is OPEN!'
    case 'SEASON_FOLLOWUP_MAR':
      return 'Summer Spots Are Filling Up Fast!'
    case 'SEASON_FOLLOWUP_APR':
      return 'The Final Countdown: Registration Closes Soon!'
    case 'SEASON_FOLLOWUP_MAY':
      return "School's Out, Camp is IN! Last Call!"

    // Existing templates
    case 'CAMP_CONFIRMATION':
      return `Your ${context.campName || 'Camp'} Registration is Confirmed!`
    case 'CAMP_REMINDER':
      return 'Camp Starts Tomorrow!'
    case 'DAILY_RECAP':
      return `Today's Camp Recap - Day ${context.dayNumber || ''}`
    case 'POST_CAMP':
      return 'Thanks for Joining Us at Camp!'
    case 'STAFF_MESSAGE':
      return `New Message from ${context.senderName || 'Empowered Sports Camp'}`
    case 'PASSWORD_RESET':
      return 'Reset Your Password'
    case 'WELCOME':
      return 'Welcome to Empowered Sports Camp!'
    case 'PAYMENT_RECEIPT':
      return 'Payment Receipt'
    case 'PAYMENT_FAILED':
      return 'Payment Issue - Action Required'
    case 'LICENSEE_APPLICATION':
      return 'New Licensee Application Received'
    case 'LICENSEE_STATUS_UPDATE':
      return `Application Update: ${context.status || 'Status Changed'}`
    case 'CIT_APPLICATION':
      return 'New CIT Application Received'
    case 'CIT_STATUS_UPDATE':
      return `CIT Application Update: ${context.status || 'Status Changed'}`
    case 'ROYALTY_INVOICE':
      return `Royalty Invoice ${context.invoiceNumber || ''}`
    case 'ROYALTY_STATUS_UPDATE':
      return `Invoice ${context.invoiceNumber || ''} - ${context.status || 'Updated'}`
    case 'LMS_COMPLETION':
      return `Congratulations! You completed ${context.moduleName || 'a module'}`
    case 'CERTIFICATION_UPDATE':
      return 'Certification Status Update'
    case 'INCENTIVE_UPDATE':
      return 'Incentive Program Update'
    case 'JOB_APPLICATION':
      return `Application Update: ${context.position || 'Position'}`
    case 'SYSTEM_ALERT':
      return `${context.severity === 'error' ? '⚠️ ' : ''}System Alert`
    case 'BROADCAST':
      return String(context.subject || 'Message from Empowered Sports Camp')
    case 'WEEKLY_REPORT':
      return `Weekly Business Report — ${context.reportDate || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
    default:
      return 'Message from Empowered Sports Camp'
  }
}

// =============================================================================
// Specialized Send Functions for Parent-Facing Emails
// =============================================================================

/**
 * Send registration confirmation email after payment success
 */
export async function sendRegistrationConfirmationEmail(params: {
  registrationId: string
  tenantId: string
}): Promise<{ data: EmailResult | null; error: Error | null }> {
  try {
    const { registrationId, tenantId } = params

    const registration = await prisma.registration.findFirst({
      where: { id: registrationId, tenantId },
      include: {
        camp: { include: { location: true } },
        athlete: true,
        parent: true,
        tenant: true,
        promoCode: { select: { code: true, discountType: true, discountValue: true } },
        registrationAddons: {
          include: {
            addon: { select: { name: true } },
            variant: { select: { name: true } },
          },
        },
      },
    })

    if (!registration) {
      return { data: null, error: new Error('Registration not found') }
    }

    const toEmail = registration.parent?.email
    if (!toEmail) {
      return { data: null, error: new Error('No parent email found') }
    }

    // Format dates
    const startDate = registration.camp.startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    const endDate = registration.camp.endDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

    // Format times
    const formatTimeVal = (t: Date | null) => {
      if (!t) return ''
      const h = t.getUTCHours()
      const m = t.getUTCMinutes()
      const ampm = h >= 12 ? 'PM' : 'AM'
      return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`
    }
    const campTimes = registration.camp.startTime && registration.camp.endTime
      ? `${formatTimeVal(registration.camp.startTime)} – ${formatTimeVal(registration.camp.endTime)}`
      : ''

    // Build receipt data for context
    const fmtCents = (c: number) => `$${(c / 100).toFixed(2)}`
    const addons = registration.registrationAddons.map((ra) => ({
      name: ra.addon?.name || 'Add-on',
      variant: ra.variant?.name || null,
      quantity: ra.quantity,
      priceCents: ra.priceCents,
    }))

    const context: EmailContext = {
      parentName: registration.parent?.firstName || 'Parent',
      camperName: `${registration.athlete?.firstName || ''} ${registration.athlete?.lastName || ''}`.trim() || 'Your Athlete',
      campName: registration.camp.name,
      sessionDates: `${startDate} – ${endDate}`,
      campTimes,
      facilityName: registration.camp.location?.name || 'TBA',
      facilityAddress: registration.camp.location?.address || '',
      facilityCity: registration.camp.location?.city || '',
      facilityState: registration.camp.location?.state || '',
      totalPaid: fmtCents(registration.totalPriceCents),
      basePriceCents: String(registration.basePriceCents),
      discountCents: String(registration.discountCents),
      promoDiscountCents: String(registration.promoDiscountCents),
      addonsTotalCents: String(registration.addonsTotalCents),
      taxCents: String(registration.taxCents),
      promoCodeStr: registration.promoCode?.code || '',
      addonsJson: JSON.stringify(addons),
      confirmationNumber: registration.confirmationNumber || `EA-${registration.id.slice(0, 8).toUpperCase()}`,
      registrationId: registration.id,
      directorName: registration.tenant?.name || 'Empowered Sports Camp',
      directorPhone: registration.tenant?.contactPhone || '',
    }

    return sendTransactionalEmail({
      templateCode: 'REGISTRATION_CONFIRMATION',
      to: toEmail,
      context,
      tenantId,
      userId: registration.parent?.id,
    })
  } catch (error) {
    console.error('[Email] Failed to send registration confirmation:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Send two-weeks-out logistics email
 */
export async function sendTwoWeeksOutEmail(params: {
  registrationId: string
  tenantId: string
}): Promise<{ data: EmailResult | null; error: Error | null }> {
  try {
    const { registrationId, tenantId } = params

    const registration = await prisma.registration.findFirst({
      where: { id: registrationId, tenantId, status: 'confirmed' },
      include: {
        camp: { include: { location: true } },
        athlete: true,
        parent: true,
        tenant: true,
      },
    })

    if (!registration) {
      return { data: null, error: new Error('Registration not found') }
    }

    const toEmail = registration.parent?.email
    if (!toEmail) {
      return { data: null, error: new Error('No parent email found') }
    }

    const startDate = registration.camp.startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

    const context: EmailContext = {
      parentName: registration.parent?.firstName || 'Parent',
      camperName: `${registration.athlete?.firstName || ''}`.trim() || 'Your Athlete',
      campName: registration.camp.name,
      campStartDate: startDate,
      facilityAddress: `${registration.camp.location?.address || ''}, ${registration.camp.location?.city || ''}, ${registration.camp.location?.state || ''}`,
    }

    return sendTransactionalEmail({
      templateCode: 'CAMP_TWO_WEEKS_OUT',
      to: toEmail,
      context,
      tenantId,
      userId: registration.parent?.id,
    })
  } catch (error) {
    console.error('[Email] Failed to send two-weeks-out email:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Send two-days-before final countdown email
 */
export async function sendTwoDaysBeforeEmail(params: {
  registrationId: string
  tenantId: string
}): Promise<{ data: EmailResult | null; error: Error | null }> {
  try {
    const { registrationId, tenantId } = params

    const registration = await prisma.registration.findFirst({
      where: { id: registrationId, tenantId, status: 'confirmed' },
      include: {
        camp: { include: { location: true } },
        athlete: true,
        parent: true,
        tenant: true,
      },
    })

    if (!registration) {
      return { data: null, error: new Error('Registration not found') }
    }

    const toEmail = registration.parent?.email
    if (!toEmail) {
      return { data: null, error: new Error('No parent email found') }
    }

    const startDate = registration.camp.startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })

    const context: EmailContext = {
      parentName: registration.parent?.firstName || 'Parent',
      camperName: `${registration.athlete?.firstName || ''}`.trim() || 'Your Athlete',
      campName: registration.camp.name,
      campStartDate: startDate,
      facilityName: registration.camp.location?.name || 'TBA',
      meetingSpot: 'main gym entrance',
      directorName: registration.tenant?.name || 'Your Camp Director',
      parkingArea: 'designated parking lot',
      directorPhone: registration.tenant?.contactPhone || '',
      whatToWear: 'Athletic clothing and sneakers',
      whatToBring: 'Water bottle, sunscreen, snack, and a positive attitude!',
    }

    return sendTransactionalEmail({
      templateCode: 'CAMP_TWO_DAYS_BEFORE',
      to: toEmail,
      context,
      tenantId,
      userId: registration.parent?.id,
    })
  } catch (error) {
    console.error('[Email] Failed to send two-days-before email:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Send daily recap email with full recap data
 */
export async function sendDailyRecapEmail(params: {
  campDayId: string
  tenantId: string
  recapData: {
    dayTheme?: string
    wordOfTheDay?: string
    wordOfTheDayExample?: string
    primarySport?: string
    primarySportFocus?: string
    secondarySport?: string
    secondarySportFocus?: string
    guestSpeakerName?: string
    guestSpeakerTitle?: string
    guestSpeakerTopic?: string
    pinkPointSkill?: string
    purplePointSkill?: string
    tomorrowSport1?: string
    tomorrowSport2?: string
    tomorrowWordOfTheDay?: string
    highlights?: string
  }
}): Promise<{ data: { sent: number; failed: number } | null; error: Error | null }> {
  try {
    const { campDayId, tenantId, recapData } = params

    const campDay = await prisma.campDay.findFirst({
      where: { id: campDayId, camp: { tenantId } },
      include: {
        camp: { include: { location: true, tenant: true } },
        attendance: {
          where: { status: 'checked_in' },
          include: { athlete: true, parentProfile: true },
        },
      },
    })

    if (!campDay) {
      return { data: null, error: new Error('Camp day not found') }
    }

    let sent = 0
    let failed = 0

    // Group by parent
    const parentEmails = new Map<string, { parentId: string; parentName: string; athletes: string[] }>()

    for (const att of campDay.attendance) {
      const email = att.parentProfile?.email
      const parentName = att.parentProfile?.firstName || 'Parent'
      const athleteName = att.athlete?.firstName || 'Camper'

      if (email) {
        const existing = parentEmails.get(email)
        if (existing) {
          existing.athletes.push(athleteName)
        } else {
          parentEmails.set(email, { parentId: att.parentProfile?.id || '', parentName, athletes: [athleteName] })
        }
      }
    }

    for (const [email, { parentId, parentName, athletes }] of parentEmails) {
      const context: EmailContext = {
        parentName,
        camperName: athletes.join(' and '),
        campName: campDay.camp.name,
        dayNumber: campDay.dayNumber,
        dayTheme: recapData.dayTheme || '',
        wordOfTheDay: recapData.wordOfTheDay || '',
        wordOfTheDayExample: recapData.wordOfTheDayExample || '',
        primarySport: recapData.primarySport || '',
        primarySportFocus: recapData.primarySportFocus || '',
        secondarySport: recapData.secondarySport || '',
        secondarySportFocus: recapData.secondarySportFocus || '',
        guestSpeakerName: recapData.guestSpeakerName || '',
        guestSpeakerTitle: recapData.guestSpeakerTitle || '',
        guestSpeakerTopic: recapData.guestSpeakerTopic || '',
        pinkPointSkill: recapData.pinkPointSkill || '',
        purplePointSkill: recapData.purplePointSkill || '',
        tomorrowSport1: recapData.tomorrowSport1 || '',
        tomorrowSport2: recapData.tomorrowSport2 || '',
        tomorrowWordOfTheDay: recapData.tomorrowWordOfTheDay || '',
        highlights: recapData.highlights || '',
      }

      const { error } = await sendTransactionalEmail({
        templateCode: 'CAMP_DAILY_RECAP',
        to: email,
        context,
        tenantId,
        userId: parentId,
      })

      if (error) {
        failed++
      } else {
        sent++
      }
    }

    return { data: { sent, failed }, error: null }
  } catch (error) {
    console.error('[Email] Failed to send daily recap emails:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Send session recap email after camp ends
 */
export async function sendSessionRecapEmail(params: {
  campId: string
  tenantId: string
}): Promise<{ data: { sent: number; failed: number } | null; error: Error | null }> {
  try {
    const { campId, tenantId } = params

    const camp = await prisma.camp.findFirst({
      where: { id: campId, tenantId },
      include: {
        tenant: true,
        registrations: {
          where: { status: 'confirmed' },
          include: { parent: true, athlete: true },
        },
      },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp not found') }
    }

    let sent = 0
    let failed = 0

    const sessionDates = `${camp.startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${camp.endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`

    // Group by parent
    const parentEmails = new Map<string, { parentId: string; parentName: string; athletes: string[] }>()

    for (const reg of camp.registrations) {
      const email = reg.parent?.email
      const parentName = reg.parent?.firstName || 'Parent'
      const athleteName = reg.athlete?.firstName || 'Camper'

      if (email) {
        const existing = parentEmails.get(email)
        if (existing) {
          existing.athletes.push(athleteName)
        } else {
          parentEmails.set(email, { parentId: reg.parent?.id || '', parentName, athletes: [athleteName] })
        }
      }
    }

    for (const [email, { parentId, parentName, athletes }] of parentEmails) {
      const context: EmailContext = {
        parentName,
        camperName: athletes.join(' and '),
        campName: camp.name,
        sessionDates,
        directorName: camp.tenant?.name || 'Your Camp Team',
        surveyUrl: `/survey/${camp.id}`,
        socialUrl: 'https://instagram.com/empoweredsportscamp',
        employmentUrl: '/careers',
        licensingUrl: '/become-a-licensee',
      }

      const { error } = await sendTransactionalEmail({
        templateCode: 'CAMP_SESSION_RECAP',
        to: email,
        context,
        tenantId,
        userId: parentId,
      })

      if (error) {
        failed++
      } else {
        sent++
      }
    }

    return { data: { sent, failed }, error: null }
  } catch (error) {
    console.error('[Email] Failed to send session recap emails:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Send seasonal follow-up email
 */
export async function sendSeasonalFollowupEmail(params: {
  month: 'jan' | 'feb' | 'mar' | 'apr' | 'may'
  to: string
  parentName: string
  tenantId?: string
  userId?: string
  year?: number
  earlyBirdCode?: string
  registrationUrl?: string
}): Promise<{ data: EmailResult | null; error: Error | null }> {
  const { month, to, parentName, tenantId, userId, year, earlyBirdCode, registrationUrl } = params

  const templateMap: Record<string, EmailTemplateCode> = {
    jan: 'SEASON_FOLLOWUP_JAN',
    feb: 'SEASON_FOLLOWUP_FEB',
    mar: 'SEASON_FOLLOWUP_MAR',
    apr: 'SEASON_FOLLOWUP_APR',
    may: 'SEASON_FOLLOWUP_MAY',
  }

  const context: EmailContext = {
    parentName,
    year: year || new Date().getFullYear(),
    earlyBirdCode: earlyBirdCode || 'EARLYBIRD',
    registrationUrl: registrationUrl || '/camps',
  }

  return sendTransactionalEmail({
    templateCode: templateMap[month],
    to,
    context,
    tenantId,
    userId,
  })
}

// =============================================================================
// Legacy Functions (maintained for backward compatibility)
// =============================================================================

export async function sendCampConfirmationEmail(params: {
  registrationId: string
  tenantId: string
}): Promise<{ data: EmailResult | null; error: Error | null }> {
  return sendRegistrationConfirmationEmail(params)
}

export async function sendDailyRecapEmailBatch(params: {
  campDayId: string
  tenantId: string
}): Promise<{ data: { sent: number; failed: number } | null; error: Error | null }> {
  // Legacy version without full recap data
  return sendDailyRecapEmail({
    ...params,
    recapData: {},
  })
}

export async function sendPostCampEmail(params: {
  campSessionId: string
  tenantId: string
}): Promise<{ data: { sent: number; failed: number } | null; error: Error | null }> {
  return sendSessionRecapEmail({
    campId: params.campSessionId,
    tenantId: params.tenantId,
  })
}

export async function sendStaffMessageEmail(params: {
  fromProfileId: string
  toProfileId: string
  messageId: string
  tenantId: string
}): Promise<{ data: EmailResult | null; error: Error | null }> {
  try {
    const [fromProfile, toProfile] = await Promise.all([
      prisma.profile.findUnique({ where: { id: params.fromProfileId } }),
      prisma.profile.findUnique({ where: { id: params.toProfileId } }),
    ])

    if (!fromProfile || !toProfile) {
      return { data: null, error: new Error('Profile not found') }
    }

    return sendTransactionalEmail({
      templateCode: 'STAFF_MESSAGE',
      to: toProfile.email,
      context: {
        recipientName: toProfile.firstName || 'Team Member',
        senderName: `${fromProfile.firstName} ${fromProfile.lastName}`,
        messageUrl: `/messaging?id=${params.messageId}`,
      },
      tenantId: params.tenantId,
      userId: params.toProfileId,
    })
  } catch (error) {
    console.error('[Email] Failed to send staff message email:', error)
    return { data: null, error: error as Error }
  }
}

export async function sendBroadcastEmail(params: {
  recipients: string[]
  subject: string
  body: string
  tenantId: string
  senderId: string
}): Promise<{ data: { sent: number; failed: number } | null; error: Error | null }> {
  const { recipients, subject, body, tenantId } = params

  let sent = 0
  let failed = 0

  for (const email of recipients) {
    const { error } = await sendTransactionalEmail({
      templateCode: 'BROADCAST',
      to: email,
      context: { subject, message: body },
      tenantId,
    })

    if (error) {
      failed++
    } else {
      sent++
    }
  }

  return { data: { sent, failed }, error: null }
}

// =============================================================================
// Weekly Business Report
// =============================================================================

/**
 * Send weekly business report email to the owner
 */
export async function sendWeeklyReportEmail(): Promise<{ data: EmailResult | null; error: Error | null }> {
  try {
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Query all data in parallel
    const [
      allConfirmedRegistrations,
      recentRegistrations,
      camps,
      paymentBreakdown,
      revenueAllTime,
      revenue30d,
      revenue7d,
    ] = await Promise.all([
      // Total confirmed registrations
      prisma.registration.findMany({
        where: { status: 'confirmed' },
        select: {
          id: true,
          totalPriceCents: true,
          athleteId: true,
        },
      }),
      // Registrations from last 7 days
      prisma.registration.findMany({
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
        select: {
          id: true,
          createdAt: true,
          totalPriceCents: true,
          paymentStatus: true,
          status: true,
          athlete: { select: { firstName: true, lastName: true } },
          camp: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // All non-draft camps
      prisma.camp.findMany({
        where: { status: { not: 'draft' } },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          capacity: true,
          status: true,
          _count: {
            select: {
              registrations: { where: { status: 'confirmed' } },
            },
          },
        },
        orderBy: { startDate: 'asc' },
      }),
      // Payment status breakdown
      prisma.registration.groupBy({
        by: ['paymentStatus'],
        where: { status: { in: ['confirmed', 'pending'] } },
        _count: { id: true },
        _sum: { totalPriceCents: true },
      }),
      // Revenue all-time
      prisma.registration.aggregate({
        where: { status: 'confirmed', paymentStatus: 'paid' },
        _sum: { totalPriceCents: true },
      }),
      // Revenue last 30 days
      prisma.registration.aggregate({
        where: { status: 'confirmed', paymentStatus: 'paid', paidAt: { gte: thirtyDaysAgo } },
        _sum: { totalPriceCents: true },
      }),
      // Revenue last 7 days
      prisma.registration.aggregate({
        where: { status: 'confirmed', paymentStatus: 'paid', paidAt: { gte: sevenDaysAgo } },
        _sum: { totalPriceCents: true },
      }),
    ])

    const fmtCents = (c: number) => `$${(c / 100).toFixed(2)}`
    const uniqueAthletes = new Set(allConfirmedRegistrations.map(r => r.athleteId)).size
    const totalRevenue = allConfirmedRegistrations.reduce((sum, r) => sum + r.totalPriceCents, 0)
    const activeCamps = camps.filter(c => ['registration_open', 'registration_closed', 'in_progress'].includes(c.status)).length

    // Build overview section
    const overviewHtml = emailDetailsCard([
      { label: 'Total Confirmed Registrations', value: String(allConfirmedRegistrations.length) },
      { label: 'Total Revenue', value: fmtCents(totalRevenue) },
      { label: 'Unique Athletes', value: String(uniqueAthletes) },
      { label: 'Active Camps', value: String(activeCamps) },
    ], 'Overview')

    // Build recent registrations table
    let recentHtml = ''
    if (recentRegistrations.length > 0) {
      const rows = recentRegistrations.map(r => {
        const name = `${r.athlete?.firstName || ''} ${r.athlete?.lastName || ''}`.trim() || 'Unknown'
        const camp = r.camp?.name || 'Unknown'
        const statusColor = r.paymentStatus === 'paid' ? BRAND.success
          : r.paymentStatus === 'failed' ? BRAND.error
          : BRAND.warning
        return `
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid ${BRAND.borderSubtle}; color: ${BRAND.textPrimary}; font-size: 13px; font-family: 'Poppins', Arial, sans-serif;">${name}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid ${BRAND.borderSubtle}; color: ${BRAND.textSecondary}; font-size: 13px; font-family: 'Poppins', Arial, sans-serif;">${camp}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid ${BRAND.borderSubtle}; color: ${statusColor}; font-size: 13px; font-weight: 600; font-family: 'Poppins', Arial, sans-serif;">${r.paymentStatus}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid ${BRAND.borderSubtle}; color: ${BRAND.textPrimary}; font-size: 13px; font-family: 'Poppins', Arial, sans-serif; text-align: right;">${fmtCents(r.totalPriceCents)}</td>
          </tr>`
      }).join('')

      recentHtml = `
        ${emailSubheading("This Week's Registrations")}
        ${emailParagraph(`${recentRegistrations.length} new registration(s) in the last 7 days.`)}
        <table cellpadding="0" cellspacing="0" style="width: 100%; margin: 0 0 24px; border-radius: 6px; overflow: hidden; background-color: rgba(204,255,0,0.04); border: 1px solid rgba(204,255,0,0.12);">
          <tr>
            <th style="padding: 10px 12px; text-align: left; color: ${BRAND.neon}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid ${BRAND.borderSubtle}; font-family: 'Poppins', Arial, sans-serif;">Athlete</th>
            <th style="padding: 10px 12px; text-align: left; color: ${BRAND.neon}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid ${BRAND.borderSubtle}; font-family: 'Poppins', Arial, sans-serif;">Camp</th>
            <th style="padding: 10px 12px; text-align: left; color: ${BRAND.neon}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid ${BRAND.borderSubtle}; font-family: 'Poppins', Arial, sans-serif;">Payment</th>
            <th style="padding: 10px 12px; text-align: right; color: ${BRAND.neon}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid ${BRAND.borderSubtle}; font-family: 'Poppins', Arial, sans-serif;">Amount</th>
          </tr>
          ${rows}
        </table>`
    } else {
      recentHtml = `
        ${emailSubheading("This Week's Registrations")}
        ${emailCallout('No new registrations in the past 7 days.')}`
    }

    // Build camp status section
    const campRows = camps.map(c => {
      const registered = c._count.registrations
      const cap = c.capacity || 0
      const fillPct = cap > 0 ? Math.round((registered / cap) * 100) : 0
      const fillColor = fillPct >= 90 ? BRAND.error : fillPct >= 70 ? BRAND.warning : BRAND.success
      const dates = `${c.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${c.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      return `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid ${BRAND.borderSubtle}; color: ${BRAND.textPrimary}; font-size: 13px; font-family: 'Poppins', Arial, sans-serif;">${c.name}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid ${BRAND.borderSubtle}; color: ${BRAND.textSecondary}; font-size: 13px; font-family: 'Poppins', Arial, sans-serif;">${dates}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid ${BRAND.borderSubtle}; color: ${BRAND.textPrimary}; font-size: 13px; font-family: 'Poppins', Arial, sans-serif;">${registered}/${cap}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid ${BRAND.borderSubtle}; color: ${fillColor}; font-size: 13px; font-weight: 600; font-family: 'Poppins', Arial, sans-serif; text-align: right;">${fillPct}%</td>
        </tr>`
    }).join('')

    const campStatusHtml = camps.length > 0 ? `
      ${emailSubheading('Camp Status')}
      <table cellpadding="0" cellspacing="0" style="width: 100%; margin: 0 0 24px; border-radius: 6px; overflow: hidden; background-color: rgba(204,255,0,0.04); border: 1px solid rgba(204,255,0,0.12);">
        <tr>
          <th style="padding: 10px 12px; text-align: left; color: ${BRAND.neon}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid ${BRAND.borderSubtle}; font-family: 'Poppins', Arial, sans-serif;">Camp</th>
          <th style="padding: 10px 12px; text-align: left; color: ${BRAND.neon}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid ${BRAND.borderSubtle}; font-family: 'Poppins', Arial, sans-serif;">Dates</th>
          <th style="padding: 10px 12px; text-align: left; color: ${BRAND.neon}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid ${BRAND.borderSubtle}; font-family: 'Poppins', Arial, sans-serif;">Registered</th>
          <th style="padding: 10px 12px; text-align: right; color: ${BRAND.neon}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid ${BRAND.borderSubtle}; font-family: 'Poppins', Arial, sans-serif;">Fill Rate</th>
        </tr>
        ${campRows}
      </table>` : ''

    // Build payment summary
    const paymentRows = paymentBreakdown.map(p => {
      const statusColor = p.paymentStatus === 'paid' ? BRAND.success
        : p.paymentStatus === 'failed' ? BRAND.error
        : p.paymentStatus === 'refunded' ? BRAND.magenta
        : BRAND.warning
      return { label: p.paymentStatus.toUpperCase(), value: `${p._count.id} registrations — ${fmtCents(p._sum.totalPriceCents || 0)}`, color: statusColor }
    })

    const paymentHtml = paymentBreakdown.length > 0 ? `
      ${emailSubheading('Payment Summary')}
      ${paymentRows.map(r => emailCallout(
        `<strong style="color: ${r.color};">${r.label}:</strong> ${r.value}`,
        r.label === 'PAID' ? 'success' : r.label === 'FAILED' ? 'warning' : 'info'
      )).join('')}` : ''

    // Build revenue snapshot
    const revenueHtml = emailDetailsCard([
      { label: 'All-Time Revenue', value: fmtCents(revenueAllTime._sum.totalPriceCents || 0) },
      { label: 'Last 30 Days', value: fmtCents(revenue30d._sum.totalPriceCents || 0) },
      { label: 'Last 7 Days', value: fmtCents(revenue7d._sum.totalPriceCents || 0) },
    ], 'Revenue Snapshot')

    const reportDate = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

    const bodyContent = `
      ${emailLabel('Weekly Report')}
      ${emailHeading(`Business<br/><span style="color: ${BRAND.neon};">Report</span>`)}
      ${emailParagraph(`Here is your weekly business snapshot for <strong style="color: ${BRAND.textPrimary};">${reportDate}</strong>.`)}
      ${overviewHtml}
      ${recentHtml}
      ${campStatusHtml}
      ${paymentHtml}
      ${revenueHtml}
      ${emailParagraph(`This report is sent automatically every Monday at 9:00 AM UTC.`)}
    `

    const html = brandWrap(bodyContent)
    const subject = `Weekly Business Report — ${reportDate}`
    const toEmail = 'coledanellerich@gmail.com'
    const fromEmail = DEFAULT_FROM_EMAIL

    // Send directly (bypass template system since content is dynamically built)
    if (IS_DEVELOPMENT && !isEmailConfigured()) {
      console.log('[Email] Would send weekly report to', toEmail)
      const emailLogId = await logEmail({
        toEmail,
        fromEmail,
        subject,
        emailType: 'weekly_report',
        payload: { reportDate },
        providerMessageId: `dev-${Date.now()}`,
        status: 'sent',
      })
      return {
        data: { success: true, messageId: `dev-${Date.now()}`, sentAt: new Date().toISOString(), emailLogId: emailLogId || undefined },
        error: null,
      }
    }

    const result = await sesSendEmail({ from: fromEmail, to: toEmail, subject, html })

    if (!result.success) {
      await logEmail({ toEmail, fromEmail, subject, emailType: 'weekly_report', payload: { reportDate }, status: 'failed', errorMessage: result.error })
      return { data: null, error: new Error(result.error) }
    }

    const emailLogId = await logEmail({
      toEmail,
      fromEmail,
      subject,
      emailType: 'weekly_report',
      payload: { reportDate },
      providerMessageId: result.messageId || null,
      status: 'sent',
    })

    return {
      data: { success: true, messageId: result.messageId || null, sentAt: new Date().toISOString(), emailLogId: emailLogId || undefined },
      error: null,
    }
  } catch (error) {
    console.error('[Email] Failed to send weekly report:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Email Templates
// =============================================================================

function buildEmailContent(templateCode: EmailTemplateCode, context: EmailContext): string {
  const F = `font-family: 'Poppins', Arial, sans-serif;`
  const listItem = (text: string) => `<tr><td style="padding: 6px 0 6px 20px; color: ${BRAND.textSecondary}; font-size: 14px; line-height: 1.6; ${F}"><span style="color: ${BRAND.neon};">&#9679;</span>&nbsp; ${text}</td></tr>`

  let bodyContent = ''

  switch (templateCode) {
    case 'REGISTRATION_CONFIRMATION': {
      // Build receipt line items
      const baseCents = parseInt(String(context.basePriceCents || '0'), 10)
      const discCents = parseInt(String(context.discountCents || '0'), 10)
      const promoCents = parseInt(String(context.promoDiscountCents || '0'), 10)
      const addonsCents = parseInt(String(context.addonsTotalCents || '0'), 10)
      const taxAmt = parseInt(String(context.taxCents || '0'), 10)
      const fmtC = (c: number) => `$${(c / 100).toFixed(2)}`

      let receiptRows = `
        <tr>
          <td style="padding: 8px 0; color: ${BRAND.textMuted}; font-size: 14px; ${F} width: 60%;">Camp Registration</td>
          <td style="padding: 8px 0; color: ${BRAND.textPrimary}; font-size: 14px; font-weight: 600; ${F} text-align: right;">${fmtC(baseCents)}</td>
        </tr>
      `

      // Parse addon details
      try {
        const addonsArr = JSON.parse(String(context.addonsJson || '[]')) as Array<{ name: string; variant: string | null; quantity: number; priceCents: number }>
        for (const addon of addonsArr) {
          const label = `${addon.name}${addon.variant ? ` (${addon.variant})` : ''}${addon.quantity > 1 ? ` x${addon.quantity}` : ''}`
          receiptRows += `
            <tr>
              <td style="padding: 4px 0 4px 16px; color: ${BRAND.textMuted}; font-size: 13px; ${F}">${label}</td>
              <td style="padding: 4px 0; color: ${BRAND.textSecondary}; font-size: 13px; ${F} text-align: right;">${fmtC(addon.priceCents)}</td>
            </tr>
          `
        }
      } catch { /* ignore parse errors */ }

      if (discCents > 0) {
        receiptRows += `
          <tr>
            <td style="padding: 8px 0; color: ${BRAND.success}; font-size: 14px; ${F}">Sibling Discount</td>
            <td style="padding: 8px 0; color: ${BRAND.success}; font-size: 14px; font-weight: 600; ${F} text-align: right;">-${fmtC(discCents)}</td>
          </tr>
        `
      }

      if (promoCents > 0) {
        receiptRows += `
          <tr>
            <td style="padding: 8px 0; color: ${BRAND.success}; font-size: 14px; ${F}">Promo Code${context.promoCodeStr ? ` (${context.promoCodeStr})` : ''}</td>
            <td style="padding: 8px 0; color: ${BRAND.success}; font-size: 14px; font-weight: 600; ${F} text-align: right;">-${fmtC(promoCents)}</td>
          </tr>
        `
      }

      if (taxAmt > 0) {
        receiptRows += `
          <tr>
            <td style="padding: 8px 0; color: ${BRAND.textMuted}; font-size: 14px; ${F}">Sales Tax</td>
            <td style="padding: 8px 0; color: ${BRAND.textSecondary}; font-size: 14px; ${F} text-align: right;">${fmtC(taxAmt)}</td>
          </tr>
        `
      }

      const receiptSection = `
<table cellpadding="0" cellspacing="0" style="margin: 16px 0 24px; width: 100%; border-radius: 6px; overflow: hidden;">
  <tr>
    <td style="background-color: rgba(204,255,0,0.04); border: 1px solid rgba(204,255,0,0.12); border-radius: 6px; padding: 20px 24px;">
      <table cellpadding="0" cellspacing="0" style="width: 100%;">
        <tr><td colspan="2" style="padding: 0 0 12px; color: ${BRAND.neon}; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; ${F}">Payment Receipt</td></tr>
        ${receiptRows}
        <tr>
          <td colspan="2" style="padding: 0;"><hr style="border: none; border-top: 2px solid ${BRAND.textPrimary}; margin: 12px 0 8px;" /></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${BRAND.textPrimary}; font-size: 16px; font-weight: 700; ${F}">Total Paid</td>
          <td style="padding: 8px 0; color: ${BRAND.neon}; font-size: 18px; font-weight: 700; ${F} text-align: right;">${context.totalPaid}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>`

      bodyContent = `
        ${emailLabel('Confirmed')}
        ${emailHeading(`You're<br/><span style="color: ${BRAND.neon};">All Set!</span>`)}
        ${emailParagraph(`Hi ${context.parentName},`)}
        ${emailParagraph(`We're thrilled to welcome <strong style="color: ${BRAND.textPrimary};">${context.camperName}</strong> to the <strong style="color: ${BRAND.neon};">${context.campName}</strong> program! Get ready for a week of fun, skill-building, and empowerment.`)}
        ${emailHighlight('Registration Confirmed!')}
        ${emailDetailsCard([
          { label: 'Camper Name', value: String(context.camperName) },
          { label: 'Camp Session', value: String(context.sessionDates) },
          ...(context.campTimes ? [{ label: 'Daily Schedule', value: String(context.campTimes) }] : []),
          { label: 'Location', value: String(context.facilityName) },
          { label: 'Address', value: `${context.facilityAddress} ${context.facilityCity}, ${context.facilityState}` },
          { label: 'Confirmation #', value: String(context.confirmationNumber) },
        ], 'Registration Details')}
        ${receiptSection}
        ${context.registrationId ? emailButton('View Full Receipt', `/dashboard/registrations/${context.registrationId}`) : ''}
        ${emailSubheading('What Happens Next?')}
        ${emailParagraph(`You will receive a detailed preparation email <strong style="color: ${BRAND.textPrimary};">two weeks before</strong> the camp start date with packing lists, check-in instructions, and the final schedule.`)}
        ${emailParagraph(`Thank you for trusting us with your athlete. We can't wait to see them on the field!`)}
        ${emailParagraph(`Best regards,<br/><strong style="color: ${BRAND.textPrimary};">${context.directorName}</strong>${context.directorPhone ? `<br/>${context.directorPhone}` : ''}`)}
      `
      break
    }

    case 'CAMP_TWO_WEEKS_OUT':
      bodyContent = `
        ${emailLabel('2 Weeks Out')}
        ${emailHeading(`Two Weeks<br/><span style="color: ${BRAND.neon};">To Go!</span>`)}
        ${emailParagraph(`Hi ${context.parentName},`)}
        ${emailParagraph(`We're just two weeks away from a great week of <strong style="color: ${BRAND.neon};">${context.campName}</strong>! Here is everything you need to prepare for <strong style="color: ${BRAND.textPrimary};">${context.camperName}</strong>.`)}
        ${emailDetailsCard([
          { label: 'Start Date', value: String(context.campStartDate) },
          { label: 'Check-In Time', value: '8:45 AM (Camp starts at 9:00 AM)' },
          { label: 'Address', value: String(context.facilityAddress) },
        ], 'Logistics')}
        ${emailSubheading('What to Pack Daily')}
        <table cellpadding="0" cellspacing="0" style="margin: 0 0 20px;">
          ${listItem('Water bottle (labeled with camper\'s name)')}
          ${listItem('Athletic shoes (no sandals or open-toe)')}
          ${listItem('Sunscreen (applied before arrival)')}
          ${listItem('A light snack')}
          ${listItem('Weather-appropriate activewear')}
        </table>
        ${emailCallout(`<strong style="color: ${BRAND.textPrimary};">Note:</strong> If you purchased a Daily Fuel Pack, lunch and snacks are covered!`)}
        ${emailSubheading('Waivers & Safety')}
        ${emailParagraph('Please confirm your online waiver submission. Review the safety guidelines for drop-off and pickup procedures in your parent portal.')}
        ${emailButton('Review in Parent Portal', '/portal')}
        ${emailParagraph(`We look forward to meeting you both soon!<br/><strong style="color: ${BRAND.textPrimary};">The ${context.campName} Team</strong>`)}
      `
      break

    case 'CAMP_TWO_DAYS_BEFORE':
      bodyContent = `
        ${emailLabel('Final Countdown', BRAND.magenta)}
        ${emailHeading(`Camp Starts<br/><span style="color: ${BRAND.magenta};">In 2 Days!</span>`)}
        ${emailParagraph(`Hi ${context.parentName},`)}
        ${emailParagraph(`Just <strong style="color: ${BRAND.textPrimary};">two days</strong> until we kick off <strong style="color: ${BRAND.neon};">${context.campName}</strong>! This is the last reminder before we get started.`)}
        ${emailDetailsCard([
          { label: 'Location', value: String(context.facilityName) },
          { label: 'Meeting Spot', value: String(context.meetingSpot) },
          { label: 'Camp Director', value: String(context.directorName) },
          { label: 'Parking', value: String(context.parkingArea) },
        ], 'Check-In Info')}
        ${emailCallout(`<strong style="color: ${BRAND.textPrimary};">Reminder:</strong> Please remain patient and follow staff directions during the busy 8:45 AM drop-off window.`, 'warning')}
        ${emailSubheading('What to Wear')}
        ${emailParagraph(String(context.whatToWear))}
        ${emailSubheading('What to Bring')}
        ${emailParagraph(String(context.whatToBring))}
        ${emailParagraph(`If you have any last-minute questions, please call us directly at <strong style="color: ${BRAND.textPrimary};">${context.directorPhone}</strong>.`)}
        ${emailHighlight(`See you bright and early on ${context.campStartDate}!`)}
      `
      break

    case 'CAMP_DAILY_RECAP': {
      const sportsRow = context.primarySport ? `<tr><td style="padding: 8px 0; color: ${BRAND.textMuted}; font-size: 14px; ${F} width: 40%;">Sports</td><td style="padding: 8px 0; color: ${BRAND.textPrimary}; font-size: 14px; font-weight: 600; ${F} text-align: right;"><strong>${context.primarySport}</strong>${context.primarySportFocus ? ` (${context.primarySportFocus})` : ''}${context.secondarySport ? `, <strong>${context.secondarySport}</strong>${context.secondarySportFocus ? ` (${context.secondarySportFocus})` : ''}` : ''}</td></tr>` : ''
      const speakerRow = context.guestSpeakerName ? `<tr><td style="padding: 8px 0; color: ${BRAND.textMuted}; font-size: 14px; ${F} width: 40%;">Guest Speaker</td><td style="padding: 8px 0; color: ${BRAND.textPrimary}; font-size: 14px; font-weight: 600; ${F} text-align: right;">${context.guestSpeakerName}, ${context.guestSpeakerTitle}</td></tr>` : ''
      const wordRow = context.wordOfTheDay ? `<tr><td style="padding: 8px 0; color: ${BRAND.textMuted}; font-size: 14px; ${F} width: 40%;">Word of the Day</td><td style="padding: 8px 0; color: ${BRAND.neon}; font-size: 14px; font-weight: 600; ${F} text-align: right;">${context.wordOfTheDay}</td></tr>` : ''

      bodyContent = `
        ${emailLabel(`Day ${context.dayNumber} Recap`)}
        ${emailHeading(`Day ${context.dayNumber}:<br/><span style="color: ${BRAND.neon};">${context.wordOfTheDay || 'Great Day'}!</span>`)}
        ${emailParagraph(`Hi ${context.parentName},`)}
        ${emailParagraph(`What a great day for <strong style="color: ${BRAND.textPrimary};">${context.camperName}</strong>! ${context.dayTheme ? `Today was all about <strong style="color: ${BRAND.neon};">${context.dayTheme}</strong>.` : ''}`)}

        <table cellpadding="0" cellspacing="0" style="margin: 16px 0 24px; width: 100%; border-radius: 6px; overflow: hidden;">
          <tr><td style="background-color: rgba(204,255,0,0.04); border: 1px solid rgba(204,255,0,0.12); border-radius: 6px; padding: 20px 24px;">
            <table cellpadding="0" cellspacing="0" style="width: 100%;">
              <tr><td colspan="2" style="padding: 0 0 12px; color: ${BRAND.neon}; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; ${F}">Today's Highlights</td></tr>
              ${sportsRow}${speakerRow}${wordRow}
            </table>
          </td></tr>
        </table>

        ${context.pinkPointSkill ? emailCallout(`<strong style="color: ${BRAND.magenta};">Pink Points:</strong> Every athlete practiced <strong style="color: ${BRAND.textPrimary};">${context.pinkPointSkill}</strong> today!`, 'purple') : ''}
        ${context.purplePointSkill ? emailCallout(`<strong style="color: ${BRAND.purple};">Purple Points:</strong> Athletes worked on <strong style="color: ${BRAND.textPrimary};">${context.purplePointSkill}</strong>!`, 'purple') : ''}

        ${context.tomorrowSport1 ? `${emailSubheading('Looking Ahead')}${emailParagraph(`Tomorrow we'll focus on <strong style="color: ${BRAND.textPrimary};">${context.tomorrowSport1}</strong>${context.tomorrowSport2 ? ` and <strong style="color: ${BRAND.textPrimary};">${context.tomorrowSport2}</strong>` : ''}${context.tomorrowWordOfTheDay ? `, with the Word of the Day being <strong style="color: ${BRAND.neon};">${context.tomorrowWordOfTheDay}</strong>` : ''}.`)}` : ''}

        ${context.highlights ? emailCallout(String(context.highlights)) : ''}
        ${emailParagraph(`See you tomorrow!<br/><strong style="color: ${BRAND.textPrimary};">The ${context.campName} Team</strong>`)}
      `
      break
    }

    case 'CAMP_SESSION_RECAP':
      bodyContent = `
        ${emailLabel('Session Complete')}
        ${emailHeading(`What an<br/><span style="color: ${BRAND.neon};">Amazing Week!</span>`)}
        ${emailParagraph(`Hi ${context.parentName},`)}
        ${emailParagraph(`The <strong style="color: ${BRAND.textPrimary};">${context.sessionDates}</strong> camp session has officially wrapped up, and we had an incredible week with <strong style="color: ${BRAND.neon};">${context.camperName}</strong>! We hope your athlete came home inspired, exhausted, and ready to take on the world.`)}
        ${emailHighlight('Thank You!')}
        ${emailSubheading('Your Feedback is Essential')}
        ${emailParagraph(`Please take 60 seconds to complete our Parent Satisfaction Survey. Your input helps us make next year even better!`)}
        ${emailButton('Take the Survey', String(context.surveyUrl))}
        ${emailSubheading('Stay Connected')}
        <table cellpadding="0" cellspacing="0" style="margin: 0 0 20px;">
          ${listItem(`<a href="${context.socialUrl}" style="color: ${BRAND.neon}; text-decoration: underline;">Follow us on social media</a> for highlights`)}
          ${listItem(`<a href="${context.employmentUrl}" style="color: ${BRAND.neon}; text-decoration: underline;">Employment opportunities</a> as a Camp Director or Coach`)}
          ${listItem(`<a href="${context.licensingUrl}" style="color: ${BRAND.neon}; text-decoration: underline;">Licensing opportunities</a> to run your own camp`)}
        </table>
        ${emailParagraph(`We hope to see you next year!<br/><strong style="color: ${BRAND.textPrimary};">The ${context.campName} Team</strong>`)}
      `
      break

    case 'SEASON_FOLLOWUP_JAN':
      bodyContent = `
        ${emailLabel('New Season')}
        ${emailHeading(`New Year,<br/><span style="color: ${BRAND.neon};">New Camp Dates!</span>`)}
        ${emailParagraph(`Hi ${context.parentName},`)}
        ${emailParagraph(`Happy New Year! We're excited to announce that our <strong style="color: ${BRAND.neon};">${context.year} summer camp dates</strong> are now available!`)}
        ${emailHighlight(`${context.year} Summer Dates Are Here!`)}
        ${emailButton(`See All ${context.year} Dates`, String(context.registrationUrl))}
        ${emailParagraph('Reserve your spot early for the best selection!')}
      `
      break

    case 'SEASON_FOLLOWUP_FEB':
      bodyContent = `
        ${emailLabel('Early Bird')}
        ${emailHeading(`Early Bird<br/><span style="color: ${BRAND.neon};">Registration Open!</span>`)}
        ${emailParagraph(`Hi ${context.parentName},`)}
        ${emailParagraph(`Great news — <strong style="color: ${BRAND.textPrimary};">Early Bird registration</strong> for our ${context.year} summer camps is now open!`)}
        ${emailHighlight(`Use code ${context.earlyBirdCode} for early bird savings!`)}
        ${emailButton('Register Now', String(context.registrationUrl))}
      `
      break

    case 'SEASON_FOLLOWUP_MAR':
      bodyContent = `
        ${emailLabel('Filling Up', BRAND.warning)}
        ${emailHeading(`Spots Are<br/><span style="color: ${BRAND.magenta};">Filling Fast!</span>`)}
        ${emailParagraph(`Hi ${context.parentName},`)}
        ${emailParagraph('Spring is here, and our most popular camp weeks are <strong style="color: ' + BRAND.textPrimary + ';">already filling up</strong>.')}
        ${emailCallout(`<strong style="color: ${BRAND.textPrimary};">High-demand weeks are going fast!</strong> Don't wait to register.`, 'warning')}
        ${emailButton('Check Availability', String(context.registrationUrl))}
      `
      break

    case 'SEASON_FOLLOWUP_APR':
      bodyContent = `
        ${emailLabel('Closing Soon', BRAND.magenta)}
        ${emailHeading(`The Final<br/><span style="color: ${BRAND.magenta};">Countdown!</span>`)}
        ${emailParagraph(`Hi ${context.parentName},`)}
        ${emailParagraph(`<strong style="color: ${BRAND.textPrimary};">Registration closes soon</strong> for many of our sessions! At Empowered Sports Camp, we build <strong style="color: ${BRAND.neon};">confidence, leadership, and lifelong skills</strong>.`)}
        ${emailHighlight('Limited Spots Remaining!')}
        ${emailButton('Secure Your Spot', String(context.registrationUrl))}
      `
      break

    case 'SEASON_FOLLOWUP_MAY':
      bodyContent = `
        ${emailLabel('Last Call', BRAND.magenta)}
        ${emailHeading(`School's Out,<br/><span style="color: ${BRAND.neon};">Camp is IN!</span>`)}
        ${emailParagraph(`Hi ${context.parentName},`)}
        ${emailParagraph(`The school year is almost over, and summer is HERE! This is your <strong style="color: ${BRAND.magenta};">last call</strong> to register.`)}
        ${emailHighlight('Last Call for Registration!', BRAND.magenta)}
        ${emailButton('Register Now — Final Chance!', String(context.registrationUrl), BRAND.magenta)}
      `
      break

    case 'CAMP_CONFIRMATION':
      bodyContent = `
        ${emailLabel('Confirmed')}
        ${emailHeading(`Registration<br/><span style="color: ${BRAND.neon};">Confirmed!</span>`)}
        ${emailParagraph(`Hi ${context.parentName},`)}
        ${emailParagraph(`Great news! <strong style="color: ${BRAND.textPrimary};">${context.athleteName}</strong> is officially registered for <strong style="color: ${BRAND.neon};">${context.campName}</strong>.`)}
        ${emailDetailsCard([
          { label: 'Dates', value: `${context.campStartDate} - ${context.campEndDate}` },
          { label: 'Location', value: String(context.campLocation || 'TBA') },
          ...(context.campAddress ? [{ label: 'Address', value: String(context.campAddress) }] : []),
        ])}
        ${emailParagraph(`We'll send you a reminder before camp starts. Get ready for an amazing experience!`)}
      `
      break

    case 'CAMP_REMINDER':
      bodyContent = `
        ${emailLabel('Tomorrow!', BRAND.magenta)}
        ${emailHeading(`Camp Starts<br/><span style="color: ${BRAND.magenta};">Tomorrow!</span>`)}
        ${emailParagraph(`Hi ${context.parentName},`)}
        ${emailParagraph(`<strong style="color: ${BRAND.textPrimary};">${context.athleteName}</strong>'s camp starts tomorrow!`)}
        ${emailDetailsCard([
          { label: 'When', value: String(context.campStartDate) },
          { label: 'Check-in Time', value: String(context.checkInTime || '8:45 AM') },
          { label: 'Location', value: String(context.campLocation) },
        ])}
        <table cellpadding="0" cellspacing="0" style="margin: 0 0 20px;">
          ${listItem('Water bottle')}
          ${listItem('Athletic shoes')}
          ${listItem('Positive attitude!')}
        </table>
      `
      break

    case 'DAILY_RECAP':
      bodyContent = `
        ${emailLabel(`Day ${context.dayNumber}`)}
        ${emailHeading(`Day ${context.dayNumber}<br/><span style="color: ${BRAND.neon};">Recap</span>`)}
        ${emailParagraph(`Hi ${context.parentName},`)}
        ${emailParagraph(`Here's what happened today at <strong style="color: ${BRAND.neon};">${context.campName}</strong>!`)}
        ${context.summary ? emailCallout(String(context.summary)) : ''}
        ${emailParagraph(`Your camper${String(context.athleteNames || '').includes(',') ? 's' : ''} (<strong style="color: ${BRAND.textPrimary};">${context.athleteNames}</strong>) had a great day!`)}
        ${emailParagraph('See you tomorrow!')}
      `
      break

    case 'POST_CAMP':
      bodyContent = `
        ${emailLabel('Thank You')}
        ${emailHeading(`Thanks for<br/><span style="color: ${BRAND.neon};">Joining Us!</span>`)}
        ${emailParagraph(`Hi ${context.parentName},`)}
        ${emailParagraph(`What an amazing week! Thank you for trusting us with <strong style="color: ${BRAND.textPrimary};">${context.athleteNames}</strong> at ${context.campName}.`)}
        ${emailButton('Share Your Experience', String(context.feedbackUrl))}
        ${emailParagraph('We hope to see you again soon!')}
      `
      break

    case 'STAFF_MESSAGE':
      bodyContent = `
        ${emailLabel('New Message')}
        ${emailHeading('New Message')}
        ${emailParagraph(`Hi ${context.recipientName},`)}
        ${emailParagraph(`You have a new message from <strong style="color: ${BRAND.textPrimary};">${context.senderName}</strong>.`)}
        ${context.messagePreview ? emailCallout(`"${context.messagePreview}..."`) : ''}
        ${emailButton('View Message', String(context.messageUrl))}
      `
      break

    case 'WELCOME':
      bodyContent = `
        ${emailLabel('Welcome')}
        ${emailHeading(`Welcome to<br/><span style="color: ${BRAND.neon};">Empowered!</span>`)}
        ${emailParagraph(`Hi ${context.userName},`)}
        ${emailParagraph(`We're thrilled to have you join us${context.role ? ` as a <strong style="color: ${BRAND.neon};">${context.role}</strong>` : ''}!`)}
        ${emailSubheading("What's Next")}
        <table cellpadding="0" cellspacing="0" style="margin: 0 0 20px;">
          ${listItem('Complete your profile')}
          ${listItem('Explore available camps')}
          ${listItem('Connect with our community')}
        </table>
        ${emailButton('Go to Dashboard', '/dashboard')}
      `
      break

    case 'PASSWORD_RESET':
      bodyContent = `
        ${emailLabel('Security')}
        ${emailHeading('Reset Your<br/>Password')}
        ${emailParagraph('We received a request to reset your password. Click the button below to set a new password:')}
        ${emailButton('Reset Password', String(context.resetUrl))}
        <p style="margin: 16px 0 0; color: ${BRAND.textMuted}; font-size: 13px; ${F}">If you didn't request this, you can safely ignore this email.</p>
      `
      break

    case 'PAYMENT_RECEIPT':
    case 'ROYALTY_INVOICE':
      bodyContent = `
        ${emailLabel(context.type === 'royalty_invoice' ? 'Invoice' : 'Receipt')}
        ${emailHeading(context.type === 'royalty_invoice' ? 'Royalty Invoice' : 'Payment Receipt')}
        ${emailHighlight(`Invoice ${context.invoiceNumber}`)}
        ${emailDetailsCard([
          { label: 'Amount', value: `$${context.amount}` },
          ...(context.dueDate ? [{ label: 'Due Date', value: String(context.dueDate) }] : []),
          ...(context.campName ? [{ label: 'Camp', value: String(context.campName) }] : []),
        ])}
        ${emailButton('View Invoice', '/admin/revenue/royalties')}
      `
      break

    case 'PAYMENT_FAILED':
      bodyContent = `
        ${emailLabel('Action Required', BRAND.error)}
        ${emailHeading('Payment Issue')}
        ${emailCallout(`We were unable to process your payment. Please update your payment method to avoid service interruption.`, 'warning')}
        ${emailButton('Update Payment Method', '/settings/billing', BRAND.warning)}
      `
      break

    case 'LICENSEE_APPLICATION':
      bodyContent = `
        ${emailLabel('New Application')}
        ${emailHeading('New Licensee<br/>Application')}
        ${emailDetailsCard([
          { label: 'Applicant', value: String(context.applicantName) },
          { label: 'Location', value: `${context.city}, ${context.state}` },
        ])}
        ${emailButton('Review Application', `/admin/licensee-applications/${context.applicationId}`)}
      `
      break

    case 'LICENSEE_STATUS_UPDATE':
      bodyContent = `
        ${emailLabel('Status Update')}
        ${emailHeading('Application<br/>Update')}
        ${emailParagraph(`Hi ${context.applicantName},`)}
        ${emailCallout(`Your licensee application status has been updated to: <strong style="color: ${BRAND.textPrimary};">${context.status}</strong>`, context.status === 'approved' ? 'success' : 'warning')}
        ${context.status === 'approved' ? emailParagraph('Congratulations! Welcome to the Empowered Sports Camp family. Our team will be in touch soon with next steps.') : ''}
        ${emailButton('View Details', '/dashboard')}
      `
      break

    case 'CIT_APPLICATION':
      bodyContent = `
        ${emailLabel('New CIT', BRAND.magenta)}
        ${emailHeading(`New CIT<br/><span style="color: ${BRAND.magenta};">Application</span>`)}
        ${emailDetailsCard([
          { label: 'Applicant', value: String(context.applicantName) },
          { label: 'Age', value: String(context.age) },
        ], undefined, BRAND.magenta)}
        ${emailButton('Review Application', `/admin/cit-applications/${context.applicationId}`, BRAND.magenta)}
      `
      break

    case 'CIT_STATUS_UPDATE':
      bodyContent = `
        ${emailLabel('CIT Update', BRAND.magenta)}
        ${emailHeading('CIT Application<br/>Update')}
        ${emailParagraph(`Hi ${context.applicantName},`)}
        ${emailCallout(`Your CIT application status has been updated to: <strong style="color: ${BRAND.textPrimary};">${context.status}</strong>`, context.status === 'approved' ? 'success' : 'info')}
        ${emailButton('View Details', '/dashboard')}
      `
      break

    case 'ROYALTY_STATUS_UPDATE':
      bodyContent = `
        ${emailLabel('Invoice Update')}
        ${emailHeading('Invoice Status<br/>Update')}
        ${emailParagraph(`Invoice <strong style="color: ${BRAND.textPrimary};">${context.invoiceNumber}</strong> status: <strong style="color: ${BRAND.neon};">${context.status}</strong>`)}
        ${emailButton('View Invoice', '/admin/revenue/royalties')}
      `
      break

    case 'LMS_COMPLETION':
      bodyContent = `
        ${emailLabel('Completed', BRAND.success)}
        ${emailHeading('Congrats!')}
        ${emailParagraph(`Hi ${context.userName},`)}
        ${emailCallout(`You've successfully completed <strong style="color: ${BRAND.textPrimary};">${context.moduleName}</strong>!`, 'success')}
        ${context.score ? emailParagraph(`Your score: <strong style="color: ${BRAND.neon};">${context.score}%</strong>`) : ''}
        ${emailButton('Continue Training', '/training')}
      `
      break

    case 'CERTIFICATION_UPDATE':
      bodyContent = `
        ${emailLabel('Certification')}
        ${emailHeading('Certification<br/>Update')}
        ${emailParagraph(`Hi ${context.userName},`)}
        ${emailDetailsCard([
          { label: 'Certification', value: String(context.certificationName) },
          { label: 'Status', value: String(context.status) },
        ])}
        ${emailButton('View Certifications', '/certifications')}
      `
      break

    case 'INCENTIVE_UPDATE':
      bodyContent = `
        ${emailLabel('Incentive')}
        ${emailHeading('Incentive<br/>Update')}
        ${emailHighlight(String(context.incentiveName || 'Incentive Program'))}
        ${context.amount ? emailParagraph(`Amount: <strong style="color: ${BRAND.neon};">$${context.amount}</strong>`) : ''}
        ${emailButton('View Details', '/incentives')}
      `
      break

    case 'JOB_APPLICATION':
      bodyContent = `
        ${emailLabel('Application')}
        ${emailHeading('Application<br/>Update')}
        ${emailParagraph(`Hi ${context.applicantName},`)}
        ${emailParagraph(`There's an update on your application for <strong style="color: ${BRAND.neon};">${context.position}</strong>.`)}
        ${emailDetailsCard([{ label: 'Status', value: String(context.status) }])}
        ${emailButton('View Application', '/jobs/applications')}
      `
      break

    case 'SYSTEM_ALERT':
    case 'BROADCAST':
      bodyContent = `
        ${emailHeading(String(context.title || 'Message'))}
        ${emailCallout(String(context.message), context.severity === 'error' || context.severity === 'warning' ? 'warning' : 'info')}
        ${context.actionUrl ? emailButton('Take Action', String(context.actionUrl)) : ''}
      `
      break

    default:
      bodyContent = `
        ${emailHeading('Notification')}
        ${emailParagraph(String(context.message || 'You have a new notification from Empowered Sports Camp.'))}
      `
  }

  return brandWrap(bodyContent)
}
