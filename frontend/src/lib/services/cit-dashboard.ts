/**
 * CIT / Volunteer Dashboard Service
 *
 * Provides data for the CIT/Volunteer portal including:
 * - Dashboard overview (profile, camps, certifications, training progress)
 * - Camp assignments and schedules
 * - Certification management
 * - EmpowerU Skill Station progress
 *
 * All queries are scoped to the specific user and their tenant assignments.
 */

import { prisma } from '@/lib/db/client'
import type {
  CertificationStatus,
  CitApplicationStatus,
  EmpowerUProgressStatus,
} from '@/generated/prisma'

// =============================================================================
// Types
// =============================================================================

export interface CitProfileInfo {
  id: string
  first_name: string
  last_name: string
  email: string
  avatar_url: string | null
  tenant_id: string | null
  tenant_name: string | null
}

export interface CitApplicationInfo {
  id: string
  status: CitApplicationStatus
  applied_at: string
  assigned_licensee_name: string | null
}

export interface CitCampSummary {
  id: string
  name: string
  slug: string
  start_date: string
  end_date: string
  start_time: string | null
  end_time: string | null
  location_name: string | null
  location_city: string | null
  location_state: string | null
  licensee_name: string
  role: string
  station_name: string | null
  call_time: string | null
  shift_end_time: string | null
  is_lead: boolean
  status: 'upcoming' | 'in_progress' | 'completed'
  days_until_start: number | null
}

export interface CitTodaySchedule {
  camp_id: string
  camp_name: string
  camp_day_id: string
  date: string
  location_name: string | null
  location_address: string | null
  call_time: string | null
  shift_end_time: string | null
  camp_start_time: string | null
  camp_end_time: string | null
  station_name: string | null
  role: string
  notes: string | null
  schedule_blocks: {
    id: string
    start_time: string
    end_time: string
    title: string
    block_type: string
    location_notes: string | null
    is_assigned: boolean
  }[]
  groups: {
    id: string
    name: string
    team_color: string | null
    camper_count: number
  }[]
}

export interface CitCertificationSummary {
  id: string
  document_type: string
  display_name: string
  status: CertificationStatus
  document_url: string | null
  submitted_at: string | null
  reviewed_at: string | null
  expires_at: string | null
  notes: string | null
  reviewer_notes: string | null
}

export interface CitEmpowerUProgress {
  total_modules: number
  completed_modules: number
  in_progress_modules: number
  completion_percentage: number
  required_modules: {
    module_id: string
    title: string
    slug: string
    status: EmpowerUProgressStatus | 'NOT_STARTED'
    is_required_for_camp: boolean
    camp_name: string | null
  }[]
}

export interface CitDashboardOverview {
  profile: CitProfileInfo
  application: CitApplicationInfo | null
  todays_camps: CitTodaySchedule[]
  upcoming_camps: CitCampSummary[]
  certifications: {
    total_required: number
    completed: number
    pending: number
    items: CitCertificationSummary[]
  }
  empoweru_progress: CitEmpowerUProgress
  quick_stats: {
    camps_assigned: number
    camps_completed: number
    modules_completed: number
    certs_approved: number
  }
}

// =============================================================================
// Required Certification Types
// =============================================================================

const REQUIRED_CERTIFICATIONS = [
  { type: 'NFHS_FUNDAMENTALS', displayName: 'NFHS Fundamentals of Coaching' },
  { type: 'NFHS_CONCUSSION', displayName: 'NFHS Concussion in Sports' },
  { type: 'BACKGROUND_CHECK', displayName: 'Background Check Clearance' },
]

// =============================================================================
// Helper Functions
// =============================================================================

function formatTimeString(date: Date | null): string | null {
  if (!date) return null
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function getCampStatus(startDate: Date, endDate: Date): 'upcoming' | 'in_progress' | 'completed' {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())

  if (today < start) return 'upcoming'
  if (today > end) return 'completed'
  return 'in_progress'
}

function getDaysUntilStart(startDate: Date): number | null {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())

  if (today >= start) return null
  const diffTime = start.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Get comprehensive dashboard overview for a CIT
 */
