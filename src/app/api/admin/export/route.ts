/**
 * Admin Export API
 *
 * GET /api/admin/export?type=athletes|emails|registrations|addons|waitlist
 * Optional filters: campId, status, tenantId
 *
 * Returns JSON data for client-side CSV/PDF conversion.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth/server'
import prisma from '@/lib/db/client'

const VALID_TYPES = ['athletes', 'emails', 'registrations', 'addons', 'waitlist']

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'hq_admin' && user.role !== 'licensee_owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')
    const campId = searchParams.get('campId') || undefined
    const status = searchParams.get('status') || undefined
    const tenantId = user.role === 'hq_admin'
      ? (searchParams.get('tenantId') || undefined)
      : (user.tenantId || undefined)

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    switch (type) {
      case 'athletes':
        return NextResponse.json({ data: await exportAthletes({ campId, tenantId }) })
      case 'emails':
        return NextResponse.json({ data: await exportEmails({ campId, tenantId }) })
      case 'registrations':
        return NextResponse.json({ data: await exportRegistrations({ campId, status, tenantId }) })
      case 'addons':
        return NextResponse.json(await exportAddons({ campId, tenantId }))
      case 'waitlist':
        return NextResponse.json({ data: await exportWaitlist({ campId, tenantId }) })
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch (error) {
    console.error('[GET /api/admin/export] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

interface ExportFilters {
  campId?: string
  status?: string
  tenantId?: string
}

async function exportAthletes({ campId, tenantId }: ExportFilters) {
  const where: Record<string, unknown> = {}

  if (campId) {
    // Only athletes registered for this camp
    where.registrations = { some: { campId } }
  }

  if (tenantId) {
    where.registrations = {
      ...((where.registrations as Record<string, unknown>) || {}),
      some: {
        ...((where.registrations as Record<string, Record<string, unknown>>)?.some || {}),
        camp: { tenantId },
      },
    }
  }

  const athletes = await prisma.athlete.findMany({
    where,
    include: {
      parent: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          city: true,
          state: true,
          zipCode: true,
        },
      },
    },
    orderBy: { lastName: 'asc' },
  })

  return athletes.map(a => ({
    athlete_first_name: a.firstName,
    athlete_last_name: a.lastName,
    date_of_birth: a.dateOfBirth?.toISOString().split('T')[0] || '',
    grade: a.grade || '',
    t_shirt_size: a.tShirtSize || '',
    medical_notes: a.medicalNotes || '',
    allergies: a.allergies || '',
    parent_first_name: a.parent?.firstName || '',
    parent_last_name: a.parent?.lastName || '',
    parent_email: a.parent?.email || '',
    parent_phone: a.parent?.phone || '',
    parent_city: a.parent?.city || '',
    parent_state: a.parent?.state || '',
    parent_zip: a.parent?.zipCode || '',
  }))
}

async function exportEmails({ campId, tenantId }: ExportFilters) {
  const where: Record<string, unknown> = {}

  if (campId || tenantId) {
    where.registrations = {
      some: {
        ...(campId ? { campId } : {}),
        ...(tenantId ? { camp: { tenantId } } : {}),
      },
    }
  }

  const profiles = await prisma.profile.findMany({
    where,
    select: {
      email: true,
      firstName: true,
      lastName: true,
    },
    distinct: ['email'],
    orderBy: { email: 'asc' },
  })

  return profiles.map(p => ({
    email: p.email,
    first_name: p.firstName || '',
    last_name: p.lastName || '',
  }))
}

async function exportRegistrations({ campId, status, tenantId }: ExportFilters) {
  const where: Record<string, unknown> = {}

  if (campId) where.campId = campId
  if (status) where.status = status
  if (tenantId) where.camp = { tenantId }

  const registrations = await prisma.registration.findMany({
    where,
    include: {
      camp: {
        select: {
          name: true,
          slug: true,
          startDate: true,
          endDate: true,
          tenantId: true,
          tenant: { select: { name: true } },
        },
      },
      athlete: {
        select: {
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          grade: true,
          tShirtSize: true,
        },
      },
      parent: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return registrations.map(r => ({
    registration_id: r.id,
    status: r.status,
    camp_name: r.camp?.name || '',
    camp_start: r.camp?.startDate?.toISOString().split('T')[0] || '',
    camp_end: r.camp?.endDate?.toISOString().split('T')[0] || '',
    licensee: r.camp?.tenant?.name || '',
    athlete_first_name: r.athlete?.firstName || '',
    athlete_last_name: r.athlete?.lastName || '',
    athlete_dob: r.athlete?.dateOfBirth?.toISOString().split('T')[0] || '',
    athlete_grade: r.athlete?.grade || '',
    athlete_shirt_size: r.athlete?.tShirtSize || '',
    parent_first_name: r.parent?.firstName || '',
    parent_last_name: r.parent?.lastName || '',
    parent_email: r.parent?.email || '',
    parent_phone: r.parent?.phone || '',
    base_price_cents: r.basePriceCents || 0,
    total_price_cents: r.totalPriceCents || 0,
    discount_cents: r.discountCents || 0,
    promo_discount_cents: r.promoDiscountCents || 0,
    waitlist_position: r.waitlistPosition || '',
    created_at: r.createdAt?.toISOString() || '',
  }))
}

async function exportAddons({ campId, tenantId }: ExportFilters) {
  const where: Record<string, unknown> = {
    registration: {
      status: { not: 'cancelled' },
      ...(campId ? { campId } : {}),
      ...(tenantId ? { camp: { tenantId } } : {}),
    },
  }

  const registrationAddons = await prisma.registrationAddon.findMany({
    where,
    include: {
      addon: { select: { name: true, collectSize: true } },
      variant: { select: { name: true } },
      registration: {
        select: {
          id: true,
          shirtSize: true,
          camp: { select: { id: true, name: true } },
          athlete: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              tShirtSize: true,
            },
          },
        },
      },
    },
    orderBy: [
      { registration: { camp: { name: 'asc' } } },
      { addon: { name: 'asc' } },
      { registration: { athlete: { lastName: 'asc' } } },
    ],
  })

  // Helper: resolve the size for an addon purchase
  // Priority: variant name > registration shirtSize > athlete tShirtSize
  const resolveSize = (ra: typeof registrationAddons[number]): string => {
    if (ra.variant?.name) return ra.variant.name
    // For shirt/size-collecting addons, fall back to registration or athlete shirt size
    const nameLower = ra.addon.name.toLowerCase()
    const isShirtAddon = ra.addon.collectSize
      || nameLower.includes('shirt') || nameLower.includes('tee')
      || nameLower.includes('t-shirt') || nameLower.includes('jersey')
    if (isShirtAddon) {
      return ra.registration.shirtSize
        || ra.registration.athlete.tShirtSize
        || ''
    }
    return ''
  }

  // Build flat rows grouped by camp > addon > variant
  const rows = registrationAddons.map(ra => ({
    camp_name: ra.registration.camp?.name || '',
    addon_name: ra.addon.name,
    variant: resolveSize(ra),
    athlete_first_name: ra.registration.athlete.firstName,
    athlete_last_name: ra.registration.athlete.lastName,
    quantity: ra.quantity,
    unit_price_cents: ra.priceCents,
    total_cents: ra.priceCents * ra.quantity,
  }))

  // Build size/variant summary for addons that have sizes
  const sizeSummary: Record<string, Record<string, number>> = {}
  for (const ra of registrationAddons) {
    const size = resolveSize(ra)
    if (!size) continue // Skip addons without any size info
    const campName = ra.registration.camp?.name || 'Unknown'
    const key = `${campName}|||${ra.addon.name}`
    if (!sizeSummary[key]) sizeSummary[key] = {}
    sizeSummary[key][size] = (sizeSummary[key][size] || 0) + ra.quantity
  }

  // Also build a per-addon quantity summary (for addons without sizes)
  const addonTotals: Record<string, number> = {}
  for (const ra of registrationAddons) {
    const campName = ra.registration.camp?.name || 'Unknown'
    const key = `${campName}|||${ra.addon.name}`
    addonTotals[key] = (addonTotals[key] || 0) + ra.quantity
  }

  // Convert size summary to structured data
  const sizeTotals = Object.entries(sizeSummary).map(([key, sizes]) => {
    const [campName, addonName] = key.split('|||')
    // Detect if this is a shirt/size addon for sort ordering
    const nameLower = addonName.toLowerCase()
    const isShirt = nameLower.includes('shirt') || nameLower.includes('tee') || nameLower.includes('t-shirt') || nameLower.includes('jersey')
    return {
      camp_name: campName,
      addon_name: addonName,
      is_shirt: isShirt,
      sizes,
      total: Object.values(sizes).reduce((s, n) => s + n, 0),
    }
  })

  // Sort: shirts first, then alphabetical
  sizeTotals.sort((a, b) => {
    if (a.is_shirt && !b.is_shirt) return -1
    if (!a.is_shirt && b.is_shirt) return 1
    return a.camp_name.localeCompare(b.camp_name) || a.addon_name.localeCompare(b.addon_name)
  })

  // Build per-camp addon quantity totals (for addons without variants)
  const quantityTotals = Object.entries(addonTotals)
    .filter(([key]) => !sizeSummary[key]) // Only addons that DON'T have variants
    .map(([key, total]) => {
      const [campName, addonName] = key.split('|||')
      return { camp_name: campName, addon_name: addonName, total }
    })

  return { data: rows, sizeTotals, quantityTotals }
}

async function exportWaitlist({ campId, tenantId }: ExportFilters) {
  const where: Record<string, unknown> = { status: 'waitlisted' }

  if (campId) where.campId = campId
  if (tenantId) where.camp = { tenantId }

  const registrations = await prisma.registration.findMany({
    where,
    include: {
      camp: { select: { name: true } },
      athlete: { select: { firstName: true, lastName: true } },
      parent: { select: { firstName: true, lastName: true, email: true, phone: true } },
    },
    orderBy: [
      { camp: { name: 'asc' } },
      { waitlistPosition: 'asc' },
    ],
  })

  return registrations.map(r => ({
    camp_name: r.camp?.name || '',
    position: r.waitlistPosition ?? '',
    athlete_first_name: r.athlete?.firstName || '',
    athlete_last_name: r.athlete?.lastName || '',
    parent_first_name: r.parent?.firstName || '',
    parent_last_name: r.parent?.lastName || '',
    parent_email: r.parent?.email || '',
    parent_phone: r.parent?.phone || '',
    offer_status: !r.waitlistOfferSentAt ? 'Waiting'
      : (r.waitlistOfferExpiresAt && new Date() > r.waitlistOfferExpiresAt) ? 'Offer Expired'
      : 'Offer Sent',
    joined_at: r.waitlistJoinedAt?.toISOString().split('T')[0] || r.createdAt?.toISOString().split('T')[0] || '',
  }))
}
