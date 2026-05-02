/**
 * Camp Add-on Purchases API
 *
 * GET /api/camps/[campId]/addon-purchases - List all add-on purchases for a camp
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'

const VALID_ROLES = ['hq_admin', 'licensee_owner', 'director', 'coach']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (!VALID_ROLES.includes(user.role as string)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { campId } = await params

    const registrationAddons = await prisma.registrationAddon.findMany({
      where: {
        registration: {
          campId,
          status: { not: 'cancelled' },
        },
      },
      include: {
        addon: { select: { name: true } },
        variant: { select: { name: true } },
        registration: {
          select: {
            id: true,
            athlete: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: [
        { registration: { athlete: { lastName: 'asc' } } },
        { registration: { athlete: { firstName: 'asc' } } },
      ],
    })

    // Group by athlete
    const camperMap = new Map<string, {
      athleteId: string
      firstName: string
      lastName: string
      registrationId: string
      addons: { name: string; variant: string | null; quantity: number; priceCents: number }[]
      addonsTotal: number
    }>()

    let totalRevenueCents = 0
    let totalItems = 0

    for (const ra of registrationAddons) {
      const athlete = ra.registration.athlete
      const key = athlete.id
      const itemTotal = ra.priceCents * ra.quantity

      if (!camperMap.has(key)) {
        camperMap.set(key, {
          athleteId: athlete.id,
          firstName: athlete.firstName,
          lastName: athlete.lastName,
          registrationId: ra.registration.id,
          addons: [],
          addonsTotal: 0,
        })
      }

      const camper = camperMap.get(key)!
      camper.addons.push({
        name: ra.addon.name,
        variant: ra.variant?.name ?? null,
        quantity: ra.quantity,
        priceCents: ra.priceCents,
      })
      camper.addonsTotal += itemTotal
      totalRevenueCents += itemTotal
      totalItems += ra.quantity
    }

    return NextResponse.json({
      data: {
        campers: Array.from(camperMap.values()),
        summary: {
          totalRevenueCents,
          totalCampersWithAddons: camperMap.size,
          totalItems,
        },
      },
    })
  } catch (error) {
    console.error('[GET /api/camps/[campId]/addon-purchases] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
