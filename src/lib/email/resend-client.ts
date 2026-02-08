/**
 * Resend Email Client
 *
 * Centralized email client using Resend for transactional email delivery.
 *
 * Environment Variables:
 * - RESEND_API_KEY: Your Resend API key
 * - FROM_EMAIL: Default from address (must have verified domain in Resend)
 */

import { Resend } from 'resend'
import { prisma } from '@/lib/db/client'
import type { EmailType, EmailStatus } from '@/generated/prisma'

// Initialize Resend client (null if no API key)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

// Default from address - domain must be verified in Resend
const DEFAULT_FROM = process.env.FROM_EMAIL || 'Empowered Sports Camp <noreply@empoweredsportscamp.com>'

// Check if we're in development mode
const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production'

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
  cc?: string | string[]
}

/**
 * Send an email using Resend
 *
 * In development mode without RESEND_API_KEY, emails are logged to console.
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  const { to, subject, html, text, from, replyTo, cc } = options
  const fromAddress = from || DEFAULT_FROM
  const toAddresses = Array.isArray(to) ? to : [to]
  const ccAddresses = cc ? (Array.isArray(cc) ? cc : [cc]) : undefined

  // In development without API key, log email details to console
  if (!resend) {
    if (IS_DEVELOPMENT) {
      console.log('=== DEV MODE: Email (Resend not configured) ===')
      console.log('From:', fromAddress)
      console.log('To:', toAddresses.join(', '))
      if (ccAddresses) console.log('CC:', ccAddresses.join(', '))
      console.log('Subject:', subject)
      console.log('Reply-To:', replyTo || 'N/A')
      console.log('================================================')
      console.log('')
    }

    return {
      success: true,
      messageId: `dev-${Date.now()}`,
    }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: toAddresses,
      cc: ccAddresses,
      subject,
      html,
      text,
      replyTo: replyTo || undefined,
    })

    if (error) {
      console.error('[Resend] Email send error:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      messageId: data?.id,
    }
  } catch (err) {
    console.error('[Resend] Email send error:', err)
    return {
      success: false,
      error: (err as Error).message,
    }
  }
}

/**
 * Check if Resend is properly configured
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}

/**
 * Log an email send to the database for observability
 */
export async function logEmail(params: {
  tenantId?: string | null
  userId?: string | null
  toEmail: string
  fromEmail?: string
  subject: string
  emailType: EmailType
  payload?: Record<string, unknown>
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
        fromEmail: params.fromEmail || DEFAULT_FROM,
        subject: params.subject,
        emailType: params.emailType,
        payload: (params.payload || {}) as never,
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

export { DEFAULT_FROM }
