/**
 * Email Service - Resend Integration
 *
 * Uses Resend for transactional email delivery.
 *
 * SETUP:
 * 1. Add RESEND_API_KEY to .env.local
 * 2. Verify your sending domain in Resend dashboard
 *
 * @see https://resend.com/docs
 */

import { Resend } from 'resend'

// Initialize Resend client
// In development without API key, emails will be logged to console
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

// Default from address - update with your verified domain
const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || 'Empowered Sports Camp <noreply@empoweredsportscamp.com>'

// Placeholder type for email result
export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

// Email templates enum for type safety
export type EmailTemplate =
  | 'licensee_application'
  | 'licensee_welcome'
  | 'parent_welcome'
  | 'camp_registration'
  | 'password_reset'

// Base email options
interface BaseEmailOptions {
  to: string
  subject: string
}

// Licensee application email options
export interface LicenseeApplicationEmailOptions extends BaseEmailOptions {
  firstName: string
  lastName: string
  territoryName: string
  applicationUrl: string
}

// Licensee welcome email options
export interface LicenseeWelcomeEmailOptions extends BaseEmailOptions {
  firstName: string
  territoryName: string
  loginUrl: string
}

/**
 * Generate HTML email template for licensee application
 */
function generateLicenseeApplicationHtml(options: LicenseeApplicationEmailOptions): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Your Licensee Application</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Poppins', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; border: 1px solid rgba(255,255,255,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; border-bottom: 2px solid #00ff88;">
              <h1 style="margin: 0; color: #00ff88; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">
                Empowered Sports Camp
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 20px; font-weight: 700;">
                Hi ${options.firstName || 'there'},
              </h2>

              <p style="margin: 0 0 20px; color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">
                You have been invited to become a licensed operator for <strong style="color: #ffffff;">Empowered Sports Camp</strong> in the <strong style="color: #00ff88;">${options.territoryName}</strong> territory.
              </p>

              <p style="margin: 0 0 30px; color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">
                Click the button below to complete your application and set up your account:
              </p>

              <table cellpadding="0" cellspacing="0" style="margin: 0 0 30px;">
                <tr>
                  <td style="background-color: #00ff88; padding: 16px 32px;">
                    <a href="${options.applicationUrl}" style="color: #000000; text-decoration: none; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                      Complete Application
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px; color: rgba(255,255,255,0.5); font-size: 14px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 30px; color: #00ff88; font-size: 14px; word-break: break-all;">
                ${options.applicationUrl}
              </p>

              <p style="margin: 0; color: rgba(255,255,255,0.5); font-size: 14px;">
                This link will expire in 7 days.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid rgba(255,255,255,0.1); background-color: rgba(0,0,0,0.5);">
              <p style="margin: 0; color: rgba(255,255,255,0.4); font-size: 12px; text-align: center;">
                &copy; ${new Date().getFullYear()} Empowered Sports Camp. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Generate plain text email for licensee application
 */
function generateLicenseeApplicationText(options: LicenseeApplicationEmailOptions): string {
  return `
Hi ${options.firstName || 'there'},

You have been invited to become a licensed operator for Empowered Sports Camp in the ${options.territoryName} territory.

Please visit the following link to complete your application and set up your account:

${options.applicationUrl}

This link will expire in 7 days.

---
Empowered Sports Camp
  `.trim()
}

/**
 * Send licensee application invite email
 *
 * Called when an hq_admin creates a new licensee and wants to
 * send them an application link to complete their profile.
 */
export async function sendLicenseeApplicationEmail(
  options: LicenseeApplicationEmailOptions
): Promise<EmailResult> {
  const { to, firstName, lastName, territoryName, applicationUrl } = options

  // If Resend is not configured, log to console and return success
  if (!resend) {
    console.log('=== DEV MODE: Licensee Application Email ===')
    console.log('To:', to)
    console.log('Subject:', `Complete Your Licensee Application - ${territoryName}`)
    console.log('First Name:', firstName)
    console.log('Last Name:', lastName)
    console.log('Territory:', territoryName)
    console.log('Application URL:', applicationUrl)
    console.log('============================================')
    console.log('')
    console.log('NOTE: Set RESEND_API_KEY in .env.local to send real emails')
    console.log('')

    return {
      success: true,
      messageId: `dev-${Date.now()}`,
    }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: [to],
      subject: options.subject || `Complete Your Licensee Application - ${territoryName}`,
      html: generateLicenseeApplicationHtml(options),
      text: generateLicenseeApplicationText(options),
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (err) {
    console.error('Email send error:', err)
    return { success: false, error: (err as Error).message }
  }
}

/**
 * Generate HTML email template for licensee welcome
 */
function generateLicenseeWelcomeHtml(options: LicenseeWelcomeEmailOptions): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Empowered Sports Camp</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Poppins', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; border: 1px solid rgba(255,255,255,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; border-bottom: 2px solid #00ff88;">
              <h1 style="margin: 0; color: #00ff88; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">
                Empowered Sports Camp
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 20px; font-weight: 700;">
                Welcome, ${options.firstName}!
              </h2>

              <p style="margin: 0 0 20px; color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">
                Congratulations! Your account for the <strong style="color: #00ff88;">${options.territoryName}</strong> territory has been activated.
              </p>

              <p style="margin: 0 0 30px; color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">
                You can now access your licensee portal to manage camps, registrations, and more.
              </p>

              <table cellpadding="0" cellspacing="0" style="margin: 0 0 30px;">
                <tr>
                  <td style="background-color: #00ff88; padding: 16px 32px;">
                    <a href="${options.loginUrl}" style="color: #000000; text-decoration: none; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                      Go to Portal
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid rgba(255,255,255,0.1); background-color: rgba(0,0,0,0.5);">
              <p style="margin: 0; color: rgba(255,255,255,0.4); font-size: 12px; text-align: center;">
                &copy; ${new Date().getFullYear()} Empowered Sports Camp. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Send licensee welcome email
 *
 * Sent after a licensee completes their application and
 * their account is activated.
 */
export async function sendLicenseeWelcomeEmail(
  options: LicenseeWelcomeEmailOptions
): Promise<EmailResult> {
  const { to, firstName, territoryName, loginUrl } = options

  if (!resend) {
    console.log('=== DEV MODE: Licensee Welcome Email ===')
    console.log('To:', to)
    console.log('Subject:', `Welcome to Empowered Sports Camp - ${territoryName}`)
    console.log('First Name:', firstName)
    console.log('Territory:', territoryName)
    console.log('Login URL:', loginUrl)
    console.log('=========================================')

    return {
      success: true,
      messageId: `dev-${Date.now()}`,
    }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: [to],
      subject: options.subject || `Welcome to Empowered Sports Camp - ${territoryName}`,
      html: generateLicenseeWelcomeHtml(options),
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

/**
 * Check if Resend is configured
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}
