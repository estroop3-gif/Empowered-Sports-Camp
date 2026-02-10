/**
 * Email Service
 *
 * Uses Resend for transactional email delivery.
 */

import { sendEmail, isEmailConfigured, DEFAULT_FROM, logEmail } from './resend-client'
import {
  brandWrap,
  BRAND,
  APP_URL,
  emailLabel,
  emailHeading,
  emailParagraph,
  emailButton,
  emailDetailsCard,
  emailCallout,
  emailFallbackUrl,
} from './brand-layout'

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
  return brandWrap(`
    ${emailLabel('Licensee Invitation')}
    ${emailHeading(`Complete Your<br/><span style="color: ${BRAND.neon};">Application</span>`)}

    ${emailParagraph(`Hi ${options.firstName || 'there'},`)}
    ${emailParagraph(`You have been invited to become a licensed operator for <strong style="color: ${BRAND.textPrimary};">Empowered Sports Camp</strong> in the <strong style="color: ${BRAND.neon};">${options.territoryName}</strong> territory.`)}
    ${emailParagraph('Click the button below to complete your application and set up your account:')}

    ${emailButton('Complete Application', options.applicationUrl)}
    ${emailFallbackUrl(options.applicationUrl)}

    <p style="margin: 16px 0 0; color: ${BRAND.textMuted}; font-size: 13px; font-family: 'Poppins', Arial, sans-serif;">This link will expire in 7 days.</p>
  `)
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
  const subject = options.subject || `Complete Your Licensee Application - ${territoryName}`

  const result = await sendEmail({
    to,
    subject,
    html: generateLicenseeApplicationHtml(options),
    text: generateLicenseeApplicationText(options),
  })

  await logEmail({
    toEmail: to,
    subject,
    emailType: 'licensee_application',
    status: result.success ? 'sent' : 'failed',
    providerMessageId: result.messageId,
    errorMessage: result.error,
  })

  if (!result.success) {
    console.error('Email send error:', result.error)
  }

  return result
}

/**
 * Generate HTML email template for licensee welcome
 */
function generateLicenseeWelcomeHtml(options: LicenseeWelcomeEmailOptions): string {
  return brandWrap(`
    ${emailLabel('Welcome Aboard')}
    ${emailHeading(`Welcome,<br/><span style="color: ${BRAND.neon};">${options.firstName}!</span>`)}

    ${emailParagraph(`Congratulations! Your account for the <strong style="color: ${BRAND.neon};">${options.territoryName}</strong> territory has been activated.`)}
    ${emailParagraph('You can now access your licensee portal to manage camps, registrations, and more.')}

    ${emailButton('Go to Portal', options.loginUrl)}
  `)
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
  const subject = options.subject || `Welcome to Empowered Sports Camp - ${territoryName}`

  const result = await sendEmail({
    to,
    subject,
    html: generateLicenseeWelcomeHtml(options),
  })

  await logEmail({
    toEmail: to,
    subject,
    emailType: 'welcome',
    status: result.success ? 'sent' : 'failed',
    providerMessageId: result.messageId,
    errorMessage: result.error,
  })

  if (!result.success) {
    console.error('Email send error:', result.error)
  }

  return result
}

/**
 * Check if email service is configured
 */
export { isEmailConfigured }

// ============================================
// CIT Program Email Functions
// ============================================

// Admin notification email address for CIT applications
const CIT_NOTIFICATIONS_EMAIL = process.env.CIT_NOTIFICATIONS_EMAIL || ''

/**
 * Generate HTML email template for CIT applicant confirmation
 */
