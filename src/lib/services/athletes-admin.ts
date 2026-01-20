/**
 * Athletes Admin Service
 *
 * Service module for athlete management in admin/licensee/coach dashboards.
 * All functions return { data, error } tuples and never throw.
 */

import prisma from '@/lib/db/client'
import { AthleteRiskFlag } from '@/generated/prisma'

// =============================================================================
// Types
// =============================================================================

export interface AdminAthlete {
  id: string
  tenant_id: string | null
  parent_id: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string | null
  grade: string | null
  school: string | null
  medical_notes: string | null
  allergies: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relationship: string | null
  photo_url: string | null
  t_shirt_size: string | null
  jersey_number_preference: string | null
  primary_sport_interest: string | null
  secondary_sport_interest: string | null
  pickup_notes: string | null
  is_active: boolean
  risk_flag: string | null
  internal_notes: string | null
  created_at: string
  updated_at: string
  parent?: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    phone: string | null
    city: string | null
    state: string | null
  }
  tenant?: {
    id: string
    name: string
    slug: string
  } | null
  registration_count?: number
  upcoming_camps_count?: number
  completed_camps_count?: number
}

export interface AthleteRegistration {
  id: string
  camp_id: string
  camp_name: string
  camp_start_date: string
  camp_end_date: string
  venue_name: string | null
  city: string | null
  state: string | null
  status: string
  payment_status: string
  total_price_cents: number
  created_at: string
}

export interface ListAthletesParams {
  tenantId?: string
  search?: string
  grade?: string
  minAge?: number
  maxAge?: number
  city?: string
  state?: string
  campId?: string
  isActive?: boolean
  riskFlag?: string
  limit?: number
  offset?: number
}

export interface UpdateAthleteAdminInput {
  first_name?: string
  last_name?: string
  date_of_birth?: string
  gender?: string
  grade?: string
  school?: string
  medical_notes?: string
  allergies?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
  photo_url?: string
  t_shirt_size?: string
  jersey_number_preference?: string
  primary_sport_interest?: string
  secondary_sport_interest?: string
  pickup_notes?: string
  is_active?: boolean
  risk_flag?: string | null
  internal_notes?: string
  tenant_id?: string
}

// =============================================================================
// Helper Functions
// =============================================================================

function transformAthlete(athlete: {
  id: string
  parentId: string
  tenantId: string | null
  firstName: string
  lastName: string
  dateOfBirth: Date
  gender: string | null
  grade: string | null
  school: string | null
  medicalNotes: string | null
  allergies: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  emergencyContactRelationship: string | null
  photoUrl: string | null
  tShirtSize: string | null
  jerseyNumberPreference: string | null
  primarySportInterest: string | null
  secondarySportInterest: string | null
  pickupNotes: string | null
  isActive: boolean
  riskFlag: string | null
  internalNotes: string | null
  createdAt: Date
  updatedAt: Date
  parent?: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    phone: string | null
    city: string | null
    state: string | null
  }
  tenant?: {
    id: string
    name: string
    slug: string
  } | null
  _count?: {
    registrations: number
  }
}): AdminAthlete {
  return {
    id: athlete.id,
    tenant_id: athlete.tenantId,
    parent_id: athlete.parentId,
    first_name: athlete.firstName,
    last_name: athlete.lastName,
    date_of_birth: athlete.dateOfBirth.toISOString().split('T')[0],
    gender: athlete.gender,
    grade: athlete.grade,
    school: athlete.school,
    medical_notes: athlete.medicalNotes,
    allergies: athlete.allergies,
    emergency_contact_name: athlete.emergencyContactName,
    emergency_contact_phone: athlete.emergencyContactPhone,
    emergency_contact_relationship: athlete.emergencyContactRelationship,
    photo_url: athlete.photoUrl,
    t_shirt_size: athlete.tShirtSize,
    jersey_number_preference: athlete.jerseyNumberPreference,
    primary_sport_interest: athlete.primarySportInterest,
    secondary_sport_interest: athlete.secondarySportInterest,
    pickup_notes: athlete.pickupNotes,
    is_active: athlete.isActive,
    risk_flag: athlete.riskFlag,
    internal_notes: athlete.internalNotes,
    created_at: athlete.createdAt.toISOString(),
    updated_at: athlete.updatedAt.toISOString(),
    parent: athlete.parent ? {
      id: athlete.parent.id,
      email: athlete.parent.email,
      first_name: athlete.parent.firstName,
      last_name: athlete.parent.lastName,
      phone: athlete.parent.phone,
      city: athlete.parent.city,
      state: athlete.parent.state,
    } : undefined,
    tenant: athlete.tenant ? {
      id: athlete.tenant.id,
      name: athlete.tenant.name,
      slug: athlete.tenant.slug,
    } : null,
    registration_count: athlete._count?.registrations,
  }
}

