/**
 * CIT (Coaches-In-Training) Services
 *
 * Prisma-based data access for CIT applications and pipeline management.
 * Returns { data, error } pattern with snake_case interfaces.
 */

import prisma from '@/lib/db/client'
import type { CitApplicationStatus, CitProgressEventType } from '@/generated/prisma'

// ============================================================================
// INTERFACES (snake_case for frontend consistency)
// ============================================================================

export interface CitApplication {
  id: string
  user_id: string | null
  first_name: string
  last_name: string
  email: string
  phone: string | null
  city: string | null
  state: string | null
  school_name: string | null
  grade_level: string | null
  graduation_year: string | null
  sports_played: string | null
  experience_summary: string | null
  why_cit: string | null
  leadership_experience: string | null
  availability_notes: string | null
  parent_name: string | null
  parent_email: string | null
  parent_phone: string | null
  status: CitApplicationStatus
  assigned_licensee_id: string | null
  assigned_director_id: string | null
  notes_internal: string | null
  how_heard: string | null
  created_at: string
  updated_at: string
}

export interface CitProgressEvent {
  id: string
  cit_application_id: string
  type: CitProgressEventType
  from_status: CitApplicationStatus | null
  to_status: CitApplicationStatus | null
  details: string | null
  changed_by_user_id: string | null
  created_at: string
}

export interface CitAssignment {
  id: string
  cit_application_id: string
  camp_id: string
  role: string
  status: string
  notes: string | null
  assigned_by_user_id: string | null
  created_at: string
  updated_at: string
  camp_name?: string
  camp_start_date?: string
}

export interface CitApplicationWithEvents extends CitApplication {
  progress_events: CitProgressEvent[]
  assignments: CitAssignment[]
}

export interface CreateCitApplicationInput {
  first_name: string
  last_name: string
  email: string
  phone?: string
  city?: string
  state?: string
  school_name?: string
  grade_level?: string
  graduation_year?: string
  sports_played?: string
  experience_summary?: string
  why_cit?: string
  leadership_experience?: string
  availability_notes?: string
  parent_name?: string
  parent_email?: string
  parent_phone?: string
  how_heard?: string
  user_id?: string
}

export interface ListCitApplicationsFilters {
  status?: CitApplicationStatus | CitApplicationStatus[]
  licensee_id?: string
  search?: string
}

export interface ListCitApplicationsOptions {
  page?: number
  page_size?: number
}

