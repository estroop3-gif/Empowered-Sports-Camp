/**
 * Registration Detail API
 *
 * GET - Fetch registration details
 * PUT - Update registration and athlete info
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { prisma } from '@/lib/db/client'

interface RouteParams {
  params: Promise<{ registrationId: string }>
}

// GET - Fetch registration details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { registrationId } = await params

    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isStaff = ['hq_admin', 'licensee_owner', 'director', 'coach'].includes(
      user.role?.toLowerCase() || ''
    )

    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        camp: {
          select: {
            id: true,
            name: true,
            description: true,
            startDate: true,
            endDate: true,
            priceCents: true,
            location: {
              select: {
                name: true,
                city: true,
                state: true,
              },
            },
          },
        },
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            grade: true,
            tShirtSize: true,
            medicalNotes: true,
            allergies: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
            emergencyContactRelationship: true,
          },
        },
        promoCode: {
          select: {
            code: true,
            description: true,
            discountType: true,
            discountValue: true,
          },
        },
        registrationAddons: {
          include: {
            addon: {
              select: {
                name: true,
                description: true,
              },
            },
            variant: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    // Check ownership - staff or the parent who made the registration
    if (!isStaff && registration.parentId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Format response
    const data = {
      id: registration.id,
      status: registration.status,
      payment_status: registration.paymentStatus,
      shirt_size: registration.shirtSize,
      special_considerations: registration.specialConsiderations,
      created_at: registration.createdAt.toISOString(),
      camp: {
        id: registration.camp.id,
        name: registration.camp.name,
        description: registration.camp.description,
        start_date: registration.camp.startDate.toISOString(),
        end_date: registration.camp.endDate.toISOString(),
        location_name: registration.camp.location?.name || null,
        city: registration.camp.location?.city || null,
        state: registration.camp.location?.state || null,
        price_cents: registration.camp.priceCents,
      },
      athlete: {
        id: registration.athlete.id,
        first_name: registration.athlete.firstName,
        last_name: registration.athlete.lastName,
        date_of_birth: registration.athlete.dateOfBirth.toISOString(),
        grade: registration.athlete.grade,
        t_shirt_size: registration.athlete.tShirtSize,
        medical_notes: registration.athlete.medicalNotes,
        allergies: registration.athlete.allergies,
        emergency_contact_name: registration.athlete.emergencyContactName,
        emergency_contact_phone: registration.athlete.emergencyContactPhone,
        emergency_contact_relationship: registration.athlete.emergencyContactRelationship,
      },
      // Receipt / Payment info
      receipt: {
        base_price_cents: registration.basePriceCents,
        discount_cents: registration.discountCents,
        promo_discount_cents: registration.promoDiscountCents,
        addons_total_cents: registration.addonsTotalCents,
        tax_cents: registration.taxCents,
        total_price_cents: registration.totalPriceCents,
        payment_status: registration.paymentStatus,
        payment_method: registration.paymentMethod,
        paid_at: registration.paidAt?.toISOString() || null,
        promo_code: registration.promoCode ? {
          code: registration.promoCode.code,
          description: registration.promoCode.description,
          discount_type: registration.promoCode.discountType,
          discount_value: registration.promoCode.discountValue,
        } : null,
        addons: registration.registrationAddons.map(ra => ({
          name: ra.addon?.name || 'Add-on',
          variant: ra.variant?.name || null,
          quantity: ra.quantity,
          price_cents: ra.priceCents,
        })),
      },
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] Failed to fetch registration:', error)
    return NextResponse.json({ error: 'Failed to fetch registration' }, { status: 500 })
  }
}

// PUT - Update registration and athlete info
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { registrationId } = await params

    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isStaff = ['hq_admin', 'licensee_owner', 'director', 'coach'].includes(
      user.role?.toLowerCase() || ''
    )

    // Get the registration first to check ownership
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      select: { parentId: true, athleteId: true },
    })

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    // Check ownership
    if (!isStaff && registration.parentId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { shirtSize, specialConsiderations, athleteUpdates } = body

    // Update registration
    const updatedRegistration = await prisma.registration.update({
      where: { id: registrationId },
      data: {
        ...(shirtSize !== undefined && { shirtSize }),
        ...(specialConsiderations !== undefined && { specialConsiderations }),
      },
    })

    // Update athlete if athleteUpdates provided
    if (athleteUpdates) {
      const {
        medicalNotes,
        allergies,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelationship,
      } = athleteUpdates

      await prisma.athlete.update({
        where: { id: registration.athleteId },
        data: {
          ...(medicalNotes !== undefined && { medicalNotes }),
          ...(allergies !== undefined && { allergies }),
          ...(emergencyContactName !== undefined && { emergencyContactName }),
          ...(emergencyContactPhone !== undefined && { emergencyContactPhone }),
          ...(emergencyContactRelationship !== undefined && { emergencyContactRelationship }),
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: { id: updatedRegistration.id },
    })
  } catch (error) {
    console.error('[API] Failed to update registration:', error)
    return NextResponse.json({ error: 'Failed to update registration' }, { status: 500 })
  }
}
