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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://empoweredsportscamp.com'

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
  .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
  .header { background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); color: #ffffff; padding: 30px 40px; text-align: center; }
  .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px; }
  .header .tagline { color: #00ff88; font-size: 12px; letter-spacing: 2px; margin-top: 8px; text-transform: uppercase; }
  .content { padding: 40px; color: #333333; line-height: 1.6; }
  .content h2 { color: #000000; margin-top: 0; font-size: 22px; }
  .content p { margin: 16px 0; }
  .highlight { background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%); color: #000000; padding: 20px; border-radius: 8px; margin: 24px 0; text-align: center; }
  .highlight strong { font-size: 18px; }
  .button { display: inline-block; background: #00ff88; color: #000000 !important; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; margin: 20px 0; }
  .details { background: #f8f8f8; padding: 20px; border-radius: 8px; margin: 24px 0; }
  .details-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eeeeee; }
  .details-row:last-child { border-bottom: none; }
  .details-label { color: #666666; font-weight: 500; }
  .details-value { color: #000000; font-weight: 600; text-align: right; }
  .footer { background: #1a1a1a; color: #888888; padding: 30px 40px; text-align: center; font-size: 12px; }
  .footer a { color: #00ff88; text-decoration: none; }
  .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 16px 0; border-radius: 4px; }
  .info-box { background: #E0F2FE; border-left: 4px solid #0EA5E9; padding: 16px; margin: 16px 0; border-radius: 4px; }
`

function wrapInLayout(bodyContent: string): string {
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1>EMPOWERED ATHLETES</h1>
      <div class="tagline">Build Her Confidence. Build Her Game.</div>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Empowered Sports Camp. All rights reserved.</p>
      <p><a href="${APP_URL}">Visit Our Website</a> | <a href="${APP_URL}/camps">Browse Camps</a></p>
    </div>
  </div>
</body>
</html>`
}

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

  const html = wrapInLayout(`
    <h2>Your Registration is Saved!</h2>
    <p>Hi ${firstName},</p>
    <p>We've saved your registration progress for <strong>${campName}</strong>. You can pick up right where you left off whenever you're ready.</p>

    <div class="details">
      <div class="details-row"><span class="details-label">Camp</span><span class="details-value">${campName}</span></div>
      <div class="details-row"><span class="details-label">Camper(s)</span><span class="details-value">${camperList}</span></div>
    </div>

    <div style="text-align: center;">
      <a href="${resumeUrl}" class="button">Continue Registration</a>
    </div>

    <div class="info-box">
      <strong>Your progress is saved for 30 days.</strong> Just click the button above to continue right where you left off.
    </div>

    <p style="color: #666;">You can also find your saved registration on your <a href="${APP_URL}/dashboard" style="color: #00ff88;">parent dashboard</a>.</p>
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

  const html = wrapInLayout(`
    <h2>Still Thinking It Over?</h2>
    <p>Hi ${firstName},</p>
    <p>We noticed you started registering <strong>${camperDisplay}</strong> for <strong>${campName}</strong> but didn't finish. No worries — your progress is still saved!</p>

    <p>Spots are filling up and we'd hate for ${camperDisplay} to miss out on an amazing camp experience.</p>

    <div style="text-align: center;">
      <a href="${resumeUrl}" class="button">Finish Registration</a>
    </div>

    <div class="info-box">
      <strong>Your saved registration will be kept for 30 days.</strong> Pick up right where you left off — no need to re-enter any information.
    </div>

    <p style="color: #666; font-size: 14px;">If you have any questions about the camp, feel free to <a href="${APP_URL}/contact" style="color: #00ff88;">reach out to us</a>. We're happy to help!</p>
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

  const html = wrapInLayout(`
    <h2>Don't Let This Opportunity Pass!</h2>
    <p>Hi ${firstName},</p>
    <p>This is a friendly reminder that your registration for <strong>${camperDisplay}</strong> at <strong>${campName}</strong> is still incomplete.</p>

    <div class="warning-box">
      <strong>Spots are limited!</strong> Camp sessions can fill up quickly. Complete your registration now to secure ${camperDisplay}'s spot.
    </div>

    <p>Everything you've already entered is saved — finishing takes just a few minutes.</p>

    <div style="text-align: center;">
      <a href="${resumeUrl}" class="button">Complete Registration Now</a>
    </div>

    <p style="color: #666; font-size: 14px;">If now isn't the right time, no worries. Your progress will be saved for 30 days. Browse other <a href="${APP_URL}/camps" style="color: #00ff88;">available camps</a> if you'd like to explore options.</p>
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