function generateCitApplicantConfirmationHtml(applicantName: string): string {
  const F = `font-family: 'Poppins', Arial, sans-serif;`
  return brandWrap(`
    ${emailLabel('Application Received', BRAND.magenta)}
    ${emailHeading(`CIT Application<br/><span style="color: ${BRAND.magenta};">Received!</span>`)}

    ${emailParagraph(`Hi ${applicantName},`)}
    ${emailParagraph(`Thank you for applying to our <strong style="color: ${BRAND.magenta};">Coaches-In-Training (CIT) Program</strong>! We're excited that you're interested in becoming a leader and role model for young athletes.`)}
    ${emailParagraph(`We've received your application and our team will review it shortly. Here's what happens next:`)}

    <table cellpadding="0" cellspacing="0" style="margin: 0 0 24px; width: 100%;">
      <tr>
        <td style="background-color: rgba(255,45,206,0.06); border-left: 3px solid ${BRAND.magenta}; border-radius: 0 6px 6px 0; padding: 20px;">
          <ol style="margin: 0; padding-left: 20px; color: ${BRAND.textSecondary}; font-size: 14px; line-height: 2.2; ${F}">
            <li><strong style="color: ${BRAND.textPrimary};">Application Review</strong> — Our team reviews your application</li>
            <li><strong style="color: ${BRAND.textPrimary};">Interview</strong> — If selected, we'll reach out to schedule a brief interview</li>
            <li><strong style="color: ${BRAND.textPrimary};">Training</strong> — Complete our CIT training modules</li>
            <li><strong style="color: ${BRAND.textPrimary};">Camp Assignment</strong> — Get matched with a camp that fits your schedule</li>
          </ol>
        </td>
      </tr>
    </table>

    ${emailParagraph(`We'll be in touch within the next 1-2 weeks. In the meantime, if you have any questions, feel free to reach out.`)}
    ${emailParagraph(`<strong style="color: ${BRAND.textPrimary};">— The Empowered Sports Camp Team</strong>`)}
  `, { accentColor: BRAND.magenta })
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
  const subject = 'Your CIT Application Has Been Received'

  const result = await sendEmail({
    to,
    subject,
    html: generateCitApplicantConfirmationHtml(applicantName),
    text: generateCitApplicantConfirmationText(applicantName),
  })

  await logEmail({
    toEmail: to,
    subject,
    emailType: 'cit_application',
    status: result.success ? 'sent' : 'failed',
    providerMessageId: result.messageId,
    errorMessage: result.error,
  })

  if (!result.success) {
    console.error('Email send error (CIT applicant):', result.error)
  }

  return result
}

/**
 * Generate HTML email template for CIT admin notification
 */
function generateCitAdminNotificationHtml(application: CitApplicationEmailData): string {
  return brandWrap(`
    ${emailLabel('New Application', BRAND.magenta)}
    ${emailHeading(`New CIT<br/><span style="color: ${BRAND.magenta};">Application</span>`)}

    ${emailParagraph('A new CIT application has been submitted. Here are the details:')}

    ${emailDetailsCard([
      { label: 'Name', value: `${application.firstName} ${application.lastName}` },
      { label: 'Email', value: application.email },
      { label: 'Phone', value: application.phone || 'Not provided' },
    ], 'Applicant Info', BRAND.magenta)}

    ${emailDetailsCard([
      { label: 'School', value: application.schoolName || 'Not provided' },
      { label: 'Grade', value: application.gradeLevel || 'Not provided' },
      { label: 'Sports', value: application.sportsPlayed || 'Not provided' },
    ], 'School & Sports', BRAND.magenta)}

    ${emailDetailsCard([
      { label: 'Name', value: application.parentName || 'Not provided' },
      { label: 'Email', value: application.parentEmail || 'Not provided' },
    ], 'Parent/Guardian', BRAND.magenta)}

    ${application.whyCit ? emailCallout(`<strong style="color: ${BRAND.magenta};">Why They Want to Be a CIT:</strong> ${application.whyCit}`, 'purple') : ''}

    ${emailParagraph('Log in to the admin portal to review and process this application.')}
  `, { accentColor: BRAND.magenta })
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

  const subject = `New CIT Application - ${application.firstName} ${application.lastName}`

  const result = await sendEmail({
    to: CIT_NOTIFICATIONS_EMAIL,
    subject,
    html: generateCitAdminNotificationHtml(application),
    text: generateCitAdminNotificationText(application),
  })

  await logEmail({
    toEmail: CIT_NOTIFICATIONS_EMAIL,
    subject,
    emailType: 'cit_application',
    status: result.success ? 'sent' : 'failed',
    providerMessageId: result.messageId,
    errorMessage: result.error,
  })

  if (!result.success) {
    console.error('Email send error (CIT admin notification):', result.error)
  }

  return result
}

/**
 * Check if CIT notifications are fully configured
 */
export function isCitNotificationsConfigured(): boolean {
  return isEmailConfigured() && !!process.env.CIT_NOTIFICATIONS_EMAIL
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
  return brandWrap(`
    ${emailLabel('Squad Invite', BRAND.purple)}
    ${emailHeading(`Join the<br/><span style="color: ${BRAND.purple};">Squad!</span>`)}

    ${emailParagraph(`<strong style="color: ${BRAND.textPrimary};">${options.inviterName}</strong> has invited you to have your athletes grouped together at <strong style="color: ${BRAND.purple};">${options.campName}</strong>.`)}
    ${emailParagraph(`With our "Build Her Squad" feature, you can keep friends together during camp activities. Create an account to accept the invite and register your athletes.`)}

    ${emailButton('Sign Up & Join Squad', options.signupUrl, BRAND.purple)}
    ${emailFallbackUrl(options.signupUrl)}

    <p style="margin: 16px 0 0; color: ${BRAND.textMuted}; font-size: 13px; font-family: 'Poppins', Arial, sans-serif;">This invite will expire in 30 days.</p>
  `, { accentColor: BRAND.purple })
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
  const subject = `${inviterName} invited you to join their squad!`

  const result = await sendEmail({
    to,
    subject,
    html: generateSquadInviteHtml(options),
    text: generateSquadInviteText(options),
  })

  await logEmail({
    toEmail: to,
    subject,
    emailType: 'system_alert',
    status: result.success ? 'sent' : 'failed',
    providerMessageId: result.messageId,
    errorMessage: result.error,
  })

  if (!result.success) {
    console.error('Email send error (squad invite):', result.error)
  }

  return result
}

// ============================================
// Camp Invite (Invite a Friend) Email Functions
// ============================================

export interface CampInviteEmailOptions {
  to: string
  inviterName: string
  friendName: string
  campName: string
  campDates: string
  campLocation: string | null
  registerUrl: string
}

function generateCampInviteHtml(options: CampInviteEmailOptions): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.empoweredsportscamp.com'
  const logoUrl = `${baseUrl}/images/logo.png`

  const locationBlock = options.campLocation
    ? `<tr>
                        <td style="padding: 0 0 0 28px; color: rgba(255,255,255,0.6); font-size: 14px; font-family: 'Poppins', Arial, sans-serif;">
                          <span style="color: #FF2DCE;">&#9679;</span>&nbsp; ${options.campLocation}
                        </td>
                      </tr>
                      <tr><td style="height: 6px;"></td></tr>`
    : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.inviterName} invited you to register for ${options.campName}!</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; overflow: hidden;">

          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding: 36px 40px 24px; background: linear-gradient(135deg, rgba(204,255,0,0.06) 0%, rgba(111,0,216,0.06) 100%);">
              <img src="${logoUrl}" alt="Empowered Sports Camp" width="180" style="display: block; max-width: 180px; height: auto;" />
            </td>
          </tr>

          <!-- Accent Bar -->
          <tr>
            <td style="height: 3px; background: linear-gradient(90deg, #CCFF00, #FF2DCE, #6F00D8);"></td>
          </tr>

          <!-- Hero Section -->
          <tr>
            <td style="padding: 40px 40px 0;">
              <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; color: #FF2DCE; font-family: 'Poppins', Arial, sans-serif;">
                You&rsquo;re Invited
              </p>
              <h1 style="margin: 0 0 24px; color: #ffffff; font-size: 26px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; line-height: 1.2; font-family: 'Poppins', Arial, sans-serif;">
                Join Us at<br/><span style="color: #CCFF00;">${options.campName}</span>
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <p style="margin: 0 0 24px; color: rgba(255,255,255,0.75); font-size: 16px; line-height: 1.7; font-family: 'Poppins', Arial, sans-serif;">
                <strong style="color: #ffffff;">${options.inviterName}</strong> thinks your athlete would love this camp — and wants to squad up! Register now so they can train, compete, and build confidence together.
              </p>

              <!-- Camp Details Card -->
              <table cellpadding="0" cellspacing="0" style="margin: 0 0 32px; width: 100%; border-radius: 6px; overflow: hidden;">
                <tr>
                  <td style="background-color: rgba(204,255,0,0.06); border: 1px solid rgba(204,255,0,0.15); border-radius: 6px; padding: 20px 24px;">
                    <table cellpadding="0" cellspacing="0" style="width: 100%;">
                      <tr>
                        <td style="padding: 0 0 12px; color: #CCFF00; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; font-family: 'Poppins', Arial, sans-serif;">
                          Camp Details
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 0 28px; color: #ffffff; font-size: 17px; font-weight: 700; font-family: 'Poppins', Arial, sans-serif;">
                          <span style="color: #CCFF00;">&#9679;</span>&nbsp; ${options.campName}
                        </td>
                      </tr>
                      <tr><td style="height: 6px;"></td></tr>
                      <tr>
                        <td style="padding: 0 0 0 28px; color: rgba(255,255,255,0.6); font-size: 14px; font-family: 'Poppins', Arial, sans-serif;">
                          <span style="color: #FF2DCE;">&#9679;</span>&nbsp; ${options.campDates}
                        </td>
                      </tr>
                      <tr><td style="height: 6px;"></td></tr>
                      ${locationBlock}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto 32px; width: 100%;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color: #CCFF00; padding: 16px 48px; border-radius: 4px;">
                          <a href="${options.registerUrl}" style="color: #000000; text-decoration: none; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; font-family: 'Poppins', Arial, sans-serif; display: inline-block;">
                            Register Your Athlete
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Squad Callout -->
              <table cellpadding="0" cellspacing="0" style="margin: 0 0 32px; width: 100%;">
                <tr>
                  <td style="background-color: rgba(111,0,216,0.08); border: 1px solid rgba(111,0,216,0.2); border-radius: 6px; padding: 16px 20px;">
                    <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 13px; line-height: 1.6; font-family: 'Poppins', Arial, sans-serif;">
                      <span style="color: #6F00D8; font-weight: 700;">BUILD HER SQUAD</span> &mdash; When you register, your athletes will be grouped together during camp activities. Best friends stick together!
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px; color: rgba(255,255,255,0.35); font-size: 12px; font-family: 'Poppins', Arial, sans-serif;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0; color: #CCFF00; font-size: 12px; word-break: break-all; font-family: 'Poppins', Arial, sans-serif;">
                <a href="${options.registerUrl}" style="color: #CCFF00; text-decoration: underline;">${options.registerUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid rgba(255,255,255,0.06); background-color: rgba(0,0,0,0.4);">
              <table cellpadding="0" cellspacing="0" style="width: 100%;">
                <tr>
                  <td align="center" style="padding: 0 0 12px;">
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.25); font-family: 'Poppins', Arial, sans-serif;">
                      Unleash Your Inner Champion
                    </span>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; color: rgba(255,255,255,0.25); font-size: 11px; font-family: 'Poppins', Arial, sans-serif;">
                      &copy; ${new Date().getFullYear()} Empowered Sports Camp. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
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

function generateCampInviteText(options: CampInviteEmailOptions): string {
  const greeting = options.friendName ? `Hi ${options.friendName},` : 'Hi there,'
  return `
${greeting}

${options.inviterName} thinks your athlete would love ${options.campName}!

Camp Details:
- Dates: ${options.campDates}${options.campLocation ? `\n- Location: ${options.campLocation}` : ''}

Register your athlete here: ${options.registerUrl}

---
Empowered Sports Camp
  `.trim()
}

export async function sendCampInviteEmail(
  options: CampInviteEmailOptions
): Promise<EmailResult> {
  const { to, inviterName, friendName, campName, campDates, campLocation, registerUrl } = options
  const subject = `${inviterName} invited you to register for ${campName}!`

  const result = await sendEmail({
    to,
    subject,
    html: generateCampInviteHtml(options),
    text: generateCampInviteText(options),
  })

  await logEmail({
    toEmail: to,
    subject,
    emailType: 'camp_invite',
    status: result.success ? 'sent' : 'failed',
    providerMessageId: result.messageId,
    errorMessage: result.error,
  })

  if (!result.success) {
    console.error('Email send error (camp invite):', result.error)
  }

  return result
}
