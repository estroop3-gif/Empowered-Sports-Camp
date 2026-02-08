/**
 * Waitlist Service
 *
 * Core business logic for the camp waitlist feature.
 * Handles joining, offering spots, accepting/declining, expiry, and reordering.
 */

import { prisma } from '@/lib/db/client'
import { createStripeCheckoutSession } from './payments'
import {
  sendWaitlistConfirmationEmail,
  sendWaitlistOfferEmail,
  sendWaitlistOfferExpiredEmail,
  sendNearbyCampsEmail,
  type NearbyCampInfo,
} from '@/lib/email/waitlist'
import { formatPrice } from '@/lib/utils'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://empoweredsportscamp.com'
const OFFER_EXPIRY_HOURS = 48

// ============================================================================
// JOIN WAITLIST
// ============================================================================

export interface JoinWaitlistParams {
  campId: string
  tenantId: string
  parentId: string
  athleteId: string
  basePriceCents: number
  discountCents: number
  promoDiscountCents?: number
  addonsTotalCents?: number
  taxCents?: number
  promoCodeId?: string | null
  shirtSize?: string | null
  specialConsiderations?: string | null
  friendRequests?: string[]
}

export interface JoinWaitlistResult {
  registrationId: string
  waitlistPosition: number
}

/**
 * Add a camper to the waitlist for a camp.
 * Creates a registration with status='waitlisted' and assigns a FIFO position.
 */
export async function joinWaitlist(params: JoinWaitlistParams): Promise<JoinWaitlistResult> {
  const {
    campId, tenantId, parentId, athleteId,
    basePriceCents, discountCents,
    promoDiscountCents = 0, addonsTotalCents = 0, taxCents = 0,
    promoCodeId, shirtSize, specialConsiderations, friendRequests,
  } = params

  // Validate camp is actually full
  const camp = await prisma.camp.findUnique({ where: { id: campId } })
  if (!camp) throw new Error('Camp not found')

  const activeCount = await prisma.registration.count({
    where: { campId, status: { in: ['confirmed', 'pending'] } },
  })

  if (camp.capacity && activeCount < camp.capacity) {
    throw new Error('Camp still has spots available — please register normally')
  }

  // Check if athlete is already registered or waitlisted
  const existing = await prisma.registration.findFirst({
    where: {
      campId,
      athleteId,
      status: { in: ['confirmed', 'pending', 'waitlisted'] },
    },
  })

  if (existing) {
    if (existing.status === 'waitlisted') {
      throw new Error('This athlete is already on the waitlist for this camp')
    }
    throw new Error('This athlete is already registered for this camp')
  }

  const totalPriceCents = basePriceCents - discountCents - promoDiscountCents + addonsTotalCents + taxCents

  // Assign next waitlist position
  const maxPosition = await prisma.registration.aggregate({
    where: { campId, status: 'waitlisted' },
    _max: { waitlistPosition: true },
  })
  const nextPosition = (maxPosition._max.waitlistPosition ?? 0) + 1

  // Generate a unique offer token
  const token = crypto.randomUUID()

  const registration = await prisma.registration.create({
    data: {
      tenantId,
      campId,
      athleteId,
      parentId,
      basePriceCents,
      discountCents,
      promoDiscountCents,
      addonsTotalCents,
      taxCents,
      totalPriceCents,
      promoCodeId,
      shirtSize,
      specialConsiderations,
      friendRequests: friendRequests || [],
      status: 'waitlisted',
      paymentStatus: 'pending',
      waitlistPosition: nextPosition,
      waitlistJoinedAt: new Date(),
      waitlistOfferToken: token,
    },
    include: {
      athlete: true,
      parent: true,
      camp: {
        include: {
          location: true,
          venue: true,
        },
      },
    },
  })

  // Send confirmation email
  const locationName = registration.camp.venue?.name
    || registration.camp.location?.name
    || 'TBD'
  const startDate = registration.camp.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endDate = registration.camp.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  sendWaitlistConfirmationEmail({
    parentEmail: registration.parent.email,
    parentFirstName: registration.parent.firstName || 'Parent',
    camperFirstName: registration.athlete.firstName,
    campName: registration.camp.name,
    campDates: `${startDate} - ${endDate}`,
    location: locationName,
    waitlistPosition: nextPosition,
    tenantId,
    userId: parentId,
  }).catch(err => console.error('[Waitlist] Confirmation email failed:', err))

  // Async: send nearby camps email
  sendNearbyCampsForRegistration(registration.id).catch(err =>
    console.error('[Waitlist] Nearby camps email failed:', err)
  )

  return {
    registrationId: registration.id,
    waitlistPosition: nextPosition,
  }
}