export interface ListCitApplicationsResult {
  applications: CitApplication[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// ============================================================================
// CREATE APPLICATION
// ============================================================================

export async function createCitApplication(
  input: CreateCitApplicationInput
): Promise<{ data: CitApplication | null; error: Error | null }> {
  try {
    // Create the application
    const application = await prisma.citApplication.create({
      data: {
        userId: input.user_id || null,
        firstName: input.first_name,
        lastName: input.last_name,
        email: input.email,
        phone: input.phone || null,
        city: input.city || null,
        state: input.state || null,
        schoolName: input.school_name || null,
        gradeLevel: input.grade_level || null,
        graduationYear: input.graduation_year || null,
        sportsPlayed: input.sports_played || null,
        experienceSummary: input.experience_summary || null,
        whyCit: input.why_cit || null,
        leadershipExperience: input.leadership_experience || null,
        availabilityNotes: input.availability_notes || null,
        parentName: input.parent_name || null,
        parentEmail: input.parent_email || null,
        parentPhone: input.parent_phone || null,
        howHeard: input.how_heard || null,
        status: 'applied',
      },
    })

    // Create initial progress event
    await prisma.citProgressEvent.create({
      data: {
        citApplicationId: application.id,
        type: 'application_submitted',
        fromStatus: null,
        toStatus: 'applied',
        details: 'Application submitted',
        changedByUserId: input.user_id || null,
      },
    })

    // Map to snake_case
    const result: CitApplication = {
      id: application.id,
      user_id: application.userId,
      first_name: application.firstName,
      last_name: application.lastName,
      email: application.email,
      phone: application.phone,
      city: application.city,
      state: application.state,
      school_name: application.schoolName,
      grade_level: application.gradeLevel,
      graduation_year: application.graduationYear,
      sports_played: application.sportsPlayed,
      experience_summary: application.experienceSummary,
      why_cit: application.whyCit,
      leadership_experience: application.leadershipExperience,
      availability_notes: application.availabilityNotes,
      parent_name: application.parentName,
      parent_email: application.parentEmail,
      parent_phone: application.parentPhone,
      status: application.status,
      assigned_licensee_id: application.assignedLicenseeId,
      assigned_director_id: application.assignedDirectorId,
      notes_internal: application.notesInternal,
      how_heard: application.howHeard,
      created_at: application.createdAt.toISOString(),
      updated_at: application.updatedAt.toISOString(),
    }

    return { data: result, error: null }
  } catch (err) {
    console.error('Error creating CIT application:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// LIST APPLICATIONS
// ============================================================================

export async function listCitApplications(
  filters?: ListCitApplicationsFilters,
  options?: ListCitApplicationsOptions
): Promise<{ data: ListCitApplicationsResult | null; error: Error | null }> {
  try {
    const page = options?.page || 1
    const pageSize = options?.page_size || 20
    const skip = (page - 1) * pageSize

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        where.status = { in: filters.status }
      } else {
        where.status = filters.status
      }
    }

    if (filters?.licensee_id) {
      where.assignedLicenseeId = filters.licensee_id
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      where.OR = [
        { firstName: { contains: searchLower, mode: 'insensitive' } },
        { lastName: { contains: searchLower, mode: 'insensitive' } },
        { email: { contains: searchLower, mode: 'insensitive' } },
      ]
    }

    // Get total count
    const total = await prisma.citApplication.count({ where })

    // Get applications
    const applications = await prisma.citApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    })

    // Map to snake_case
    const result: CitApplication[] = applications.map((app) => ({
      id: app.id,
      user_id: app.userId,
      first_name: app.firstName,
      last_name: app.lastName,
      email: app.email,
      phone: app.phone,
      city: app.city,
      state: app.state,
      school_name: app.schoolName,
      grade_level: app.gradeLevel,
      graduation_year: app.graduationYear,
      sports_played: app.sportsPlayed,
      experience_summary: app.experienceSummary,
      why_cit: app.whyCit,
      leadership_experience: app.leadershipExperience,
      availability_notes: app.availabilityNotes,
      parent_name: app.parentName,
      parent_email: app.parentEmail,
      parent_phone: app.parentPhone,
      status: app.status,
      assigned_licensee_id: app.assignedLicenseeId,
      assigned_director_id: app.assignedDirectorId,
      notes_internal: app.notesInternal,
      how_heard: app.howHeard,
      created_at: app.createdAt.toISOString(),
      updated_at: app.updatedAt.toISOString(),
    }))

    return {
      data: {
        applications: result,
        total,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(total / pageSize),
      },
      error: null,
    }
  } catch (err) {
    console.error('Error listing CIT applications:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// GET APPLICATION BY ID
// ============================================================================

export async function getCitApplicationById(
  id: string
): Promise<{ data: CitApplicationWithEvents | null; error: Error | null }> {
  try {
    const application = await prisma.citApplication.findUnique({
      where: { id },
      include: {
        progressEvents: {
          orderBy: { createdAt: 'desc' },
        },
        assignments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!application) {
      return { data: null, error: new Error('Application not found') }
    }

    // Map to snake_case
    const result: CitApplicationWithEvents = {
      id: application.id,
      user_id: application.userId,
      first_name: application.firstName,
      last_name: application.lastName,
      email: application.email,
      phone: application.phone,
      city: application.city,
      state: application.state,
      school_name: application.schoolName,
      grade_level: application.gradeLevel,
      graduation_year: application.graduationYear,
      sports_played: application.sportsPlayed,
      experience_summary: application.experienceSummary,
      why_cit: application.whyCit,
      leadership_experience: application.leadershipExperience,
      availability_notes: application.availabilityNotes,
      parent_name: application.parentName,
      parent_email: application.parentEmail,
      parent_phone: application.parentPhone,
      status: application.status,
      assigned_licensee_id: application.assignedLicenseeId,
      assigned_director_id: application.assignedDirectorId,
      notes_internal: application.notesInternal,
      how_heard: application.howHeard,
      created_at: application.createdAt.toISOString(),
      updated_at: application.updatedAt.toISOString(),
      progress_events: application.progressEvents.map((event) => ({
        id: event.id,
        cit_application_id: event.citApplicationId,
        type: event.type,
        from_status: event.fromStatus,
        to_status: event.toStatus,
        details: event.details,
        changed_by_user_id: event.changedByUserId,
        created_at: event.createdAt.toISOString(),
      })),
      assignments: application.assignments.map((assign) => ({
        id: assign.id,
        cit_application_id: assign.citApplicationId,
        camp_id: assign.campId,
        role: assign.role,
        status: assign.status,
        notes: assign.notes,
        assigned_by_user_id: assign.assignedByUserId,
        created_at: assign.createdAt.toISOString(),
        updated_at: assign.updatedAt.toISOString(),
      })),
    }

    return { data: result, error: null }
  } catch (err) {
    console.error('Error getting CIT application:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// UPDATE APPLICATION STATUS
// ============================================================================

export async function updateCitApplicationStatus(
  id: string,
  newStatus: CitApplicationStatus,
  options?: {
    details?: string
    changed_by_user_id?: string
    notes_internal?: string
  }
): Promise<{ data: CitApplication | null; error: Error | null }> {
  try {
    // Get current application
    const current = await prisma.citApplication.findUnique({
      where: { id },
    })

    if (!current) {
      return { data: null, error: new Error('Application not found') }
    }

    const fromStatus = current.status

    // Update application
    const updateData: { status: CitApplicationStatus; notesInternal?: string } = {
      status: newStatus,
    }
    if (options?.notes_internal !== undefined) {
      updateData.notesInternal = options.notes_internal
    }

    const updated = await prisma.citApplication.update({
      where: { id },
      data: updateData,
    })

    // Create progress event
    await prisma.citProgressEvent.create({
      data: {
        citApplicationId: id,
        type: 'status_change',
        fromStatus,
        toStatus: newStatus,
        details: options?.details || `Status changed from ${fromStatus} to ${newStatus}`,
        changedByUserId: options?.changed_by_user_id || null,
      },
    })

    // Map to snake_case
    const result: CitApplication = {
      id: updated.id,
      user_id: updated.userId,
      first_name: updated.firstName,
      last_name: updated.lastName,
      email: updated.email,
      phone: updated.phone,
      city: updated.city,
      state: updated.state,
      school_name: updated.schoolName,
      grade_level: updated.gradeLevel,
      graduation_year: updated.graduationYear,
      sports_played: updated.sportsPlayed,
      experience_summary: updated.experienceSummary,
      why_cit: updated.whyCit,
      leadership_experience: updated.leadershipExperience,
      availability_notes: updated.availabilityNotes,
      parent_name: updated.parentName,
      parent_email: updated.parentEmail,
      parent_phone: updated.parentPhone,
      status: updated.status,
      assigned_licensee_id: updated.assignedLicenseeId,
      assigned_director_id: updated.assignedDirectorId,
      notes_internal: updated.notesInternal,
      how_heard: updated.howHeard,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
    }

    return { data: result, error: null }
  } catch (err) {
    console.error('Error updating CIT application status:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// ADD PROGRESS EVENT (for notes/custom events)
// ============================================================================

export async function addCitProgressEvent(
  citApplicationId: string,
  type: CitProgressEventType,
  options?: {
    details?: string
    changed_by_user_id?: string
  }
): Promise<{ data: CitProgressEvent | null; error: Error | null }> {
  try {
    const event = await prisma.citProgressEvent.create({
      data: {
        citApplicationId,
        type,
        details: options?.details || null,
        changedByUserId: options?.changed_by_user_id || null,
      },
    })

    const result: CitProgressEvent = {
      id: event.id,
      cit_application_id: event.citApplicationId,
      type: event.type,
      from_status: event.fromStatus,
      to_status: event.toStatus,
      details: event.details,
      changed_by_user_id: event.changedByUserId,
      created_at: event.createdAt.toISOString(),
    }

    return { data: result, error: null }
  } catch (err) {
    console.error('Error adding CIT progress event:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// UPDATE INTERNAL NOTES
// ============================================================================

export async function updateCitApplicationNotes(
  id: string,
  notes: string,
  changedByUserId?: string
): Promise<{ data: CitApplication | null; error: Error | null }> {
  try {
    const updated = await prisma.citApplication.update({
      where: { id },
      data: { notesInternal: notes },
    })

    // Create progress event for note
    await prisma.citProgressEvent.create({
      data: {
        citApplicationId: id,
        type: 'note_added',
        details: 'Internal notes updated',
        changedByUserId: changedByUserId || null,
      },
    })

    const result: CitApplication = {
      id: updated.id,
      user_id: updated.userId,
      first_name: updated.firstName,
      last_name: updated.lastName,
      email: updated.email,
      phone: updated.phone,
      city: updated.city,
      state: updated.state,
      school_name: updated.schoolName,
      grade_level: updated.gradeLevel,
      graduation_year: updated.graduationYear,
      sports_played: updated.sportsPlayed,
      experience_summary: updated.experienceSummary,
      why_cit: updated.whyCit,
      leadership_experience: updated.leadershipExperience,
      availability_notes: updated.availabilityNotes,
      parent_name: updated.parentName,
      parent_email: updated.parentEmail,
      parent_phone: updated.parentPhone,
      status: updated.status,
      assigned_licensee_id: updated.assignedLicenseeId,
      assigned_director_id: updated.assignedDirectorId,
      notes_internal: updated.notesInternal,
      how_heard: updated.howHeard,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
    }

    return { data: result, error: null }
  } catch (err) {
    console.error('Error updating CIT application notes:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// CREATE CAMP ASSIGNMENT
// ============================================================================

export async function createCitAssignment(
  citApplicationId: string,
  campId: string,
  options?: {
    role?: string
    notes?: string
    assigned_by_user_id?: string
  }
): Promise<{ data: CitAssignment | null; error: Error | null }> {
  try {
    const assignment = await prisma.citAssignment.create({
      data: {
        citApplicationId,
        campId,
        role: options?.role || 'cit',
        status: 'planned',
        notes: options?.notes || null,
        assignedByUserId: options?.assigned_by_user_id || null,
      },
    })

    // Create progress event
    await prisma.citProgressEvent.create({
      data: {
        citApplicationId,
        type: 'camp_assigned',
        details: `Assigned to camp ${campId}`,
        changedByUserId: options?.assigned_by_user_id || null,
      },
    })

    const result: CitAssignment = {
      id: assignment.id,
      cit_application_id: assignment.citApplicationId,
      camp_id: assignment.campId,
      role: assignment.role,
      status: assignment.status,
      notes: assignment.notes,
      assigned_by_user_id: assignment.assignedByUserId,
      created_at: assignment.createdAt.toISOString(),
      updated_at: assignment.updatedAt.toISOString(),
    }

    return { data: result, error: null }
  } catch (err) {
    console.error('Error creating CIT assignment:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// GET APPLICATION COUNTS BY STATUS
// ============================================================================

export async function getCitApplicationCounts(): Promise<{
  data: Record<CitApplicationStatus, number> | null
  error: Error | null
}> {
  try {
    const counts = await prisma.citApplication.groupBy({
      by: ['status'],
      _count: true,
    })

    // Initialize all statuses with 0
    const result: Record<CitApplicationStatus, number> = {
      applied: 0,
      under_review: 0,
      interview_scheduled: 0,
      interview_completed: 0,
      training_pending: 0,
      training_complete: 0,
      approved: 0,
      assigned_first_camp: 0,
      rejected: 0,
      on_hold: 0,
      withdrawn: 0,
    }

    // Fill in actual counts
    for (const count of counts) {
      result[count.status] = count._count
    }

    return { data: result, error: null }
  } catch (err) {
    console.error('Error getting CIT application counts:', err)
    return { data: null, error: err as Error }
  }
}
