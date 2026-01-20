/**
 * Job Postings Services
 *
 * Prisma-based data access for job board/careers functionality.
 * Returns { data, error } pattern with snake_case interfaces.
 */

import prisma from '@/lib/db/client'
import type { JobStatus, EmploymentType } from '@/generated/prisma'

// ============================================================================
// INTERFACES
// ============================================================================

export interface JobPosting {
  id: string
  title: string
  slug: string
  short_description: string
  full_description: string
  location_label: string
  employment_type: EmploymentType
  is_remote_friendly: boolean
  min_comp_cents: number | null
  max_comp_cents: number | null
  comp_frequency: string | null
  application_instructions: string | null
  application_email: string | null
  application_url: string | null
  status: JobStatus
  priority: number
  tenant_id: string | null
  created_by_user_id: string
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface JobPostingCard {
  id: string
  title: string
  slug: string
  short_description: string
  location_label: string
  employment_type: EmploymentType
  is_remote_friendly: boolean
  created_at: string
}

export interface CreateJobPostingInput {
  title: string
  slug?: string
  short_description: string
  full_description: string
  location_label: string
  employment_type: EmploymentType
  is_remote_friendly?: boolean
  min_comp_cents?: number
  max_comp_cents?: number
  comp_frequency?: string
  application_instructions?: string
  application_email?: string
  application_url?: string
  status?: JobStatus
  priority?: number
  tenant_id?: string
  created_by_user_id: string
}

export interface UpdateJobPostingInput {
  title?: string
  slug?: string
  short_description?: string
  full_description?: string
  location_label?: string
  employment_type?: EmploymentType
  is_remote_friendly?: boolean
  min_comp_cents?: number | null
  max_comp_cents?: number | null
  comp_frequency?: string | null
  application_instructions?: string | null
  application_email?: string | null
  application_url?: string | null
  status?: JobStatus
  priority?: number
}

export interface ListJobPostingsResult {
  postings: JobPosting[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface JobCounts {
  draft: number
  open: number
  closed: number
  archived: number
  total: number
}

// ============================================================================
// HELPER: Transform Prisma record to snake_case interface
// ============================================================================

function transformJobPosting(record: {
  id: string
  title: string
  slug: string
  shortDescription: string
  fullDescription: string
  locationLabel: string
  employmentType: EmploymentType
  isRemoteFriendly: boolean
  minCompCents: number | null
  maxCompCents: number | null
  compFrequency: string | null
  applicationInstructions: string | null
  applicationEmail: string | null
  applicationUrl: string | null
  status: JobStatus
  priority: number
  tenantId: string | null
  createdByUserId: string
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): JobPosting {
  return {
    id: record.id,
    title: record.title,
    slug: record.slug,
    short_description: record.shortDescription,
    full_description: record.fullDescription,
    location_label: record.locationLabel,
    employment_type: record.employmentType,
    is_remote_friendly: record.isRemoteFriendly,
    min_comp_cents: record.minCompCents,
    max_comp_cents: record.maxCompCents,
    comp_frequency: record.compFrequency,
    application_instructions: record.applicationInstructions,
    application_email: record.applicationEmail,
    application_url: record.applicationUrl,
    status: record.status,
    priority: record.priority,
    tenant_id: record.tenantId,
    created_by_user_id: record.createdByUserId,
    published_at: record.publishedAt?.toISOString() || null,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
  }
}

function transformJobPostingCard(record: {
  id: string
  title: string
  slug: string
  shortDescription: string
  locationLabel: string
  employmentType: EmploymentType
  isRemoteFriendly: boolean
  createdAt: Date
}): JobPostingCard {
  return {
    id: record.id,
    title: record.title,
    slug: record.slug,
    short_description: record.shortDescription,
    location_label: record.locationLabel,
    employment_type: record.employmentType,
    is_remote_friendly: record.isRemoteFriendly,
    created_at: record.createdAt.toISOString(),
  }
}

// ============================================================================
// SLUG GENERATION
// ============================================================================

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await prisma.jobPosting.findUnique({
      where: { slug },
      select: { id: true },
    })

    if (!existing || existing.id === excludeId) {
      return slug
    }

    slug = `${baseSlug}-${counter}`
    counter++
  }
}

// ============================================================================
// PUBLIC: LIST JOB POSTINGS (for /careers page)
// ============================================================================

export async function listPublicJobPostings(
  filters?: {
    location?: string
    employment_type?: EmploymentType
  }
): Promise<{ data: JobPostingCard[] | null; error: Error | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      status: 'open',
    }