export async function getCitDashboardOverview(params: {
  userId: string
}): Promise<{ data: CitDashboardOverview | null; error: Error | null }> {
  try {
    const { userId } = params

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          where: { role: 'cit_volunteer' },
          include: { tenant: true },
          take: 1,
        },
      },
    })

    if (!profile) {
      return { data: null, error: new Error('Profile not found') }
    }

    const tenantId = profile.userRoles[0]?.tenantId || null
    const tenantName = profile.userRoles[0]?.tenant?.name || null

    // Get CIT application status
    const citApplication = await prisma.citApplication.findFirst({
      where: {
        OR: [
          { userId },
          { email: profile.email },
        ],
      },
      include: {
        assignments: {
          include: {
            citApplication: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get licensee name from application assignment
    let assignedLicenseeName: string | null = null
    if (citApplication?.assignedLicenseeId) {
      const licensee = await prisma.tenant.findUnique({
        where: { id: citApplication.assignedLicenseeId },
        select: { name: true },
      })
      assignedLicenseeName = licensee?.name || null
    }

    // Get all camp assignments for this user
    const campAssignments = await prisma.campStaffAssignment.findMany({
      where: { userId },
      include: {
        camp: {
          include: {
            location: true,
            tenant: true,
            campSessionDays: {
              include: {
                scheduleBlocks: {
                  orderBy: { startTime: 'asc' },
                },
              },
            },
          },
        },
      },
      orderBy: { camp: { startDate: 'asc' } },
    })

    // Process today's camps
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    const todaysCamps: CitTodaySchedule[] = []
    const upcomingCamps: CitCampSummary[] = []

    for (const assignment of campAssignments) {
      const camp = assignment.camp
      const status = getCampStatus(camp.startDate, camp.endDate)

      // Find if today is a camp day (using CampSessionDay with actualDate)
      const todayCampDay = camp.campSessionDays.find(
        (day) => day.actualDate && day.actualDate.toISOString().split('T')[0] === todayStr
      )

      if (todayCampDay) {
        // Get groups for this camp
        const groups = await prisma.campGroup.findMany({
          where: { campId: camp.id },
        })

        todaysCamps.push({
          camp_id: camp.id,
          camp_name: camp.name,
          camp_day_id: todayCampDay.id,
          date: todayCampDay.actualDate?.toISOString() || '',
          location_name: camp.location?.name || null,
          location_address: camp.location?.address || null,
          call_time: assignment.callTime ? formatTimeString(assignment.callTime) : null,
          shift_end_time: assignment.endTime ? formatTimeString(assignment.endTime) : null,
          camp_start_time: camp.startTime ? formatTimeString(camp.startTime) : null,
          camp_end_time: camp.endTime ? formatTimeString(camp.endTime) : null,
          station_name: assignment.stationName,
          role: assignment.role,
          notes: assignment.notes,
          schedule_blocks: todayCampDay.scheduleBlocks.map((block) => ({
            id: block.id,
            start_time: formatTimeString(block.startTime) || '',
            end_time: formatTimeString(block.endTime) || '',
            title: block.label,
            block_type: block.blockType,
            location_notes: block.location,
            is_assigned: assignment.stationName
              ? block.label.toLowerCase().includes(assignment.stationName.toLowerCase())
              : false,
          })),
          groups: groups.map((g) => ({
            id: g.id,
            name: g.groupName || `Group ${g.groupNumber}`,
            team_color: g.groupColor,
            camper_count: g.camperCount,
          })),
        })
      }

      // Add to upcoming camps if not completed
      if (status !== 'completed') {
        upcomingCamps.push({
          id: camp.id,
          name: camp.name,
          slug: camp.slug,
          start_date: camp.startDate.toISOString(),
          end_date: camp.endDate.toISOString(),
          start_time: camp.startTime ? formatTimeString(camp.startTime) : null,
          end_time: camp.endTime ? formatTimeString(camp.endTime) : null,
          location_name: camp.location?.name || null,
          location_city: camp.location?.city || null,
          location_state: camp.location?.state || null,
          licensee_name: camp.tenant?.name || 'Unknown',
          role: assignment.role,
          station_name: assignment.stationName,
          call_time: assignment.callTime ? formatTimeString(assignment.callTime) : null,
          shift_end_time: assignment.endTime ? formatTimeString(assignment.endTime) : null,
          is_lead: assignment.isLead,
          status,
          days_until_start: getDaysUntilStart(camp.startDate),
        })
      }
    }

    // Get certifications
    const certifications = await prisma.volunteerCertification.findMany({
      where: { profileId: userId },
      orderBy: { createdAt: 'desc' },
    })

    // Build certification list with required certs
    const certItems: CitCertificationSummary[] = REQUIRED_CERTIFICATIONS.map((req) => {
      const existing = certifications.find((c) => c.documentType === req.type)
      return {
        id: existing?.id || '',
        document_type: req.type,
        display_name: req.displayName,
        status: existing?.status || ('pending_review' as CertificationStatus),
        document_url: existing?.documentUrl || null,
        submitted_at: existing?.submittedAt?.toISOString() || null,
        reviewed_at: existing?.reviewedAt?.toISOString() || null,
        expires_at: existing?.expiresAt?.toISOString() || null,
        notes: existing?.notes || null,
        reviewer_notes: existing?.reviewerNotes || null,
      }
    })

    const completedCerts = certItems.filter((c) => c.status === 'approved').length
    const pendingCerts = certItems.filter(
      (c) => c.status === 'pending_review' && c.document_url
    ).length

    // Get EmpowerU progress for Skill Station portal
    const skillStationModules = await prisma.empowerUModule.findMany({
      where: {
        portalType: 'SKILL_STATION',
        isPublished: true,
      },
      select: { id: true, title: true, slug: true },
    })

    const moduleIds = skillStationModules.map((m) => m.id)
    const userProgress = await prisma.empowerUModuleProgress.findMany({
      where: {
        userId,
        moduleId: { in: moduleIds },
      },
    })

    const progressMap = new Map(userProgress.map((p) => [p.moduleId, p]))
    const completedModules = userProgress.filter((p) => p.status === 'COMPLETED').length
    const inProgressModules = userProgress.filter((p) => p.status === 'IN_PROGRESS').length

    const empoweruProgress: CitEmpowerUProgress = {
      total_modules: skillStationModules.length,
      completed_modules: completedModules,
      in_progress_modules: inProgressModules,
      completion_percentage:
        skillStationModules.length > 0
          ? Math.round((completedModules / skillStationModules.length) * 100)
          : 0,
      required_modules: skillStationModules.slice(0, 5).map((mod) => {
        const progress = progressMap.get(mod.id)
        return {
          module_id: mod.id,
          title: mod.title,
          slug: mod.slug,
          status: progress?.status || 'NOT_STARTED',
          is_required_for_camp: false, // Could enhance to check camp-specific requirements
          camp_name: null,
        }
      }),
    }

    // Calculate quick stats
    const completedCampCount = campAssignments.filter(
      (a) => getCampStatus(a.camp.startDate, a.camp.endDate) === 'completed'
    ).length

    return {
      data: {
        profile: {
          id: profile.id,
          first_name: profile.firstName || '',
          last_name: profile.lastName || '',
          email: profile.email,
          avatar_url: profile.avatarUrl,
          tenant_id: tenantId,
          tenant_name: tenantName,
        },
        application: citApplication
          ? {
              id: citApplication.id,
              status: citApplication.status,
              applied_at: citApplication.createdAt.toISOString(),
              assigned_licensee_name: assignedLicenseeName,
            }
          : null,
        todays_camps: todaysCamps,
        upcoming_camps: upcomingCamps,
        certifications: {
          total_required: REQUIRED_CERTIFICATIONS.length,
          completed: completedCerts,
          pending: pendingCerts,
          items: certItems,
        },
        empoweru_progress: empoweruProgress,
        quick_stats: {
          camps_assigned: campAssignments.length,
          camps_completed: completedCampCount,
          modules_completed: completedModules,
          certs_approved: completedCerts,
        },
      },
      error: null,
    }
  } catch (error) {
    console.error('[CITDashboard] Failed to get overview:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * List all camps where CIT is assigned
 */
export async function listCitCamps(params: {
  userId: string
  status?: 'all' | 'upcoming' | 'in_progress' | 'completed'
}): Promise<{ data: CitCampSummary[] | null; error: Error | null }> {
  try {
    const { userId, status = 'all' } = params

    const campAssignments = await prisma.campStaffAssignment.findMany({
      where: { userId },
      include: {
        camp: {
          include: {
            location: true,
            tenant: true,
          },
        },
      },
      orderBy: { camp: { startDate: 'asc' } },
    })

    const camps: CitCampSummary[] = campAssignments
      .map((assignment) => {
        const camp = assignment.camp
        const campStatus = getCampStatus(camp.startDate, camp.endDate)

        return {
          id: camp.id,
          name: camp.name,
          slug: camp.slug,
          start_date: camp.startDate.toISOString(),
          end_date: camp.endDate.toISOString(),
          start_time: camp.startTime ? formatTimeString(camp.startTime) : null,
          end_time: camp.endTime ? formatTimeString(camp.endTime) : null,
          location_name: camp.location?.name || null,
          location_city: camp.location?.city || null,
          location_state: camp.location?.state || null,
          licensee_name: camp.tenant?.name || 'Unknown',
          role: assignment.role,
          station_name: assignment.stationName,
          call_time: assignment.callTime ? formatTimeString(assignment.callTime) : null,
          shift_end_time: assignment.endTime ? formatTimeString(assignment.endTime) : null,
          is_lead: assignment.isLead,
          status: campStatus,
          days_until_start: getDaysUntilStart(camp.startDate),
        }
      })
      .filter((camp) => {
        if (status === 'all') return true
        return camp.status === status
      })

    return { data: camps, error: null }
  } catch (error) {
    console.error('[CITDashboard] Failed to list camps:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get today's camp days for a CIT with full schedule details
 */
export async function listCitCampDaysForToday(params: {
  userId: string
}): Promise<{ data: CitTodaySchedule[] | null; error: Error | null }> {
  try {
    const { userId } = params
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // Get all camp assignments
    const campAssignments = await prisma.campStaffAssignment.findMany({
      where: { userId },
      include: {
        camp: {
          include: {
            location: true,
            campSessionDays: {
              where: {
                actualDate: {
                  gte: new Date(todayStr),
                  lt: new Date(new Date(todayStr).getTime() + 24 * 60 * 60 * 1000),
                },
              },
              include: {
                scheduleBlocks: {
                  orderBy: { startTime: 'asc' },
                },
              },
            },
            campGroups: true,
          },
        },
      },
    })

    const todaysSchedules: CitTodaySchedule[] = []

    for (const assignment of campAssignments) {
      const camp = assignment.camp
      const todayCampDay = camp.campSessionDays[0]

      if (todayCampDay) {
        todaysSchedules.push({
          camp_id: camp.id,
          camp_name: camp.name,
          camp_day_id: todayCampDay.id,
          date: todayCampDay.actualDate?.toISOString() || '',
          location_name: camp.location?.name || null,
          location_address: camp.location?.address || null,
          call_time: assignment.callTime ? formatTimeString(assignment.callTime) : null,
          shift_end_time: assignment.endTime ? formatTimeString(assignment.endTime) : null,
          camp_start_time: camp.startTime ? formatTimeString(camp.startTime) : null,
          camp_end_time: camp.endTime ? formatTimeString(camp.endTime) : null,
          station_name: assignment.stationName,
          role: assignment.role,
          notes: assignment.notes,
          schedule_blocks: todayCampDay.scheduleBlocks.map((block) => ({
            id: block.id,
            start_time: formatTimeString(block.startTime) || '',
            end_time: formatTimeString(block.endTime) || '',
            title: block.label,
            block_type: block.blockType,
            location_notes: block.location,
            is_assigned: assignment.stationName
              ? block.label.toLowerCase().includes(assignment.stationName.toLowerCase())
              : false,
          })),
          groups: camp.campGroups.map((g) => ({
            id: g.id,
            name: g.groupName || `Group ${g.groupNumber}`,
            team_color: g.groupColor,
            camper_count: g.camperCount,
          })),
        })
      }
    }

    return { data: todaysSchedules, error: null }
  } catch (error) {
    console.error('[CITDashboard] Failed to get today schedule:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get CIT's certifications
 */
export async function getCitCertifications(params: {
  userId: string
}): Promise<{
  data: {
    items: CitCertificationSummary[]
    required_types: { type: string; display_name: string }[]
  } | null
  error: Error | null
}> {
  try {
    const { userId } = params

    const certifications = await prisma.volunteerCertification.findMany({
      where: { profileId: userId },
      orderBy: { createdAt: 'desc' },
    })

    // Build certification list with required certs
    const items: CitCertificationSummary[] = REQUIRED_CERTIFICATIONS.map((req) => {
      const existing = certifications.find((c) => c.documentType === req.type)
      return {
        id: existing?.id || '',
        document_type: req.type,
        display_name: req.displayName,
        status: existing?.status || ('pending_review' as CertificationStatus),
        document_url: existing?.documentUrl || null,
        submitted_at: existing?.submittedAt?.toISOString() || null,
        reviewed_at: existing?.reviewedAt?.toISOString() || null,
        expires_at: existing?.expiresAt?.toISOString() || null,
        notes: existing?.notes || null,
        reviewer_notes: existing?.reviewerNotes || null,
      }
    })

    // Add any additional certifications not in required list
    for (const cert of certifications) {
      if (!REQUIRED_CERTIFICATIONS.find((r) => r.type === cert.documentType)) {
        items.push({
          id: cert.id,
          document_type: cert.documentType,
          display_name: cert.documentName || cert.documentType,
          status: cert.status,
          document_url: cert.documentUrl,
          submitted_at: cert.submittedAt?.toISOString() || null,
          reviewed_at: cert.reviewedAt?.toISOString() || null,
          expires_at: cert.expiresAt?.toISOString() || null,
          notes: cert.notes,
          reviewer_notes: cert.reviewerNotes,
        })
      }
    }

    return {
      data: {
        items,
        required_types: REQUIRED_CERTIFICATIONS.map((r) => ({
          type: r.type,
          display_name: r.displayName,
        })),
      },
      error: null,
    }
  } catch (error) {
    console.error('[CITDashboard] Failed to get certifications:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Upsert a CIT certification (upload or update document)
 */
export async function upsertCitCertification(params: {
  userId: string
  tenantId?: string | null
  documentType: string
  displayName: string
  documentUrl: string
  notes?: string
}): Promise<{ data: { id: string } | null; error: Error | null }> {
  try {
    const { userId, tenantId, documentType, displayName, documentUrl, notes } = params

    // Check if certification of this type already exists
    const existing = await prisma.volunteerCertification.findFirst({
      where: {
        profileId: userId,
        documentType,
      },
    })

    if (existing) {
      // Update existing
      const updated = await prisma.volunteerCertification.update({
        where: { id: existing.id },
        data: {
          documentUrl,
          documentName: displayName,
          status: 'pending_review',
          submittedAt: new Date(),
          reviewedAt: null,
          reviewedByProfileId: null,
          notes,
          reviewerNotes: null,
        },
      })
      return { data: { id: updated.id }, error: null }
    }

    // Create new
    const created = await prisma.volunteerCertification.create({
      data: {
        profileId: userId,
        tenantId,
        documentType,
        documentName: displayName,
        documentUrl,
        status: 'pending_review',
        submittedAt: new Date(),
        notes,
      },
    })

    return { data: { id: created.id }, error: null }
  } catch (error) {
    console.error('[CITDashboard] Failed to upsert certification:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get a specific camp's schedule details for a CIT
 */
export async function getCitCampSchedule(params: {
  userId: string
  campId: string
}): Promise<{
  data: {
    camp: CitCampSummary
    camp_days: {
      id: string
      date: string
      day_number: number
      status: string
      schedule_blocks: {
        id: string
        start_time: string
        end_time: string
        title: string
        block_type: string
        description: string | null
        location_notes: string | null
      }[]
    }[]
  } | null
  error: Error | null
}> {
  try {
    const { userId, campId } = params

    // Verify CIT is assigned to this camp
    const assignment = await prisma.campStaffAssignment.findFirst({
      where: {
        userId,
        campId,
      },
      include: {
        camp: {
          include: {
            location: true,
            tenant: true,
            campSessionDays: {
              orderBy: { dayNumber: 'asc' },
              include: {
                scheduleBlocks: {
                  orderBy: { startTime: 'asc' },
                },
              },
            },
          },
        },
      },
    })

    if (!assignment) {
      return { data: null, error: new Error('Not assigned to this camp') }
    }

    const camp = assignment.camp
    const campStatus = getCampStatus(camp.startDate, camp.endDate)

    // Map camp session days with their blocks
    const campDaysWithBlocks = camp.campSessionDays.map((day) => ({
      id: day.id,
      date: day.actualDate?.toISOString() || '',
      day_number: day.dayNumber,
      status: day.status,
      schedule_blocks: day.scheduleBlocks.map((block) => ({
        id: block.id,
        start_time: formatTimeString(block.startTime) || '',
        end_time: formatTimeString(block.endTime) || '',
        title: block.label,
        block_type: block.blockType,
        description: block.description,
        location_notes: block.location,
      })),
    }))

    return {
      data: {
        camp: {
          id: camp.id,
          name: camp.name,
          slug: camp.slug,
          start_date: camp.startDate.toISOString(),
          end_date: camp.endDate.toISOString(),
          start_time: camp.startTime ? formatTimeString(camp.startTime) : null,
          end_time: camp.endTime ? formatTimeString(camp.endTime) : null,
          location_name: camp.location?.name || null,
          location_city: camp.location?.city || null,
          location_state: camp.location?.state || null,
          licensee_name: camp.tenant?.name || 'Unknown',
          role: assignment.role,
          station_name: assignment.stationName,
          call_time: assignment.callTime ? formatTimeString(assignment.callTime) : null,
          shift_end_time: assignment.endTime ? formatTimeString(assignment.endTime) : null,
          is_lead: assignment.isLead,
          status: campStatus,
          days_until_start: getDaysUntilStart(camp.startDate),
        },
        camp_days: campDaysWithBlocks,
      },
      error: null,
    }
  } catch (error) {
    console.error('[CITDashboard] Failed to get camp schedule:', error)
    return { data: null, error: error as Error }
  }
}
