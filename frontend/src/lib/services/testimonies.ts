/**
 * Testimonies Services
 *
 * Prisma-based data access for testimony submissions and admin moderation.
 * Returns { data, error } pattern with snake_case interfaces.
 */

import prisma from '@/lib/db/client'
import type { TestimonyStatus, TestimonyRole, TestimonySourceType } from '@/generated/prisma'

// ============================================================================
// INTERFACES
// ============================================================================

export interface Testimony {
  id: string
  tenant_id: string | null
  author_name: string
  author_email: string | null
  author_role: TestimonyRole
  author_relationship: string | null
  headline: string | null
  body: string
  photo_url: string | null
  video_url: string | null
  camp_session_id: string | null
  program_type: string | null
  status: TestimonyStatus
  source_type: TestimonySourceType
  is_featured: boolean
  display_order: number | null
  review_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_by_user_id: string | null
  created_at: string
  updated_at: string
  // Joined fields
  camp_name?: string | null
  camp_start_date?: string | null
  camp_end_date?: string | null
  reviewer_name?: string | null
}

export interface CreatePublicTestimonyInput {
  author_name: string
  author_email?: string
  author_role: TestimonyRole
  author_relationship?: string
  headline?: string
  body: string
  photo_url?: string
  video_url?: string
  camp_session_id?: string
  program_type?: string
  tenant_id?: string
  created_by_user_id?: string
}

export interface UpdateTestimonyInput {
  headline?: string
  body?: string
  photo_url?: string | null
  video_url?: string | null
  status?: TestimonyStatus
  is_featured?: boolean
  display_order?: number | null
  review_notes?: string
  reviewed_by?: string
}

