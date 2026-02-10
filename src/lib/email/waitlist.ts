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
import {
  brandWrap,
  BRAND,
  APP_URL,
  emailLabel,
  emailHeading,
  emailSubheading,
  emailParagraph,
  emailButton,
  emailDetailsCard,
  emailHighlight,
  emailCallout,
} from './brand-layout'

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
  const html = brandWrap(`
    ${emailLabel("You're on the list")}
    ${emailHeading(`Waitlist<br/><span style="color: ${BRAND.neon};">Confirmed</span>`)}

    ${emailParagraph(`Hi ${parentFirstName},`)}
    ${emailParagraph(`We've added <strong style="color: ${BRAND.textPrimary};">${camperFirstName}</strong> to the waitlist for <strong style="color: ${BRAND.neon};">${campName}</strong>. While the camp is currently full, spots do open up!`)}

    ${emailHighlight(`Waitlist Position: #${waitlistPosition}`)}

    ${emailDetailsCard([
      { label: 'Camper', value: camperFirstName },
      { label: 'Camp', value: campName },
      { label: 'Dates', value: campDates },
      { label: 'Location', value: location },
    ], 'Details')}

    ${emailSubheading('How It Works')}
    ${emailCallout(`When a spot opens, we'll email you with a <strong style="color: ${BRAND.textPrimary};">48-hour window</strong> to complete your registration and payment. If you don't respond in time, the spot will be offered to the next person in line.`)}

    ${emailParagraph('In the meantime, check out our other available camps!')}
    ${emailButton('Browse Available Camps', `${APP_URL}/camps`)}

    ${emailParagraph('Thank you for your interest in Empowered Sports Camp!')}
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
  const html = brandWrap(`
    ${emailLabel('Great News')}
    ${emailHeading(`A Spot<br/><span style="color: ${BRAND.neon};">Opened Up!</span>`)}

    ${emailParagraph(`Hi ${parentFirstName},`)}
    ${emailParagraph(`A spot has become available for <strong style="color: ${BRAND.textPrimary};">${camperFirstName}</strong> at <strong style="color: ${BRAND.neon};">${campName}</strong>!`)}

    ${emailHighlight('You have 48 hours to claim this spot', BRAND.magenta)}

    ${emailDetailsCard([
      { label: 'Camper', value: camperFirstName },
      { label: 'Camp', value: campName },
      { label: 'Dates', value: campDates },
      { label: 'Location', value: location },
      { label: 'Price', value: price },
      { label: 'Offer Expires', value: offerExpiresAt },
    ], 'Spot Details')}

    ${emailButton('Complete Registration & Pay', acceptUrl)}

    ${emailCallout(`<strong style="color: ${BRAND.textPrimary};">Important:</strong> This offer expires on <strong style="color: ${BRAND.textPrimary};">${offerExpiresAt}</strong>. If you don't complete payment by then, the spot will be offered to the next person on the waitlist.`, 'warning')}

    <p style="text-align: center; margin-top: 24px;">
      <a href="${declineUrl}" style="color: ${BRAND.textMuted}; font-size: 13px; text-decoration: underline; font-family: 'Poppins', Arial, sans-serif;">No thanks, remove me from the waitlist</a>
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
  const html = brandWrap(`
    ${emailLabel('Offer Expired')}
    ${emailHeading('Offer Expired')}

    ${emailParagraph(`Hi ${parentFirstName},`)}
    ${emailParagraph(`Unfortunately, the 48-hour window to claim the spot for <strong style="color: ${BRAND.textPrimary};">${camperFirstName}</strong> at <strong style="color: ${BRAND.neon};">${campName}</strong> has expired. The spot has been offered to the next person on the waitlist.`)}

    ${emailCallout(`You've been moved to the back of the waitlist. If another spot opens up, we'll send you a new offer.`)}

    ${emailParagraph('In the meantime, check out other available camps near you:')}
    ${emailButton('Browse Available Camps', `${APP_URL}/camps`)}
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

  const F = `font-family: 'Poppins', Arial, sans-serif;`
  const campCards = camps.map(camp => `
    <table cellpadding="0" cellspacing="0" style="margin: 8px 0; width: 100%;">
      <tr>
        <td style="background-color: rgba(255,255,255,0.03); border: 1px solid ${BRAND.borderSubtle}; border-radius: 6px; padding: 16px 20px;">
          <p style="margin: 0 0 6px; color: ${BRAND.textPrimary}; font-size: 15px; font-weight: 700; ${F}">${camp.name}</p>
          <p style="margin: 0 0 8px; color: ${BRAND.textMuted}; font-size: 13px; ${F}">${camp.dates} &bull; ${camp.location} &bull; ${camp.spotsLeft} spots left</p>
          <a href="${camp.registerUrl}" style="color: ${BRAND.neon}; font-weight: 700; font-size: 13px; text-decoration: none; text-transform: uppercase; letter-spacing: 1px; ${F}">Register Now &rarr;</a>
        </td>
      </tr>
    </table>
  `).join('')

  const subject = 'More camps available near you!'
  const html = brandWrap(`
    ${emailLabel('More Options')}
    ${emailHeading(`Camps<br/><span style="color: ${BRAND.neon};">Near You</span>`)}

    ${emailParagraph(`Hi ${parentFirstName},`)}
    ${emailParagraph(`While you're on the waitlist, here are some other camps with open spots:`)}

    ${campCards}

    ${emailButton('View All Camps', `${APP_URL}/camps`)}
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