// ============================================================================
// GET WAITLIST DATA
// ============================================================================

export async function getWaitlistForCamp(campId: string) {
  const entries = await prisma.registration.findMany({
    where: { campId, status: 'waitlisted' },
    orderBy: { waitlistPosition: 'asc' },
    include: {
      athlete: { select: { firstName: true, lastName: true } },
      parent: { select: { firstName: true, lastName: true, email: true } },
    },
  })

  return entries.map(entry => ({
    id: entry.id,
    position: entry.waitlistPosition,
    athleteName: `${entry.athlete.firstName} ${entry.athlete.lastName}`,
    parentName: `${entry.parent.firstName} ${entry.parent.lastName}`,
    parentEmail: entry.parent.email,
    joinedAt: entry.waitlistJoinedAt?.toISOString() || entry.createdAt.toISOString(),
    offerStatus: getOfferStatus(entry),
    offerExpiresAt: entry.waitlistOfferExpiresAt?.toISOString() || null,
  }))
}

function getOfferStatus(entry: {
  waitlistOfferSentAt: Date | null
  waitlistOfferExpiresAt: Date | null
}): 'waiting' | 'offer_sent' | 'offer_expired' {
  if (!entry.waitlistOfferSentAt) return 'waiting'
  if (entry.waitlistOfferExpiresAt && new Date() > entry.waitlistOfferExpiresAt) return 'offer_expired'
  return 'offer_sent'
}

export async function getWaitlistPosition(campId: string, parentId: string) {
  const registration = await prisma.registration.findFirst({
    where: { campId, parentId, status: 'waitlisted' },
    select: { waitlistPosition: true, id: true },
  })

  if (!registration) return null

  const totalWaitlisted = await prisma.registration.count({
    where: { campId, status: 'waitlisted' },
  })

  return {
    registrationId: registration.id,
    position: registration.waitlistPosition,
    totalWaitlisted,
  }
}

// ============================================================================
// SPOT OPENED — TRIGGER OFFER
// ============================================================================

/**
 * Called when a confirmed registration is cancelled/refunded.
 * Uses a transaction to prevent race conditions when checking capacity.
 */
export async function onSpotOpened(campId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const camp = await tx.camp.findUnique({ where: { id: campId } })
    if (!camp || !camp.capacity) return

    // Count confirmed + pending + active offers (unexpired)
    const activeCount = await tx.registration.count({
      where: {
        campId,
        OR: [
          { status: { in: ['confirmed', 'pending'] } },
          {
            status: 'waitlisted',
            waitlistOfferSentAt: { not: null },
            waitlistOfferExpiresAt: { gt: new Date() },
          },
        ],
      },
    })

    if (activeCount >= camp.capacity) return // Still full

    // Find next eligible waitlisted person (no active offer)
    const nextInLine = await tx.registration.findFirst({
      where: {
        campId,
        status: 'waitlisted',
        OR: [
          { waitlistOfferSentAt: null },
          { waitlistOfferExpiresAt: { lt: new Date() } },
        ],
      },
      orderBy: { waitlistPosition: 'asc' },
    })

    if (!nextInLine) return // No one waiting

    // Send offer (outside transaction to not hold lock)
    // Mark as "about to send" to prevent double-sends
    const expiresAt = new Date(Date.now() + OFFER_EXPIRY_HOURS * 60 * 60 * 1000)
    await tx.registration.update({
      where: { id: nextInLine.id },
      data: {
        waitlistOfferSentAt: new Date(),
        waitlistOfferExpiresAt: expiresAt,
      },
    })
  })

  // Send the email outside the transaction
  const offeredReg = await prisma.registration.findFirst({
    where: {
      campId,
      status: 'waitlisted',
      waitlistOfferSentAt: { not: null },
      waitlistOfferExpiresAt: { gt: new Date() },
    },
    orderBy: { waitlistOfferSentAt: 'desc' },
    include: {
      athlete: true,
      parent: true,
      camp: { include: { location: true, venue: true } },
    },
  })

  if (offeredReg) {
    await sendOfferEmail(offeredReg)
  }
}

