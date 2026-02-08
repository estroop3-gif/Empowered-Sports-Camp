/**
 * Role Invite Email Templates
 *
 * Sends branded invite emails for all role types using Resend.
 */

import { sendEmail, logEmail } from './resend-client'
import { UserRole } from '@/generated/prisma'

// Role display names and descriptions
const ROLE_INFO: Record<string, { name: string; description: string; color: string }> = {
  licensee_owner: {
    name: 'Licensee Owner',
    description: 'Run your own Empowered Sports Camp franchise in your territory',
    color: '#00ff88', // neon green
  },
  director: {
    name: 'Camp Director',
    description: 'Lead and manage camp sessions, oversee staff and campers',
    color: '#d946ef', // magenta
  },
  coach: {
    name: 'Coach',
    description: 'Coach young athletes and help them develop their skills',
    color: '#8b5cf6', // purple
  },
  cit_volunteer: {
    name: 'CIT Volunteer',
    description: 'Join our Coaches-in-Training program and develop leadership skills',
    color: '#f59e0b', // amber
  },
}

export interface RoleInviteEmailOptions {
  to: string
  firstName: string
  lastName: string
  targetRole: UserRole
  inviterName: string
  inviteUrl: string
  expiresAt: Date
  tenantName?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Generate HTML email template for role invite
 */
function generateRoleInviteHtml(options: RoleInviteEmailOptions): string {
  const roleInfo = ROLE_INFO[options.targetRole] || {
    name: options.targetRole,
    description: 'Join our team',
    color: '#00ff88',
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to Join Empowered Sports Camp</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Poppins', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; border: 1px solid rgba(255,255,255,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; border-bottom: 2px solid ${roleInfo.color};">
              <h1 style="margin: 0; color: ${roleInfo.color}; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">
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
                <strong style="color: #ffffff;">${options.inviterName}</strong> has invited you to join
                <strong style="color: #ffffff;">Empowered Sports Camp</strong> as a
                <strong style="color: ${roleInfo.color};">${roleInfo.name}</strong>.
              </p>

              <div style="margin: 0 0 30px; padding: 20px; background-color: rgba(255,255,255,0.05); border-left: 3px solid ${roleInfo.color};">
                <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 14px; line-height: 1.6;">
                  ${roleInfo.description}
                </p>
              </div>

              <p style="margin: 0 0 30px; color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6;">
                Click the button below to accept your invitation and create your account:
              </p>

              <table cellpadding="0" cellspacing="0" style="margin: 0 0 30px;">
                <tr>
                  <td style="background-color: ${roleInfo.color}; padding: 16px 32px;">
                    <a href="${options.inviteUrl}" style="color: #000000; text-decoration: none; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px; color: rgba(255,255,255,0.5); font-size: 14px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 30px; color: ${roleInfo.color}; font-size: 14px; word-break: break-all;">
                ${options.inviteUrl}
              </p>

              <p style="margin: 0; color: rgba(255,255,255,0.5); font-size: 14px;">
                This invitation expires on ${options.expiresAt.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}.
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
 * Generate plain text email for role invite
 */
function generateRoleInviteText(options: RoleInviteEmailOptions): string {
  const roleInfo = ROLE_INFO[options.targetRole] || {
    name: options.targetRole,
    description: 'Join our team',
  }

  return `
Hi ${options.firstName || 'there'},

${options.inviterName} has invited you to join Empowered Sports Camp as a ${roleInfo.name}.

${roleInfo.description}

Click the link below to accept your invitation and create your account:

${options.inviteUrl}

This invitation expires on ${options.expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })}.

---
Empowered Sports Camp
  `.trim()
}

/**
 * Send role invite email
 */
export async function sendRoleInviteEmail(
  options: RoleInviteEmailOptions
): Promise<EmailResult> {
  const roleInfo = ROLE_INFO[options.targetRole] || { name: options.targetRole }
  const subject = `You're Invited to Join Empowered Sports Camp as ${roleInfo.name}`

  const result = await sendEmail({
    to: options.to,
    subject,
    html: generateRoleInviteHtml(options),
    text: generateRoleInviteText(options),
  })

  await logEmail({
    toEmail: options.to,
    subject,
    emailType: 'system_alert',
    status: result.success ? 'sent' : 'failed',
    providerMessageId: result.messageId,
    errorMessage: result.error,
  })

  if (!result.success) {
    console.error('Email send error:', result.error)
  }

  return result
}
