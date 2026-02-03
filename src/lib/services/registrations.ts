/**
 * Registrations Service
 *
 * Prisma-based service for camp registrations.
 */

import prisma from '@/lib/db/client'

// =============================================================================
// Types (snake_case for backward compatibility with pages)
// =============================================================================

export interface Registration {
  id: string
  tenant_id: string
  camp_id: string
  athlete_id: string
  parent_id: string
  status: string
  base_price_cents: number
  discount_cents: number
  addons_total_cents: number
  total_price_cents: number
  payment_status: string
  payment_method: string | null
  paid_at: string | null
  friend_requests: string[]
  special_considerations: string | null
  shirt_size: string | null
  waiver_signed: boolean
  waiver_signed_at: string | null
  created_at: string
  updated_at: string
  // Joined data
  athletes?: {
    first_name: string
    last_name: string
    parent_id?: string
  }
  camps?: {
    name: string
    start_date: string
    end_date: string
    location_name: string | null
    city: string | null
    price_cents: number
  }
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Fetch registrations for a parent (with camp and athlete details)
 */
export async function fetchRegistrationsByParent(
  parentId: string
): Promise<{ data: Registration[] | null; error: Error | null }> {
  try {
    const registrations = await prisma.registration.findMany({
      where: { parentId },
      include: {
        athlete: {
          select: {
            firstName: true,
            lastName: true,
            parentId: true,
          },
        },
        camp: {
          select: {
            name: true,
            startDate: true,
            endDate: true,
            priceCents: true,
            location: {
              select: {
                name: true,
                city: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      data: registrations.map((r) => ({
        id: r.id,
        tenant_id: r.tenantId,
        camp_id: r.campId,
        athlete_id: r.athleteId,
        parent_id: r.parentId,
        status: r.status,
        base_price_cents: r.basePriceCents,
        discount_cents: r.discountCents,
        addons_total_cents: r.addonsTotalCents,
        total_price_cents: r.totalPriceCents,
        payment_status: r.paymentStatus,
        payment_method: r.paymentMethod,
        paid_at: r.paidAt?.toISOString() || null,
        friend_requests: r.friendRequests,
        special_considerations: r.specialConsiderations,
        shirt_size: r.shirtSize,
        waiver_signed: r.waiverSigned,
        waiver_signed_at: r.waiverSignedAt?.toISOString() || null,
        created_at: r.createdAt.toISOString(),
        updated_at: r.updatedAt.toISOString(),
        athletes: {
          first_name: r.athlete.firstName,
          last_name: r.athlete.lastName,
          parent_id: r.athlete.parentId,
        },
        camps: {
          name: r.camp.name,
          start_date: r.camp.startDate.toISOString().split('T')[0],
          end_date: r.camp.endDate.toISOString().split('T')[0],
          location_name: r.camp.location?.name || null,
          city: r.camp.location?.city || null,
          price_cents: r.camp.priceCents,
        },
      })),
      error: null,
    }
  } catch (error) {
    console.error('[Registrations] Failed to fetch registrations:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Fetch registrations for a camp
 */
export async function fetchRegistrationsByCamp(
  campId: string
): Promise<{ data: Registration[] | null; error: Error | null }> {
  try {
    const registrations = await prisma.registration.findMany({
      where: { campId },
      include: {
        athlete: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      data: registrations.map((r) => ({
        id: r.id,
        tenant_id: r.tenantId,
        camp_id: r.campId,
        athlete_id: r.athleteId,
        parent_id: r.parentId,
        status: r.status,
        base_price_cents: r.basePriceCents,
        discount_cents: r.discountCents,
        addons_total_cents: r.addonsTotalCents,
        total_price_cents: r.totalPriceCents,
        payment_status: r.paymentStatus,
        payment_method: r.paymentMethod,
        paid_at: r.paidAt?.toISOString() || null,
        friend_requests: r.friendRequests,
        special_considerations: r.specialConsiderations,
        shirt_size: r.shirtSize,
        waiver_signed: r.waiverSigned,
        waiver_signed_at: r.waiverSignedAt?.toISOString() || null,
        created_at: r.createdAt.toISOString(),
        updated_at: r.updatedAt.toISOString(),
        athletes: {
          first_name: r.athlete.firstName,
          last_name: r.athlete.lastName,
        },
      })),
      error: null,
    }
  } catch (error) {
    console.error('[Registrations] Failed to fetch camp registrations:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Fetch a single registration by ID
 */
export async function fetchRegistrationById(
  registrationId: string
): Promise<{ data: Registration | null; error: Error | null }> {
  try {
    const r = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        athlete: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        camp: {
          select: {
            name: true,
            startDate: true,
            endDate: true,
            priceCents: true,
            location: {
              select: {
                name: true,
                city: true,
              },
            },
          },
        },
      },
    })

    if (!r) {
      return { data: null, error: null }
    }

    return {
      data: {
        id: r.id,
        tenant_id: r.tenantId,
        camp_id: r.campId,
        athlete_id: r.athleteId,
        parent_id: r.parentId,
        status: r.status,
        base_price_cents: r.basePriceCents,
        discount_cents: r.discountCents,
        addons_total_cents: r.addonsTotalCents,
        total_price_cents: r.totalPriceCents,
        payment_status: r.paymentStatus,
        payment_method: r.paymentMethod,
        paid_at: r.paidAt?.toISOString() || null,
        friend_requests: r.friendRequests,
        special_considerations: r.specialConsiderations,
        shirt_size: r.shirtSize,
        waiver_signed: r.waiverSigned,
        waiver_signed_at: r.waiverSignedAt?.toISOString() || null,
        created_at: r.createdAt.toISOString(),
        updated_at: r.updatedAt.toISOString(),
        athletes: {
          first_name: r.athlete.firstName,
          last_name: r.athlete.lastName,
        },
        camps: {
          name: r.camp.name,
          start_date: r.camp.startDate.toISOString().split('T')[0],
          end_date: r.camp.endDate.toISOString().split('T')[0],
          location_name: r.camp.location?.name || null,
          city: r.camp.location?.city || null,
          price_cents: r.camp.priceCents,
        },
      },
      error: null,
    }
  } catch (error) {
    console.error('[Registrations] Failed to fetch registration:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Create a new registration
 */
export async function createRegistration(params: {
  tenantId: string
  campId: string
  athleteId: string
  parentId: string
  basePriceCents: number
  discountCents: number
  promoDiscountCents: number
  addonsTotalCents: number
  taxCents?: number
  promoCodeId?: string | null
  shirtSize?: string | null
  specialConsiderations?: string | null
  friendRequests?: string[]
}): Promise<{ data: { registrationId: string } | null; error: Error | null }> {
  try {
    const {
      tenantId,
      campId,
      athleteId,
      parentId,
      basePriceCents,
      discountCents,
      promoDiscountCents,
      addonsTotalCents,
      taxCents = 0,
      promoCodeId,
      shirtSize,
      specialConsiderations,
      friendRequests,
    } = params

    const totalPriceCents = basePriceCents - discountCents - promoDiscountCents + addonsTotalCents + taxCents

    // Check if athlete is already registered for this camp
    const existingRegistration = await prisma.registration.findFirst({
      where: {
        campId,
        athleteId,
        status: { not: 'cancelled' },
      },
      include: {
        athlete: { select: { firstName: true, lastName: true } },
      },
    })

    if (existingRegistration) {
      // If the existing registration is pending (unpaid), clean it up and allow re-registration
      if (existingRegistration.status === 'pending' && existingRegistration.paymentStatus === 'pending') {
        // Delete associated add-ons and the stale pending registration
        await prisma.registrationAddon.deleteMany({
          where: { registrationId: existingRegistration.id },
        })
        await prisma.registration.delete({
          where: { id: existingRegistration.id },
        })
        console.log(`[Registrations] Cleaned up stale pending registration ${existingRegistration.id} for athlete ${athleteId}`)
      } else {
        // Confirmed or paid registration — block duplicate
        const athleteName = existingRegistration.athlete
          ? `${existingRegistration.athlete.firstName} ${existingRegistration.athlete.lastName}`
          : 'This athlete'
        return {
          data: null,
          error: new Error(`${athleteName} is already registered for this camp.`),
        }
      }
    }

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
        status: 'pending',
        paymentStatus: 'pending',
      },
    })

    // Increment promo code usage if used
    if (promoCodeId) {
      await prisma.promoCode.update({
        where: { id: promoCodeId },
        data: { currentUses: { increment: 1 } },
      })
    }

    return { data: { registrationId: registration.id }, error: null }
  } catch (error) {
    console.error('[Registrations] Failed to create registration:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Add addon to registration
 */
export async function addRegistrationAddon(params: {
  registrationId: string
  addonId: string
  variantId?: string | null
  quantity: number
  priceCents: number
}): Promise<{ data: { id: string } | null; error: Error | null }> {
  try {
    const { registrationId, addonId, variantId, quantity, priceCents } = params

    const regAddon = await prisma.registrationAddon.create({
      data: {
        registrationId,
        addonId,
        variantId,
        quantity,
        priceCents,
      },
    })

    return { data: { id: regAddon.id }, error: null }
  } catch (error) {
    console.error('[Registrations] Failed to add registration addon:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Count registrations by athlete
 */
export async function countRegistrationsByAthlete(
  athleteIds: string[]
): Promise<{ data: Map<string, { upcoming: number; completed: number }> | null; error: Error | null }> {
  try {
    const today = new Date()

    const registrations = await prisma.registration.findMany({
      where: {
        athleteId: { in: athleteIds },
        status: { not: 'cancelled' },
      },
      include: {
        camp: {
          select: {
            startDate: true,
            endDate: true,
          },
        },
      },
    })

    const counts = new Map<string, { upcoming: number; completed: number }>()

    // Initialize counts for all athletes
    athleteIds.forEach((id) => counts.set(id, { upcoming: 0, completed: 0 }))

    // Count registrations
    registrations.forEach((r) => {
      const current = counts.get(r.athleteId) || { upcoming: 0, completed: 0 }
      if (r.camp.startDate >= today) {
        current.upcoming++
      } else if (r.camp.endDate < today) {
        current.completed++
      }
      counts.set(r.athleteId, current)
    })

    return { data: counts, error: null }
  } catch (error) {
    console.error('[Registrations] Failed to count registrations:', error)
    return { data: null, error: error as Error }
  }
}