    if (filters?.location) {
      where.locationLabel = { contains: filters.location, mode: 'insensitive' }
    }

    if (filters?.employment_type) {
      where.employmentType = filters.employment_type
    }

    const postings = await prisma.jobPosting.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        shortDescription: true,
        locationLabel: true,
        employmentType: true,
        isRemoteFriendly: true,
        createdAt: true,
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return {
      data: postings.map(transformJobPostingCard),
      error: null,
    }
  } catch (err) {
    console.error('Error listing public job postings:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// PUBLIC: GET JOB POSTING BY SLUG (for /careers/[slug] page)
// ============================================================================

export async function getJobPostingBySlug(
  slug: string,
  options?: { allowDraft?: boolean }
): Promise<{ data: JobPosting | null; error: Error | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { slug }

    if (!options?.allowDraft) {
      where.status = 'open'
    }

    const posting = await prisma.jobPosting.findFirst({
      where,
    })

    if (!posting) {
      return { data: null, error: null }
    }

    return { data: transformJobPosting(posting), error: null }
  } catch (err) {
    console.error('Error fetching job posting by slug:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// ADMIN: LIST JOB POSTINGS
// ============================================================================

export async function adminListJobPostings(
  filters?: {
    status?: JobStatus | JobStatus[]
    tenant_id?: string
    search?: string
  },
  options?: {
    page?: number
    page_size?: number
  }
): Promise<{ data: ListJobPostingsResult | null; error: Error | null }> {
  try {
    const page = options?.page || 1
    const pageSize = options?.page_size || 20
    const skip = (page - 1) * pageSize

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        where.status = { in: filters.status }
      } else {
        where.status = filters.status
      }
    }

    if (filters?.tenant_id) {
      where.tenantId = filters.tenant_id
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { locationLabel: { contains: filters.search, mode: 'insensitive' } },
        { shortDescription: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    const [postings, total] = await Promise.all([
      prisma.jobPosting.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: pageSize,
      }),
      prisma.jobPosting.count({ where }),
    ])

    return {
      data: {
        postings: postings.map(transformJobPosting),
        total,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(total / pageSize),
      },
      error: null,
    }
  } catch (err) {
    console.error('Error listing admin job postings:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// ADMIN: GET JOB POSTING BY ID
// ============================================================================

export async function adminGetJobPostingById(
  id: string
): Promise<{ data: JobPosting | null; error: Error | null }> {
  try {
    const posting = await prisma.jobPosting.findUnique({
      where: { id },
    })

    if (!posting) {
      return { data: null, error: null }
    }

    return { data: transformJobPosting(posting), error: null }
  } catch (err) {
    console.error('Error fetching job posting by ID:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// ADMIN: CREATE JOB POSTING
// ============================================================================

export async function adminCreateJobPosting(
  input: CreateJobPostingInput
): Promise<{ data: JobPosting | null; error: Error | null }> {
  try {
    // Generate slug if not provided
    const baseSlug = input.slug || generateSlug(input.title)
    const slug = await ensureUniqueSlug(baseSlug)

    const posting = await prisma.jobPosting.create({
      data: {
        title: input.title,
        slug,
        shortDescription: input.short_description,
        fullDescription: input.full_description,
        locationLabel: input.location_label,
        employmentType: input.employment_type,
        isRemoteFriendly: input.is_remote_friendly ?? false,
        minCompCents: input.min_comp_cents || null,
        maxCompCents: input.max_comp_cents || null,
        compFrequency: input.comp_frequency || null,
        applicationInstructions: input.application_instructions || null,
        applicationEmail: input.application_email || null,
        applicationUrl: input.application_url || null,
        status: input.status || 'draft',
        priority: input.priority ?? 0,
        tenantId: input.tenant_id || null,
        createdByUserId: input.created_by_user_id,
        publishedAt: input.status === 'open' ? new Date() : null,
      },
    })

    return { data: transformJobPosting(posting), error: null }
  } catch (err) {
    console.error('Error creating job posting:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// ADMIN: UPDATE JOB POSTING
// ============================================================================

export async function adminUpdateJobPosting(
  id: string,
  input: UpdateJobPostingInput
): Promise<{ data: JobPosting | null; error: Error | null }> {
  try {
    // Get existing posting to check status changes
    const existing = await prisma.jobPosting.findUnique({
      where: { id },
      select: { status: true, publishedAt: true, slug: true },
    })

    if (!existing) {
      return { data: null, error: new Error('Job posting not found') }
    }

    // Handle slug uniqueness if changing
    let slug = input.slug
    if (slug && slug !== existing.slug) {
      slug = await ensureUniqueSlug(slug, id)
    }

    // Set publishedAt if transitioning to open
    let publishedAt = undefined
    if (input.status === 'open' && existing.status !== 'open' && !existing.publishedAt) {
      publishedAt = new Date()
    }

    const posting = await prisma.jobPosting.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(slug !== undefined && { slug }),
        ...(input.short_description !== undefined && { shortDescription: input.short_description }),
        ...(input.full_description !== undefined && { fullDescription: input.full_description }),
        ...(input.location_label !== undefined && { locationLabel: input.location_label }),
        ...(input.employment_type !== undefined && { employmentType: input.employment_type }),
        ...(input.is_remote_friendly !== undefined && { isRemoteFriendly: input.is_remote_friendly }),
        ...(input.min_comp_cents !== undefined && { minCompCents: input.min_comp_cents }),
        ...(input.max_comp_cents !== undefined && { maxCompCents: input.max_comp_cents }),
        ...(input.comp_frequency !== undefined && { compFrequency: input.comp_frequency }),
        ...(input.application_instructions !== undefined && { applicationInstructions: input.application_instructions }),
        ...(input.application_email !== undefined && { applicationEmail: input.application_email }),
        ...(input.application_url !== undefined && { applicationUrl: input.application_url }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(publishedAt !== undefined && { publishedAt }),
      },
    })

    return { data: transformJobPosting(posting), error: null }
  } catch (err) {
    console.error('Error updating job posting:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// ADMIN: DELETE (ARCHIVE) JOB POSTING
// ============================================================================

export async function adminDeleteJobPosting(
  id: string
): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    await prisma.jobPosting.update({
      where: { id },
      data: { status: 'archived' },
    })

    return { data: { success: true }, error: null }
  } catch (err) {
    console.error('Error archiving job posting:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// ADMIN: GET JOB COUNTS
// ============================================================================

export async function getJobPostingCounts(
  tenantId?: string
): Promise<{ data: JobCounts | null; error: Error | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    if (tenantId) {
      where.tenantId = tenantId
    }

    const counts = await prisma.jobPosting.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    })

    const result: JobCounts = {
      draft: 0,
      open: 0,
      closed: 0,
      archived: 0,
      total: 0,
    }

    counts.forEach((c) => {
      result[c.status as keyof Omit<JobCounts, 'total'>] = c._count.id
      result.total += c._count.id
    })

    return { data: result, error: null }
  } catch (err) {
    console.error('Error getting job posting counts:', err)
    return { data: null, error: err as Error }
  }
}
