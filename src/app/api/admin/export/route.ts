/**
 * Admin Export API
 *
 * GET /api/admin/export?type=athletes|emails|registrations
 * Optional filters: campId, status, tenantId
 *
 * Returns JSON data for client-side CSV conversion.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth/server'
import prisma from '@/lib/db/client'

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

    if (!type || !['athletes', 'emails', 'registrations'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be: athletes, emails, or registrations' },
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
