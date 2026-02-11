/**
 * Waitlist Join API
 *
 * POST /api/waitlist/join — Join the waitlist for a camp
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { joinWaitlist } from '@/lib/services/waitlist'

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUserFromRequest(request)
    const body = await request.json()

    const {
      campId,
      tenantId,
      parent,
      campers,
      promoCode,
    } = body

    if (!campId || !parent || !campers?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: campId, parent, campers' },
        { status: 400 }
      )
    }

    // Verify camp exists
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      include: { tenant: { select: { id: true } } },
    })

    if (!camp) {
      return NextResponse.json({ error: 'Camp not found' }, { status: 404 })
    }

    if (camp.waitlistEnabled === false) {
      return NextResponse.json(
        { error: 'Waitlist is not enabled for this camp' },
        { status: 403 }
      )
    }

    const effectiveTenantId = tenantId || camp.tenantId
    if (!effectiveTenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
    }

    // Find or create parent profile
    const profileIdToUse = authUser?.id || crypto.randomUUID()
    let parentProfile = await prisma.profile.findFirst({
      where: { email: parent.email.toLowerCase() },
    })

    if (!parentProfile && authUser?.id) {
      parentProfile = await prisma.profile.findUnique({
        where: { id: authUser.id },
      })
    }

    if (!parentProfile) {
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
      // Update parent profile
      const updateData: Record<string, string | null> = {}
      if (parent.firstName) updateData.firstName = parent.firstName
      if (parent.lastName) updateData.lastName = parent.lastName
      if (parent.phone) updateData.phone = parent.phone
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

    // Calculate pricing
    const today = new Date()
    const isEarlyBird = camp.earlyBirdPriceCents !== null &&
      camp.earlyBirdDeadline !== null &&
      today < new Date(camp.earlyBirdDeadline)
    const campPrice = isEarlyBird ? camp.earlyBirdPriceCents! : camp.priceCents
    const siblingDiscountPercent = 10

    const registrationIds: string[] = []
    let firstPosition = 0

    for (let i = 0; i < campers.length; i++) {
      const camperData = campers[i]

      const isFirstCamper = i === 0
      const siblingDiscount = isFirstCamper ? 0 : Math.round(campPrice * (siblingDiscountPercent / 100))

      // Promo discount on first camper only
      let promoDiscountCents = 0
      if (isFirstCamper && promoCodeRecord) {
        const appliesTo = promoCodeRecord.appliesTo || 'both'
        let eligible = 0
        if (appliesTo === 'registration' || appliesTo === 'both') eligible += campPrice
        promoDiscountCents = promoCodeRecord.discountType === 'percentage'
          ? Math.round(eligible * (promoCodeRecord.discountValue / 100))
          : Math.min(promoCodeRecord.discountValue, eligible)
      }

      // Find or create athlete
      let athlete = null
      if (camperData.existingAthleteId) {
        athlete = await prisma.athlete.findFirst({
          where: { id: camperData.existingAthleteId, parentId: parentProfile.id },
        })
      }
      if (!athlete) {
        athlete = await prisma.athlete.findFirst({
          where: { parentId: parentProfile.id, firstName: camperData.firstName, lastName: camperData.lastName },
        })
      }
      if (!athlete) {
        const dob = camperData.dateOfBirth ? new Date(camperData.dateOfBirth) : new Date('2010-01-01')
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

      // Create authorized pickups
      if (camperData.authorizedPickups?.length > 0) {
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
              }).catch(() => {}) // Non-blocking
            }
          }
        }
      }

      const result = await joinWaitlist({
        campId,
        tenantId: effectiveTenantId,
        parentId: parentProfile.id,
        athleteId: athlete.id,
        basePriceCents: campPrice,
        discountCents: siblingDiscount,
        promoDiscountCents,
        promoCodeId: isFirstCamper ? promoCodeRecord?.id : null,
        shirtSize: camperData.tshirtSize || null,
        specialConsiderations: camperData.specialConsiderations || null,
        friendRequests: camperData.friendRequests || [],
      })

      registrationIds.push(result.registrationId)
      if (i === 0) firstPosition = result.waitlistPosition
    }

    return NextResponse.json({
      data: {
        registrationIds,
        waitlistPosition: firstPosition,
      },
    })
  } catch (error) {
    console.error('[POST /api/waitlist/join] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
