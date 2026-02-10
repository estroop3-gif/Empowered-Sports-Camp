/**
 * Registration Draft Email Templates
 *
 * Emails for saved/abandoned registration drafts:
 * - Save confirmation (immediate)
 * - 24-hour gentle reminder
 * - 72-hour urgency reminder
 */

import { sendEmail, logEmail } from './resend-client'
import type { EmailType } from '@/generated/prisma'
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
} from './brand-layout'

function getResumeUrl(campSlug: string): string {
  return `${APP_URL}/register/${campSlug}?resume=true`
}

// ============================================================================
// SAVE CONFIRMATION (immediate)
// ============================================================================

export async function sendDraftSaveConfirmationEmail(params: {
  parentEmail: string
  parentName: string | null
  campName: string
  campSlug: string
  camperNames: string[]
}) {
  const { parentEmail, parentName, campName, campSlug, camperNames } = params
  const firstName = parentName?.split(' ')[0] || 'there'
  const resumeUrl = getResumeUrl(campSlug)
  const camperList = camperNames.length > 0 ? camperNames.join(', ') : 'your camper'

  const subject = "Your registration is saved! Continue when you're ready"

  const html = brandWrap(`
    ${emailLabel('Progress Saved')}
    ${emailHeading(`Registration<br/><span style="color: ${BRAND.neon};">Saved!</span>`)}

    ${emailParagraph(`Hi ${firstName},`)}
    ${emailParagraph(`We've saved your registration progress for <strong style="color: ${BRAND.neon};">${campName}</strong>. You can pick up right where you left off whenever you're ready.`)}

    ${emailDetailsCard([
      { label: 'Camp', value: campName },
      { label: 'Camper(s)', value: camperList },
    ], 'Saved Registration')}

    ${emailButton('Continue Registration', resumeUrl)}

    ${emailCallout(`<strong style="color: ${BRAND.textPrimary};">Your progress is saved for 30 days.</strong> Just click the button above to continue right where you left off.`)}

    <p style="margin: 0; color: ${BRAND.textMuted}; font-size: 13px; font-family: 'Poppins', Arial, sans-serif;">You can also find your saved registration on your <a href="${APP_URL}/dashboard" style="color: ${BRAND.neon}; text-decoration: underline;">parent dashboard</a>.</p>
  `)

  const text = `Hi ${firstName},\n\nYour registration for ${campName} has been saved. Continue where you left off: ${resumeUrl}\n\nCamper(s): ${camperList}\n\nYour progress is saved for 30 days.`

  const emailType: EmailType = 'draft_save_confirmation'

  const result = await sendEmail({ to: parentEmail, subject, html, text })
  await logEmail({
    toEmail: parentEmail,
    subject,
    emailType,
    status: result.success ? 'sent' : 'failed',
    providerMessageId: result.messageId,
    errorMessage: result.error,
  })

  return result
}

// ============================================================================
// 24-HOUR REMINDER (gentle)
// ============================================================================

