/**
 * Role Invite Email Templates
 *
 * Sends branded invite emails for all role types using Resend.
 */

import { sendEmail, logEmail } from './resend-client'
import { UserRole } from '@/generated/prisma'
import {
  brandWrap,
  BRAND,
  emailLabel,
  emailHeading,
  emailParagraph,
  emailButton,
  emailCallout,
  emailFallbackUrl,
} from './brand-layout'

// Role display names and descriptions
const ROLE_INFO: Record<string, { name: string; description: string; color: string }> = {
  licensee_owner: {
    name: 'Licensee Owner',
    description: 'Run your own Empowered Sports Camp franchise in your territory',
    color: BRAND.neon,
  },
  director: {
    name: 'Camp Director',
    description: 'Lead and manage camp sessions, oversee staff and campers',
    color: BRAND.magenta,
  },
  coach: {
    name: 'Coach',
    description: 'Coach young athletes and help them develop their skills',
    color: BRAND.purple,
  },
  cit_volunteer: {
    name: 'CIT Volunteer',
    description: 'Join our Coaches-in-Training program and develop leadership skills',
    color: BRAND.warning,
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
    color: BRAND.neon,
  }

  const expiryDate = options.expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return brandWrap(`
    ${emailLabel("You're Invited", roleInfo.color)}
    ${emailHeading(`Join Us as a<br/><span style="color: ${roleInfo.color};">${roleInfo.name}</span>`)}

    ${emailParagraph(`Hi ${options.firstName || 'there'},`)}
    ${emailParagraph(`<strong style="color: ${BRAND.textPrimary};">${options.inviterName}</strong> has invited you to join <strong style="color: ${BRAND.textPrimary};">Empowered Sports Camp</strong> as a <strong style="color: ${roleInfo.color};">${roleInfo.name}</strong>.`)}

    ${emailCallout(roleInfo.description, 'purple')}

    ${emailParagraph('Click the button below to accept your invitation and create your account:')}

    ${emailButton('Accept Invitation', options.inviteUrl, roleInfo.color)}

    ${emailFallbackUrl(options.inviteUrl)}

    <p style="margin: 16px 0 0; color: ${BRAND.textMuted}; font-size: 13px; font-family: 'Poppins', Arial, sans-serif;">This invitation expires on ${expiryDate}.</p>
  `, { accentColor: roleInfo.color })
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
