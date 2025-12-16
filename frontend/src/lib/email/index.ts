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
  | 'cit_applicant_confirmation'
  | 'cit_admin_notification'

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

// CIT application data for emails
export interface CitApplicationEmailData {
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  schoolName?: string | null
  gradeLevel?: string | null
  sportsPlayed?: string | null
  whyCit?: string | null
  parentName?: string | null
  parentEmail?: string | null
}

// CIT applicant confirmation email options
export interface CitApplicantConfirmationEmailOptions {
  to: string
  applicantName: string
}

// CIT admin notification email options
export interface CitAdminNotificationEmailOptions {
  application: CitApplicationEmailData
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

// ============================================
// CIT Program Email Functions
// ============================================

// Admin notification email address for CIT applications
const CIT_NOTIFICATIONS_EMAIL = process.env.CIT_NOTIFICATIONS_EMAIL || ''

/**
 * Generate HTML email template for CIT applicant confirmation
 */
function generateCitApplicantConfirmationHtml(applicantName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CIT Application Received</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Poppins', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; border: 1px solid rgba(255,255,255,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; border-bottom: 2px solid #d946ef;">
              <h1 style="margin: 0; color: #d946ef; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">
                Empowered Sports Camp
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 20px; font-weight: 700;">
                Hi ${applicantName},
              </h2>

              <p style="margin: 0 0 20px; color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">
                Thank you for applying to our <strong style="color: #d946ef;">Coaches-In-Training (CIT) Program</strong>! We're excited that you're interested in becoming a leader and role model for young athletes.
              </p>

              <p style="margin: 0 0 20px; color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">
                We've received your application and our team will review it shortly. Here's what happens next:
              </p>

              <table cellpadding="0" cellspacing="0" style="margin: 0 0 30px; width: 100%;">
                <tr>
                  <td style="padding: 20px; background-color: rgba(217, 70, 239, 0.1); border-left: 3px solid #d946ef;">
                    <ol style="margin: 0; padding-left: 20px; color: rgba(255,255,255,0.7); font-size: 14px; line-height: 2;">
                      <li><strong style="color: #ffffff;">Application Review</strong> — Our team reviews your application</li>
                      <li><strong style="color: #ffffff;">Interview</strong> — If selected, we'll reach out to schedule a brief interview</li>
                      <li><strong style="color: #ffffff;">Training</strong> — Complete our CIT training modules</li>
                      <li><strong style="color: #ffffff;">Camp Assignment</strong> — Get matched with a camp that fits your schedule</li>
                    </ol>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px; color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">
                We'll be in touch within the next 1-2 weeks. In the meantime, if you have any questions, feel free to reach out.
              </p>

              <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">
                <strong style="color: #ffffff;">— The Empowered Sports Camp Team</strong>
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
 * Generate plain text email for CIT applicant confirmation
 */
function generateCitApplicantConfirmationText(applicantName: string): string {
  return `
Hi ${applicantName},

Thank you for applying to our Coaches-In-Training (CIT) Program! We're excited that you're interested in becoming a leader and role model for young athletes.

We've received your application and our team will review it shortly.

Here's what happens next:
1. Application Review — Our team reviews your application
2. Interview — If selected, we'll reach out to schedule a brief interview
3. Training — Complete our CIT training modules
4. Camp Assignment — Get matched with a camp that fits your schedule

We'll be in touch within the next 1-2 weeks. In the meantime, if you have any questions, feel free to reach out.

— The Empowered Sports Camp Team

---
Empowered Sports Camp
  `.trim()
}

/**
 * Send CIT applicant confirmation email
 *
 * Called when a new CIT application is submitted.
 * Sends a confirmation to the applicant.
 */
export async function sendCitApplicantConfirmationEmail(
  options: CitApplicantConfirmationEmailOptions
): Promise<EmailResult> {
  const { to, applicantName } = options

  // If Resend is not configured, log to console and return success
  if (!resend) {
    console.log('=== DEV MODE: CIT Applicant Confirmation Email ===')
    console.log('To:', to)
    console.log('Subject: Your CIT Application Has Been Received')
    console.log('Applicant Name:', applicantName)
    console.log('=================================================')
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
      subject: 'Your CIT Application Has Been Received',
      html: generateCitApplicantConfirmationHtml(applicantName),
      text: generateCitApplicantConfirmationText(applicantName),
    })

    if (error) {
      console.error('Resend error (CIT applicant):', error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (err) {
    console.error('Email send error (CIT applicant):', err)
    return { success: false, error: (err as Error).message }
  }
}

/**
 * Generate HTML email template for CIT admin notification
 */
function generateCitAdminNotificationHtml(application: CitApplicationEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New CIT Application</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Poppins', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; border: 1px solid rgba(255,255,255,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; border-bottom: 2px solid #d946ef;">
              <h1 style="margin: 0; color: #d946ef; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">
                New CIT Application
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 30px; color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">
                A new CIT application has been submitted. Here are the details:
              </p>

              <table cellpadding="0" cellspacing="0" style="margin: 0 0 30px; width: 100%;">
                <!-- Applicant Info -->
                <tr>
                  <td colspan="2" style="padding: 15px 20px; background-color: rgba(217, 70, 239, 0.1); border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <strong style="color: #d946ef; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Applicant Information</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 20px; color: rgba(255,255,255,0.5); font-size: 14px; width: 140px;">Name</td>
                  <td style="padding: 12px 20px; color: #ffffff; font-size: 14px;">${application.firstName} ${application.lastName}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 20px; color: rgba(255,255,255,0.5); font-size: 14px;">Email</td>
                  <td style="padding: 12px 20px; color: #ffffff; font-size: 14px;"><a href="mailto:${application.email}" style="color: #d946ef;">${application.email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 12px 20px; color: rgba(255,255,255,0.5); font-size: 14px;">Phone</td>
                  <td style="padding: 12px 20px; color: #ffffff; font-size: 14px;">${application.phone || 'Not provided'}</td>
                </tr>

                <!-- School Info -->
                <tr>
                  <td colspan="2" style="padding: 15px 20px; background-color: rgba(217, 70, 239, 0.1); border-top: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <strong style="color: #d946ef; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">School & Sports</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 20px; color: rgba(255,255,255,0.5); font-size: 14px;">School</td>
                  <td style="padding: 12px 20px; color: #ffffff; font-size: 14px;">${application.schoolName || 'Not provided'}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 20px; color: rgba(255,255,255,0.5); font-size: 14px;">Grade</td>
                  <td style="padding: 12px 20px; color: #ffffff; font-size: 14px;">${application.gradeLevel || 'Not provided'}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 20px; color: rgba(255,255,255,0.5); font-size: 14px;">Sports</td>
                  <td style="padding: 12px 20px; color: #ffffff; font-size: 14px;">${application.sportsPlayed || 'Not provided'}</td>
                </tr>

                <!-- Parent Info -->
                <tr>
                  <td colspan="2" style="padding: 15px 20px; background-color: rgba(217, 70, 239, 0.1); border-top: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <strong style="color: #d946ef; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Parent/Guardian</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 20px; color: rgba(255,255,255,0.5); font-size: 14px;">Name</td>
                  <td style="padding: 12px 20px; color: #ffffff; font-size: 14px;">${application.parentName || 'Not provided'}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 20px; color: rgba(255,255,255,0.5); font-size: 14px;">Email</td>
                  <td style="padding: 12px 20px; color: #ffffff; font-size: 14px;">${application.parentEmail ? `<a href="mailto:${application.parentEmail}" style="color: #d946ef;">${application.parentEmail}</a>` : 'Not provided'}</td>
                </tr>
              </table>

              ${application.whyCit ? `
              <div style="margin: 0 0 30px; padding: 20px; background-color: rgba(255,255,255,0.05); border-left: 3px solid #d946ef;">
                <strong style="color: #d946ef; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 10px;">Why They Want to Be a CIT</strong>
                <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 14px; line-height: 1.6;">${application.whyCit}</p>
              </div>
              ` : ''}

              <p style="margin: 0; color: rgba(255,255,255,0.5); font-size: 14px;">
                Log in to the admin portal to review and process this application.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid rgba(255,255,255,0.1); background-color: rgba(0,0,0,0.5);">
              <p style="margin: 0; color: rgba(255,255,255,0.4); font-size: 12px; text-align: center;">
                This is an automated notification from Empowered Sports Camp
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
 * Generate plain text email for CIT admin notification
 */
function generateCitAdminNotificationText(application: CitApplicationEmailData): string {
  return `
NEW CIT APPLICATION

Applicant Information
---------------------
Name: ${application.firstName} ${application.lastName}
Email: ${application.email}
Phone: ${application.phone || 'Not provided'}

School & Sports
---------------
School: ${application.schoolName || 'Not provided'}
Grade: ${application.gradeLevel || 'Not provided'}
Sports: ${application.sportsPlayed || 'Not provided'}

Parent/Guardian
---------------
Name: ${application.parentName || 'Not provided'}
Email: ${application.parentEmail || 'Not provided'}

${application.whyCit ? `Why They Want to Be a CIT
--------------------------
${application.whyCit}` : ''}

---
Log in to the admin portal to review and process this application.
  `.trim()
}

/**
 * Send CIT admin notification email
 *
 * Called when a new CIT application is submitted.
 * Sends notification to the CIT_NOTIFICATIONS_EMAIL address.
 */
export async function sendCitAdminNotificationEmail(
  options: CitAdminNotificationEmailOptions
): Promise<EmailResult> {
  const { application } = options

  // Check if notification email is configured
  if (!CIT_NOTIFICATIONS_EMAIL) {
    console.log('=== CIT Admin Notification Skipped ===')
    console.log('CIT_NOTIFICATIONS_EMAIL is not configured')
    console.log('Set CIT_NOTIFICATIONS_EMAIL in .env.local to receive notifications')
    console.log('======================================')
    return {
      success: true,
      messageId: `skipped-no-recipient-${Date.now()}`,
    }
  }

  // If Resend is not configured, log to console and return success
  if (!resend) {
    console.log('=== DEV MODE: CIT Admin Notification Email ===')
    console.log('To:', CIT_NOTIFICATIONS_EMAIL)
    console.log('Subject: New CIT Application - ' + application.firstName + ' ' + application.lastName)
    console.log('Application Data:', JSON.stringify(application, null, 2))
    console.log('==============================================')
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
      to: [CIT_NOTIFICATIONS_EMAIL],
      subject: `New CIT Application - ${application.firstName} ${application.lastName}`,
      html: generateCitAdminNotificationHtml(application),
      text: generateCitAdminNotificationText(application),
    })

    if (error) {
      console.error('Resend error (CIT admin notification):', error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (err) {
    console.error('Email send error (CIT admin notification):', err)
    return { success: false, error: (err as Error).message }
  }
}

/**
 * Check if CIT notifications are fully configured
 */
export function isCitNotificationsConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.CIT_NOTIFICATIONS_EMAIL
}

// ============================================
// Squad Invite Email Functions
// ============================================

export interface SquadInviteEmailOptions {
  to: string
  inviterName: string
  campName: string
  signupUrl: string
}

/**
 * Generate HTML email template for squad invite (new user)
 */
function generateSquadInviteHtml(options: SquadInviteEmailOptions): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've Been Invited to Join a Squad!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Poppins', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; border: 1px solid rgba(255,255,255,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; border-bottom: 2px solid #a855f7;">
              <h1 style="margin: 0; color: #a855f7; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">
                Empowered Sports Camp
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 20px; font-weight: 700;">
                You've Been Invited to Join a Squad! 🎉
              </h2>

              <p style="margin: 0 0 20px; color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">
                <strong style="color: #ffffff;">${options.inviterName}</strong> has invited you to have your athletes grouped together at <strong style="color: #a855f7;">${options.campName}</strong>.
              </p>

              <p style="margin: 0 0 20px; color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">
                With our "Build Her Squad" feature, you can keep friends together during camp activities. Create an account to accept the invite and register your athletes.
              </p>

              <table cellpadding="0" cellspacing="0" style="margin: 0 0 30px;">
                <tr>
                  <td style="background-color: #a855f7; padding: 16px 32px;">
                    <a href="${options.signupUrl}" style="color: #000000; text-decoration: none; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                      Sign Up & Join Squad
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px; color: rgba(255,255,255,0.5); font-size: 14px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 30px; color: #a855f7; font-size: 14px; word-break: break-all;">
                ${options.signupUrl}
              </p>

              <p style="margin: 0; color: rgba(255,255,255,0.5); font-size: 14px;">
                This invite will expire in 30 days.
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
 * Generate plain text email for squad invite
 */
function generateSquadInviteText(options: SquadInviteEmailOptions): string {
  return `
You've Been Invited to Join a Squad!

${options.inviterName} has invited you to have your athletes grouped together at ${options.campName}.

With our "Build Her Squad" feature, you can keep friends together during camp activities. Create an account to accept the invite and register your athletes.

Sign up here: ${options.signupUrl}

This invite will expire in 30 days.

---
Empowered Sports Camp
  `.trim()
}

/**
 * Send squad invite email to a new user
 *
 * Called when a parent invites someone who doesn't have an account yet.
 */
export async function sendSquadInviteEmail(
  options: SquadInviteEmailOptions
): Promise<EmailResult> {
  const { to, inviterName, campName, signupUrl } = options

  // If Resend is not configured, log to console and return success
  if (!resend) {
    console.log('=== DEV MODE: Squad Invite Email ===')
    console.log('To:', to)
    console.log('Subject:', `${inviterName} invited you to join their squad!`)
    console.log('Inviter:', inviterName)
    console.log('Camp:', campName)
    console.log('Signup URL:', signupUrl)
    console.log('====================================')
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
      subject: `${inviterName} invited you to join their squad!`,
      html: generateSquadInviteHtml(options),
      text: generateSquadInviteText(options),
    })

    if (error) {
      console.error('Resend error (squad invite):', error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (err) {
    console.error('Email send error (squad invite):', err)
    return { success: false, error: (err as Error).message }
  }
}
