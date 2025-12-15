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
import type { RegistrationPayload } from '@/types/registration'

export async function POST(request: NextRequest) {
  try {
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

    // Verify camp exists and has spots
    const camp = await prisma.camp.findFirst({
      where: { id: campId, tenantId },
    })

    if (!camp) {
      return NextResponse.json({ error: 'Camp not found' }, { status: 404 })
    }

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
    // Profile is linked to auth, so we look up by email
    let parentProfile = await prisma.profile.findFirst({
      where: {
        email: parent.email.toLowerCase(),
      },
    })

    if (!parentProfile) {
      // Create a new profile with a generated UUID
      parentProfile = await prisma.profile.create({
        data: {
          id: crypto.randomUUID(),
          email: parent.email.toLowerCase(),
          firstName: parent.firstName,
          lastName: parent.lastName,
          phone: parent.phone,
        },
      })
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

    // Calculate per-camper pricing
    const campPrice = camp.priceCents
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
      const addonsTotalCents = i === 0
        ? addOns.reduce((sum, a) => sum + a.unitPrice * a.quantity, 0)
        : camperAddOns.filter(a => a.camperId === camperData.id).reduce((sum, a) => sum + a.unitPrice * a.quantity, 0)

      // Find or create athlete profile
      let athlete = await prisma.athlete.findFirst({
        where: {
          parentId: parentProfile.id,
          firstName: camperData.firstName,
          lastName: camperData.lastName,
        },
      })

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
        addonsTotalCents: i === 0 ? addonsTotalCents : camperAddOns.filter(a => a.camperId === camperData.id).reduce((sum, a) => sum + a.unitPrice * a.quantity, 0),
        promoCodeId: isFirstCamper ? promoCodeRecord?.id : null,
        shirtSize: camperData.tshirtSize || null,
        specialConsiderations: camperData.specialConsiderations || null,
      })

      if (regError || !regData) {
        throw new Error(regError?.message || 'Failed to create registration')
      }

      registrationIds.push(regData.registrationId)

      // Add addons for this registration
      for (const addon of camperAddOns) {
        if (addon.camperId === camperData.id || (addon.camperId === null && i === 0)) {
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

    // Create Stripe checkout session for the first registration
    // (All registrations will be linked via parent profile)
    const primaryRegistrationId = registrationIds[0]
    const successUrl = `${baseUrl}/register/confirmation?registration_id=${primaryRegistrationId}`
    const cancelUrl = `${baseUrl}/camps/${campId}`

    const { data: checkoutData, error: checkoutError } = await createStripeCheckoutSession({
      campSessionId: campId,
      registrationId: primaryRegistrationId,
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