/**
 * Manually send an offer to a specific waitlisted registration (admin action).
 */
export async function sendWaitlistOffer(registrationId: string): Promise<void> {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: {
      athlete: true,
      parent: true,
      camp: { include: { location: true, venue: true } },
    },
  })

  if (!registration || registration.status !== 'waitlisted') {
    throw new Error('Registration not found or not in waitlisted state')
  }

  const expiresAt = new Date(Date.now() + OFFER_EXPIRY_HOURS * 60 * 60 * 1000)
  await prisma.registration.update({
    where: { id: registrationId },
    data: {
      waitlistOfferSentAt: new Date(),
      waitlistOfferExpiresAt: expiresAt,
    },
  })

  await sendOfferEmail({
    ...registration,
    waitlistOfferExpiresAt: expiresAt,
  })
}

async function sendOfferEmail(registration: {
  id: string
  waitlistOfferToken: string | null
  waitlistOfferExpiresAt: Date | null
  totalPriceCents: number
  tenantId: string
  parentId: string
  athlete: { firstName: string }
  parent: { email: string; firstName: string | null }
  camp: {
    name: string
    startDate: Date
    endDate: Date
    location: { name: string } | null
    venue: { name: string } | null
  }
}) {
  const token = registration.waitlistOfferToken
  if (!token) return

  const locationName = registration.camp.venue?.name || registration.camp.location?.name || 'TBD'
  const startDate = registration.camp.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endDate = registration.camp.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const expiresFormatted = registration.waitlistOfferExpiresAt
    ? registration.waitlistOfferExpiresAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : 'in 48 hours'

  await sendWaitlistOfferEmail({
    parentEmail: registration.parent.email,
    parentFirstName: registration.parent.firstName || 'Parent',
    camperFirstName: registration.athlete.firstName,
    campName: registration.camp.name,
    campDates: `${startDate} - ${endDate}`,
    location: locationName,
    price: formatPrice(registration.totalPriceCents),
    offerExpiresAt: expiresFormatted,
    acceptUrl: `${APP_URL}/waitlist/offer/${token}`,
    declineUrl: `${APP_URL}/waitlist/offer/${token}?action=decline`,
    tenantId: registration.tenantId,
    userId: registration.parentId,
  })
}

// ============================================================================
// ACCEPT OFFER
// ============================================================================

export interface AcceptOfferResult {
  checkoutUrl: string
  sessionId: string
}

/**
 * Accept a waitlist offer. Validates token + expiry, creates Stripe checkout.
 */
export async function acceptOffer(token: string, baseUrl: string): Promise<AcceptOfferResult> {
  const registration = await prisma.registration.findFirst({
    where: { waitlistOfferToken: token, status: 'waitlisted' },
    include: { camp: true },
  })

  if (!registration) {
    throw new Error('Invalid or expired offer token')
  }

  if (registration.waitlistOfferExpiresAt && new Date() > registration.waitlistOfferExpiresAt) {
    throw new Error('This offer has expired')
  }

  // Verify spot is actually available
  const activeCount = await prisma.registration.count({
    where: {
      campId: registration.campId,
      status: { in: ['confirmed', 'pending'] },
    },
  })

  if (registration.camp.capacity && activeCount >= registration.camp.capacity) {
    throw new Error('Sorry, the spot is no longer available')
  }

  // Create Stripe checkout session
  const successUrl = `${baseUrl}/register/success`
  const cancelUrl = `${baseUrl}/waitlist/offer/${token}`

  const { data: checkoutData, error: checkoutError } = await createStripeCheckoutSession({
    campSessionId: registration.campId,
    registrationId: registration.id,
    successUrl,
    cancelUrl,
    tenantId: registration.tenantId,
  })

  if (checkoutError || !checkoutData) {
    throw new Error(checkoutError?.message || 'Failed to create checkout session')
  }

  // Store the checkout session ID on the registration
  await prisma.registration.update({
    where: { id: registration.id },
    data: { stripeCheckoutSessionId: checkoutData.sessionId },
  })

  return {
    checkoutUrl: checkoutData.checkoutUrl,
    sessionId: checkoutData.sessionId,
  }
}