function calculateAge(dateOfBirth: Date): number {
  const today = new Date()
  let age = today.getFullYear() - dateOfBirth.getFullYear()
  const m = today.getMonth() - dateOfBirth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--
  }
  return age
}

// =============================================================================
// List Functions
// =============================================================================

/**
 * List athletes for HQ Admin (global view across all tenants)
 */
export async function listAthletesForAdmin(
  params: ListAthletesParams
): Promise<{ data: { athletes: AdminAthlete[]; total: number } | null; error: Error | null }> {
  try {
    const {
      tenantId,
      search,
      grade,
      minAge,
      maxAge,
      city,
      state,
      campId,
      isActive,
      riskFlag,
      limit = 50,
      offset = 0,
    } = params

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (tenantId) {
      where.tenantId = tenantId
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { school: { contains: search, mode: 'insensitive' } },
        { parent: { email: { contains: search, mode: 'insensitive' } } },
        { parent: { firstName: { contains: search, mode: 'insensitive' } } },
        { parent: { lastName: { contains: search, mode: 'insensitive' } } },
      ]
    }

    if (grade) {
      where.grade = grade
    }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    if (riskFlag) {
      where.riskFlag = riskFlag as AthleteRiskFlag
    }

    // Age filtering requires date calculation
    if (minAge !== undefined || maxAge !== undefined) {
      const today = new Date()
      if (maxAge !== undefined) {
        const minDate = new Date(today.getFullYear() - maxAge - 1, today.getMonth(), today.getDate())
        where.dateOfBirth = { ...where.dateOfBirth, gte: minDate }
      }
      if (minAge !== undefined) {
        const maxDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate())
        where.dateOfBirth = { ...where.dateOfBirth, lte: maxDate }
      }
    }

    // Parent location filtering
    if (city || state) {
      where.parent = { ...where.parent }
      if (city) {
        where.parent.city = { contains: city, mode: 'insensitive' }
      }
      if (state) {
        where.parent.state = state
      }
    }

    // Camp filtering
    if (campId) {
      where.registrations = {
        some: { campId }
      }
    }

    const [athletes, total] = await Promise.all([
      prisma.athlete.findMany({
        where,
        include: {
          parent: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              city: true,
              state: true,
            },
          },
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: { registrations: true },
          },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: limit,
        skip: offset,
      }),
      prisma.athlete.count({ where }),
    ])

    // Calculate upcoming and completed camps for each athlete
    const athleteIds = athletes.map(a => a.id)
    const now = new Date()

    const registrationCounts = await prisma.registration.groupBy({
      by: ['athleteId'],
      where: {
        athleteId: { in: athleteIds },
        status: { not: 'cancelled' },
      },
      _count: true,
    })

    const upcomingCounts = await prisma.registration.groupBy({
      by: ['athleteId'],
      where: {
        athleteId: { in: athleteIds },
        status: { not: 'cancelled' },
        camp: { startDate: { gte: now } },
      },
      _count: true,
    })

    const countMap = new Map(registrationCounts.map(r => [r.athleteId, r._count]))
    const upcomingMap = new Map(upcomingCounts.map(r => [r.athleteId, r._count]))

    const transformedAthletes = athletes.map(athlete => {
      const transformed = transformAthlete(athlete as Parameters<typeof transformAthlete>[0])
      const totalCount = countMap.get(athlete.id) || 0
      const upcomingCount = upcomingMap.get(athlete.id) || 0
      transformed.upcoming_camps_count = upcomingCount
      transformed.completed_camps_count = totalCount - upcomingCount
      return transformed
    })

    return {
      data: { athletes: transformedAthletes, total },
      error: null,
    }
  } catch (error) {
    console.error('[Athletes Admin] Failed to list athletes:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * List athletes for Licensee (scoped to their tenant)
 */
export async function listAthletesForLicensee(
  tenantId: string,
  params: Omit<ListAthletesParams, 'tenantId'>
): Promise<{ data: { athletes: AdminAthlete[]; total: number } | null; error: Error | null }> {
  // Athletes are scoped by tenant via registrations
  // An athlete belongs to a tenant if they have registered for a camp in that tenant
  try {
    const {
      search,
      grade,
      minAge,
      maxAge,
      campId,
      isActive,
      riskFlag,
      limit = 50,
      offset = 0,
    } = params

    // Build where clause - athletes with registrations in this tenant OR tenant_id set
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      OR: [
        { tenantId },
        { registrations: { some: { tenantId } } },
      ],
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { school: { contains: search, mode: 'insensitive' } },
            { parent: { email: { contains: search, mode: 'insensitive' } } },
            { parent: { firstName: { contains: search, mode: 'insensitive' } } },
            { parent: { lastName: { contains: search, mode: 'insensitive' } } },
          ],
        },
      ]
    }

    if (grade) {
      where.grade = grade
    }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    if (riskFlag) {
      where.riskFlag = riskFlag as AthleteRiskFlag
    }

    // Age filtering
    if (minAge !== undefined || maxAge !== undefined) {
      const today = new Date()
      if (maxAge !== undefined) {
        const minDate = new Date(today.getFullYear() - maxAge - 1, today.getMonth(), today.getDate())
        where.dateOfBirth = { ...where.dateOfBirth, gte: minDate }
      }
      if (minAge !== undefined) {
        const maxDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate())
        where.dateOfBirth = { ...where.dateOfBirth, lte: maxDate }
      }
    }

    // Camp filtering within tenant
    if (campId) {
      where.registrations = {
        some: { campId, tenantId }
      }
    }

    const [athletes, total] = await Promise.all([
      prisma.athlete.findMany({
        where,
        include: {
          parent: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              city: true,
              state: true,
            },
          },
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: { registrations: { where: { tenantId } } },
          },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: limit,
        skip: offset,
      }),
      prisma.athlete.count({ where }),
    ])

    // Count registrations for this tenant only
    const athleteIds = athletes.map(a => a.id)
    const now = new Date()

    const upcomingCounts = await prisma.registration.groupBy({
      by: ['athleteId'],
      where: {
        athleteId: { in: athleteIds },
        tenantId,
        status: { not: 'cancelled' },
        camp: { startDate: { gte: now } },
      },
      _count: true,
    })

    const completedCounts = await prisma.registration.groupBy({
      by: ['athleteId'],
      where: {
        athleteId: { in: athleteIds },
        tenantId,
        status: { not: 'cancelled' },
        camp: { endDate: { lt: now } },
      },
      _count: true,
    })

    const upcomingMap = new Map(upcomingCounts.map(r => [r.athleteId, r._count]))
    const completedMap = new Map(completedCounts.map(r => [r.athleteId, r._count]))

    const transformedAthletes = athletes.map(athlete => {
      const transformed = transformAthlete(athlete as Parameters<typeof transformAthlete>[0])
      transformed.upcoming_camps_count = upcomingMap.get(athlete.id) || 0
      transformed.completed_camps_count = completedMap.get(athlete.id) || 0
      return transformed
    })

    return {
      data: { athletes: transformedAthletes, total },
      error: null,
    }
  } catch (error) {
    console.error('[Athletes Admin] Failed to list athletes for licensee:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * List athletes for Coach (scoped to camps they are assigned to)
 */
export async function listAthletesForCoach(
  coachProfileId: string,
  params: Omit<ListAthletesParams, 'tenantId'>
): Promise<{ data: { athletes: AdminAthlete[]; total: number } | null; error: Error | null }> {
  try {
    // First, get camps where this coach is assigned
    const coachAssignments = await prisma.campStaffAssignment.findMany({
      where: {
        userId: coachProfileId,
        role: 'coach',
      },
      select: { campId: true },
    })

    const campIds = coachAssignments.map((a: { campId: string }) => a.campId)

    if (campIds.length === 0) {
      return { data: { athletes: [], total: 0 }, error: null }
    }

    const {
      search,
      grade,
      minAge,
      maxAge,
      campId,
      isActive,
      limit = 50,
      offset = 0,
    } = params

    // Build where clause - athletes registered for coach's camps
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      registrations: {
        some: {
          campId: campId ? { equals: campId } : { in: campIds },
          status: { not: 'cancelled' },
        },
      },
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { school: { contains: search, mode: 'insensitive' } },
          ],
        },
      ]
    }

    if (grade) {
      where.grade = grade
    }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    // Age filtering
    if (minAge !== undefined || maxAge !== undefined) {
      const today = new Date()
      if (maxAge !== undefined) {
        const minDate = new Date(today.getFullYear() - maxAge - 1, today.getMonth(), today.getDate())
        where.dateOfBirth = { ...where.dateOfBirth, gte: minDate }
      }
      if (minAge !== undefined) {
        const maxDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate())
        where.dateOfBirth = { ...where.dateOfBirth, lte: maxDate }
      }
    }

    const [athletes, total] = await Promise.all([
      prisma.athlete.findMany({
        where,
        include: {
          parent: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              city: true,
              state: true,
            },
          },
          _count: {
            select: { registrations: { where: { campId: { in: campIds } } } },
          },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: limit,
        skip: offset,
      }),
      prisma.athlete.count({ where }),
    ])

    const transformedAthletes = athletes.map(athlete => {
      return transformAthlete(athlete as Parameters<typeof transformAthlete>[0])
    })

    return {
      data: { athletes: transformedAthletes, total },
      error: null,
    }
  } catch (error) {
    console.error('[Athletes Admin] Failed to list athletes for coach:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Single Athlete Functions
// =============================================================================

/**
 * Get athlete by ID with full details
 */
export async function getAthleteById(params: {
  athleteId: string
  requestingTenantId?: string
  role: string
}): Promise<{ data: AdminAthlete | null; error: Error | null }> {
  try {
    const { athleteId, requestingTenantId, role } = params

    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      include: {
        parent: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            city: true,
            state: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: { registrations: true },
        },
      },
    })

    if (!athlete) {
      return { data: null, error: null }
    }

    // Access control
    if (role !== 'hq_admin') {
      // Licensee can only view athletes in their tenant or with registrations in their camps
      if (requestingTenantId) {
        if (athlete.tenantId !== requestingTenantId) {
          // Check if athlete has any registrations in this tenant
          const hasRegistration = await prisma.registration.findFirst({
            where: {
              athleteId,
              tenantId: requestingTenantId,
            },
          })

          if (!hasRegistration) {
            return { data: null, error: new Error('Access denied: Athlete not in your tenant') }
          }
        }
      }
    }

    return {
      data: transformAthlete(athlete as Parameters<typeof transformAthlete>[0]),
      error: null,
    }
  } catch (error) {
    console.error('[Athletes Admin] Failed to get athlete:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get athlete registrations (enrollment history)
 */
export async function listAthleteRegistrations(params: {
  athleteId: string
  requestingTenantId?: string
  role: string
}): Promise<{ data: AthleteRegistration[] | null; error: Error | null }> {
  try {
    const { athleteId, requestingTenantId, role } = params

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { athleteId }

    // Scope to tenant for non-HQ roles
    if (role !== 'hq_admin' && requestingTenantId) {
      where.tenantId = requestingTenantId
    }

    const registrations = await prisma.registration.findMany({
      where,
      include: {
        camp: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            venue: {
              select: {
                name: true,
                city: true,
                state: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const transformed: AthleteRegistration[] = registrations.map(reg => ({
      id: reg.id,
      camp_id: reg.campId,
      camp_name: reg.camp.name,
      camp_start_date: reg.camp.startDate.toISOString().split('T')[0],
      camp_end_date: reg.camp.endDate.toISOString().split('T')[0],
      venue_name: reg.camp.venue?.name || null,
      city: reg.camp.venue?.city || null,
      state: reg.camp.venue?.state || null,
      status: reg.status,
      payment_status: reg.paymentStatus,
      total_price_cents: reg.totalPriceCents,
      created_at: reg.createdAt.toISOString(),
    }))

    return { data: transformed, error: null }
  } catch (error) {
    console.error('[Athletes Admin] Failed to list athlete registrations:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Mutation Functions
// =============================================================================

/**
 * Update athlete (admin/licensee)
 */
export async function updateAthleteAdmin(params: {
  athleteId: string
  role: string
  requestingTenantId?: string
  input: UpdateAthleteAdminInput
}): Promise<{ data: AdminAthlete | null; error: Error | null }> {
  try {
    const { athleteId, role, requestingTenantId, input } = params

    // First verify access
    const existing = await prisma.athlete.findUnique({
      where: { id: athleteId },
      include: {
        registrations: {
          where: requestingTenantId ? { tenantId: requestingTenantId } : undefined,
          take: 1,
        },
      },
    })

    if (!existing) {
      return { data: null, error: new Error('Athlete not found') }
    }

    // Access control
    if (role !== 'hq_admin') {
      if (requestingTenantId) {
        if (existing.tenantId !== requestingTenantId && existing.registrations.length === 0) {
          return { data: null, error: new Error('Access denied: Cannot modify athletes outside your tenant') }
        }
        // Licensee cannot change tenant_id
        if (input.tenant_id !== undefined && input.tenant_id !== requestingTenantId) {
          return { data: null, error: new Error('Access denied: Cannot reassign athlete to different tenant') }
        }
      }
    }

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {}

    if (input.first_name !== undefined) updateData.firstName = input.first_name
    if (input.last_name !== undefined) updateData.lastName = input.last_name
    if (input.date_of_birth !== undefined) updateData.dateOfBirth = new Date(input.date_of_birth)
    if (input.gender !== undefined) updateData.gender = input.gender
    if (input.grade !== undefined) updateData.grade = input.grade
    if (input.school !== undefined) updateData.school = input.school
    if (input.medical_notes !== undefined) updateData.medicalNotes = input.medical_notes
    if (input.allergies !== undefined) updateData.allergies = input.allergies
    if (input.emergency_contact_name !== undefined) updateData.emergencyContactName = input.emergency_contact_name
    if (input.emergency_contact_phone !== undefined) updateData.emergencyContactPhone = input.emergency_contact_phone
    if (input.emergency_contact_relationship !== undefined) updateData.emergencyContactRelationship = input.emergency_contact_relationship
    if (input.photo_url !== undefined) updateData.photoUrl = input.photo_url
    if (input.t_shirt_size !== undefined) updateData.tShirtSize = input.t_shirt_size
    if (input.jersey_number_preference !== undefined) updateData.jerseyNumberPreference = input.jersey_number_preference
    if (input.primary_sport_interest !== undefined) updateData.primarySportInterest = input.primary_sport_interest
    if (input.secondary_sport_interest !== undefined) updateData.secondarySportInterest = input.secondary_sport_interest
    if (input.pickup_notes !== undefined) updateData.pickupNotes = input.pickup_notes
    if (input.is_active !== undefined) updateData.isActive = input.is_active
    if (input.risk_flag !== undefined) updateData.riskFlag = input.risk_flag as AthleteRiskFlag | null
    if (input.internal_notes !== undefined) updateData.internalNotes = input.internal_notes

    // HQ admin can change tenant
    if (role === 'hq_admin' && input.tenant_id !== undefined) {
      updateData.tenantId = input.tenant_id || null
    }

    const updated = await prisma.athlete.update({
      where: { id: athleteId },
      data: updateData,
      include: {
        parent: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            city: true,
            state: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: { registrations: true },
        },
      },
    })

    return {
      data: transformAthlete(updated as Parameters<typeof transformAthlete>[0]),
      error: null,
    }
  } catch (error) {
    console.error('[Athletes Admin] Failed to update athlete:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Archive athlete (set is_active = false)
 */
export async function archiveAthlete(params: {
  athleteId: string
  requestingTenantId?: string
  role: string
}): Promise<{ data: { success: boolean; hasUpcomingRegistrations: boolean } | null; error: Error | null }> {
  try {
    const { athleteId, requestingTenantId, role } = params

    // First verify access
    const existing = await prisma.athlete.findUnique({
      where: { id: athleteId },
      include: {
        registrations: {
          where: {
            status: { not: 'cancelled' },
            camp: { startDate: { gte: new Date() } },
          },
          take: 1,
        },
      },
    })

    if (!existing) {
      return { data: null, error: new Error('Athlete not found') }
    }

    // Access control
    if (role !== 'hq_admin') {
      if (requestingTenantId && existing.tenantId !== requestingTenantId) {
        // Check registrations in tenant
        const hasRegistration = await prisma.registration.findFirst({
          where: { athleteId, tenantId: requestingTenantId },
        })
        if (!hasRegistration) {
          return { data: null, error: new Error('Access denied: Cannot archive athletes outside your tenant') }
        }
      }
    }

    const hasUpcomingRegistrations = existing.registrations.length > 0

    // Archive the athlete
    await prisma.athlete.update({
      where: { id: athleteId },
      data: { isActive: false },
    })

    return {
      data: { success: true, hasUpcomingRegistrations },
      error: null,
    }
  } catch (error) {
    console.error('[Athletes Admin] Failed to archive athlete:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Reactivate athlete (set is_active = true)
 */
export async function reactivateAthlete(params: {
  athleteId: string
  requestingTenantId?: string
  role: string
}): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const { athleteId, requestingTenantId, role } = params

    // Verify access first
    const existing = await prisma.athlete.findUnique({
      where: { id: athleteId },
    })

    if (!existing) {
      return { data: null, error: new Error('Athlete not found') }
    }

    // Access control
    if (role !== 'hq_admin' && requestingTenantId && existing.tenantId !== requestingTenantId) {
      const hasRegistration = await prisma.registration.findFirst({
        where: { athleteId, tenantId: requestingTenantId },
      })
      if (!hasRegistration) {
        return { data: null, error: new Error('Access denied') }
      }
    }

    await prisma.athlete.update({
      where: { id: athleteId },
      data: { isActive: true },
    })

    return { data: { success: true }, error: null }
  } catch (error) {
    console.error('[Athletes Admin] Failed to reactivate athlete:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Stats Functions
// =============================================================================

/**
 * Get athlete counts for dashboard stats
 */
export async function getAthleteStats(params: {
  tenantId?: string
}): Promise<{ data: { total: number; active: number; inactive: number; withRiskFlags: number } | null; error: Error | null }> {
  try {
    const { tenantId } = params

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = tenantId ? {
      OR: [
        { tenantId },
        { registrations: { some: { tenantId } } },
      ],
    } : {}

    const [total, active, withRiskFlags] = await Promise.all([
      prisma.athlete.count({ where }),
      prisma.athlete.count({ where: { ...where, isActive: true } }),
      prisma.athlete.count({
        where: {
          ...where,
          riskFlag: { in: ['monitor', 'restricted'] },
        },
      }),
    ])

    return {
      data: {
        total,
        active,
        inactive: total - active,
        withRiskFlags,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Athletes Admin] Failed to get stats:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get list of available grades for filtering
 */
export async function getAvailableGrades(): Promise<{ data: string[] | null; error: Error | null }> {
  try {
    const grades = await prisma.athlete.findMany({
      where: { grade: { not: null } },
      select: { grade: true },
      distinct: ['grade'],
      orderBy: { grade: 'asc' },
    })

    return {
      data: grades.map(g => g.grade!).filter(Boolean),
      error: null,
    }
  } catch (error) {
    console.error('[Athletes Admin] Failed to get grades:', error)
    return { data: null, error: error as Error }
  }
}
