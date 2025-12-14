/**
 * Contact Submission Services
 *
 * Prisma-based data access for contact form submissions.
 * Returns { data, error } pattern with snake_case interfaces.
 */

import prisma from '@/lib/db/client'
import type { ContactSubmissionStatus } from '@/generated/prisma'

// ============================================================================
// INTERFACES
// ============================================================================

export interface ContactSubmission {
  id: string
  name: string
  email: string
  phone: string | null
  inquiry_type: string
  message: string
  athlete_info: string | null
  organization: string | null
  location: string | null
  status: ContactSubmissionStatus
  responded_by: string | null
  responded_at: string | null
  internal_notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateContactSubmissionInput {
  name: string
  email: string
  phone?: string
  inquiry_type: string
  message: string
  athlete_info?: string
  organization?: string
  location?: string
}

export interface ListContactSubmissionsResult {
  submissions: ContactSubmission[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// ============================================================================
// HELPER: Transform Prisma record to snake_case interface
// ============================================================================

function transformContactSubmission(record: {
  id: string
  name: string
  email: string
  phone: string | null
  inquiryType: string
  message: string
  athleteInfo: string | null
  organization: string | null
  location: string | null
  status: ContactSubmissionStatus
  respondedBy: string | null
  respondedAt: Date | null
  internalNotes: string | null
  createdAt: Date
  updatedAt: Date
}): ContactSubmission {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    phone: record.phone,
    inquiry_type: record.inquiryType,
    message: record.message,
    athlete_info: record.athleteInfo,
    organization: record.organization,
    location: record.location,
    status: record.status,
    responded_by: record.respondedBy,
    responded_at: record.respondedAt?.toISOString() || null,
    internal_notes: record.internalNotes,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
  }
}

// ============================================================================
// CREATE CONTACT SUBMISSION
// ============================================================================

export async function createContactSubmission(
  input: CreateContactSubmissionInput
): Promise<{ data: ContactSubmission | null; error: Error | null }> {
  try {
    const submission = await prisma.contactSubmission.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        inquiryType: input.inquiry_type,
        message: input.message,
        athleteInfo: input.athlete_info || null,
        organization: input.organization || null,
        location: input.location || null,
      },
    })

    return { data: transformContactSubmission(submission), error: null }
  } catch (err) {
    console.error('Error creating contact submission:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// LIST CONTACT SUBMISSIONS
// ============================================================================

export async function listContactSubmissions(
  filters?: {
    status?: ContactSubmissionStatus | ContactSubmissionStatus[]
    inquiry_type?: string
    search?: string
  },
  options?: {
    page?: number
    page_size?: number
  }
): Promise<{ data: ListContactSubmissionsResult | null; error: Error | null }> {
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

    if (filters?.inquiry_type) {
      where.inquiryType = filters.inquiry_type
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { message: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    const [submissions, total] = await Promise.all([
      prisma.contactSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.contactSubmission.count({ where }),
    ])

    return {
      data: {
        submissions: submissions.map(transformContactSubmission),
        total,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(total / pageSize),
      },
      error: null,
    }
  } catch (err) {
    console.error('Error listing contact submissions:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// GET CONTACT SUBMISSION BY ID
// ============================================================================

export async function getContactSubmissionById(
  id: string
): Promise<{ data: ContactSubmission | null; error: Error | null }> {
  try {
    const submission = await prisma.contactSubmission.findUnique({
      where: { id },
    })

    if (!submission) {
      return { data: null, error: null }
    }

    return { data: transformContactSubmission(submission), error: null }
  } catch (err) {
    console.error('Error fetching contact submission:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// UPDATE CONTACT SUBMISSION STATUS
// ============================================================================

export async function updateContactSubmissionStatus(
  id: string,
  status: ContactSubmissionStatus,
  options?: {
    responded_by?: string
    internal_notes?: string
  }
): Promise<{ data: ContactSubmission | null; error: Error | null }> {
  try {
    const updateData: {
      status: ContactSubmissionStatus
      respondedBy?: string
      respondedAt?: Date
      internalNotes?: string
    } = { status }

    if (status === 'replied' && options?.responded_by) {
      updateData.respondedBy = options.responded_by
      updateData.respondedAt = new Date()
    }

    if (options?.internal_notes !== undefined) {
      updateData.internalNotes = options.internal_notes
    }

    const submission = await prisma.contactSubmission.update({
      where: { id },
      data: updateData,
    })

    return { data: transformContactSubmission(submission), error: null }
  } catch (err) {
    console.error('Error updating contact submission:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// GET CONTACT SUBMISSION COUNTS
// ============================================================================

export async function getContactSubmissionCounts(): Promise<{
  data: Record<string, number> | null
  error: Error | null
}> {
  try {
    const counts = await prisma.contactSubmission.groupBy({
      by: ['status'],
      _count: { id: true },
    })

    const result: Record<string, number> = {
      new: 0,
      read: 0,
      replied: 0,
      archived: 0,
      total: 0,
    }

    counts.forEach((c) => {
      result[c.status] = c._count.id
      result.total += c._count.id
    })

    return { data: result, error: null }
  } catch (err) {
    console.error('Error getting contact submission counts:', err)
    return { data: null, error: err as Error }
  }
}
