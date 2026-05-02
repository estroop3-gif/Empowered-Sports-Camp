/**
 * T-Shirt Size Confirmation Email API
 *
 * POST /api/admin/camps/[campId]/tshirt-email
 * Sends branded confirmation emails to parents who purchased apparel add-ons,
 * showing their selected size(s) and camp details.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { prisma } from '@/lib/db/client'
import { sendTshirtSizeConfirmationEmail } from '@/lib/services/email'

interface RouteContext {
  params: Promise<{ campId: string }>
}

const SIZE_LABELS: Record<string, string> = {
  YXS: 'Youth XS',
  YS: 'Youth S',
  YM: 'Youth M',
  YL: 'Youth L',
  AS: 'Adult S',
  AM: 'Adult M',
  AL: 'Adult L',
  AXL: 'Adult XL',
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    const userRole = user.role?.toLowerCase() || ''
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { campId } = await context.params

    // Fetch the camp
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: { id: true, name: true, startDate: true, tenantId: true },
    })

    if (!camp) {
      return NextResponse.json({ error: 'Camp not found' }, { status: 404 })
    }

    // Non-HQ admins can only send for their own tenant's camps
    if (userRole !== 'hq_admin' && user.tenantId !== camp.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Query registration addons where addon.collectSize = true, with variant info
    const registrationAddons = await prisma.registrationAddon.findMany({
      where: {
        registration: {
          campId,
          status: { not: 'cancelled' },
        },
        addon: {
          collectSize: true,
        },
      },
      include: {
        variant: true,
        addon: { select: { name: true } },
        registration: {
          select: {
            shirtSize: true,
            athlete: {
              select: { firstName: true, lastName: true },
            },
            parent: {
              select: { email: true, firstName: true },
            },
          },
        },
      },
    })

    if (registrationAddons.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, total: 0, message: 'No apparel add-on registrations found' })
    }

    // Group by parent email
    const parentMap = new Map<string, {
      parentFirstName: string
      camperSizes: { camperName: string; addonName: string; sizeName: string }[]
    }>()

    for (const ra of registrationAddons) {
      const reg = ra.registration
      const parentEmail = reg.parent.email
      const parentFirstName = reg.parent.firstName || 'there'
      const camperName = `${reg.athlete.firstName} ${reg.athlete.lastName}`
      const addonName = ra.addon.name

      // Size comes from variant name, or from registration.shirtSize as fallback
      const sizeName = ra.variant?.name
        || (reg.shirtSize ? (SIZE_LABELS[reg.shirtSize] || reg.shirtSize) : 'Not specified')

      if (!parentMap.has(parentEmail)) {
        parentMap.set(parentEmail, { parentFirstName, camperSizes: [] })
      }
      parentMap.get(parentEmail)!.camperSizes.push({ camperName, addonName, sizeName })
    }

    const campStartDate = camp.startDate
      ? new Date(camp.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'TBD'

    let sent = 0
    let failed = 0

    for (const [parentEmail, data] of parentMap) {
      const result = await sendTshirtSizeConfirmationEmail({
        parentEmail,
        parentFirstName: data.parentFirstName,
        campName: camp.name,
        campStartDate,
        camperSizes: data.camperSizes,
        tenantId: camp.tenantId,
      })

      if (result.success) {
        sent++
      } else {
        failed++
        console.error(`[TshirtEmail] Failed for ${parentEmail}:`, result.error)
      }
    }

    return NextResponse.json({ sent, failed, total: parentMap.size })
  } catch (error) {
    console.error('[API] POST /api/admin/camps/[campId]/tshirt-email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
