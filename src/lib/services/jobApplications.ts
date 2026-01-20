/**
 * Job Applications Services
 *
 * Prisma-based data access for job applications and pipeline management.
 * Returns { data, error } pattern with snake_case interfaces.
 * Supports multi-tenant filtering (hq_admin sees all, licensee_owner sees their tenant only).
 */

import prisma from '@/lib/db/client'
import type { JobApplicationStatus, Prisma } from '@/generated/prisma'

// ============================================================================
// INTERFACES (snake_case for frontend consistency)
// ============================================================================

export interface JobApplication {
  id: string
  tenant_id: string | null
  job_id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  city: string | null
  state: string | null
  age: number | null
  resume_url: string | null
  cover_letter: string | null
  linkedin_url: string | null
  how_heard: string | null
  availability_json: Record<string, unknown> | null
  certifications_json: Record<string, unknown> | null
  applicant_notes: string | null
  background_check_acknowledged: boolean
  status: JobApplicationStatus
  reviewed_by_user_id: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  // Joined fields
  job?: {
    id: string
    title: string
    slug: string
    location_label: string
    employment_type: string
  }
  tenant?: {
    id: string
    name: string
    slug: string
  } | null
}

export interface JobApplicationAttachment {
  id: string
  application_id: string
  file_name: string
  file_type: string
  file_size: number
  s3_key: string
  uploaded_at: string
  // Presigned URL for download (computed)
  download_url?: string
}

export interface JobApplicationInternalNote {
  id: string
  application_id: string
  author_user_id: string
  author_name: string
  content: string
  created_at: string
  updated_at: string
}

export interface JobApplicationStatusChange {
  id: string
  application_id: string
  from_status: JobApplicationStatus
  to_status: JobApplicationStatus
  changed_by_user_id: string
  changed_by_name: string
  reason: string | null
  created_at: string
}

export interface JobApplicationWithDetails extends JobApplication {
  attachments: JobApplicationAttachment[]
  internal_notes: JobApplicationInternalNote[]
  status_changes: JobApplicationStatusChange[]
}

export interface CreateJobApplicationInput {
  tenant_id?: string
  job_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  city?: string
  state?: string
  age?: number
  resume_url?: string
  cover_letter?: string
  linkedin_url?: string
  how_heard?: string
  availability_json?: Record<string, unknown>
  certifications_json?: Record<string, unknown>
  applicant_notes?: string
  background_check_acknowledged?: boolean
}

export interface ListJobApplicationsFilters {
  tenant_id?: string
  job_id?: string
  status?: JobApplicationStatus | JobApplicationStatus[]
  search?: string
}

export interface ListJobApplicationsOptions {
  page?: number
  page_size?: number
}

