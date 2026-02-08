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

    // Validate required fields with specific error messages
    const missingFields: string[] = []
    if (!campId) missingFields.push('campId')
    if (!parent) missingFields.push('parent info')
    if (!campers?.length) missingFields.push('campers')

    if (missingFields.length > 0) {
      console.error('[Checkout] Missing fields:', missingFields, 'Payload:', { campId, tenantId, parent: !!parent, campersCount: campers?.length })
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify camp exists and has spots
    // First find the camp (tenantId might be null for legacy camps)
    const camp = await prisma.camp.findFirst({
      where: { id: campId },
      include: { tenant: { select: { id: true, taxRatePercent: true } } },
    })

    if (!camp) {
      return NextResponse.json({ error: 'Camp not found' }, { status: 404 })
    }

    // Use camp's tenantId or get default tenant if camp has no tenant
    let effectiveTenantId = tenantId || camp.tenantId
    let taxRatePercent = camp.tenant?.taxRatePercent ? Number(camp.tenant.taxRatePercent) : 0

    // If still no tenant, default to admin tenant
    if (!effectiveTenantId) {
      // Look for admin tenant by common slugs
      const adminTenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            { slug: 'admin' },
            { slug: 'empowered-athletes' },
            { slug: 'empowered' },
          ],
        },
      })

      if (adminTenant) {
        effectiveTenantId = adminTenant.id
        taxRatePercent = adminTenant.taxRatePercent ? Number(adminTenant.taxRatePercent) : 0
      } else {
        // Get the first tenant if no admin tenant found
        const firstTenant = await prisma.tenant.findFirst({
          orderBy: { createdAt: 'asc' },
        })

        if (firstTenant) {
          effectiveTenantId = firstTenant.id
          taxRatePercent = firstTenant.taxRatePercent ? Number(firstTenant.taxRatePercent) : 0
        } else {
          // Create a default tenant if none exists
          const newTenant = await prisma.tenant.create({
            data: {
              name: 'Empowered Athletes',
              slug: 'empowered-athletes',
            },
          })
          effectiveTenantId = newTenant.id
        }
      }

      // Update the camp to have this tenant
      await prisma.camp.update({
        where: { id: campId },
        data: { tenantId: effectiveTenantId },
      })
      console.log(`[Checkout] Assigned tenant ${effectiveTenantId} to camp ${campId}`)
    }


    // Get current registration count (exclude waitlisted and cancelled)
    const currentCount = await prisma.registration.count({
      where: { campId, status: { in: ['confirmed', 'pending'] } },
    })

    if (camp.capacity && currentCount + campers.length > camp.capacity) {
      return NextResponse.json(
        { error: 'Not enough spots available' },
        { status: 400 }
      )
    }

    // Find or create parent profile
    // Profile is linked to auth, so we look up by email first
    // If user is authenticated, we also check by their profile ID
    let parentProfile = await prisma.profile.findFirst({
      where: {
        email: parent.email.toLowerCase(),
      },
    })

    // If not found by email but user is authenticated, look up by their profile ID
    // This handles cases where the registration form email differs from the account email
    if (!parentProfile && authUser?.id) {
      parentProfile = await prisma.profile.findUnique({
        where: { id: authUser.id },
      })
    }

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
          tenantId: effectiveTenantId,
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

      // Calculate addons for this camper (before promo so we can scope the discount)
      const camperAddOns = addOns.filter(a => a.camperId === camperData.id || !a.camperId)
      const relevantAddOns = i === 0 ? addOns : camperAddOns.filter(a => a.camperId === camperData.id)
      const addonsTotalCents = relevantAddOns.reduce((sum, a) => sum + a.unitPrice * a.quantity, 0)

      // Promo discount (apply only to first camper, scoped by appliesTo)
      let promoDiscountCents = 0
      if (isFirstCamper && promoCodeRecord) {
        const appliesTo = promoCodeRecord.appliesTo || 'both'
        let eligible = 0
        if (appliesTo === 'registration' || appliesTo === 'both') eligible += basePriceCents
        if (appliesTo === 'addons' || appliesTo === 'both') eligible += addonsTotalCents
        promoDiscountCents = promoCodeRecord.discountType === 'percentage'
          ? Math.round(eligible * (promoCodeRecord.discountValue / 100))
          : Math.min(promoCodeRecord.discountValue, eligible)
      }

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
              gender: 'female',
              grade: camperData.grade || athlete.grade,
              tShirtSize: camperData.tshirtSize || athlete.tShirtSize,
              medicalNotes: camperData.medicalNotes || athlete.medicalNotes,
              allergies: camperData.allergies || athlete.allergies,
              emergencyContactName: parent.emergencyContactName || athlete.emergencyContactName,
              emergencyContactPhone: parent.emergencyContactPhone || athlete.emergencyContactPhone,
              emergencyContactRelationship: parent.emergencyContactRelationship || athlete.emergencyContactRelationship,
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

        // If found by name, update with any new info
        if (athlete) {
          athlete = await prisma.athlete.update({
            where: { id: athlete.id },
            data: {
              gender: 'female',
              grade: camperData.grade || athlete.grade,
              tShirtSize: camperData.tshirtSize || athlete.tShirtSize,
              medicalNotes: camperData.medicalNotes || athlete.medicalNotes,
              allergies: camperData.allergies || athlete.allergies,
              emergencyContactName: parent.emergencyContactName || athlete.emergencyContactName,
              emergencyContactPhone: parent.emergencyContactPhone || athlete.emergencyContactPhone,
              emergencyContactRelationship: parent.emergencyContactRelationship || athlete.emergencyContactRelationship,
            },
          })
        }
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
            gender: 'female',
            grade: camperData.grade || null,
            tShirtSize: camperData.tshirtSize || null,
            medicalNotes: camperData.medicalNotes || null,
            allergies: camperData.allergies || null,
            emergencyContactName: parent.emergencyContactName || null,
            emergencyContactPhone: parent.emergencyContactPhone || null,
            emergencyContactRelationship: parent.emergencyContactRelationship || null,
          },
        })
      }

      // Create authorized pickup records
      if (camperData.authorizedPickups?.length > 0) {
        try {
          for (const pickup of camperData.authorizedPickups) {
            if (pickup.name && pickup.relationship) {
              const existing = await prisma.authorizedPickup.findFirst({
                where: { athleteId: athlete.id, name: pickup.name, isActive: true },
              })
              if (!existing) {
                await prisma.authorizedPickup.create({
                  data: {
                    athleteId: athlete.id,
                    parentProfileId: parentProfile.id,
                    name: pickup.name,
                    relationship: pickup.relationship,
                    phone: pickup.phone || null,
                    photoIdOnFile: false,
                  },
                })
              }
            }
          }
        } catch (pickupError) {
          console.error('[Checkout] Failed to create authorized pickups:', pickupError)
          // Non-blocking: don't fail checkout for pickup creation errors
        }
      }

      // Create registration
      const { data: regData, error: regError } = await createRegistration({
        tenantId: effectiveTenantId,
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
    // Use /register/success which is the actual success page route
    // The session_id will be appended by Stripe using {CHECKOUT_SESSION_ID} template
    const successUrl = `${baseUrl}/register/success`
    // Use camp slug for cancel URL since the route is /camps/[slug], not /camps/[id]
    const cancelUrl = `${baseUrl}/camps/${camp.slug}`

    console.log('[Checkout] Creating Stripe session:', {
      campId,
      campSlug: camp.slug,
      primaryRegistrationId,
      registrationIds,
      effectiveTenantId,
      successUrl,
      cancelUrl,
    })

    const { data: checkoutData, error: checkoutError } = await createStripeCheckoutSession({
      campSessionId: campId,
      registrationId: primaryRegistrationId,
      registrationIds: registrationIds, // Pass all registration IDs
      successUrl,
      cancelUrl,
      tenantId: effectiveTenantId,
    })

    if (checkoutError || !checkoutData) {
      // If checkout fails, mark registrations as cancelled
      console.error('[Checkout] Stripe session creation failed:', {
        error: checkoutError?.message,
        registrationIds,
        effectiveTenantId,
      })
      await prisma.registration.updateMany({
        where: { id: { in: registrationIds } },
        data: { status: 'cancelled', cancellationReason: 'Checkout creation failed' },
      })
      throw new Error(checkoutError?.message || 'Failed to create checkout session')
    }

    console.log('[Checkout] Stripe session created:', {
      sessionId: checkoutData.sessionId,
      checkoutUrl: checkoutData.checkoutUrl,
    })

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
