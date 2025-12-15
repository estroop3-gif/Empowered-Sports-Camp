/**
 * Licensee Application Services
 *
 * Prisma-based data access for franchise/licensee applications.
 * Returns { data, error } pattern with snake_case interfaces.
 */

import prisma from '@/lib/db/client'
import type { LicenseeApplicationStatus } from '@/generated/prisma'
import { notifyLicenseeApplicationCreated, notifyLicenseeApplicationStatusChanged } from './notifications'

// ============================================================================
// INTERFACES
// ============================================================================

export interface LicenseeApplication {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  company_name: string | null
  website: string | null
  city: string | null
  state: string | null
  territory_interest: string | null
  business_experience: string | null
  sports_background: string | null
  why_interested: string | null
  investment_capacity: string | null
  how_heard: string | null
  status: LicenseeApplicationStatus
  assigned_territory_id: string | null
  internal_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateLicenseeApplicationInput {
  first_name: string
  last_name: string
  email: string
  phone?: string
  company_name?: string
  website?: string
  city?: string
  state?: string
  territory_interest?: string
  business_experience?: string
  sports_background?: string
  why_interested?: string
  investment_capacity?: string
  how_heard?: string
}

export interface ListLicenseeApplicationsResult {
  applications: LicenseeApplication[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// ============================================================================
// HELPER: Transform Prisma record to snake_case interface
// ============================================================================

function transformLicenseeApplication(record: {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  companyName: string | null
  website: string | null
  city: string | null
  state: string | null
  territoryInterest: string | null
  businessExperience: string | null
  sportsBackground: string | null
  whyInterested: string | null
  investmentCapacity: string | null
  howHeard: string | null
  status: LicenseeApplicationStatus
  assignedTerritoryId: string | null
  internalNotes: string | null
  reviewedBy: string | null
  reviewedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): LicenseeApplication {
  return {
    id: record.id,
    first_name: record.firstName,
    last_name: record.lastName,
    email: record.email,
    phone: record.phone,
    company_name: record.companyName,
    website: record.website,
    city: record.city,
    state: record.state,
    territory_interest: record.territoryInterest,
    business_experience: record.businessExperience,
    sports_background: record.sportsBackground,
    why_interested: record.whyInterested,
    investment_capacity: record.investmentCapacity,
    how_heard: record.howHeard,
    status: record.status,
    assigned_territory_id: record.assignedTerritoryId,
    internal_notes: record.internalNotes,
    reviewed_by: record.reviewedBy,
    reviewed_at: record.reviewedAt?.toISOString() || null,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
  }
}

// ============================================================================
// CREATE LICENSEE APPLICATION
// ============================================================================

export async function createLicenseeApplication(
  input: CreateLicenseeApplicationInput
): Promise<{ data: LicenseeApplication | null; error: Error | null }> {
  try {
    const application = await prisma.licenseeApplication.create({
      data: {
        firstName: input.first_name,
        lastName: input.last_name,
        email: input.email,
        phone: input.phone || null,
        companyName: input.company_name || null,
        website: input.website || null,
        city: input.city || null,
        state: input.state || null,
        territoryInterest: input.territory_interest || null,
        businessExperience: input.business_experience || null,
        sportsBackground: input.sports_background || null,
        whyInterested: input.why_interested || null,
        investmentCapacity: input.investment_capacity || null,
        howHeard: input.how_heard || null,
      },
    })

    // Notify HQ admins about new application
    notifyLicenseeApplicationCreated({
      applicationId: application.id,
      applicantName: `${application.firstName} ${application.lastName}`,
      city: application.city || 'Unknown',
      state: application.state || 'Unknown',
    }).catch((err) => console.error('[LicenseeApplication] Failed to send notification:', err))

    return { data: transformLicenseeApplication(application), error: null }
  } catch (err) {
    console.error('Error creating licensee application:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// LIST LICENSEE APPLICATIONS
// ============================================================================

export async function listLicenseeApplications(
  filters?: {
    status?: LicenseeApplicationStatus | LicenseeApplicationStatus[]
    state?: string
    search?: string
  },
  options?: {
    page?: number
    page_size?: number
  }
): Promise<{ data: ListLicenseeApplicationsResult | null; error: Error | null }> {
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

    if (filters?.state) {
      where.state = filters.state
    }

    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { companyName: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    const [applications, total] = await Promise.all([
      prisma.licenseeApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.licenseeApplication.count({ where }),
    ])

    return {
      data: {
        applications: applications.map(transformLicenseeApplication),
        total,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(total / pageSize),
      },
      error: null,
    }
  } catch (err) {
    console.error('Error listing licensee applications:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// GET LICENSEE APPLICATION BY ID
// ============================================================================

export async function getLicenseeApplicationById(
  id: string
): Promise<{ data: LicenseeApplication | null; error: Error | null }> {
  try {
    const application = await prisma.licenseeApplication.findUnique({
      where: { id },
    })

    if (!application) {
      return { data: null, error: null }
    }

    return { data: transformLicenseeApplication(application), error: null }
  } catch (err) {
    console.error('Error fetching licensee application:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// UPDATE LICENSEE APPLICATION STATUS
// ============================================================================

export async function updateLicenseeApplicationStatus(
  id: string,
  status: LicenseeApplicationStatus,
  options?: {
    reviewed_by?: string
    internal_notes?: string
    assigned_territory_id?: string
  }
): Promise<{ data: LicenseeApplication | null; error: Error | null }> {
  try {
    const updateData: {
      status: LicenseeApplicationStatus
      reviewedBy?: string
      reviewedAt?: Date
      internalNotes?: string
      assignedTerritoryId?: string
    } = { status }

    if (options?.reviewed_by) {
      updateData.reviewedBy = options.reviewed_by
      updateData.reviewedAt = new Date()
    }

    if (options?.internal_notes !== undefined) {
      updateData.internalNotes = options.internal_notes
    }

    if (options?.assigned_territory_id) {
      updateData.assignedTerritoryId = options.assigned_territory_id
    }

    const application = await prisma.licenseeApplication.update({
      where: { id },
      data: updateData,
    })

    // Try to notify the applicant if they have a user account
    const userProfile = await prisma.profile.findFirst({
      where: { email: { equals: application.email, mode: 'insensitive' } },
      select: { id: true },
    })

    if (userProfile) {
      notifyLicenseeApplicationStatusChanged({
        userId: userProfile.id,
        applicationId: application.id,
        newStatus: status,
        applicantName: `${application.firstName} ${application.lastName}`,
      }).catch((err) => console.error('[LicenseeApplication] Failed to send status notification:', err))
    }

    return { data: transformLicenseeApplication(application), error: null }
  } catch (err) {
    console.error('Error updating licensee application:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// GET LICENSEE APPLICATION COUNTS
// ============================================================================

export async function getLicenseeApplicationCounts(): Promise<{
  data: Record<string, number> | null
  error: Error | null
}> {
  try {
    const counts = await prisma.licenseeApplication.groupBy({
      by: ['status'],
      _count: { id: true },
    })

    const result: Record<string, number> = {
      submitted: 0,
      under_review: 0,
      contacted: 0,
      interview_scheduled: 0,
      interview_completed: 0,
      approved: 0,
      rejected: 0,
      withdrawn: 0,
      total: 0,
    }

    counts.forEach((c) => {
      result[c.status] = c._count.id
      result.total += c._count.id
    })

    return { data: result, error: null }
  } catch (err) {
    console.error('Error getting licensee application counts:', err)
    return { data: null, error: err as Error }
  }
}
