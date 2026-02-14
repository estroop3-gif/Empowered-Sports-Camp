/**
 * Camp Registration Service
 *
 * Handles the camp registration flow including:
 * - Getting registration context (camp info, parent profile, athletes)
 * - Creating/updating registration drafts
 * - Confirming registrations after payment
 * - Managing registration status
 */

import { prisma } from '@/lib/db/client'
import { createNotification } from './notifications'
import { createStripeCheckoutSession } from './payments'
import { ensureParentRole } from './users'
import type { PaymentStatus, RegistrationStatus, CampFriendSquad, CampFriendSquadMember } from '@/generated/prisma'

// =============================================================================
// Types
// =============================================================================

export interface CampRegistrationContext {
  camp: {
    id: string
    name: string
    slug: string
    description: string | null
    programType: string
    startDate: string
    endDate: string
    startTime: string | null
    endTime: string | null
    minAge: number | null
    maxAge: number | null
    capacity: number | null
    priceCents: number
    earlyBirdPriceCents: number | null
    earlyBirdDeadline: string | null
    registrationOpen: string | null
    registrationClose: string | null
    imageUrl: string | null
    sportsOffered: string[]
    highlights: string[]
    tenantId: string | null
    venue: {
      id: string
      name: string
      city: string
      state: string
    } | null
  }
  parent: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    phone: string | null
    city: string | null
    state: string | null
    zipCode: string | null
  }
  athletes: {
    id: string
    firstName: string
    lastName: string
    dateOfBirth: string
    gender: string | null
    grade: string | null
    school: string | null
    medicalNotes: string | null
    allergies: string | null
    emergencyContactName: string | null
    emergencyContactPhone: string | null
    tShirtSize: string | null
    primarySportInterest: string | null
    isRegistered: boolean
    registrationId: string | null
    registrationStatus: RegistrationStatus | null
  }[]
  existingRegistrations: {
    id: string
    athleteId: string
    status: RegistrationStatus
    paymentStatus: PaymentStatus
    totalPriceCents: number
  }[]
  existingSquads: {
    id: string
    label: string
    memberCount: number
    isCreator: boolean
  }[]
  currentPrice: number
  isEarlyBird: boolean
  spotsRemaining: number
}

export interface RegistrationDraftParams {
  campId: string
  parentId: string
  tenantId: string
  athletes: {
    athleteId: string
    tShirtSize?: string
    medicalNotes?: string
    allergies?: string
    specialConsiderations?: string
    friendRequests?: string[]
  }[]
  promoCode?: string
}

