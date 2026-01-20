/**
 * The Roster Service
 *
 * Provides role-aware, tenant-scoped access to camper data for a camp session.
 * Used by HQ Admin, Licensee Owner, Director, and Coach dashboards.
 */

import prisma from '@/lib/db/client'
import { AttendanceStatus } from '@/generated/prisma'

// ============================================================================
// TYPES
// ============================================================================

export type RosterRole = 'hq_admin' | 'licensee_owner' | 'director' | 'coach'

export interface RosterCamper {
  id: string
  registrationId: string
  athleteId: string
  firstName: string
  lastName: string
  fullName: string
  dateOfBirth: string | null
  age: number | null
  gradeLevel: number | null
  gradeDisplay: string
  groupId: string | null
  groupName: string | null
  groupNumber: number | null
  friendGroupId: string | null
  friendGroupNumber: number | null
  checkInStatus: string
  hasMedicalNotes: boolean
  hasAllergies: boolean
  hasSpecialConsiderations: boolean
  hasUpsells: boolean
  shirtSize: string | null
  photoUrl: string | null
  parentName: string | null
  parentEmail: string | null
  parentPhone: string | null
}

export interface RosterCamperDetail extends RosterCamper {
  // Extended contact info
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  emergencyContactRelationship: string | null
  // Health & safety
  medicalNotes: string | null
  allergies: string | null
  specialConsiderations: string | null
  // Registration details
  friendRequests: string[]
  waiverSigned: boolean
  waiverSignedAt: string | null
  registeredAt: string
  // Upsells
  upsells: RosterUpsell[]
  upsellsTotal: number
  // Attendance history for this camp
  attendanceHistory: RosterAttendanceRecord[]
  // Camp info
  campName: string
  campStartDate: string
  campEndDate: string
}

export interface RosterUpsell {
  name: string
  variant: string | null
  quantity: number
  priceCents: number
}

export interface RosterAttendanceRecord {
  date: string
  dayNumber: number
  checkInTime: string | null
  checkOutTime: string | null
  status: string
  notes: string | null
}

export interface RosterFilters {
  search?: string
  groupId?: string | 'ungrouped'
  checkInStatus?: 'all' | 'checked_in' | 'not_arrived' | 'checked_out' | 'absent'
  page?: number
  limit?: number
}

export interface RosterListResult {
  campers: RosterCamper[]
  total: number
  page: number
  limit: number
  totalPages: number
  campName: string
  campStartDate: string
  campEndDate: string
  totalCheckedIn: number
  totalNotArrived: number
}

export interface CamperBasicUpdateInput {
  shirtSize?: string
  specialConsiderations?: string
  internalNotes?: string
}

// ============================================================================
// HELPERS
// ============================================================================

function calculateAge(dateOfBirth: Date): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