export interface ListTestimoniesResult {
  testimonies: Testimony[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface TestimonyCounts {
  pending_review: number
  approved: number
  rejected: number
  archived: number
  total: number
  featured: number
}

// ============================================================================
// HELPER: Transform Prisma record to snake_case interface
// ============================================================================

function transformTestimony(record: {
  id: string
  tenantId: string | null
  authorName: string
  authorEmail: string | null
  authorRole: TestimonyRole
  authorRelationship: string | null
  headline: string | null
  body: string
  photoUrl: string | null
  videoUrl: string | null
  campSessionId: string | null
  programType: string | null
  status: TestimonyStatus
  sourceType: TestimonySourceType
  isFeatured: boolean
  displayOrder: number | null
  reviewNotes: string | null
  reviewedBy: string | null
  reviewedAt: Date | null
  createdByUserId: string | null
  createdAt: Date
  updatedAt: Date
  camp?: { name: string; startDate: Date; endDate: Date } | null
  reviewedByUser?: { firstName: string | null; lastName: string | null } | null
}): Testimony {
  return {
    id: record.id,
    tenant_id: record.tenantId,
    author_name: record.authorName,
    author_email: record.authorEmail,
    author_role: record.authorRole,
    author_relationship: record.authorRelationship,
    headline: record.headline,
    body: record.body,
    photo_url: record.photoUrl,
    video_url: record.videoUrl,
    camp_session_id: record.campSessionId,
    program_type: record.programType,
    status: record.status,
    source_type: record.sourceType,
    is_featured: record.isFeatured,
    display_order: record.displayOrder,
    review_notes: record.reviewNotes,
    reviewed_by: record.reviewedBy,
    reviewed_at: record.reviewedAt?.toISOString() || null,
    created_by_user_id: record.createdByUserId,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
    camp_name: record.camp?.name || null,
    camp_start_date: record.camp?.startDate?.toISOString() || null,
    camp_end_date: record.camp?.endDate?.toISOString() || null,
    reviewer_name: record.reviewedByUser
      ? `${record.reviewedByUser.firstName || ''} ${record.reviewedByUser.lastName || ''}`.trim() || null
      : null,
  }
}

// ============================================================================
// CREATE PUBLIC TESTIMONY SUBMISSION
// ============================================================================

export async function createPublicTestimonySubmission(
  input: CreatePublicTestimonyInput
): Promise<{ data: Testimony | null; error: Error | null }> {
  try {
    const testimony = await prisma.testimony.create({
      data: {
        tenantId: input.tenant_id || null,
        authorName: input.author_name,
        authorEmail: input.author_email || null,
        authorRole: input.author_role,
        authorRelationship: input.author_relationship || null,
        headline: input.headline || null,
        body: input.body,
        photoUrl: input.photo_url || null,
        videoUrl: input.video_url || null,
        campSessionId: input.camp_session_id || null,
        programType: input.program_type || null,
        createdByUserId: input.created_by_user_id || null,
        status: 'pending_review',
        sourceType: 'submitted',
      },
      include: {
        camp: true,
      },
    })

    return { data: transformTestimony(testimony), error: null }
  } catch (err) {
    console.error('Error creating testimony submission:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// LIST ADMIN TESTIMONIES (For Inbox)
// ============================================================================

export async function listAdminTestimonies(
  filters?: {
    status?: TestimonyStatus | TestimonyStatus[]
    author_role?: TestimonyRole
    is_featured?: boolean
    tenant_id?: string
    search?: string
  },
  options?: {
    page?: number
    page_size?: number
  }
): Promise<{ data: ListTestimoniesResult | null; error: Error | null }> {
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

    if (filters?.author_role) {
      where.authorRole = filters.author_role
    }

    if (filters?.is_featured !== undefined) {
      where.isFeatured = filters.is_featured
    }

    if (filters?.tenant_id) {
      where.tenantId = filters.tenant_id
    }

    if (filters?.search) {
      where.OR = [
        { authorName: { contains: filters.search, mode: 'insensitive' } },
        { headline: { contains: filters.search, mode: 'insensitive' } },
        { body: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    const [testimonies, total] = await Promise.all([
      prisma.testimony.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          camp: true,
          reviewedByUser: true,
        },
      }),
      prisma.testimony.count({ where }),
    ])

    return {
      data: {
        testimonies: testimonies.map(transformTestimony),
        total,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(total / pageSize),
      },
      error: null,
    }
  } catch (err) {
    console.error('Error listing admin testimonies:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// LIST PUBLIC TESTIMONIES (Approved only)
// ============================================================================

export async function listPublicTestimonies(
  options?: {
    limit?: number
    featured_only?: boolean
  }
): Promise<{ data: Testimony[] | null; error: Error | null }> {
  try {
    const limit = options?.limit || 50

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      status: 'approved',
    }

    if (options?.featured_only) {
      where.isFeatured = true
    }

    const testimonies = await prisma.testimony.findMany({
      where,
      orderBy: [
        { isFeatured: 'desc' },
        { displayOrder: 'asc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      include: {
        camp: true,
      },
    })

    return { data: testimonies.map(transformTestimony), error: null }
  } catch (err) {
    console.error('Error listing public testimonies:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// GET TESTIMONY BY ID
// ============================================================================

export async function getTestimonyById(
  id: string
): Promise<{ data: Testimony | null; error: Error | null }> {
  try {
    const testimony = await prisma.testimony.findUnique({
      where: { id },
      include: {
        camp: true,
        reviewedByUser: true,
      },
    })

    if (!testimony) {
      return { data: null, error: null }
    }

    return { data: transformTestimony(testimony), error: null }
  } catch (err) {
    console.error('Error fetching testimony:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// UPDATE TESTIMONY
// ============================================================================

export async function updateTestimony(
  id: string,
  input: UpdateTestimonyInput
): Promise<{ data: Testimony | null; error: Error | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {}

    if (input.headline !== undefined) updateData.headline = input.headline
    if (input.body !== undefined) updateData.body = input.body
    if (input.photo_url !== undefined) updateData.photoUrl = input.photo_url
    if (input.video_url !== undefined) updateData.videoUrl = input.video_url
    if (input.status !== undefined) updateData.status = input.status
    if (input.is_featured !== undefined) updateData.isFeatured = input.is_featured
    if (input.display_order !== undefined) updateData.displayOrder = input.display_order
    if (input.review_notes !== undefined) updateData.reviewNotes = input.review_notes

    if (input.reviewed_by) {
      updateData.reviewedBy = input.reviewed_by
      updateData.reviewedAt = new Date()
    }

    const testimony = await prisma.testimony.update({
      where: { id },
      data: updateData,
      include: {
        camp: true,
        reviewedByUser: true,
      },
    })

    return { data: transformTestimony(testimony), error: null }
  } catch (err) {
    console.error('Error updating testimony:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// DELETE TESTIMONY
// ============================================================================

export async function deleteTestimony(
  id: string
): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    await prisma.testimony.delete({
      where: { id },
    })

    return { data: { success: true }, error: null }
  } catch (err) {
    console.error('Error deleting testimony:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// GET TESTIMONY COUNTS (For Inbox stats)
// ============================================================================

export async function getTestimonyCounts(
  tenantId?: string
): Promise<{ data: TestimonyCounts | null; error: Error | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = tenantId ? { tenantId } : {}

    const [statusCounts, featuredCount] = await Promise.all([
      prisma.testimony.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      prisma.testimony.count({
        where: { ...where, isFeatured: true },
      }),
    ])

    const result: TestimonyCounts = {
      pending_review: 0,
      approved: 0,
      rejected: 0,
      archived: 0,
      total: 0,
      featured: featuredCount,
    }

    statusCounts.forEach((c) => {
      result[c.status as keyof Omit<TestimonyCounts, 'total' | 'featured'>] = c._count.id
      result.total += c._count.id
    })

    return { data: result, error: null }
  } catch (err) {
    console.error('Error getting testimony counts:', err)
    return { data: null, error: err as Error }
  }
}
