/**
 * Registration Checkout API
 *
 * POST /api/registrations/checkout
 * Creates registration record(s) and initiates Stripe Checkout.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { createRegistration, addRegistrationAddon } from '@/lib/services/registrations'
import { createStripeCheckoutSession } from '@/lib/services/payments'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import type { RegistrationPayload } from '@/types/registration'

// Helper to check if a string is a valid UUID
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user - their Cognito sub will be used as profile ID
    const authUser = await getAuthenticatedUserFromRequest(request)
    // Note: We don't require authentication for checkout, but if user is authenticated,
    // we use their ID for the profile to ensure dashboard queries work correctly

    const body = (await request.json()) as RegistrationPayload
    const {
      campId,
      tenantId,
      parent,
      campers,
      addOns,
      promoCode,
      totals,
    } = body

    if (!campId || !tenantId || !parent || !campers?.length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify camp exists and has spots, also get tenant for tax rate
    const [camp, tenant] = await Promise.all([
      prisma.camp.findFirst({
        where: { id: campId, tenantId },
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { taxRatePercent: true },
      }),
    ])

    if (!camp) {
      return NextResponse.json({ error: 'Camp not found' }, { status: 404 })
    }

    // Get tax rate (default to 0 if not set)
    const taxRatePercent = tenant?.taxRatePercent ? Number(tenant.taxRatePercent) : 0

    // Get current registration count
    const currentCount = await prisma.registration.count({
      where: { campId, status: { not: 'cancelled' } },
    })

    if (camp.capacity && currentCount + campers.length > camp.capacity) {
      return NextResponse.json(
        { error: 'Not enough spots available' },
        { status: 400 }
      )
    }

    // Find or create parent profile
    // Profile is linked to auth, so we look up by email first
    // If user is authenticated, we also check by their Cognito sub (user ID)
    let parentProfile = await prisma.profile.findFirst({
      where: {
        email: parent.email.toLowerCase(),
      },
    })

    // Get the profile ID to use - prefer authUser.id (Cognito sub) for consistency with dashboard
    // The auth helper may have already mapped the ID to profile.id, but we want the original Cognito sub
    // for new profiles so dashboard queries work correctly
    const profileIdToUse = authUser?.id || crypto.randomUUID()

    if (!parentProfile) {
      // Create a new profile - use authUser's ID (Cognito sub) if authenticated
      // This ensures the profile ID matches what the dashboard queries use
      console.log(`[Checkout] Creating new profile with ID: ${profileIdToUse} for email: ${parent.email}`)
      parentProfile = await prisma.profile.create({
        data: {
          id: profileIdToUse,
          email: parent.email.toLowerCase(),
          firstName: parent.firstName,
          lastName: parent.lastName,
          phone: parent.phone,
          addressLine1: parent.addressLine1 || null,
          addressLine2: parent.addressLine2 || null,
          city: parent.city || null,
          state: parent.state || null,
          zipCode: parent.zipCode || null,
          emergencyContactName: parent.emergencyContactName || null,
          emergencyContactPhone: parent.emergencyContactPhone || null,
          emergencyContactRelationship: parent.emergencyContactRelationship || null,
        },
      })
    } else {
      // Update existing profile with billing address if provided
      // Only update fields that were provided and not empty
      const updateData: Record<string, string | null> = {}
      if (parent.firstName) updateData.firstName = parent.firstName
      if (parent.lastName) updateData.lastName = parent.lastName
      if (parent.phone) updateData.phone = parent.phone
      if (parent.addressLine1) updateData.addressLine1 = parent.addressLine1
      if (parent.addressLine2 !== undefined) updateData.addressLine2 = parent.addressLine2 || null
      if (parent.city) updateData.city = parent.city
      if (parent.state) updateData.state = parent.state
      if (parent.zipCode) updateData.zipCode = parent.zipCode
      if (parent.emergencyContactName) updateData.emergencyContactName = parent.emergencyContactName
      if (parent.emergencyContactPhone) updateData.emergencyContactPhone = parent.emergencyContactPhone
      if (parent.emergencyContactRelationship) updateData.emergencyContactRelationship = parent.emergencyContactRelationship

      if (Object.keys(updateData).length > 0) {
        parentProfile = await prisma.profile.update({
          where: { id: parentProfile.id },
          data: updateData,
        })
      }
    }

    // Look up promo code if provided
    let promoCodeRecord = null
    if (promoCode) {
      promoCodeRecord = await prisma.promoCode.findFirst({
        where: {
          tenantId,
          code: promoCode.toUpperCase(),
          isActive: true,
        },
      })
    }

    // Fetch addon taxability for tax calculation
    const addonIds = addOns.filter(a => isValidUUID(a.addonId)).map(a => a.addonId)
    const taxableAddonsMap = new Map<string, boolean>()
    if (addonIds.length > 0) {
      const addonsWithTaxInfo = await prisma.addon.findMany({
        where: { id: { in: addonIds } },
        select: { id: true, isTaxable: true },
      })
      addonsWithTaxInfo.forEach(a => taxableAddonsMap.set(a.id, a.isTaxable))
    }

    // Calculate per-camper pricing
    // Check if early bird pricing applies
    const today = new Date()
    const isEarlyBird = camp.earlyBirdPriceCents !== null &&
      camp.earlyBirdDeadline !== null &&
      today < new Date(camp.earlyBirdDeadline)
    const campPrice = isEarlyBird ? camp.earlyBirdPriceCents! : camp.priceCents
    const numCampers = campers.length
    // Sibling discount - 10% for 2nd+ campers (standard rate)
    const siblingDiscountPercent = 10

    // Create registrations for each camper
    const registrationIds: string[] = []
    const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''

    for (let i = 0; i < campers.length; i++) {
      const camperData = campers[i]

      // Calculate individual pricing
      const isFirstCamper = i === 0
      const siblingDiscount = isFirstCamper ? 0 : Math.round(campPrice * (siblingDiscountPercent / 100))
      const basePriceCents = campPrice
      const discountCents = siblingDiscount

      // Promo discount (apply only to first camper)
      const promoDiscountCents = isFirstCamper && promoCodeRecord
        ? (promoCodeRecord.discountType === 'percentage'
            ? Math.round(basePriceCents * (promoCodeRecord.discountValue / 100))
            : Math.min(promoCodeRecord.discountValue, basePriceCents))
        : 0

      // Calculate addons for this camper
      const camperAddOns = addOns.filter(a => a.camperId === camperData.id || !a.camperId)
      const relevantAddOns = i === 0 ? addOns : camperAddOns.filter(a => a.camperId === camperData.id)
      const addonsTotalCents = relevantAddOns.reduce((sum, a) => sum + a.unitPrice * a.quantity, 0)

      // Calculate tax on taxable addons (physical products like t-shirts)
      // Camp registration fees are services and typically not taxed
      const taxableAmount = relevantAddOns
        .filter(a => isValidUUID(a.addonId) && taxableAddonsMap.get(a.addonId) === true)
        .reduce((sum, a) => sum + a.unitPrice * a.quantity, 0)
      const taxCents = taxRatePercent > 0 ? Math.round(taxableAmount * (taxRatePercent / 100)) : 0

      // Find or create athlete profile
      let athlete = null

      // If existingAthleteId is provided, use that athlete
      if (camperData.existingAthleteId) {
        athlete = await prisma.athlete.findFirst({
          where: {
            id: camperData.existingAthleteId,
            parentId: parentProfile.id, // Ensure the athlete belongs to this parent
          },
        })

        // Update athlete with any new info (like grade, t-shirt size)
        if (athlete) {
          athlete = await prisma.athlete.update({
            where: { id: athlete.id },
            data: {
              grade: camperData.grade || athlete.grade,
              tShirtSize: camperData.tshirtSize || athlete.tShirtSize,
              medicalNotes: camperData.medicalNotes || athlete.medicalNotes,
              allergies: camperData.allergies || athlete.allergies,
            },
          })
        }
      }

      // If no existing athlete, find by name or create new
      if (!athlete) {
        athlete = await prisma.athlete.findFirst({
          where: {
            parentId: parentProfile.id,
            firstName: camperData.firstName,
            lastName: camperData.lastName,
          },
        })
      }

      if (!athlete) {
        // dateOfBirth is required - use a default if not provided
        const dob = camperData.dateOfBirth
          ? new Date(camperData.dateOfBirth)
          : new Date('2010-01-01') // Default for missing DOB

        athlete = await prisma.athlete.create({
          data: {
            parentId: parentProfile.id,
            firstName: camperData.firstName,
            lastName: camperData.lastName,
            dateOfBirth: dob,
            grade: camperData.grade || null,
            tShirtSize: camperData.tshirtSize || null,
            medicalNotes: camperData.medicalNotes || null,
            allergies: camperData.allergies || null,
          },
        })
      }

      // Create registration
      const { data: regData, error: regError } = await createRegistration({
        tenantId,
        campId,
        athleteId: athlete.id,
        parentId: parentProfile.id,
        basePriceCents,
        discountCents,
        promoDiscountCents,
        addonsTotalCents,
        taxCents,
        promoCodeId: isFirstCamper ? promoCodeRecord?.id : null,
        shirtSize: camperData.tshirtSize || null,
        specialConsiderations: camperData.specialConsiderations || null,
      })

      if (regError || !regData) {
        throw new Error(regError?.message || 'Failed to create registration')
      }

      registrationIds.push(regData.registrationId)

      // Add addons for this registration
      // Only add addons with valid UUIDs (skip default/fallback addons with non-UUID IDs)
      for (const addon of camperAddOns) {
        if (addon.camperId === camperData.id || (addon.camperId === null && i === 0)) {
          // Skip addons with non-UUID IDs (these are default/fallback addons)
          if (!isValidUUID(addon.addonId)) {
            console.log(`[Checkout] Skipping addon with non-UUID ID: ${addon.addonId}`)
            continue
          }
          await addRegistrationAddon({
            registrationId: regData.registrationId,
            addonId: addon.addonId,
            variantId: addon.variantId,
            quantity: addon.quantity,
            priceCents: addon.unitPrice * addon.quantity,
          })
        }
      }
    }

    // Create Stripe checkout session for ALL registrations
    // This ensures all campers' prices, add-ons, and taxes are included
    const primaryRegistrationId = registrationIds[0]
    const successUrl = `${baseUrl}/register/confirmation?registration_id=${primaryRegistrationId}`
    const cancelUrl = `${baseUrl}/camps/${campId}`

    const { data: checkoutData, error: checkoutError } = await createStripeCheckoutSession({
      campSessionId: campId,
      registrationId: primaryRegistrationId,
      registrationIds: registrationIds, // Pass all registration IDs
      successUrl,
      cancelUrl,
      tenantId,
    })

    if (checkoutError || !checkoutData) {
      // If checkout fails, mark registrations as cancelled
      await prisma.registration.updateMany({
        where: { id: { in: registrationIds } },
        data: { status: 'cancelled', cancellationReason: 'Checkout creation failed' },
      })
      throw new Error(checkoutError?.message || 'Failed to create checkout session')
    }

    return NextResponse.json({
      data: {
        registrationIds,
        checkoutUrl: checkoutData.checkoutUrl,
        sessionId: checkoutData.sessionId,
      },
    })
  } catch (error) {
    console.error('[API] Registration checkout error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