function gradeToDisplay(grade: number | null): string {
  if (grade === null) return 'N/A'
  if (grade === 0) return 'K'
  if (grade === -1) return 'Pre-K'
  return `${grade}`
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List campers for a camp session with filters and pagination
 */
export async function listCampersForSession(params: {
  campId: string
  role: RosterRole
  tenantId: string | null
  userId: string
  filters?: RosterFilters
}): Promise<{ data: RosterListResult | null; error: Error | null }> {
  try {
    const { campId, role, tenantId, userId, filters = {} } = params
    const { search, groupId, checkInStatus, page = 1, limit = 50 } = filters

    // Get camp details and verify access
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: {
        id: true,
        name: true,
        tenantId: true,
        startDate: true,
        endDate: true,
      },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp not found') }
    }

    // Tenant access check (skip for hq_admin)
    if (role !== 'hq_admin' && tenantId && camp.tenantId !== tenantId) {
      return { data: null, error: new Error('Not authorized to access this camp') }
    }

    // Director/Coach assignment check
    if (role === 'director' || role === 'coach') {
      const assignment = await prisma.campStaffAssignment.findFirst({
        where: { campId, userId },
      })
      if (!assignment) {
        return { data: null, error: new Error('Not assigned to this camp') }
      }
    }

    // Build where clause for registrations
    const whereClause: Record<string, unknown> = {
      campId,
      status: { not: 'cancelled' },
    }

    // Get today's attendance status if needed for filtering
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get current camp day for attendance info
    const currentCampDay = await prisma.campDay.findFirst({
      where: {
        campId,
        date: today,
      },
      select: { id: true },
    })

    // Get all registrations with related data
    const registrations = await prisma.registration.findMany({
      where: whereClause,
      include: {
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            photoUrl: true,
            medicalNotes: true,
            allergies: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
          },
        },
        parent: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        camperSessionData: {
          select: {
            id: true,
            gradeValidated: true,
            assignedGroupId: true,
            friendGroupId: true,
            specialConsiderations: true,
            assignedGroup: {
              select: {
                id: true,
                groupName: true,
                groupNumber: true,
              },
            },
            friendGroup: {
              select: {
                groupNumber: true,
              },
            },
          },
        },
        registrationAddons: {
          select: {
            id: true,
            quantity: true,
            priceCents: true,
            addon: {
              select: {
                name: true,
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
      orderBy: [
        { athlete: { lastName: 'asc' } },
        { athlete: { firstName: 'asc' } },
      ],
    })

    // Get attendance for current day if exists
    let attendanceMap = new Map<string, { status: string; checkInTime: Date | null; checkOutTime: Date | null }>()
    if (currentCampDay) {
      const attendanceRecords = await prisma.campAttendance.findMany({
        where: { campDayId: currentCampDay.id },
        select: {
          athleteId: true,
          status: true,
          checkInTime: true,
          checkOutTime: true,
        },
      })
      attendanceRecords.forEach((a) => {
        attendanceMap.set(a.athleteId, {
          status: a.status,
          checkInTime: a.checkInTime,
          checkOutTime: a.checkOutTime,
        })
      })
    }

    // Transform to roster campers
    let campers: RosterCamper[] = registrations.map((r) => {
      const attendance = attendanceMap.get(r.athleteId)
      const sessionData = r.camperSessionData

      return {
        id: sessionData?.id || r.id,
        registrationId: r.id,
        athleteId: r.athleteId,
        firstName: r.athlete.firstName,
        lastName: r.athlete.lastName,
        fullName: `${r.athlete.firstName} ${r.athlete.lastName}`,
        dateOfBirth: r.athlete.dateOfBirth?.toISOString().split('T')[0] || null,
        age: r.athlete.dateOfBirth ? calculateAge(r.athlete.dateOfBirth) : null,
        gradeLevel: sessionData?.gradeValidated ?? null,
        gradeDisplay: gradeToDisplay(sessionData?.gradeValidated ?? null),
        groupId: sessionData?.assignedGroupId ?? null,
        groupName: sessionData?.assignedGroup?.groupName ?? null,
        groupNumber: sessionData?.assignedGroup?.groupNumber ?? null,
        friendGroupId: sessionData?.friendGroupId ?? null,
        friendGroupNumber: sessionData?.friendGroup?.groupNumber ?? null,
        checkInStatus: attendance?.status || 'not_arrived',
        hasMedicalNotes: !!(r.athlete.medicalNotes),
        hasAllergies: !!(r.athlete.allergies),
        hasSpecialConsiderations: !!(r.specialConsiderations || sessionData?.specialConsiderations),
        hasUpsells: r.registrationAddons.length > 0,
        shirtSize: r.shirtSize,
        photoUrl: r.athlete.photoUrl,
        parentName: r.parent.firstName && r.parent.lastName
          ? `${r.parent.firstName} ${r.parent.lastName}`
          : null,
        parentEmail: r.parent.email,
        parentPhone: r.parent.phone,
      }
    })

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase()
      campers = campers.filter((c) =>
        c.fullName.toLowerCase().includes(searchLower) ||
        (c.parentEmail && c.parentEmail.toLowerCase().includes(searchLower)) ||
        (c.parentName && c.parentName.toLowerCase().includes(searchLower))
      )
    }

    if (groupId) {
      if (groupId === 'ungrouped') {
        campers = campers.filter((c) => !c.groupId)
      } else {
        campers = campers.filter((c) => c.groupId === groupId)
      }
    }

    if (checkInStatus && checkInStatus !== 'all') {
      campers = campers.filter((c) => c.checkInStatus === checkInStatus)
    }

    // Calculate stats
    const totalCheckedIn = campers.filter((c) => c.checkInStatus === 'checked_in').length
    const totalNotArrived = campers.filter((c) => c.checkInStatus === 'not_arrived').length

    // Pagination
    const total = campers.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const paginatedCampers = campers.slice(startIndex, startIndex + limit)

    return {
      data: {
        campers: paginatedCampers,
        total,
        page,
        limit,
        totalPages,
        campName: camp.name,
        campStartDate: camp.startDate.toISOString().split('T')[0],
        campEndDate: camp.endDate.toISOString().split('T')[0],
        totalCheckedIn,
        totalNotArrived,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Roster] listCampersForSession error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get detailed information for a single camper
 */
export async function getCamperDetail(params: {
  camperId: string
  campId: string
  role: RosterRole
  tenantId: string | null
  userId: string
}): Promise<{ data: RosterCamperDetail | null; error: Error | null }> {
  try {
    const { camperId, campId, role, tenantId, userId } = params

    // Get camp and verify access
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: {
        id: true,
        name: true,
        tenantId: true,
        startDate: true,
        endDate: true,
      },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp not found') }
    }

    // Tenant access check (skip for hq_admin)
    if (role !== 'hq_admin' && tenantId && camp.tenantId !== tenantId) {
      return { data: null, error: new Error('Not authorized') }
    }

    // Director/Coach assignment check
    if (role === 'director' || role === 'coach') {
      const assignment = await prisma.campStaffAssignment.findFirst({
        where: { campId, userId },
      })
      if (!assignment) {
        return { data: null, error: new Error('Not assigned to this camp') }
      }
    }

    // Find camper session data or registration
    const sessionData = await prisma.camperSessionData.findUnique({
      where: { id: camperId },
      include: {
        registration: {
          include: {
            athlete: true,
            parent: true,
            registrationAddons: {
              include: {
                addon: true,
                variant: true,
              },
            },
          },
        },
        assignedGroup: {
          select: {
            id: true,
            groupName: true,
            groupNumber: true,
          },
        },
        friendGroup: {
          select: {
            groupNumber: true,
          },
        },
      },
    })

    // If found by session data ID, use that registration
    if (sessionData?.registration) {
      const registration = sessionData.registration
      const camperSessionData = sessionData

      // Get attendance history
      const campDays = await prisma.campDay.findMany({
        where: { campId },
        orderBy: { dayNumber: 'asc' },
        select: {
          id: true,
          date: true,
          dayNumber: true,
          attendance: {
            where: { athleteId: registration.athleteId },
            select: {
              status: true,
              checkInTime: true,
              checkOutTime: true,
              notes: true,
            },
          },
        },
      })

      const attendanceHistory: RosterAttendanceRecord[] = campDays.map((day) => {
        const attendance = day.attendance[0]
        return {
          date: day.date.toISOString().split('T')[0],
          dayNumber: day.dayNumber,
          checkInTime: attendance?.checkInTime?.toISOString() || null,
          checkOutTime: attendance?.checkOutTime?.toISOString() || null,
          status: attendance?.status || 'not_arrived',
          notes: attendance?.notes || null,
        }
      })

      // Get today's attendance for current status
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayRecord = attendanceHistory.find(
        (a) => new Date(a.date).getTime() === today.getTime()
      )

      // Build upsells list
      const upsells: RosterUpsell[] = registration.registrationAddons.map((ra) => ({
        name: ra.addon.name,
        variant: ra.variant?.name || null,
        quantity: ra.quantity,
        priceCents: ra.priceCents,
      }))

      const upsellsTotal = upsells.reduce((sum, u) => sum + u.priceCents * u.quantity, 0)

      // Role-based field masking for coaches
      const shouldMaskContact = role === 'coach'

      const detail: RosterCamperDetail = {
        id: camperSessionData.id,
        registrationId: registration.id,
        athleteId: registration.athleteId,
        firstName: registration.athlete.firstName,
        lastName: registration.athlete.lastName,
        fullName: `${registration.athlete.firstName} ${registration.athlete.lastName}`,
        dateOfBirth: registration.athlete.dateOfBirth?.toISOString().split('T')[0] || null,
        age: registration.athlete.dateOfBirth
          ? calculateAge(registration.athlete.dateOfBirth)
          : null,
        gradeLevel: camperSessionData.gradeValidated ?? null,
        gradeDisplay: gradeToDisplay(camperSessionData.gradeValidated ?? null),
        groupId: camperSessionData.assignedGroup?.id ?? null,
        groupName: camperSessionData.assignedGroup?.groupName ?? null,
        groupNumber: camperSessionData.assignedGroup?.groupNumber ?? null,
        friendGroupId: camperSessionData.friendGroupId ?? null,
        friendGroupNumber: camperSessionData.friendGroup?.groupNumber ?? null,
        checkInStatus: todayRecord?.status || 'not_arrived',
        hasMedicalNotes: !!registration.athlete.medicalNotes,
        hasAllergies: !!registration.athlete.allergies,
        hasSpecialConsiderations: !!(
          registration.specialConsiderations || camperSessionData.specialConsiderations
        ),
        hasUpsells: upsells.length > 0,
        shirtSize: registration.shirtSize,
        photoUrl: registration.athlete.photoUrl,
        parentName: shouldMaskContact
          ? null
          : registration.parent.firstName && registration.parent.lastName
            ? `${registration.parent.firstName} ${registration.parent.lastName}`
            : null,
        parentEmail: shouldMaskContact ? null : registration.parent.email,
        parentPhone: shouldMaskContact ? null : registration.parent.phone,
        emergencyContactName: registration.athlete.emergencyContactName,
        emergencyContactPhone: registration.athlete.emergencyContactPhone,
        emergencyContactRelationship: registration.athlete.emergencyContactRelationship,
        medicalNotes: registration.athlete.medicalNotes,
        allergies: registration.athlete.allergies,
        specialConsiderations:
          registration.specialConsiderations || camperSessionData.specialConsiderations || null,
        friendRequests: registration.friendRequests,
        waiverSigned: registration.waiverSigned,
        waiverSignedAt: registration.waiverSignedAt?.toISOString() || null,
        registeredAt: registration.createdAt.toISOString(),
        upsells,
        upsellsTotal,
        attendanceHistory,
        campName: camp.name,
        campStartDate: camp.startDate.toISOString().split('T')[0],
        campEndDate: camp.endDate.toISOString().split('T')[0],
      }

      return { data: detail, error: null }
    }

    // Try by registration ID if session data not found
    const registrationById = await prisma.registration.findFirst({
      where: {
        id: camperId,
        campId,
      },
      include: {
        athlete: true,
        parent: true,
        registrationAddons: {
          include: {
            addon: true,
            variant: true,
          },
        },
        camperSessionData: {
          include: {
            assignedGroup: {
              select: {
                id: true,
                groupName: true,
                groupNumber: true,
              },
            },
            friendGroup: {
              select: {
                groupNumber: true,
              },
            },
          },
        },
      },
    })

    if (!registrationById) {
      return { data: null, error: new Error('Camper not found') }
    }

    const registration = registrationById
    const camperSessionData = registration.camperSessionData

    // Get attendance history
    const campDays = await prisma.campDay.findMany({
      where: { campId },
      orderBy: { dayNumber: 'asc' },
      select: {
        id: true,
        date: true,
        dayNumber: true,
        attendance: {
          where: { athleteId: registration.athleteId },
          select: {
            status: true,
            checkInTime: true,
            checkOutTime: true,
            notes: true,
          },
        },
      },
    })

    const attendanceHistory: RosterAttendanceRecord[] = campDays.map((day) => {
      const attendance = day.attendance[0]
      return {
        date: day.date.toISOString().split('T')[0],
        dayNumber: day.dayNumber,
        checkInTime: attendance?.checkInTime?.toISOString() || null,
        checkOutTime: attendance?.checkOutTime?.toISOString() || null,
        status: attendance?.status || 'not_arrived',
        notes: attendance?.notes || null,
      }
    })

    // Get today's attendance for current status
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayRecord = attendanceHistory.find(
      (a) => new Date(a.date).getTime() === today.getTime()
    )

    // Build upsells list
    const upsells: RosterUpsell[] = registration.registrationAddons.map((ra) => ({
      name: ra.addon.name,
      variant: ra.variant?.name || null,
      quantity: ra.quantity,
      priceCents: ra.priceCents,
    }))

    const upsellsTotal = upsells.reduce((sum, u) => sum + u.priceCents * u.quantity, 0)

    // Role-based field masking for coaches
    const shouldMaskContact = role === 'coach'

    const detail: RosterCamperDetail = {
      id: camperSessionData?.id || registration.id,
      registrationId: registration.id,
      athleteId: registration.athleteId,
      firstName: registration.athlete.firstName,
      lastName: registration.athlete.lastName,
      fullName: `${registration.athlete.firstName} ${registration.athlete.lastName}`,
      dateOfBirth: registration.athlete.dateOfBirth?.toISOString().split('T')[0] || null,
      age: registration.athlete.dateOfBirth
        ? calculateAge(registration.athlete.dateOfBirth)
        : null,
      gradeLevel: camperSessionData?.gradeValidated ?? null,
      gradeDisplay: gradeToDisplay(camperSessionData?.gradeValidated ?? null),
      groupId: camperSessionData?.assignedGroup?.id ?? null,
      groupName: camperSessionData?.assignedGroup?.groupName ?? null,
      groupNumber: camperSessionData?.assignedGroup?.groupNumber ?? null,
      friendGroupId: camperSessionData?.friendGroupId ?? null,
      friendGroupNumber: camperSessionData?.friendGroup?.groupNumber ?? null,
      checkInStatus: todayRecord?.status || 'not_arrived',
      hasMedicalNotes: !!registration.athlete.medicalNotes,
      hasAllergies: !!registration.athlete.allergies,
      hasSpecialConsiderations: !!(
        registration.specialConsiderations || camperSessionData?.specialConsiderations
      ),
      hasUpsells: upsells.length > 0,
      shirtSize: registration.shirtSize,
      photoUrl: registration.athlete.photoUrl,
      // Contact info (masked for coaches)
      parentName: shouldMaskContact
        ? null
        : registration.parent.firstName && registration.parent.lastName
          ? `${registration.parent.firstName} ${registration.parent.lastName}`
          : null,
      parentEmail: shouldMaskContact ? null : registration.parent.email,
      parentPhone: shouldMaskContact ? null : registration.parent.phone,
      emergencyContactName: registration.athlete.emergencyContactName,
      emergencyContactPhone: registration.athlete.emergencyContactPhone,
      emergencyContactRelationship: registration.athlete.emergencyContactRelationship,
      // Health & safety (always visible for safety)
      medicalNotes: registration.athlete.medicalNotes,
      allergies: registration.athlete.allergies,
      specialConsiderations:
        registration.specialConsiderations || camperSessionData?.specialConsiderations || null,
      // Registration details
      friendRequests: registration.friendRequests,
      waiverSigned: registration.waiverSigned,
      waiverSignedAt: registration.waiverSignedAt?.toISOString() || null,
      registeredAt: registration.createdAt.toISOString(),
      // Upsells
      upsells,
      upsellsTotal,
      // Attendance
      attendanceHistory,
      // Camp info
      campName: camp.name,
      campStartDate: camp.startDate.toISOString().split('T')[0],
      campEndDate: camp.endDate.toISOString().split('T')[0],
    }

    return { data: detail, error: null }
  } catch (error) {
    console.error('[Roster] getCamperDetail error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update camper basic info (admin/licensee/director only)
 */
export async function updateCamperBasicInfo(params: {
  camperId: string
  campId: string
  updates: CamperBasicUpdateInput
  role: RosterRole
  tenantId: string | null
  userId: string
}): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const { camperId, campId, updates, role, tenantId, userId } = params

    // Only admin, licensee owner, and director can update
    if (role === 'coach') {
      return { data: null, error: new Error('Coaches cannot update camper info') }
    }

    // Get camp and verify access
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: { id: true, tenantId: true },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp not found') }
    }

    if (role !== 'hq_admin' && tenantId && camp.tenantId !== tenantId) {
      return { data: null, error: new Error('Not authorized') }
    }

    if (role === 'director') {
      const assignment = await prisma.campStaffAssignment.findFirst({
        where: { campId, userId },
      })
      if (!assignment) {
        return { data: null, error: new Error('Not assigned to this camp') }
      }
    }

    // Find the registration
    const sessionData = await prisma.camperSessionData.findUnique({
      where: { id: camperId },
      select: { registrationId: true },
    })

    const registrationId = sessionData?.registrationId || camperId

    // Update registration
    const updateData: Record<string, unknown> = {}
    if (updates.shirtSize !== undefined) {
      updateData.shirtSize = updates.shirtSize
    }
    if (updates.specialConsiderations !== undefined) {
      updateData.specialConsiderations = updates.specialConsiderations
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.registration.update({
        where: { id: registrationId },
        data: updateData,
      })
    }

    // Update session data if special considerations changed
    if (updates.specialConsiderations !== undefined && sessionData) {
      await prisma.camperSessionData.update({
        where: { id: camperId },
        data: { specialConsiderations: updates.specialConsiderations },
      })
    }

    return { data: { success: true }, error: null }
  } catch (error) {
    console.error('[Roster] updateCamperBasicInfo error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update camper check-in/out status (director/coach)
 */
export async function updateCamperStatus(params: {
  camperId: string
  campId: string
  status: 'checked_in' | 'checked_out' | 'not_arrived' | 'absent'
  notes?: string
  role: RosterRole
  tenantId: string | null
  userId: string
  // Pickup person info for checkout
  pickupPersonName?: string
  pickupPersonRelationship?: string
  pickupPersonId?: string
  // Verification tracking for authorized pickup
  verificationMethod?: 'parent' | 'id_verified'
  verificationTypedName?: string
}): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const {
      camperId,
      campId,
      status,
      notes,
      role,
      tenantId,
      userId,
      pickupPersonName,
      pickupPersonRelationship,
      pickupPersonId,
      verificationMethod,
      verificationTypedName,
    } = params

    // Get camp and verify access
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: { id: true, tenantId: true },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp not found') }
    }

    if (role !== 'hq_admin' && tenantId && camp.tenantId !== tenantId) {
      return { data: null, error: new Error('Not authorized') }
    }

    if (role === 'director' || role === 'coach') {
      const assignment = await prisma.campStaffAssignment.findFirst({
        where: { campId, userId },
      })
      if (!assignment) {
        return { data: null, error: new Error('Not assigned to this camp') }
      }
    }

    // Find the camper's athlete ID and registration
    const sessionData = await prisma.camperSessionData.findUnique({
      where: { id: camperId },
      select: {
        athleteId: true,
        registrationId: true,
        registration: {
          select: {
            parentId: true,
            athleteId: true,
          },
        },
      },
    })

    let athleteId: string
    let registrationId: string
    let parentId: string

    if (sessionData) {
      athleteId = sessionData.athleteId
      registrationId = sessionData.registrationId
      parentId = sessionData.registration.parentId
    } else {
      // Try as registration ID
      const registration = await prisma.registration.findFirst({
        where: { id: camperId, campId },
        select: { athleteId: true, parentId: true },
      })
      if (!registration) {
        return { data: null, error: new Error('Camper not found') }
      }
      athleteId = registration.athleteId
      registrationId = camperId
      parentId = registration.parentId
    }

    // Get or create today's camp day
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let campDay = await prisma.campDay.findFirst({
      where: { campId, date: today },
    })

    if (!campDay) {
      // Calculate day number
      const campDaysCount = await prisma.campDay.count({ where: { campId } })
      campDay = await prisma.campDay.create({
        data: {
          campId,
          date: today,
          dayNumber: campDaysCount + 1,
          status: 'in_progress',
        },
      })
    }

    // Update or create attendance record
    const now = new Date()
    const attendanceData: Record<string, unknown> = {
      status: status as AttendanceStatus,
    }

    if (status === 'checked_in') {
      attendanceData.checkInTime = now
      attendanceData.checkInMethod = 'manual'
      attendanceData.checkInByUserId = userId
    } else if (status === 'checked_out') {
      attendanceData.checkOutTime = now
      attendanceData.checkOutMethod = 'manual'
      attendanceData.checkOutByUserId = userId
      // Record pickup person info
      if (pickupPersonName) {
        attendanceData.checkOutPickupPersonName = pickupPersonName
      }
      if (pickupPersonRelationship) {
        attendanceData.checkOutPickupPersonRelationship = pickupPersonRelationship
      }
      if (pickupPersonId) {
        attendanceData.checkOutPickupPersonId = pickupPersonId
      }
      // Store verification info
      if (verificationMethod) {
        attendanceData.checkOutVerificationMethod = verificationMethod
      }
      if (verificationTypedName) {
        attendanceData.checkOutVerificationTypedName = verificationTypedName
      }
    }

    if (notes) {
      attendanceData.notes = notes
    }

    await prisma.campAttendance.upsert({
      where: {
        campDayId_athleteId: {
          campDayId: campDay.id,
          athleteId,
        },
      },
      create: {
        campDayId: campDay.id,
        athleteId,
        registrationId,
        parentProfileId: parentId,
        ...attendanceData,
      },
      update: attendanceData,
    })

    return { data: { success: true }, error: null }
  } catch (error) {
    console.error('[Roster] updateCamperStatus error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get groups for a camp (for filter dropdown)
 */
export async function getCampGroups(
  campId: string
): Promise<{ data: Array<{ id: string; name: string; number: number }> | null; error: Error | null }> {
  try {
    const groups = await prisma.campGroup.findMany({
      where: { campId },
      select: {
        id: true,
        groupName: true,
        groupNumber: true,
      },
      orderBy: { groupNumber: 'asc' },
    })

    return {
      data: groups.map((g) => ({
        id: g.id,
        name: g.groupName || `Group ${g.groupNumber}`,
        number: g.groupNumber,
      })),
      error: null,
    }
  } catch (error) {
    console.error('[Roster] getCampGroups error:', error)
    return { data: null, error: error as Error }
  }
}