export interface ListJobApplicationsResult {
  applications: JobApplication[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface JobApplicationCounts {
  submitted: number
  under_review: number
  phone_screen: number
  interview_scheduled: number
  interview_completed: number
  offer_extended: number
  hired: number
  rejected: number
  withdrawn: number
  total: number
}

// ============================================================================
// HELPER: Map Prisma model to snake_case interface
// ============================================================================

function mapApplicationToSnakeCase(app: {
  id: string
  tenantId: string | null
  jobId: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  city: string | null
  state: string | null
  age: number | null
  resumeUrl: string | null
  coverLetter: string | null
  linkedinUrl: string | null
  howHeard: string | null
  availabilityJson: unknown
  certificationsJson: unknown
  applicantNotes: string | null
  backgroundCheckAcknowledged: boolean
  status: JobApplicationStatus
  reviewedByUserId: string | null
  reviewedAt: Date | null
  createdAt: Date
  updatedAt: Date
  job?: {
    id: string
    title: string
    slug: string
    locationLabel: string
    employmentType: string
  }
  tenant?: {
    id: string
    name: string
    slug: string
  } | null
}): JobApplication {
  return {
    id: app.id,
    tenant_id: app.tenantId,
    job_id: app.jobId,
    first_name: app.firstName,
    last_name: app.lastName,
    email: app.email,
    phone: app.phone,
    city: app.city,
    state: app.state,
    age: app.age,
    resume_url: app.resumeUrl,
    cover_letter: app.coverLetter,
    linkedin_url: app.linkedinUrl,
    how_heard: app.howHeard,
    availability_json: app.availabilityJson as Record<string, unknown> | null,
    certifications_json: app.certificationsJson as Record<string, unknown> | null,
    applicant_notes: app.applicantNotes,
    background_check_acknowledged: app.backgroundCheckAcknowledged,
    status: app.status,
    reviewed_by_user_id: app.reviewedByUserId,
    reviewed_at: app.reviewedAt?.toISOString() || null,
    created_at: app.createdAt.toISOString(),
    updated_at: app.updatedAt.toISOString(),
    job: app.job
      ? {
          id: app.job.id,
          title: app.job.title,
          slug: app.job.slug,
          location_label: app.job.locationLabel,
          employment_type: app.job.employmentType,
        }
      : undefined,
    tenant: app.tenant
      ? {
          id: app.tenant.id,
          name: app.tenant.name,
          slug: app.tenant.slug,
        }
      : null,
  }
}

// ============================================================================
// CREATE APPLICATION (public submission)
// ============================================================================

export async function createJobApplication(
  input: CreateJobApplicationInput
): Promise<{ data: JobApplication | null; error: Error | null }> {
  try {
    // Find the job to get tenant_id
    const job = await prisma.jobPosting.findUnique({
      where: { id: input.job_id },
      select: { id: true, tenantId: true },
    })

    if (!job) {
      return { data: null, error: new Error('Job posting not found') }
    }

    // Check for duplicate application
    const existing = await prisma.jobApplication.findFirst({
      where: {
        jobId: input.job_id,
        email: input.email.toLowerCase(),
      },
    })

    if (existing) {
      return {
        data: null,
        error: new Error('You have already submitted an application for this position'),
      }
    }

    // Create the application
    const application = await prisma.jobApplication.create({
      data: {
        tenantId: input.tenant_id || job.tenantId,
        jobId: input.job_id,
        firstName: input.first_name.trim(),
        lastName: input.last_name.trim(),
        email: input.email.toLowerCase().trim(),
        phone: input.phone?.trim() || null,
        city: input.city?.trim() || null,
        state: input.state?.trim() || null,
        age: input.age || null,
        resumeUrl: input.resume_url || null,
        coverLetter: input.cover_letter?.trim() || null,
        linkedinUrl: input.linkedin_url?.trim() || null,
        howHeard: input.how_heard?.trim() || null,
        availabilityJson: input.availability_json as Prisma.InputJsonValue | undefined,
        certificationsJson: input.certifications_json as Prisma.InputJsonValue | undefined,
        applicantNotes: input.applicant_notes?.trim() || null,
        backgroundCheckAcknowledged: input.background_check_acknowledged || false,
        status: 'submitted',
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            slug: true,
            locationLabel: true,
            employmentType: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    return { data: mapApplicationToSnakeCase(application), error: null }
  } catch (err) {
    console.error('Error creating job application:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// LIST APPLICATIONS (with tenant filtering)
// ============================================================================

export async function listJobApplications(
  filters?: ListJobApplicationsFilters,
  options?: ListJobApplicationsOptions
): Promise<{ data: ListJobApplicationsResult | null; error: Error | null }> {
  try {
    const page = options?.page || 1
    const pageSize = options?.page_size || 20
    const skip = (page - 1) * pageSize

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    // Tenant filtering (critical for RBAC)
    if (filters?.tenant_id) {
      where.tenantId = filters.tenant_id
    }

    if (filters?.job_id) {
      where.jobId = filters.job_id
    }

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        where.status = { in: filters.status }
      } else {
        where.status = filters.status
      }
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
    const total = await prisma.jobApplication.count({ where })

    // Get applications
    const applications = await prisma.jobApplication.findMany({
      where,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            slug: true,
            locationLabel: true,
            employmentType: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    })

    return {
      data: {
        applications: applications.map(mapApplicationToSnakeCase),
        total,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(total / pageSize),
      },
      error: null,
    }
  } catch (err) {
    console.error('Error listing job applications:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// GET APPLICATION BY ID
// ============================================================================

export async function getJobApplicationById(
  id: string,
  tenantId?: string
): Promise<{ data: JobApplicationWithDetails | null; error: Error | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { id }

    // Tenant filtering for RBAC
    if (tenantId) {
      where.tenantId = tenantId
    }

    const application = await prisma.jobApplication.findFirst({
      where,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            slug: true,
            locationLabel: true,
            employmentType: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        attachments: {
          orderBy: { uploadedAt: 'desc' },
        },
        internalNotes: {
          orderBy: { createdAt: 'desc' },
        },
        statusChanges: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!application) {
      return { data: null, error: new Error('Application not found') }
    }

    const result: JobApplicationWithDetails = {
      ...mapApplicationToSnakeCase(application),
      attachments: application.attachments.map((att) => ({
        id: att.id,
        application_id: att.applicationId,
        file_name: att.fileName,
        file_type: att.fileType,
        file_size: att.fileSize,
        s3_key: att.s3Key,
        uploaded_at: att.uploadedAt.toISOString(),
      })),
      internal_notes: application.internalNotes.map((note) => ({
        id: note.id,
        application_id: note.applicationId,
        author_user_id: note.authorUserId,
        author_name: note.authorName,
        content: note.content,
        created_at: note.createdAt.toISOString(),
        updated_at: note.updatedAt.toISOString(),
      })),
      status_changes: application.statusChanges.map((change) => ({
        id: change.id,
        application_id: change.applicationId,
        from_status: change.fromStatus,
        to_status: change.toStatus,
        changed_by_user_id: change.changedByUserId,
        changed_by_name: change.changedByName,
        reason: change.reason,
        created_at: change.createdAt.toISOString(),
      })),
    }

    return { data: result, error: null }
  } catch (err) {
    console.error('Error getting job application:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// UPDATE APPLICATION STATUS
// ============================================================================

export async function updateJobApplicationStatus(
  id: string,
  newStatus: JobApplicationStatus,
  options: {
    changed_by_user_id: string
    changed_by_name: string
    reason?: string
    tenant_id?: string
  }
): Promise<{ data: JobApplication | null; error: Error | null }> {
  try {
    // Get current application
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { id }
    if (options.tenant_id) {
      where.tenantId = options.tenant_id
    }

    const current = await prisma.jobApplication.findFirst({ where })

    if (!current) {
      return { data: null, error: new Error('Application not found') }
    }

    const fromStatus = current.status

    // Update application
    const updated = await prisma.jobApplication.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedByUserId: options.changed_by_user_id,
        reviewedAt: new Date(),
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            slug: true,
            locationLabel: true,
            employmentType: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    // Create status change audit record
    await prisma.jobApplicationStatusChange.create({
      data: {
        applicationId: id,
        fromStatus,
        toStatus: newStatus,
        changedByUserId: options.changed_by_user_id,
        changedByName: options.changed_by_name,
        reason: options.reason || null,
      },
    })

    return { data: mapApplicationToSnakeCase(updated), error: null }
  } catch (err) {
    console.error('Error updating job application status:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// ADD INTERNAL NOTE
// ============================================================================

export async function addJobApplicationNote(
  applicationId: string,
  content: string,
  options: {
    author_user_id: string
    author_name: string
    tenant_id?: string
  }
): Promise<{ data: JobApplicationInternalNote | null; error: Error | null }> {
  try {
    // Verify application exists (with tenant check if provided)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { id: applicationId }
    if (options.tenant_id) {
      where.tenantId = options.tenant_id
    }

    const application = await prisma.jobApplication.findFirst({ where })
    if (!application) {
      return { data: null, error: new Error('Application not found') }
    }

    const note = await prisma.jobApplicationInternalNote.create({
      data: {
        applicationId,
        authorUserId: options.author_user_id,
        authorName: options.author_name,
        content: content.trim(),
      },
    })

    return {
      data: {
        id: note.id,
        application_id: note.applicationId,
        author_user_id: note.authorUserId,
        author_name: note.authorName,
        content: note.content,
        created_at: note.createdAt.toISOString(),
        updated_at: note.updatedAt.toISOString(),
      },
      error: null,
    }
  } catch (err) {
    console.error('Error adding job application note:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// DELETE INTERNAL NOTE
// ============================================================================

export async function deleteJobApplicationNote(
  noteId: string,
  tenantId?: string
): Promise<{ data: { success: boolean }; error: Error | null }> {
  try {
    // Get note with application for tenant check
    const note = await prisma.jobApplicationInternalNote.findUnique({
      where: { id: noteId },
      include: { application: true },
    })

    if (!note) {
      return { data: { success: false }, error: new Error('Note not found') }
    }

    // Tenant check
    if (tenantId && note.application.tenantId !== tenantId) {
      return { data: { success: false }, error: new Error('Unauthorized') }
    }

    await prisma.jobApplicationInternalNote.delete({
      where: { id: noteId },
    })

    return { data: { success: true }, error: null }
  } catch (err) {
    console.error('Error deleting job application note:', err)
    return { data: { success: false }, error: err as Error }
  }
}

// ============================================================================
// ADD ATTACHMENT
// ============================================================================

export async function addJobApplicationAttachment(
  applicationId: string,
  attachment: {
    file_name: string
    file_type: string
    file_size: number
    s3_key: string
  },
  tenantId?: string
): Promise<{ data: JobApplicationAttachment | null; error: Error | null }> {
  try {
    // Verify application exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { id: applicationId }
    if (tenantId) {
      where.tenantId = tenantId
    }

    const application = await prisma.jobApplication.findFirst({ where })
    if (!application) {
      return { data: null, error: new Error('Application not found') }
    }

    const att = await prisma.jobApplicationAttachment.create({
      data: {
        applicationId,
        fileName: attachment.file_name,
        fileType: attachment.file_type,
        fileSize: attachment.file_size,
        s3Key: attachment.s3_key,
      },
    })

    return {
      data: {
        id: att.id,
        application_id: att.applicationId,
        file_name: att.fileName,
        file_type: att.fileType,
        file_size: att.fileSize,
        s3_key: att.s3Key,
        uploaded_at: att.uploadedAt.toISOString(),
      },
      error: null,
    }
  } catch (err) {
    console.error('Error adding job application attachment:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// DELETE ATTACHMENT
// ============================================================================

export async function deleteJobApplicationAttachment(
  attachmentId: string,
  tenantId?: string
): Promise<{ data: { success: boolean; s3_key: string | null }; error: Error | null }> {
  try {
    const attachment = await prisma.jobApplicationAttachment.findUnique({
      where: { id: attachmentId },
      include: { application: true },
    })

    if (!attachment) {
      return { data: { success: false, s3_key: null }, error: new Error('Attachment not found') }
    }

    // Tenant check
    if (tenantId && attachment.application.tenantId !== tenantId) {
      return { data: { success: false, s3_key: null }, error: new Error('Unauthorized') }
    }

    const s3Key = attachment.s3Key

    await prisma.jobApplicationAttachment.delete({
      where: { id: attachmentId },
    })

    return { data: { success: true, s3_key: s3Key }, error: null }
  } catch (err) {
    console.error('Error deleting job application attachment:', err)
    return { data: { success: false, s3_key: null }, error: err as Error }
  }
}

// ============================================================================
// GET APPLICATION COUNTS BY STATUS
// ============================================================================

export async function getJobApplicationCounts(
  tenantId?: string
): Promise<{ data: JobApplicationCounts | null; error: Error | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    if (tenantId) {
      where.tenantId = tenantId
    }

    const counts = await prisma.jobApplication.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    })

    const result: JobApplicationCounts = {
      submitted: 0,
      under_review: 0,
      phone_screen: 0,
      interview_scheduled: 0,
      interview_completed: 0,
      offer_extended: 0,
      hired: 0,
      rejected: 0,
      withdrawn: 0,
      total: 0,
    }

    for (const count of counts) {
      result[count.status] = count._count.id
      result.total += count._count.id
    }

    return { data: result, error: null }
  } catch (err) {
    console.error('Error getting job application counts:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// DELETE APPLICATION
// ============================================================================

export async function deleteJobApplication(
  id: string,
  tenantId?: string
): Promise<{ data: { success: boolean }; error: Error | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { id }
    if (tenantId) {
      where.tenantId = tenantId
    }

    const application = await prisma.jobApplication.findFirst({ where })
    if (!application) {
      return { data: { success: false }, error: new Error('Application not found') }
    }

    // Delete cascades to attachments, notes, status changes
    await prisma.jobApplication.delete({
      where: { id },
    })

    return { data: { success: true }, error: null }
  } catch (err) {
    console.error('Error deleting job application:', err)
    return { data: { success: false }, error: err as Error }
  }
}

// ============================================================================
// GET JOBS WITH APPLICATION COUNTS (for filtering dropdown)
// ============================================================================

export async function getJobsWithApplicationCounts(
  tenantId?: string
): Promise<{
  data: Array<{ id: string; title: string; slug: string; application_count: number }> | null
  error: Error | null
}> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    if (tenantId) {
      where.tenantId = tenantId
    }

    const jobs = await prisma.jobPosting.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        _count: {
          select: { applications: true },
        },
      },
      orderBy: { title: 'asc' },
    })

    return {
      data: jobs.map((job) => ({
        id: job.id,
        title: job.title,
        slug: job.slug,
        application_count: job._count.applications,
      })),
      error: null,
    }
  } catch (err) {
    console.error('Error getting jobs with application counts:', err)
    return { data: null, error: err as Error }
  }
}
