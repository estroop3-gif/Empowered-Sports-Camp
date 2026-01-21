/**
 * Certifications Service
 *
 * Prisma-based service for volunteer certifications.
 */

import prisma from '@/lib/db/client'
import { CertificationStatus } from '@/generated/prisma'

// =============================================================================
// Types (snake_case for backward compatibility with pages)
// =============================================================================

export interface Certification {
  id: string
  profile_id: string
  document_url: string
  document_type: string
  document_name: string | null
  status: 'pending_review' | 'approved' | 'rejected' | 'expired'
  submitted_at: string
  expires_at: string | null
  reviewed_at: string | null
  notes: string | null
  reviewer_notes: string | null
  tenant_id: string | null
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Fetch certifications for a user
 */
export async function fetchUserCertifications(
  profileId: string
): Promise<{ data: Certification[] | null; error: Error | null }> {
  try {
    const certs = await prisma.volunteerCertification.findMany({
      where: { profileId },
      orderBy: { submittedAt: 'desc' },
    })

    return {
      data: certs.map((c) => ({
        id: c.id,
        profile_id: c.profileId,
        document_url: c.documentUrl,
        document_type: c.documentType,
        document_name: c.documentName,
        status: c.status as Certification['status'],
        submitted_at: c.submittedAt.toISOString(),
        expires_at: c.expiresAt?.toISOString() || null,
        reviewed_at: c.reviewedAt?.toISOString() || null,
        notes: c.notes,
        reviewer_notes: c.reviewerNotes,
        tenant_id: c.tenantId,
      })),
      error: null,
    }
  } catch (error) {
    console.error('[Certifications] Failed to fetch:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Fetch all certifications (admin view)
 */
export async function fetchAllCertifications(options?: {
  status?: CertificationStatus
  tenantId?: string
}): Promise<{ data: Certification[] | null; error: Error | null }> {
  try {
    const where: Record<string, unknown> = {}
    if (options?.status) where.status = options.status
    if (options?.tenantId) where.tenantId = options.tenantId

    const certs = await prisma.volunteerCertification.findMany({
      where,
      include: {
        profile: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    })

    return {
      data: certs.map((c) => ({
        id: c.id,
        profile_id: c.profileId,
        document_url: c.documentUrl,
        document_type: c.documentType,
        document_name: c.documentName,
        status: c.status as Certification['status'],
        submitted_at: c.submittedAt.toISOString(),
        expires_at: c.expiresAt?.toISOString() || null,
        reviewed_at: c.reviewedAt?.toISOString() || null,
        notes: c.notes,
        reviewer_notes: c.reviewerNotes,
        tenant_id: c.tenantId,
      })),
      error: null,
    }
  } catch (error) {
    console.error('[Certifications] Failed to fetch all:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Mutations
// =============================================================================

export interface CreateCertificationInput {
  profile_id: string
  document_url: string
  document_type: string
  document_name?: string
  notes?: string
  tenant_id?: string
}

/**
 * Create a new certification
 */
export async function createCertification(
  input: CreateCertificationInput
): Promise<{ data: Certification | null; error: Error | null }> {
  try {
    const cert = await prisma.volunteerCertification.create({
      data: {
        profileId: input.profile_id,
        documentUrl: input.document_url,
        documentType: input.document_type,
        documentName: input.document_name || null,
        notes: input.notes || null,
        tenantId: input.tenant_id || null,
        status: 'pending_review',
      },
    })

    return {
      data: {
        id: cert.id,
        profile_id: cert.profileId,
        document_url: cert.documentUrl,
        document_type: cert.documentType,
        document_name: cert.documentName,
        status: cert.status as Certification['status'],
        submitted_at: cert.submittedAt.toISOString(),
        expires_at: cert.expiresAt?.toISOString() || null,
        reviewed_at: cert.reviewedAt?.toISOString() || null,
        notes: cert.notes,
        reviewer_notes: cert.reviewerNotes,
        tenant_id: cert.tenantId,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Certifications] Failed to create:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Delete a pending certification (only owner can delete, only pending status)
 */
export async function deleteCertification(
  certId: string,
  profileId: string
): Promise<{ error: Error | null }> {
  try {
    // Only allow deletion of pending certifications by owner
    await prisma.volunteerCertification.delete({
      where: {
        id: certId,
        profileId,
        status: 'pending_review',
      },
    })

    return { error: null }
  } catch (error) {
    console.error('[Certifications] Failed to delete:', error)
    return { error: error as Error }
  }
}

/**
 * Review a certification (admin only)
 */
export async function reviewCertification(
  certId: string,
  reviewerProfileId: string,
  status: 'approved' | 'rejected',
  reviewerNotes?: string,
  expiresAt?: Date
): Promise<{ data: Certification | null; error: Error | null }> {
  try {
    const cert = await prisma.volunteerCertification.update({
      where: { id: certId },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedByProfileId: reviewerProfileId,
        reviewerNotes: reviewerNotes || null,
        expiresAt: expiresAt || null,
      },
    })

    return {
      data: {
        id: cert.id,
        profile_id: cert.profileId,
        document_url: cert.documentUrl,
        document_type: cert.documentType,
        document_name: cert.documentName,
        status: cert.status as Certification['status'],
        submitted_at: cert.submittedAt.toISOString(),
        expires_at: cert.expiresAt?.toISOString() || null,
        reviewed_at: cert.reviewedAt?.toISOString() || null,
        notes: cert.notes,
        reviewer_notes: cert.reviewerNotes,
        tenant_id: cert.tenantId,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Certifications] Failed to review:', error)
    return { data: null, error: error as Error }
  }
}