export async function sendDraftReminder24hEmail(params: {
  parentEmail: string
  parentName: string | null
  campName: string
  campSlug: string
  camperNames: string[]
}) {
  const { parentEmail, parentName, campName, campSlug, camperNames } = params
  const firstName = parentName?.split(' ')[0] || 'there'
  const resumeUrl = getResumeUrl(campSlug)
  const camperDisplay = camperNames.length > 0 ? camperNames[0] : 'your camper'

  const subject = `Don't forget — ${camperDisplay}'s spot at ${campName}!`

  const html = brandWrap(`
    ${emailLabel('Friendly Reminder')}
    ${emailHeading(`Still Thinking<br/><span style="color: ${BRAND.neon};">It Over?</span>`)}

    ${emailParagraph(`Hi ${firstName},`)}
    ${emailParagraph(`We noticed you started registering <strong style="color: ${BRAND.textPrimary};">${camperDisplay}</strong> for <strong style="color: ${BRAND.neon};">${campName}</strong> but didn't finish. No worries — your progress is still saved!`)}
    ${emailParagraph(`Spots are filling up and we'd hate for ${camperDisplay} to miss out on an amazing camp experience.`)}

    ${emailButton('Finish Registration', resumeUrl)}

    ${emailCallout(`<strong style="color: ${BRAND.textPrimary};">Your saved registration will be kept for 30 days.</strong> Pick up right where you left off — no need to re-enter any information.`)}

    <p style="margin: 0; color: ${BRAND.textMuted}; font-size: 13px; font-family: 'Poppins', Arial, sans-serif;">If you have any questions about the camp, feel free to <a href="${APP_URL}/contact" style="color: ${BRAND.neon}; text-decoration: underline;">reach out to us</a>. We're happy to help!</p>
  `)

  const text = `Hi ${firstName},\n\nYou started registering ${camperDisplay} for ${campName} but didn't finish. Your progress is still saved!\n\nFinish registration: ${resumeUrl}\n\nSpots are filling up — don't miss out!`

  const emailType: EmailType = 'draft_reminder_24h'

  const result = await sendEmail({ to: parentEmail, subject, html, text })
  await logEmail({
    toEmail: parentEmail,
    subject,
    emailType,
    status: result.success ? 'sent' : 'failed',
    providerMessageId: result.messageId,
    errorMessage: result.error,
  })

  return result
}

// ============================================================================
// 72-HOUR REMINDER (urgency)
// ============================================================================

export async function sendDraftReminder72hEmail(params: {
  parentEmail: string
  parentName: string | null
  campName: string
  campSlug: string
  camperNames: string[]
}) {
  const { parentEmail, parentName, campName, campSlug, camperNames } = params
  const firstName = parentName?.split(' ')[0] || 'there'
  const resumeUrl = getResumeUrl(campSlug)
  const camperDisplay = camperNames.length > 0 ? camperNames[0] : 'your camper'

  const subject = `Last chance to complete ${camperDisplay}'s registration!`

  const html = brandWrap(`
    ${emailLabel("Don't Miss Out", BRAND.warning)}
    ${emailHeading(`Don't Let This<br/><span style="color: ${BRAND.magenta};">Opportunity Pass!</span>`)}

    ${emailParagraph(`Hi ${firstName},`)}
    ${emailParagraph(`This is a friendly reminder that your registration for <strong style="color: ${BRAND.textPrimary};">${camperDisplay}</strong> at <strong style="color: ${BRAND.neon};">${campName}</strong> is still incomplete.`)}

    ${emailCallout(`<strong style="color: ${BRAND.textPrimary};">Spots are limited!</strong> Camp sessions can fill up quickly. Complete your registration now to secure ${camperDisplay}'s spot.`, 'warning')}

    ${emailParagraph('Everything you\'ve already entered is saved — finishing takes just a few minutes.')}

    ${emailButton('Complete Registration Now', resumeUrl, BRAND.magenta)}

    <p style="margin: 0; color: ${BRAND.textMuted}; font-size: 13px; font-family: 'Poppins', Arial, sans-serif;">If now isn't the right time, no worries. Your progress will be saved for 30 days. Browse other <a href="${APP_URL}/camps" style="color: ${BRAND.neon}; text-decoration: underline;">available camps</a> if you'd like to explore options.</p>
  `)

  const text = `Hi ${firstName},\n\nYour registration for ${camperDisplay} at ${campName} is still incomplete. Spots are limited!\n\nComplete registration: ${resumeUrl}\n\nEverything you've entered is saved — finishing takes just a few minutes.`

  const emailType: EmailType = 'draft_reminder_72h'

  const result = await sendEmail({ to: parentEmail, subject, html, text })
  await logEmail({
    toEmail: parentEmail,
    subject,
    emailType,
    status: result.success ? 'sent' : 'failed',
    providerMessageId: result.messageId,
    errorMessage: result.error,
  })

  return result
}
