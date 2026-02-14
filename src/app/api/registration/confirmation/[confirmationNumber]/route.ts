/**
 * Confirmation Lookup API
 *
 * GET /api/registration/confirmation/[confirmationNumber]
 * Looks up registrations by confirmation number (no auth required — the
 * confirmation number itself acts as a token).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

function formatTimeValue(time: Date | null): string {
  if (!time) return ''
  const hours = time.getUTCHours()
  const minutes = time.getUTCMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const h = hours % 12 || 12
  return `${h}:${minutes.toString().padStart(2, '0')} ${ampm}`
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ confirmationNumber: string }> }
) {
  try {
    const { confirmationNumber } = await params

    if (!confirmationNumber) {
      return NextResponse.json({ error: 'Confirmation number required' }, { status: 400 })
    }

    const registrations = await prisma.registration.findMany({
      where: { confirmationNumber },
      include: {
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
      },
    })

    if (registrations.length === 0) {
      return NextResponse.json({ error: 'Confirmation not found' }, { status: 404 })
    }

    const camp = registrations[0].camp
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

    const receiptRegistrations = registrations.map((r) => {
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

    return NextResponse.json({
      data: {
        confirmationNumber,
        campName: camp.name,
        campDates: `${startDate} - ${endDate}`,
        campTimes,
        location: locationStr,
        locationAddress,
        athleteNames: registrations.map((r) => `${r.athlete.firstName} ${r.athlete.lastName}`),
        totalPaid: `$${(grandTotalCents / 100).toFixed(2)}`,
        registrationIds: registrations.map((r) => r.id),
        receipt: {
          registrations: receiptRegistrations,
          subtotalCents,
          totalDiscountCents,
          totalAddonsCents,
          taxCents,
          grandTotalCents,
        },
      },
    })
  } catch (error) {
    console.error('[Confirmation API] Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