export interface RegistrationDraft {
  registrationIds: string[]
  totalPriceCents: number
  itemizedPrices: {
    athleteId: string
    athleteName: string
    basePriceCents: number
    discountCents: number
    totalCents: number
  }[]
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Get all context needed for the registration page.
 */
export async function getCampRegistrationContext(params: {
  campId: string
  parentId: string
}): Promise<{ data: CampRegistrationContext | null; error: Error | null }> {
  try {
    const { campId, parentId } = params

    // Get camp info
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
          },
        },
      },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp not found') }
    }

    // Get parent profile
    const parent = await prisma.profile.findUnique({
      where: { id: parentId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        city: true,
        state: true,
        zipCode: true,
      },
    })

    if (!parent) {
      return { data: null, error: new Error('Parent not found') }
    }

    // Get parent's athletes with their registration status for this camp
    const athletes = await prisma.athlete.findMany({
      where: {
        parentId,
        isActive: true,
      },
      include: {
        registrations: {
          where: { campId },
          select: {
            id: true,
            status: true,
            paymentStatus: true,
          },
        },
      },
    })

    // Get existing registrations
    const existingRegistrations = await prisma.registration.findMany({
      where: {
        campId,
        parentId,
        status: { not: 'cancelled' },
      },
      select: {
        id: true,
        athleteId: true,
        status: true,
        paymentStatus: true,
        totalPriceCents: true,
      },
    })

    // Get existing squads for this camp
    const squads = await prisma.campFriendSquad.findMany({
      where: {
        campId,
        OR: [
          { createdByParentId: parentId },
          {
            members: {
              some: {
                parentId,
                status: { in: ['requested', 'accepted'] },
              },
            },
          },
        ],
      },
      include: {
        members: {
          where: { status: 'accepted' },
        },
      },
    })

    // Calculate current price (check early bird)
    const now = new Date()
    const isEarlyBird = camp.earlyBirdDeadline && camp.earlyBirdPriceCents
      ? new Date(camp.earlyBirdDeadline) > now
      : false
    const currentPrice = isEarlyBird && camp.earlyBirdPriceCents
      ? camp.earlyBirdPriceCents
      : camp.priceCents

    // Calculate spots remaining
    const confirmedCount = await prisma.registration.count({
      where: {
        campId,
        status: { in: ['confirmed', 'pending'] },
        paymentStatus: { in: ['paid', 'pending'] },
      },
    })
    const spotsRemaining = (camp.capacity || 60) - confirmedCount

    return {
      data: {
        camp: {
          id: camp.id,
          name: camp.name,
          slug: camp.slug,
          description: camp.description,
          programType: camp.programType,
          startDate: camp.startDate.toISOString().split('T')[0],
          endDate: camp.endDate.toISOString().split('T')[0],
          startTime: camp.startTime?.toISOString().split('T')[1]?.slice(0, 5) || null,
          endTime: camp.endTime?.toISOString().split('T')[1]?.slice(0, 5) || null,
          minAge: camp.minAge,
          maxAge: camp.maxAge,
          capacity: camp.capacity,
          priceCents: camp.priceCents,
          earlyBirdPriceCents: camp.earlyBirdPriceCents,
          earlyBirdDeadline: camp.earlyBirdDeadline?.toISOString().split('T')[0] || null,
          registrationOpen: camp.registrationOpen?.toISOString().split('T')[0] || null,
          registrationClose: camp.registrationClose?.toISOString().split('T')[0] || null,
          imageUrl: camp.imageUrl,
          sportsOffered: camp.sportsOffered,
          highlights: camp.highlights,
          tenantId: camp.tenantId,
          venue: camp.venue,
        },
        parent: {
          id: parent.id,
          email: parent.email,
          firstName: parent.firstName,
          lastName: parent.lastName,
          phone: parent.phone,
          city: parent.city,
          state: parent.state,
          zipCode: parent.zipCode,
        },
        athletes: athletes.map((a) => {
          const reg = a.registrations[0]
          return {
            id: a.id,
            firstName: a.firstName,
            lastName: a.lastName,
            dateOfBirth: a.dateOfBirth.toISOString().split('T')[0],
            gender: a.gender,
            grade: a.grade,
            school: a.school,
            medicalNotes: a.medicalNotes,
            allergies: a.allergies,
            emergencyContactName: a.emergencyContactName,
            emergencyContactPhone: a.emergencyContactPhone,
            tShirtSize: a.tShirtSize,
            primarySportInterest: a.primarySportInterest,
            isRegistered: !!reg,
            registrationId: reg?.id || null,
            registrationStatus: reg?.status || null,
          }
        }),
        existingRegistrations,
        existingSquads: squads.map((s) => ({
          id: s.id,
          label: s.label,
          memberCount: s.members.length,
          isCreator: s.createdByParentId === parentId,
        })),
        currentPrice,
        isEarlyBird,
        spotsRemaining,
      },
      error: null,
    }
  } catch (error) {
    console.error('[CampRegistration] Failed to get context:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Create or update registration drafts for athletes.
 * Status will be 'pending' with payment status 'pending' until payment completes.
 */
export async function createOrUpdateRegistrationDraft(
  params: RegistrationDraftParams
): Promise<{ data: RegistrationDraft | null; error: Error | null }> {
  try {
    const { campId, parentId, tenantId, athletes, promoCode } = params

    // Get camp for pricing
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp not found') }
    }

    // Calculate current price
    const now = new Date()
    const isEarlyBird = camp.earlyBirdDeadline && camp.earlyBirdPriceCents
      ? new Date(camp.earlyBirdDeadline) > now
      : false
    const basePrice = isEarlyBird && camp.earlyBirdPriceCents
      ? camp.earlyBirdPriceCents
      : camp.priceCents

    // Handle promo code if provided
    let promoDiscount = 0
    let promoCodeRecord = null
    if (promoCode) {
      promoCodeRecord = await prisma.promoCode.findFirst({
        where: {
          code: promoCode.toUpperCase(),
          tenantId,
          isActive: true,
          OR: [
            { validFrom: null },
            { validFrom: { lte: now } },
          ],
        },
      })

      if (promoCodeRecord) {
        const validUntil = promoCodeRecord.validUntil
        if (!validUntil || new Date(validUntil) >= now) {
          if (promoCodeRecord.discountType === 'percentage') {
            promoDiscount = Math.round(basePrice * (promoCodeRecord.discountValue / 100))
          } else {
            promoDiscount = promoCodeRecord.discountValue
          }
        }
      }
    }

    // Calculate sibling discount (10% off for each additional athlete after the first)
    const siblingDiscountPercent = 10

    const registrationIds: string[] = []
    const itemizedPrices: RegistrationDraft['itemizedPrices'] = []
    let totalPriceCents = 0

    // Get athlete names for itemized list
    const athleteRecords = await prisma.athlete.findMany({
      where: { id: { in: athletes.map((a) => a.athleteId) } },
      select: { id: true, firstName: true, lastName: true },
    })

    const athleteMap = new Map(athleteRecords.map((a) => [a.id, a]))

    for (let i = 0; i < athletes.length; i++) {
      const athleteData = athletes[i]
      const athleteRecord = athleteMap.get(athleteData.athleteId)

      // Calculate discounts
      const siblingDiscount = i > 0 ? Math.round(basePrice * (siblingDiscountPercent / 100)) : 0
      const totalDiscount = siblingDiscount + promoDiscount
      const athleteTotal = Math.max(0, basePrice - totalDiscount)

      // Check for existing registration
      const existingReg = await prisma.registration.findUnique({
        where: {
          campId_athleteId: {
            campId,
            athleteId: athleteData.athleteId,
          },
        },
      })

      let registration

      if (existingReg && existingReg.status !== 'cancelled' && existingReg.paymentStatus !== 'paid') {
        // Update existing draft
        registration = await prisma.registration.update({
          where: { id: existingReg.id },
          data: {
            basePriceCents: basePrice,
            discountCents: siblingDiscount,
            promoDiscountCents: promoDiscount,
            totalPriceCents: athleteTotal,
            promoCodeId: promoCodeRecord?.id,
            shirtSize: athleteData.tShirtSize || existingReg.shirtSize,
            specialConsiderations: athleteData.specialConsiderations || existingReg.specialConsiderations,
            friendRequests: athleteData.friendRequests || existingReg.friendRequests,
          },
        })
      } else if (!existingReg) {
        // Create new registration
        registration = await prisma.registration.create({
          data: {
            tenantId,
            campId,
            athleteId: athleteData.athleteId,
            parentId,
            basePriceCents: basePrice,
            discountCents: siblingDiscount,
            promoDiscountCents: promoDiscount,
            totalPriceCents: athleteTotal,
            promoCodeId: promoCodeRecord?.id,
            shirtSize: athleteData.tShirtSize,
            specialConsiderations: athleteData.specialConsiderations,
            friendRequests: athleteData.friendRequests || [],
            status: 'pending',
            paymentStatus: 'pending',
          },
        })

        // Update athlete profile if data provided
        if (athleteData.medicalNotes || athleteData.allergies || athleteData.tShirtSize) {
          await prisma.athlete.update({
            where: { id: athleteData.athleteId },
            data: {
              ...(athleteData.medicalNotes && { medicalNotes: athleteData.medicalNotes }),
              ...(athleteData.allergies && { allergies: athleteData.allergies }),
              ...(athleteData.tShirtSize && { tShirtSize: athleteData.tShirtSize }),
            },
          })
        }
      } else {
        // Already registered and paid - skip
        continue
      }

      registrationIds.push(registration.id)
      totalPriceCents += athleteTotal

      itemizedPrices.push({
        athleteId: athleteData.athleteId,
        athleteName: `${athleteRecord?.firstName || ''} ${athleteRecord?.lastName || ''}`.trim(),
        basePriceCents: basePrice,
        discountCents: siblingDiscount + promoDiscount,
        totalCents: athleteTotal,
      })
    }

    return {
      data: {
        registrationIds,
        totalPriceCents,
        itemizedPrices,
      },
      error: null,
    }
  } catch (error) {
    console.error('[CampRegistration] Failed to create/update draft:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Create Stripe checkout session for registration payment.
 */
export async function createRegistrationCheckout(params: {
  registrationIds: string[]
  tenantId: string
  successUrl: string
  cancelUrl: string
}): Promise<{ data: { checkoutUrl: string; sessionId: string } | null; error: Error | null }> {
  try {
    const { registrationIds, tenantId, successUrl, cancelUrl } = params

    if (registrationIds.length === 0) {
      return { data: null, error: new Error('No registrations to process') }
    }

    // For now, we'll create a checkout session for the first registration
    // and batch the others via metadata
    // In production, you might create multiple sessions or a batch checkout

    const firstRegId = registrationIds[0]

    // Get first registration to determine campId
    const firstReg = await prisma.registration.findUnique({
      where: { id: firstRegId },
    })

    if (!firstReg) {
      return { data: null, error: new Error('Registration not found') }
    }

    // Store all registration IDs in the first registration for batch processing
    await prisma.registration.update({
      where: { id: firstRegId },
      data: {
        // We can use friendRequests array to temporarily store related reg IDs
        // or extend the model - for now we'll process individually
      },
    })

    const result = await createStripeCheckoutSession({
      campSessionId: firstReg.campId,
      registrationId: firstRegId,
      tenantId,
      successUrl,
      cancelUrl,
    })

    if (result.error) {
      return { data: null, error: result.error }
    }

    // Store checkout session ID on all registrations
    await prisma.registration.updateMany({
      where: { id: { in: registrationIds } },
      data: {
        stripeCheckoutSessionId: result.data?.sessionId,
      },
    })

    return {
      data: {
        checkoutUrl: result.data!.checkoutUrl,
        sessionId: result.data!.sessionId,
      },
      error: null,
    }
  } catch (error) {
    console.error('[CampRegistration] Failed to create checkout:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Confirm registrations after successful payment.
 * Called from Stripe webhook or for demo payments.
 */
interface ConfirmReceiptRegistration {
  athleteName: string
  basePriceCents: number
  discountCents: number
  promoDiscountCents: number
  addonsTotalCents: number
  addons: Array<{ name: string; variant: string | null; quantity: number; priceCents: number }>
  promoCode: { code: string; discountType: string; discountValue: number } | null
}

interface ConfirmReceiptData {
  registrations: ConfirmReceiptRegistration[]
  subtotalCents: number
  totalDiscountCents: number
  totalAddonsCents: number
  taxCents: number
  grandTotalCents: number
}

interface ConfirmResponse {
  confirmed: number
  confirmationNumber: string
  campName: string
  campDates: string
  campTimes: string
  location: string
  locationAddress: string
  athleteNames: string[]
  totalPaid: string
  registrationIds: string[]
  receipt: ConfirmReceiptData
}

function formatTimeValue(time: Date | null): string {
  if (!time) return ''
  const hours = time.getUTCHours()
  const minutes = time.getUTCMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const h = hours % 12 || 12
  return `${h}:${minutes.toString().padStart(2, '0')} ${ampm}`
}

function buildConfirmResponse(
  regs: Array<{
    id: string
    confirmationNumber: string | null
    basePriceCents: number
    discountCents: number
    promoDiscountCents: number
    addonsTotalCents: number
    taxCents: number
    totalPriceCents: number
    athlete: { firstName: string; lastName: string }
    camp: {
      name: string
      startDate: Date
      endDate: Date
      startTime: Date | null
      endTime: Date | null
      location: { name: string; address: string | null; city: string | null; state: string | null; zip: string | null } | null
    }
    promoCode: { code: string; discountType: string; discountValue: number } | null
    registrationAddons: Array<{
      quantity: number
      priceCents: number
      addon: { name: string } | null
      variant: { name: string } | null
    }>
  }>,
  sessionId: string,
  confirmedCount: number,
): ConfirmResponse {
  const camp = regs[0].camp
  const loc = camp.location
  const locationStr = loc ? [loc.name, loc.city, loc.state].filter(Boolean).join(', ') : ''
  const locationAddress = loc
    ? [loc.address, loc.city, loc.state, loc.zip].filter(Boolean).join(', ')
    : ''
  const startDate = camp.startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const endDate = camp.endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const startTime = formatTimeValue(camp.startTime)
  const endTime = formatTimeValue(camp.endTime)
  const campTimes = startTime && endTime ? `${startTime} - ${endTime}` : ''

  let subtotalCents = 0
  let totalDiscountCents = 0
  let totalAddonsCents = 0
  let taxCents = 0
  let grandTotalCents = 0

  const receiptRegistrations: ConfirmReceiptRegistration[] = regs.map((r) => {
    subtotalCents += r.basePriceCents
    totalDiscountCents += r.discountCents + r.promoDiscountCents
    totalAddonsCents += r.addonsTotalCents
    taxCents += r.taxCents
    grandTotalCents += r.totalPriceCents

    return {
      athleteName: `${r.athlete.firstName} ${r.athlete.lastName}`,
      basePriceCents: r.basePriceCents,
      discountCents: r.discountCents,
      promoDiscountCents: r.promoDiscountCents,
      addonsTotalCents: r.addonsTotalCents,
      addons: r.registrationAddons.map((ra) => ({
        name: ra.addon?.name || 'Add-on',
        variant: ra.variant?.name || null,
        quantity: ra.quantity,
        priceCents: ra.priceCents,
      })),
      promoCode: r.promoCode
        ? { code: r.promoCode.code, discountType: r.promoCode.discountType, discountValue: r.promoCode.discountValue }
        : null,
    }
  })

  return {
    confirmed: confirmedCount,
    confirmationNumber: regs[0].confirmationNumber || `EA-${sessionId.slice(-8).toUpperCase()}`,
    campName: camp.name,
    campDates: `${startDate} - ${endDate}`,
    campTimes,
    location: locationStr,
    locationAddress,
    athleteNames: regs.map((r) => `${r.athlete.firstName} ${r.athlete.lastName}`),
    totalPaid: `$${(grandTotalCents / 100).toFixed(2)}`,
    registrationIds: regs.map((r) => r.id),
    receipt: {
      registrations: receiptRegistrations,
      subtotalCents,
      totalDiscountCents,
      totalAddonsCents,
      taxCents,
      grandTotalCents,
    },
  }
}

export async function confirmRegistrationsFromPayment(params: {
  sessionId: string
}): Promise<{ data: ConfirmResponse | null; error: Error | null }> {
  try {
    const { sessionId } = params

    const registrationInclude = {
      camp: {
        include: {
          location: true,
        },
      },
      athlete: true,
      parent: true,
      promoCode: {
        select: { code: true, discountType: true, discountValue: true },
      },
      registrationAddons: {
        include: {
          addon: { select: { name: true } },
          variant: { select: { name: true } },
        },
      },
    }

    // Find registrations with this checkout session
    // Works for both real Stripe sessions and demo sessions since all registrations
    // have stripeCheckoutSessionId set during checkout creation
    const registrations = await prisma.registration.findMany({
      where: {
        stripeCheckoutSessionId: sessionId,
        paymentStatus: { not: 'paid' },
      },
      include: registrationInclude,
    })

    if (registrations.length === 0) {
      // Check if already confirmed (e.g. webhook already processed)
      const alreadyConfirmed = await prisma.registration.findMany({
        where: { stripeCheckoutSessionId: sessionId },
        include: registrationInclude,
      })
      if (alreadyConfirmed.length > 0) {
        return {
          data: buildConfirmResponse(alreadyConfirmed, sessionId, 0),
          error: null,
        }
      }
      return { data: null, error: null }
    }

    // Update all registrations
    await prisma.registration.updateMany({
      where: {
        stripeCheckoutSessionId: sessionId,
      },
      data: {
        status: 'confirmed',
        paymentStatus: 'paid',
        paidAt: new Date(),
      },
    })

    // Ensure parent has the parent role (for dashboard access)
    const parentIds = [...new Set(registrations.map(r => r.parentId))]
    for (const parentId of parentIds) {
      await ensureParentRole(parentId)
    }

    // Create CamperSessionData for each registration
    for (const reg of registrations) {
      const existingSessionData = await prisma.camperSessionData.findUnique({
        where: {
          campId_athleteId: {
            campId: reg.campId,
            athleteId: reg.athleteId,
          },
        },
      })

      if (!existingSessionData) {
        // Calculate age at camp start
        const campStart = new Date(reg.camp.startDate)
        const dob = reg.athlete.dateOfBirth
        const ageAtCamp = campStart.getFullYear() - dob.getFullYear()
        const ageMonths = (campStart.getFullYear() - dob.getFullYear()) * 12 +
          (campStart.getMonth() - dob.getMonth())

        await prisma.camperSessionData.create({
          data: {
            registrationId: reg.id,
            campId: reg.campId,
            athleteId: reg.athleteId,
            tenantId: reg.tenantId,
            ageAtCampStart: ageAtCamp,
            ageMonthsAtCampStart: ageMonths,
            gradeFromRegistration: reg.athlete.grade,
            medicalNotes: reg.athlete.medicalNotes,
            allergies: reg.athlete.allergies,
            specialConsiderations: reg.specialConsiderations,
            friendRequests: reg.friendRequests,
            registeredAt: reg.createdAt,
            isLateRegistration: new Date() > new Date(reg.camp.registrationClose || reg.camp.startDate),
          },
        })
      }

      // Send confirmation notification
      await createNotification({
        userId: reg.parentId,
        tenantId: reg.tenantId,
        type: 'camp_registration_completed',
        title: 'Registration Confirmed!',
        body: `${reg.athlete.firstName}'s registration for ${reg.camp.name} is confirmed. See you at camp!`,
        category: 'camp',
        severity: 'success',
        actionUrl: `/portal/camps/${reg.campId}`,
      })
    }

    return {
      data: buildConfirmResponse(registrations, sessionId, registrations.length),
      error: null,
    }
  } catch (error) {
    console.error('[CampRegistration] Failed to confirm registrations:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get registration details for a camp and parent.
 */
export async function getRegistrations(params: {
  campId: string
  parentId: string
}): Promise<{ data: { registrations: Array<{
  id: string
  athleteId: string
  athleteName: string
  status: RegistrationStatus
  paymentStatus: PaymentStatus
  totalPriceCents: number
  createdAt: string
}> } | null; error: Error | null }> {
  try {
    const { campId, parentId } = params

    const registrations = await prisma.registration.findMany({
      where: {
        campId,
        parentId,
        status: { not: 'cancelled' },
      },
      include: {
        athlete: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    return {
      data: {
        registrations: registrations.map((r) => ({
          id: r.id,
          athleteId: r.athleteId,
          athleteName: `${r.athlete.firstName} ${r.athlete.lastName}`,
          status: r.status,
          paymentStatus: r.paymentStatus,
          totalPriceCents: r.totalPriceCents,
          createdAt: r.createdAt.toISOString(),
        })),
      },
      error: null,
    }
  } catch (error) {
    console.error('[CampRegistration] Failed to get registrations:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Cancel a registration.
 */
export async function cancelRegistration(params: {
  registrationId: string
  parentId: string
  reason?: string
}): Promise<{ data: { cancelled: boolean } | null; error: Error | null }> {
  try {
    const { registrationId, parentId, reason } = params

    const registration = await prisma.registration.findFirst({
      where: {
        id: registrationId,
        parentId,
      },
    })

    if (!registration) {
      return { data: null, error: new Error('Registration not found') }
    }

    if (registration.paymentStatus === 'paid') {
      return { data: null, error: new Error('Cannot cancel paid registration. Please request a refund.') }
    }

    await prisma.registration.update({
      where: { id: registrationId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    })

    return { data: { cancelled: true }, error: null }
  } catch (error) {
    console.error('[CampRegistration] Failed to cancel registration:', error)
    return { data: null, error: error as Error }
  }
}