// ============================================================================
// DECLINE OFFER
// ============================================================================

/**
 * Decline a waitlist offer. Cancels registration, reorders, triggers next offer.
 */
export async function declineOffer(token: string): Promise<void> {
  const registration = await prisma.registration.findFirst({
    where: { waitlistOfferToken: token, status: 'waitlisted' },
  })

  if (!registration) {
    throw new Error('Invalid offer token')
  }

  await prisma.registration.update({
    where: { id: registration.id },
    data: {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancellationReason: 'Waitlist offer declined',
    },
  })

  await reorderPositions(registration.campId)

  // Trigger next offer
  onSpotOpened(registration.campId).catch(err =>
    console.error('[Waitlist] Failed to offer next after decline:', err)
  )
}

// ============================================================================
// EXPIRE STALE OFFERS (CRON)
// ============================================================================

/**
 * Find expired offers, move person to end of list, and offer to next.
 * Returns counts for logging.
 */
export async function expireStaleOffers(): Promise<{ expired: number; newOffersSent: number }> {
  const now = new Date()

  // Find all expired offers
  const expiredRegistrations = await prisma.registration.findMany({
    where: {
      status: 'waitlisted',
      waitlistOfferSentAt: { not: null },
      waitlistOfferExpiresAt: { lt: now },
    },
    include: {
      athlete: true,
      parent: true,
      camp: true,
    },
  })

  let expired = 0
  const campIds = new Set<string>()

  for (const reg of expiredRegistrations) {
    // Move to end of waitlist
    const maxPosition = await prisma.registration.aggregate({
      where: { campId: reg.campId, status: 'waitlisted' },
      _max: { waitlistPosition: true },
    })
    const newPosition = (maxPosition._max.waitlistPosition ?? 0) + 1

    await prisma.registration.update({
      where: { id: reg.id },
      data: {
        waitlistPosition: newPosition,
        waitlistOfferSentAt: null,
        waitlistOfferExpiresAt: null,
      },
    })

    // Send expired email
    sendWaitlistOfferExpiredEmail({
      parentEmail: reg.parent.email,
      parentFirstName: reg.parent.firstName || 'Parent',
      camperFirstName: reg.athlete.firstName,
      campName: reg.camp.name,
      tenantId: reg.tenantId,
      userId: reg.parentId,
    }).catch(err => console.error('[Waitlist] Expired email failed:', err))

    expired++
    campIds.add(reg.campId)
  }

  // Reorder and trigger new offers for affected camps
  let newOffersSent = 0
  for (const campId of campIds) {
    await reorderPositions(campId)
    try {
      await onSpotOpened(campId)
      newOffersSent++
    } catch {
      // No spot available or no one waiting
    }
  }

  return { expired, newOffersSent }
}

// ============================================================================
// REMOVE FROM WAITLIST (ADMIN)
// ============================================================================

export async function removeFromWaitlist(registrationId: string): Promise<void> {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
  })

  if (!registration || registration.status !== 'waitlisted') {
    throw new Error('Registration not found or not in waitlisted state')
  }

  await prisma.registration.update({
    where: { id: registrationId },
    data: {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancellationReason: 'Removed from waitlist by admin',
    },
  })

  await reorderPositions(registration.campId)
}

// ============================================================================
// REORDER POSITIONS
// ============================================================================

/**
 * Compact waitlist positions to sequential 1, 2, 3... after removals.
 */
export async function reorderPositions(campId: string): Promise<void> {
  const waitlisted = await prisma.registration.findMany({
    where: { campId, status: 'waitlisted' },
    orderBy: { waitlistPosition: 'asc' },
    select: { id: true },
  })

  for (let i = 0; i < waitlisted.length; i++) {
    await prisma.registration.update({
      where: { id: waitlisted[i].id },
      data: { waitlistPosition: i + 1 },
    })
  }
}

// ============================================================================
// OFFER DETAILS (for public offer page)
// ============================================================================

