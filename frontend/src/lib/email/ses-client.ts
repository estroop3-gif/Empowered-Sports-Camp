/**
 * AWS SES Email Client
 *
 * Centralized email client using Amazon Simple Email Service (SES).
 * Replaces Resend for transactional email delivery.
 *
 * SETUP:
 * 1. Configure AWS credentials (via environment variables or IAM role)
 * 2. Verify your sending domain in AWS SES console
 * 3. Request production access to send to non-verified emails
 *
 * Environment Variables:
 * - AWS_REGION: AWS region for SES (defaults to us-east-1)
 * - SES_FROM_EMAIL: Default from address (must be verified in SES)
 *
 * @see https://docs.aws.amazon.com/ses/latest/dg/Welcome.html
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

// Initialize SES client
// Uses default credential provider chain (env vars, IAM role, etc.)
const region = process.env.AWS_REGION || process.env.APP_AWS_REGION || 'us-east-1'
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.APP_AWS_ACCESS_KEY_ID
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.APP_AWS_SECRET_ACCESS_KEY

const sesClient = new SESClient({
  region,
  ...(accessKeyId && secretAccessKey ? {
    credentials: { accessKeyId, secretAccessKey }
  } : {}),
})

// Default from address - must be verified in SES
const DEFAULT_FROM = process.env.SES_FROM_EMAIL || 'Empowered Sports Camp <noreply@empoweredsportscamp.com>'

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
 * Send an email using AWS SES
 *
 * In development mode without proper SES configuration, emails are logged to console.
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  const { to, subject, html, text, from, replyTo, cc } = options
  const fromAddress = from || DEFAULT_FROM
  const toAddresses = Array.isArray(to) ? to : [to]
  const ccAddresses = cc ? (Array.isArray(cc) ? cc : [cc]) : undefined

  // In development, log email details to console
  if (IS_DEVELOPMENT && !accessKeyId) {
    console.log('=== DEV MODE: Email (SES not configured) ===')
    console.log('From:', fromAddress)
    console.log('To:', toAddresses.join(', '))
    if (ccAddresses) console.log('CC:', ccAddresses.join(', '))
    console.log('Subject:', subject)
    console.log('Reply-To:', replyTo || 'N/A')
    console.log('============================================')
    console.log('')
    console.log('NOTE: Configure AWS credentials to send real emails via SES')
    console.log('')

    return {
      success: true,
      messageId: `dev-${Date.now()}`,
    }
  }

  try {
    const command = new SendEmailCommand({
      Source: fromAddress,
      Destination: {
        ToAddresses: toAddresses,
        CcAddresses: ccAddresses,
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: html,
            Charset: 'UTF-8',
          },
          ...(text && {
            Text: {
              Data: text,
              Charset: 'UTF-8',
            },
          }),
        },
      },
      ReplyToAddresses: replyTo ? [replyTo] : undefined,
    })

    const response = await sesClient.send(command)

    return {
      success: true,
      messageId: response.MessageId,
    }
  } catch (err) {
    console.error('[SES] Email send error:', err)
    return {
      success: false,
      error: (err as Error).message,
    }
  }
}

/**
 * Check if SES is properly configured
 */
export function isEmailConfigured(): boolean {
  // Check if AWS credentials are available
  return !!(process.env.AWS_ACCESS_KEY_ID || process.env.APP_AWS_ACCESS_KEY_ID || process.env.AWS_ROLE_ARN)
}

export { sesClient, DEFAULT_FROM }
