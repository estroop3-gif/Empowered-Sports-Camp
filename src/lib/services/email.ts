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

    // Calculate total paid
    const totalPaid = (registration.totalPriceCents || 0) / 100

    const context: EmailContext = {
      parentName: registration.parent?.firstName || 'Parent',
      camperName: `${registration.athlete?.firstName || ''} ${registration.athlete?.lastName || ''}`.trim() || 'Your Athlete',
      campName: registration.camp.name,
      sessionDates: `${startDate} – ${endDate}`,
      facilityName: registration.camp.location?.name || 'TBA',
      facilityAddress: registration.camp.location?.address || '',
      facilityCity: registration.camp.location?.city || '',
      facilityState: registration.camp.location?.state || '',
      totalPaid: `$${totalPaid.toFixed(2)}`,
      confirmationNumber: registration.id.slice(0, 8).toUpperCase(),
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
// Email Templates
// =============================================================================

function buildEmailContent(templateCode: EmailTemplateCode, context: EmailContext): string {
  const baseStyle = `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); color: #ffffff; padding: 30px 40px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px; }
    .header .tagline { color: #00ff88; font-size: 12px; letter-spacing: 2px; margin-top: 8px; text-transform: uppercase; }
    .content { padding: 40px; color: #333333; line-height: 1.6; }
    .content h2 { color: #000000; margin-top: 0; font-size: 22px; }
    .content h3 { color: #000000; margin-top: 24px; font-size: 18px; }
    .content p { margin: 16px 0; }
    .content ul { margin: 16px 0; padding-left: 24px; }
    .content li { margin: 8px 0; }
    .highlight { background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%); color: #000000; padding: 20px; border-radius: 8px; margin: 24px 0; text-align: center; }
    .highlight strong { font-size: 18px; }
    .button { display: inline-block; background: #00ff88; color: #000000 !important; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .button:hover { background: #00cc6a; }
    .details { background: #f8f8f8; padding: 20px; border-radius: 8px; margin: 24px 0; }
    .details-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eeeeee; }
    .details-row:last-child { border-bottom: none; }
    .details-label { color: #666666; font-weight: 500; }
    .details-value { color: #000000; font-weight: 600; text-align: right; }
    .footer { background: #1a1a1a; color: #888888; padding: 30px 40px; text-align: center; font-size: 12px; }
    .footer a { color: #00ff88; text-decoration: none; }
    .pink-box { background: #FF2DCE20; border-left: 4px solid #FF2DCE; padding: 16px; margin: 16px 0; border-radius: 4px; }
    .purple-box { background: #8B5CF620; border-left: 4px solid #8B5CF6; padding: 16px; margin: 16px 0; border-radius: 4px; }
    .info-box { background: #E0F2FE; border-left: 4px solid #0EA5E9; padding: 16px; margin: 16px 0; border-radius: 4px; }
    .success-box { background: #d4edda; border-left: 4px solid #00ff88; padding: 16px; margin: 16px 0; border-radius: 4px; }
    .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 16px 0; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    table th, table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    table th { background: #f8f8f8; font-weight: 600; }
  `

  let bodyContent = ''

  switch (templateCode) {
    // =========================================================================
    // PARENT-FACING CAMP COMMUNICATIONS
    // =========================================================================

    case 'REGISTRATION_CONFIRMATION':
      bodyContent = `
        <h2>You're All Set!</h2>
        <p>Hi ${context.parentName},</p>
        <p>We're thrilled to welcome <strong>${context.camperName}</strong> to the <strong>${context.campName}</strong> program! Get ready for a week of fun, skill-building, and empowerment.</p>

        <div class="highlight">
          <strong>Registration Confirmed!</strong>
        </div>

        <h3>Your Registration Details</h3>
        <div class="details">
          <div class="details-row"><span class="details-label">Camper Name</span><span class="details-value">${context.camperName}</span></div>
          <div class="details-row"><span class="details-label">Camp Session</span><span class="details-value">${context.sessionDates}</span></div>
          <div class="details-row"><span class="details-label">Location</span><span class="details-value">${context.facilityName}</span></div>
          <div class="details-row"><span class="details-label">Address</span><span class="details-value">${context.facilityAddress} ${context.facilityCity}, ${context.facilityState}</span></div>
          <div class="details-row"><span class="details-label">Total Paid</span><span class="details-value">${context.totalPaid}</span></div>
          <div class="details-row"><span class="details-label">Confirmation #</span><span class="details-value">${context.confirmationNumber}</span></div>
        </div>

        <h3>What Happens Next?</h3>
        <p>You will receive a detailed preparation email <strong>two weeks before</strong> the camp start date with packing lists, check-in instructions, and the final schedule.</p>

        <p>Thank you for trusting us with your athlete. We can't wait to see them on the field!</p>

        <p>Best regards,<br/>
        <strong>${context.directorName}</strong><br/>
        ${context.directorPhone ? `📞 ${context.directorPhone}` : ''}</p>
      `
      break

    case 'CAMP_TWO_WEEKS_OUT':
      bodyContent = `
        <h2>Two Weeks to Go!</h2>
        <p>Hi ${context.parentName},</p>
        <p>We're just two weeks away from a great week of <strong>${context.campName}</strong>! Here is everything you need to prepare for a successful session for <strong>${context.camperName}</strong>.</p>

        <h3>📋 Logistics Checklist</h3>
        <div class="details">
          <div class="details-row"><span class="details-label">Start Date</span><span class="details-value">${context.campStartDate}</span></div>
          <div class="details-row"><span class="details-label">Check-In Time</span><span class="details-value">8:45 AM (Camp starts at 9:00 AM)</span></div>
          <div class="details-row"><span class="details-label">Address</span><span class="details-value">${context.facilityAddress}</span></div>
        </div>

        <h3>🎒 What to Pack Daily</h3>
        <ul>
          <li>Water bottle (labeled with camper's name)</li>
          <li>Athletic shoes (no sandals or open-toe)</li>
          <li>Sunscreen (applied before arrival)</li>
          <li>A light snack</li>
          <li>Weather-appropriate activewear</li>
        </ul>

        <div class="info-box">
          <strong>Note:</strong> If you purchased a Daily Fuel Pack, lunch and snacks are covered!
        </div>

        <h3>📝 Important: Waivers & Safety</h3>
        <p>Please confirm your online waiver submission. Review the safety guidelines for drop-off and pickup procedures in your parent portal.</p>

        <p style="text-align: center;">
          <a href="/portal" class="button">Review in Parent Portal</a>
        </p>

        <p>We look forward to meeting you both soon!</p>
        <p>Sincerely,<br/><strong>The ${context.campName} Team</strong></p>
      `
      break

    case 'CAMP_TWO_DAYS_BEFORE':
      bodyContent = `
        <h2>Final Countdown!</h2>
        <p>Hi ${context.parentName},</p>
        <p>Just <strong>two days</strong> until we kick off the <strong>${context.campName}</strong> session! This is the last reminder before we get started.</p>

        <h3>📍 Check-In Information</h3>
        <div class="details">
          <div class="details-row"><span class="details-label">Location</span><span class="details-value">${context.facilityName}</span></div>
          <div class="details-row"><span class="details-label">Meeting Spot</span><span class="details-value">${context.meetingSpot}</span></div>
          <div class="details-row"><span class="details-label">Camp Director</span><span class="details-value">${context.directorName}</span></div>
          <div class="details-row"><span class="details-label">Parking</span><span class="details-value">${context.parkingArea}</span></div>
        </div>

        <div class="warning-box">
          <strong>Reminder:</strong> Please remain patient and follow staff directions during the busy 8:45 AM drop-off window.
        </div>

        <h3>👟 What to Wear</h3>
        <p>${context.whatToWear}</p>

        <h3>🎒 What to Bring</h3>
        <p>${context.whatToBring}</p>

        <p>If you have any last-minute questions, please call us directly at <strong>${context.directorPhone}</strong>.</p>

        <div class="highlight">
          <strong>See you bright and early on ${context.campStartDate}!</strong>
        </div>

        <p>Best,<br/><strong>The ${context.campName} Team</strong></p>
      `
      break

    case 'CAMP_DAILY_RECAP':
      bodyContent = `
        <h2>Day ${context.dayNumber} Recap: ${context.wordOfTheDay || 'Great Day'}!</h2>
        <p>Hi ${context.parentName},</p>
        <p>What a great day for <strong>${context.camperName}</strong>! ${context.dayTheme ? `Today was all about <strong>${context.dayTheme}</strong>.` : ''}</p>

        <h3>🏆 Today's Highlights</h3>
        <table>
          <tr><th>Category</th><th>Details</th></tr>
          ${context.primarySport ? `<tr><td>Sports Played</td><td><strong>${context.primarySport}</strong>${context.primarySportFocus ? ` (${context.primarySportFocus})` : ''}${context.secondarySport ? ` and <strong>${context.secondarySport}</strong>${context.secondarySportFocus ? ` (${context.secondarySportFocus})` : ''}` : ''}</td></tr>` : ''}
          ${context.guestSpeakerName ? `<tr><td>Guest Speaker</td><td><strong>${context.guestSpeakerName}</strong>, ${context.guestSpeakerTitle}, spoke about ${context.guestSpeakerTopic}</td></tr>` : ''}
          ${context.wordOfTheDay ? `<tr><td>Word of the Day</td><td><strong>${context.wordOfTheDay}</strong>${context.wordOfTheDayExample ? ` – ${context.wordOfTheDayExample}` : ''}</td></tr>` : ''}
        </table>

        ${context.pinkPointSkill || context.purplePointSkill ? `
        <h3>💖 Values Section</h3>
        <p><strong>Today's Camp Value Highlight:</strong> We don't just teach skills; we teach leadership.</p>
        ${context.pinkPointSkill ? `<div class="pink-box"><strong>Pink Points:</strong> Every athlete practiced <strong>${context.pinkPointSkill}</strong> to earn their Pink Points today!</div>` : ''}
        ${context.purplePointSkill ? `<div class="purple-box"><strong>Purple Points:</strong> Athletes worked on <strong>${context.purplePointSkill}</strong> for their Purple Points!</div>` : ''}
        ` : ''}

        ${context.tomorrowSport1 ? `
        <h3>👀 Looking Ahead to Tomorrow (Day ${Number(context.dayNumber) + 1})</h3>
        <p>We will be focusing on <strong>${context.tomorrowSport1}</strong>${context.tomorrowSport2 ? ` and <strong>${context.tomorrowSport2}</strong>` : ''}${context.tomorrowWordOfTheDay ? `, with the Word of the Day being <strong>${context.tomorrowWordOfTheDay}</strong>` : ''}.</p>
        ` : ''}

        ${context.highlights ? `<div class="info-box">${context.highlights}</div>` : ''}

        <p>See you tomorrow!</p>
        <p><strong>The ${context.campName} Team</strong></p>
      `
      break

    case 'CAMP_SESSION_RECAP':
      bodyContent = `
        <h2>Thank You for an Amazing Week!</h2>
        <p>Hi ${context.parentName},</p>
        <p>The <strong>${context.sessionDates}</strong> camp session has officially wrapped up, and we had an incredible week with <strong>${context.camperName}</strong>! We hope your athlete came home inspired, exhausted, and ready to take on the world.</p>

        <div class="highlight">
          <strong>What an amazing week!</strong>
        </div>

        <h3>📝 Your Feedback is Essential</h3>
        <p>Please take 60 seconds to complete our Parent Satisfaction Survey. Your input helps us make next year even better, and it helps our director, <strong>${context.directorName}</strong>, earn their performance bonus!</p>
        <p style="text-align: center;">
          <a href="${context.surveyUrl}" class="button">Take the Survey</a>
        </p>

        <h3>🤝 Stay Connected</h3>
        <ul>
          <li><strong>Follow us on social media</strong> for highlights: <a href="${context.socialUrl}">@empoweredsportscamp</a></li>
          <li><strong>Want to inspire the next generation?</strong> Learn about <a href="${context.employmentUrl}">employment opportunities</a> as a Camp Director or Coach</li>
          <li><strong>Interested in running your own camp?</strong> Learn about <a href="${context.licensingUrl}">licensing opportunities</a></li>
        </ul>

        <p>We hope to see you next year!</p>
        <p>Best regards,<br/><strong>The ${context.campName} Team</strong></p>
      `
      break

    // =========================================================================
    // SEASONAL FOLLOW-UP EMAILS
    // =========================================================================

    case 'SEASON_FOLLOWUP_JAN':
      bodyContent = `
        <h2>New Year, New Camp Dates!</h2>
        <p>Hi ${context.parentName},</p>
        <p>Happy New Year! We hope ${context.year} is off to a great start for your family.</p>
        <p>We're excited to announce that our <strong>${context.year} summer camp dates</strong> are now available! Get a head start on your summer planning and secure your spot early.</p>

        <div class="highlight">
          <strong>${context.year} Summer Dates Are Here!</strong>
        </div>

        <p style="text-align: center;">
          <a href="${context.registrationUrl}" class="button">See All ${context.year} Dates</a>
        </p>

        <p>Reserve your spot early for the best selection!</p>
        <p><strong>The Empowered Sports Camp Team</strong></p>
      `
      break

    case 'SEASON_FOLLOWUP_FEB':
      bodyContent = `
        <h2>Early Bird Registration is OPEN!</h2>
        <p>Hi ${context.parentName},</p>
        <p>Great news – <strong>Early Bird registration</strong> for our ${context.year} summer camps is now open!</p>

        <div class="highlight">
          <strong>Use code ${context.earlyBirdCode} for early bird savings!</strong>
        </div>

        <p>Don't miss out on this limited-time offer. Secure your athlete's spot at the best price of the season.</p>

        <p style="text-align: center;">
          <a href="${context.registrationUrl}" class="button">Register Now</a>
        </p>

        <p>See you this summer!</p>
        <p><strong>The Empowered Sports Camp Team</strong></p>
      `
      break

    case 'SEASON_FOLLOWUP_MAR':
      bodyContent = `
        <h2>Summer Spots Are Filling Up Fast!</h2>
        <p>Hi ${context.parentName},</p>
        <p>Spring is here, and that means summer is right around the corner! Our most popular camp weeks are <strong>already filling up</strong>.</p>

        <div class="warning-box">
          <strong>High-demand weeks are going fast!</strong> Don't wait to register.
        </div>

        <p>Give your athlete the gift of an unforgettable summer experience – reserve their spot today before it's too late.</p>

        <p style="text-align: center;">
          <a href="${context.registrationUrl}" class="button">Check Availability</a>
        </p>

        <p><strong>The Empowered Sports Camp Team</strong></p>
      `
      break

    case 'SEASON_FOLLOWUP_APR':
      bodyContent = `
        <h2>The Final Countdown!</h2>
        <p>Hi ${context.parentName},</p>
        <p>With school winding down, now is the perfect time to finalize your summer plans. <strong>Registration closes soon</strong> for many of our sessions!</p>

        <p>At Empowered Sports Camp, we don't just teach sports – we build <strong>confidence, leadership, and lifelong skills</strong>. Your athlete deserves this experience.</p>

        <div class="highlight">
          <strong>Limited spots remaining!</strong>
        </div>

        <p style="text-align: center;">
          <a href="${context.registrationUrl}" class="button">Secure Your Spot</a>
        </p>

        <p><strong>The Empowered Sports Camp Team</strong></p>
      `
      break

    case 'SEASON_FOLLOWUP_MAY':
      bodyContent = `
        <h2>School's Out, Camp is IN!</h2>
        <p>Hi ${context.parentName},</p>
        <p>The school year is almost over, and summer is HERE! This is your <strong>last call</strong> to register for any remaining open sessions.</p>

        <div class="highlight">
          <strong>🚨 Last Call for Registration! 🚨</strong>
        </div>

        <p>Don't let your athlete miss out on the fun, friendships, and growth that come with an Empowered Sports Camp experience.</p>

        <p style="text-align: center;">
          <a href="${context.registrationUrl}" class="button">Register Now – Final Chance!</a>
        </p>

        <p>See you on the field!</p>
        <p><strong>The Empowered Sports Camp Team</strong></p>
      `
      break

    // =========================================================================
    // EXISTING TEMPLATES (maintained for backward compatibility)
    // =========================================================================

    case 'CAMP_CONFIRMATION':
      bodyContent = `
        <h2>Registration Confirmed!</h2>
        <p>Hi ${context.parentName},</p>
        <p>Great news! <strong>${context.athleteName}</strong> is officially registered for camp.</p>
        <div class="highlight"><strong>${context.campName}</strong></div>
        <div class="details">
          <div class="details-row"><span class="details-label">Dates</span><span class="details-value">${context.campStartDate} - ${context.campEndDate}</span></div>
          <div class="details-row"><span class="details-label">Location</span><span class="details-value">${context.campLocation || 'TBA'}</span></div>
          ${context.campAddress ? `<div class="details-row"><span class="details-label">Address</span><span class="details-value">${context.campAddress}</span></div>` : ''}
        </div>
        <p>We'll send you a reminder before camp starts with all the details you need.</p>
        <p>Get ready for an amazing experience!</p>
      `
      break

    case 'CAMP_REMINDER':
      bodyContent = `
        <h2>Camp Starts Tomorrow!</h2>
        <p>Hi ${context.parentName},</p>
        <p>This is a friendly reminder that <strong>${context.athleteName}</strong>'s camp starts tomorrow!</p>
        <div class="highlight"><strong>${context.campName}</strong></div>
        <div class="details">
          <div class="details-row"><span class="details-label">When</span><span class="details-value">${context.campStartDate}</span></div>
          <div class="details-row"><span class="details-label">Check-in Time</span><span class="details-value">${context.checkInTime || '8:45 AM'}</span></div>
          <div class="details-row"><span class="details-label">Location</span><span class="details-value">${context.campLocation}</span></div>
        </div>
        <p><strong>What to bring:</strong></p>
        <ul>
          <li>Water bottle</li>
          <li>Athletic shoes</li>
          <li>Positive attitude!</li>
        </ul>
      `
      break

    case 'DAILY_RECAP':
      bodyContent = `
        <h2>Day ${context.dayNumber} Recap</h2>
        <p>Hi ${context.parentName},</p>
        <p>Here's what happened today at <strong>${context.campName}</strong>!</p>
        ${context.summary ? `<div class="details"><p>${context.summary}</p></div>` : ''}
        <p>Your camper${String(context.athleteNames || '').includes(',') ? 's' : ''} (<strong>${context.athleteNames}</strong>) had a great day!</p>
        <p>See you tomorrow!</p>
      `
      break

    case 'POST_CAMP':
      bodyContent = `
        <h2>Thanks for Joining Us!</h2>
        <p>Hi ${context.parentName},</p>
        <p>What an amazing week! Thank you for trusting us with <strong>${context.athleteNames}</strong> at ${context.campName}.</p>
        <p>We'd love to hear your feedback:</p>
        <p style="text-align: center;"><a href="${context.feedbackUrl}" class="button">Share Your Experience</a></p>
        <p>We hope to see you again soon!</p>
      `
      break

    case 'STAFF_MESSAGE':
      bodyContent = `
        <h2>New Message</h2>
        <p>Hi ${context.recipientName},</p>
        <p>You have a new message from <strong>${context.senderName}</strong>.</p>
        ${context.messagePreview ? `<div class="details"><p>"${context.messagePreview}..."</p></div>` : ''}
        <p style="text-align: center;"><a href="${context.messageUrl}" class="button">View Message</a></p>
      `
      break

    case 'WELCOME':
      bodyContent = `
        <h2>Welcome to Empowered Sports Camp!</h2>
        <p>Hi ${context.userName},</p>
        <p>We're thrilled to have you join us${context.role ? ` as a <strong>${context.role}</strong>` : ''}!</p>
        <p>Here's what you can do next:</p>
        <ul>
          <li>Complete your profile</li>
          <li>Explore available camps</li>
          <li>Connect with our community</li>
        </ul>
        <p style="text-align: center;"><a href="/dashboard" class="button">Go to Dashboard</a></p>
      `
      break

    case 'PASSWORD_RESET':
      bodyContent = `
        <h2>Reset Your Password</h2>
        <p>Hi,</p>
        <p>We received a request to reset your password. Click the button below to set a new password:</p>
        <p style="text-align: center;"><a href="${context.resetUrl}" class="button">Reset Password</a></p>
        <p style="font-size: 12px; color: #666;">If you didn't request this, you can safely ignore this email.</p>
      `
      break

    case 'PAYMENT_RECEIPT':
    case 'ROYALTY_INVOICE':
      bodyContent = `
        <h2>${context.type === 'royalty_invoice' ? 'Royalty Invoice' : 'Payment Receipt'}</h2>
        <p>Hi,</p>
        <div class="highlight"><strong>Invoice ${context.invoiceNumber}</strong></div>
        <div class="details">
          <div class="details-row"><span class="details-label">Amount</span><span class="details-value">$${context.amount}</span></div>
          ${context.dueDate ? `<div class="details-row"><span class="details-label">Due Date</span><span class="details-value">${context.dueDate}</span></div>` : ''}
          ${context.campName ? `<div class="details-row"><span class="details-label">Camp</span><span class="details-value">${context.campName}</span></div>` : ''}
        </div>
        <p style="text-align: center;"><a href="/admin/revenue/royalties" class="button">View Invoice</a></p>
      `
      break

    case 'PAYMENT_FAILED':
      bodyContent = `
        <h2>Payment Issue</h2>
        <p>Hi,</p>
        <div class="warning-box"><p>We were unable to process your payment. Please update your payment method to avoid service interruption.</p></div>
        <p style="text-align: center;"><a href="/settings/billing" class="button">Update Payment Method</a></p>
      `
      break

    case 'LICENSEE_APPLICATION':
      bodyContent = `
        <h2>New Licensee Application</h2>
        <p>A new licensee application has been submitted:</p>
        <div class="details">
          <div class="details-row"><span class="details-label">Applicant</span><span class="details-value">${context.applicantName}</span></div>
          <div class="details-row"><span class="details-label">Location</span><span class="details-value">${context.city}, ${context.state}</span></div>
        </div>
        <p style="text-align: center;"><a href="/admin/licensee-applications/${context.applicationId}" class="button">Review Application</a></p>
      `
      break

    case 'LICENSEE_STATUS_UPDATE':
      bodyContent = `
        <h2>Application Status Update</h2>
        <p>Hi ${context.applicantName},</p>
        <div class="${context.status === 'approved' ? 'success-box' : context.status === 'rejected' ? 'warning-box' : 'details'}">
          <p>Your licensee application status has been updated to: <strong>${context.status}</strong></p>
        </div>
        ${context.status === 'approved' ? '<p>Congratulations! Welcome to the Empowered Sports Camp family. Our team will be in touch soon with next steps.</p>' : ''}
        <p style="text-align: center;"><a href="/dashboard" class="button">View Details</a></p>
      `
      break

    case 'CIT_APPLICATION':
      bodyContent = `
        <h2>New CIT Application</h2>
        <p>A new Counselor-in-Training application has been submitted:</p>
        <div class="details">
          <div class="details-row"><span class="details-label">Applicant</span><span class="details-value">${context.applicantName}</span></div>
          <div class="details-row"><span class="details-label">Age</span><span class="details-value">${context.age}</span></div>
        </div>
        <p style="text-align: center;"><a href="/admin/cit-applications/${context.applicationId}" class="button">Review Application</a></p>
      `
      break

    case 'CIT_STATUS_UPDATE':
      bodyContent = `
        <h2>CIT Application Update</h2>
        <p>Hi ${context.applicantName},</p>
        <div class="${context.status === 'approved' ? 'success-box' : 'details'}">
          <p>Your CIT application status has been updated to: <strong>${context.status}</strong></p>
        </div>
        <p style="text-align: center;"><a href="/dashboard" class="button">View Details</a></p>
      `
      break

    case 'ROYALTY_STATUS_UPDATE':
      bodyContent = `
        <h2>Invoice Status Update</h2>
        <p>Invoice <strong>${context.invoiceNumber}</strong> status has been updated to: <strong>${context.status}</strong></p>
        <p style="text-align: center;"><a href="/admin/revenue/royalties" class="button">View Invoice</a></p>
      `
      break

    case 'LMS_COMPLETION':
      bodyContent = `
        <h2>Congratulations!</h2>
        <p>Hi ${context.userName},</p>
        <div class="success-box"><p>You've successfully completed <strong>${context.moduleName}</strong>!</p></div>
        ${context.score ? `<p>Your score: <strong>${context.score}%</strong></p>` : ''}
        <p>Keep up the great work! Check out what's next in your training journey.</p>
        <p style="text-align: center;"><a href="/training" class="button">Continue Training</a></p>
      `
      break

    case 'CERTIFICATION_UPDATE':
      bodyContent = `
        <h2>Certification Update</h2>
        <p>Hi ${context.userName},</p>
        <p>Your certification status has been updated:</p>
        <div class="details">
          <div class="details-row"><span class="details-label">Certification</span><span class="details-value">${context.certificationName}</span></div>
          <div class="details-row"><span class="details-label">Status</span><span class="details-value">${context.status}</span></div>
        </div>
        <p style="text-align: center;"><a href="/certifications" class="button">View Certifications</a></p>
      `
      break

    case 'INCENTIVE_UPDATE':
      bodyContent = `
        <h2>Incentive Update</h2>
        <p>Hi,</p>
        <p>There's an update to your incentive program:</p>
        <div class="highlight"><strong>${context.incentiveName || 'Incentive Program'}</strong></div>
        ${context.amount ? `<p>Amount: <strong>$${context.amount}</strong></p>` : ''}
        <p style="text-align: center;"><a href="/incentives" class="button">View Details</a></p>
      `
      break

    case 'JOB_APPLICATION':
      bodyContent = `
        <h2>Application Update</h2>
        <p>Hi ${context.applicantName},</p>
        <p>There's an update on your application for <strong>${context.position}</strong>.</p>
        <div class="details">
          <div class="details-row"><span class="details-label">Status</span><span class="details-value">${context.status}</span></div>
        </div>
        <p style="text-align: center;"><a href="/jobs/applications" class="button">View Application</a></p>
      `
      break

    case 'SYSTEM_ALERT':
    case 'BROADCAST':
      bodyContent = `
        <h2>${context.title || 'Message'}</h2>
        <div class="${context.severity === 'error' ? 'warning-box' : context.severity === 'warning' ? 'warning-box' : 'info-box'}">
          <p>${context.message}</p>
        </div>
        ${context.actionUrl ? `<p style="text-align: center;"><a href="${context.actionUrl}" class="button">Take Action</a></p>` : ''}
      `
      break

    default:
      bodyContent = `
        <h2>Notification</h2>
        <p>${context.message || 'You have a new notification from Empowered Sports Camp.'}</p>
      `
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Empowered Sports Camp</title>
      <style>${baseStyle}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>EMPOWERED SPORTS CAMP</h1>
          <div class="tagline">Building Champions On & Off The Field</div>
        </div>
        <div class="content">
          ${bodyContent}
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Empowered Sports Camp. All rights reserved.</p>
          <p>
            <a href="https://empoweredsportscamp.com">Website</a> |
            <a href="https://empoweredsportscamp.com/privacy">Privacy Policy</a> |
            <a href="https://empoweredsportscamp.com/unsubscribe">Unsubscribe</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}