export async function getOfferDetails(token: string) {
  const registration = await prisma.registration.findFirst({
    where: { waitlistOfferToken: token, status: 'waitlisted' },
    include: {
      athlete: { select: { firstName: true, lastName: true } },
      camp: {
        include: {
          location: true,
          venue: true,
        },
      },
    },
  })

  if (!registration) return null

  const isExpired = registration.waitlistOfferExpiresAt
    ? new Date() > registration.waitlistOfferExpiresAt
    : false

  const locationName = registration.camp.venue?.name || registration.camp.location?.name || 'TBD'
  const locationAddress = registration.camp.venue?.addressLine1 || registration.camp.location?.address || ''
  const city = registration.camp.venue?.city || registration.camp.location?.city || ''
  const state = registration.camp.venue?.state || registration.camp.location?.state || ''

  return {
    registrationId: registration.id,
    campName: registration.camp.name,
    campDates: {
      start: registration.camp.startDate.toISOString(),
      end: registration.camp.endDate.toISOString(),
    },
    location: {
      name: locationName,
      address: locationAddress,
      city,
      state,
    },
    camperName: `${registration.athlete.firstName} ${registration.athlete.lastName}`,
    totalPriceCents: registration.totalPriceCents,
    offerExpiresAt: registration.waitlistOfferExpiresAt?.toISOString() || null,
    isExpired,
    hasOffer: !!registration.waitlistOfferSentAt,
  }
}

// ============================================================================
// NEARBY CAMPS HELPER
// ============================================================================

async function sendNearbyCampsForRegistration(registrationId: string): Promise<void> {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: {
      parent: true,
      camp: true,
    },
  })

  if (!registration) return

  const nearbyCamps = await getNearbyCampsWithAvailability(registration.campId, registration.tenantId)
  if (nearbyCamps.length === 0) return

  await sendNearbyCampsEmail({
    parentEmail: registration.parent.email,
    parentFirstName: registration.parent.firstName || 'Parent',
    camps: nearbyCamps,
    tenantId: registration.tenantId,
    userId: registration.parentId,
  })
}

export async function getNearbyCampsWithAvailability(
  excludeCampId: string,
  tenantId: string,
  limit = 5
): Promise<NearbyCampInfo[]> {
  const now = new Date()

  const camps = await prisma.camp.findMany({
    where: {
      tenantId,
      id: { not: excludeCampId },
      startDate: { gt: now },
      status: { in: ['published', 'registration_open'] },
    },
    include: {
      registrations: {
        where: { status: { in: ['confirmed', 'pending'] } },
        select: { id: true },
      },
      location: true,
      venue: true,
    },
    orderBy: { startDate: 'asc' },
    take: limit * 2, // Fetch more than needed to filter by availability
  })

  const available: NearbyCampInfo[] = []

  for (const camp of camps) {
    const spotsLeft = Math.max(0, (camp.capacity || 60) - camp.registrations.length)
    if (spotsLeft <= 0) continue

    const locationName = camp.venue?.name || camp.location?.name || 'TBD'
    const startDate = camp.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endDate = camp.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

    available.push({
      name: camp.name,
      dates: `${startDate} - ${endDate}`,
      location: locationName,
      spotsLeft,
      registerUrl: `${APP_URL}/register/${camp.slug}`,
    })

    if (available.length >= limit) break
  }

  return available
}

// ============================================================================
// COMPLETE WAITLIST PAYMENT (called from Stripe webhook)
// ============================================================================

/**
 * After a waitlist payment completes via Stripe, finalize the registration.
 * Called from the existing handleCheckoutComplete in payments.ts.
 */
export async function completeWaitlistRegistration(registrationId: string): Promise<void> {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
  })

  if (!registration || registration.status !== 'waitlisted') return

  // Clear waitlist fields and confirm
  await prisma.registration.update({
    where: { id: registrationId },
    data: {
      status: 'confirmed',
      paymentStatus: 'paid',
      paidAt: new Date(),
      waitlistPosition: null,
      waitlistOfferSentAt: null,
      waitlistOfferExpiresAt: null,
    },
  })

  // Reorder remaining waitlist
  await reorderPositions(registration.campId)
}
