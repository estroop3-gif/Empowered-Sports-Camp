/**
 * Waitlist Email Templates
 *
 * Handles all waitlist-related email communications:
 * - Waitlist confirmation (when parent joins waitlist)
 * - Waitlist offer (when a spot opens)
 * - Waitlist offer expired (when offer times out)
 * - Nearby camps (alternative camp suggestions)
 */

import { sendEmail, logEmail } from './resend-client'
import type { EmailType } from '@/generated/prisma'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://empoweredsportscamp.com'

// Shared email styles matching the existing brand
const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
  .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
  .header { background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); color: #ffffff; padding: 30px 40px; text-align: center; }
  .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px; }
  .header .tagline { color: #00ff88; font-size: 12px; letter-spacing: 2px; margin-top: 8px; text-transform: uppercase; }
  .content { padding: 40px; color: #333333; line-height: 1.6; }
  .content h2 { color: #000000; margin-top: 0; font-size: 22px; }
  .content h3 { color: #000000; margin-top: 24px; font-size: 18px; }
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
  .info-box { background: #E0F2FE; border-left: 4px solid #0EA5E9; padding: 16px; margin: 16px 0; border-radius: 4px; }
  .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 16px 0; border-radius: 4px; }
  .purple-box { background: #8B5CF620; border-left: 4px solid #8B5CF6; padding: 16px; margin: 16px 0; border-radius: 4px; }
  .camp-card { background: #f8f8f8; border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; margin: 12px 0; }
  .camp-card h4 { margin: 0 0 8px; color: #000; }
  .camp-card .meta { color: #666; font-size: 14px; }
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

// ============================================================================
// WAITLIST CONFIRMATION
// ============================================================================

export async function sendWaitlistConfirmationEmail(params: {
  parentEmail: string
  parentFirstName: string
  camperFirstName: string
  campName: string
  campDates: string
  location: string
  waitlistPosition: number
  tenantId?: string | null
  userId?: string | null
}): Promise<void> {
  const { parentEmail, parentFirstName, camperFirstName, campName, campDates, location, waitlistPosition, tenantId, userId } = params

  const subject = `You're on the waitlist for ${campName}!`
  const html = wrapInLayout(`
    <h2>You're On the Waitlist!</h2>
    <p>Hi ${parentFirstName},</p>
    <p>We've added <strong>${camperFirstName}</strong> to the waitlist for <strong>${campName}</strong>. While the camp is currently full, spots do open up!</p>

    <div class="highlight">
      <strong>Waitlist Position: #${waitlistPosition}</strong>
    </div>

    <div class="details">
      <div class="details-row"><span class="details-label">Camper</span><span class="details-value">${camperFirstName}</span></div>
      <div class="details-row"><span class="details-label">Camp</span><span class="details-value">${campName}</span></div>
      <div class="details-row"><span class="details-label">Dates</span><span class="details-value">${campDates}</span></div>
      <div class="details-row"><span class="details-label">Location</span><span class="details-value">${location}</span></div>
    </div>

    <h3>How It Works</h3>
    <div class="info-box">
      <p style="margin: 0;">When a spot opens, we'll email you with a <strong>48-hour window</strong> to complete your registration and payment. If you don't respond in time, the spot will be offered to the next person in line.</p>
    </div>

    <p>In the meantime, check out our other available camps!</p>
    <p style="text-align: center;">
      <a href="${APP_URL}/camps" class="button">Browse Available Camps</a>
    </p>

    <p>Thank you for your interest in Empowered Athletes!</p>
  `)

  const result = await sendEmail({ to: parentEmail, subject, html })

  await logEmail({
    tenantId,
    userId,
    toEmail: parentEmail,
    subject,
    emailType: 'waitlist_confirmation' as EmailType,
    payload: { camperFirstName, campName, waitlistPosition },
    providerMessageId: result.messageId,
    status: result.success ? 'sent' : 'failed',
    errorMessage: result.error,
  })
}

// ============================================================================
// WAITLIST OFFER
// ============================================================================

export async function sendWaitlistOfferEmail(params: {
  parentEmail: string
  parentFirstName: string
  camperFirstName: string
  campName: string
  campDates: string
  location: string
  price: string
  offerExpiresAt: string
  acceptUrl: string
  declineUrl: string
  tenantId?: string | null
  userId?: string | null
}): Promise<void> {
  const { parentEmail, parentFirstName, camperFirstName, campName, campDates, location, price, offerExpiresAt, acceptUrl, declineUrl, tenantId, userId } = params

  const subject = `A spot opened at ${campName} — complete your registration!`
  const html = wrapInLayout(`
    <h2>Great News — A Spot Opened!</h2>
    <p>Hi ${parentFirstName},</p>
    <p>A spot has become available for <strong>${camperFirstName}</strong> at <strong>${campName}</strong>!</p>

    <div class="highlight">
      <strong>You have 48 hours to claim this spot</strong>
    </div>

    <div class="details">
      <div class="details-row"><span class="details-label">Camper</span><span class="details-value">${camperFirstName}</span></div>
      <div class="details-row"><span class="details-label">Camp</span><span class="details-value">${campName}</span></div>
      <div class="details-row"><span class="details-label">Dates</span><span class="details-value">${campDates}</span></div>
      <div class="details-row"><span class="details-label">Location</span><span class="details-value">${location}</span></div>
      <div class="details-row"><span class="details-label">Price</span><span class="details-value">${price}</span></div>
      <div class="details-row"><span class="details-label">Offer Expires</span><span class="details-value">${offerExpiresAt}</span></div>
    </div>

    <p style="text-align: center;">
      <a href="${acceptUrl}" class="button">Complete Registration & Pay</a>
    </p>

    <div class="warning-box">
      <strong>Important:</strong> This offer expires on <strong>${offerExpiresAt}</strong>. If you don't complete payment by then, the spot will be offered to the next person on the waitlist.
    </div>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${declineUrl}" style="color: #666; font-size: 14px;">No thanks, remove me from the waitlist</a>
    </p>
  `)

  const result = await sendEmail({ to: parentEmail, subject, html })

  await logEmail({
    tenantId,
    userId,
    toEmail: parentEmail,
    subject,
    emailType: 'waitlist_offer' as EmailType,
    payload: { camperFirstName, campName, price, offerExpiresAt },
    providerMessageId: result.messageId,
    status: result.success ? 'sent' : 'failed',
    errorMessage: result.error,
  })
}

// ============================================================================
// WAITLIST OFFER EXPIRED
// ============================================================================

export async function sendWaitlistOfferExpiredEmail(params: {
  parentEmail: string
  parentFirstName: string
  camperFirstName: string
  campName: string
  tenantId?: string | null
  userId?: string | null
}): Promise<void> {
  const { parentEmail, parentFirstName, camperFirstName, campName, tenantId, userId } = params

  const subject = `Your spot offer for ${campName} has expired`
  const html = wrapInLayout(`
    <h2>Offer Expired</h2>
    <p>Hi ${parentFirstName},</p>
    <p>Unfortunately, the 48-hour window to claim the spot for <strong>${camperFirstName}</strong> at <strong>${campName}</strong> has expired. The spot has been offered to the next person on the waitlist.</p>

    <div class="info-box">
      <p style="margin: 0;">You've been moved to the back of the waitlist. If another spot opens up, we'll send you a new offer.</p>
    </div>

    <p>In the meantime, check out other available camps near you:</p>
    <p style="text-align: center;">
      <a href="${APP_URL}/camps" class="button">Browse Available Camps</a>
    </p>
  `)

  const result = await sendEmail({ to: parentEmail, subject, html })

  await logEmail({
    tenantId,
    userId,
    toEmail: parentEmail,
    subject,
    emailType: 'waitlist_offer_expired' as EmailType,
    payload: { camperFirstName, campName },
    providerMessageId: result.messageId,
    status: result.success ? 'sent' : 'failed',
    errorMessage: result.error,
  })
}

// ============================================================================
// NEARBY CAMPS
// ============================================================================

export interface NearbyCampInfo {
  name: string
  dates: string
  location: string
  spotsLeft: number
  registerUrl: string
}

export async function sendNearbyCampsEmail(params: {
  parentEmail: string
  parentFirstName: string
  camps: NearbyCampInfo[]
  tenantId?: string | null
  userId?: string | null
}): Promise<void> {
  const { parentEmail, parentFirstName, camps, tenantId, userId } = params

  if (camps.length === 0) return

  const campCards = camps.map(camp => `
    <div class="camp-card">
      <h4>${camp.name}</h4>
      <div class="meta">${camp.dates} &bull; ${camp.location} &bull; ${camp.spotsLeft} spots left</div>
      <p style="margin: 8px 0 0;"><a href="${camp.registerUrl}" style="color: #00ff88; font-weight: 600;">Register Now</a></p>
    </div>
  `).join('')

  const subject = 'More camps available near you!'
  const html = wrapInLayout(`
    <h2>More Camps Available!</h2>
    <p>Hi ${parentFirstName},</p>
    <p>While you're on the waitlist, here are some other camps with open spots:</p>

    ${campCards}

    <p style="text-align: center; margin-top: 24px;">
      <a href="${APP_URL}/camps" class="button">View All Camps</a>
    </p>
  `)

  const result = await sendEmail({ to: parentEmail, subject, html })

  await logEmail({
    tenantId,
    userId,
    toEmail: parentEmail,
    subject,
    emailType: 'waitlist_nearby_camps' as EmailType,
    payload: { campCount: camps.length },
    providerMessageId: result.messageId,
    status: result.success ? 'sent' : 'failed',
    errorMessage: result.error,
  })
}
