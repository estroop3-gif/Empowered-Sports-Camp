/**
 * Curriculum Submissions Service
 *
 * Handles curriculum submission and admin review for Empowered Sports Camp.
 *
 * Features:
 * - Submitting curriculum contributions (from licensees, CITs, etc.)
 * - Listing submissions for review
 * - Approving/rejecting/requesting revisions on submissions
 *
 * Note: This is related to but separate from:
 * - curriculum.ts (existing templates and blocks)
 * - EmpowerU Contribution Center (for training modules)
 *
 * This service handles curriculum blocks/templates that go through admin review
 * before being added to the curriculum library.
 */

import { prisma } from '@/lib/db/client'
import type { CurriculumSubmissionStatus as PrismaStatus, Prisma } from '@/generated/prisma'
import { createNotification } from './notifications'

// =============================================================================
// Types
// =============================================================================

// Map to Prisma enum values (lowercase)
export type CurriculumSubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'revision_requested'

export type CurriculumLevel = 1 | 2 | 3 | 4 | 5

export interface CurriculumSubmissionData {
  id: string
  tenantId: string
  submittedByUserId: string
  submittedByName: string
  title: string
  description: string
  sport: string | null
  level: CurriculumLevel
  videoUrl: string | null
  attachmentUrl: string | null
  status: CurriculumSubmissionStatus
  adminNotes: string | null
  reviewedByUserId: string | null
  reviewedByName: string | null
  reviewedAt: string | null
  approvedBlockId: string | null
  createdAt: string
  updatedAt: string
}

export interface SubmitCurriculumParams {
  title: string
  description: string
  sport?: string
  level?: CurriculumLevel
  tenantId: string
  submittedByUserId: string
  role: string
  attachmentUrl?: string
  videoUrl?: string
  saveAsDraft?: boolean
}

export interface ReviewCurriculumParams {
  submissionId: string
  action: 'approve' | 'reject' | 'request_revision'
  notes?: string
  reviewerUserId: string
}

// Helper to convert DB model to service data
function toSubmissionData(submission: {
  id: string
  tenantId: string
  submittedByUserId: string
  submittedBy: { firstName: string | null; lastName: string | null }
  title: string
  description: string
  sport: string | null
  level: number
  videoUrl: string | null
  attachmentUrl: string | null
  status: PrismaStatus
  adminNotes: string | null
  reviewedByUserId: string | null
  reviewedBy: { firstName: string | null; lastName: string | null } | null
  reviewedAt: Date | null
  approvedBlockId: string | null
  createdAt: Date
  updatedAt: Date
}): CurriculumSubmissionData {
  return {
    id: submission.id,
    tenantId: submission.tenantId,
    submittedByUserId: submission.submittedByUserId,
    submittedByName: `${submission.submittedBy.firstName || ''} ${submission.submittedBy.lastName || ''}`.trim() || 'Unknown',
    title: submission.title,
    description: submission.description,
    sport: submission.sport,
    level: submission.level as CurriculumLevel,
    videoUrl: submission.videoUrl,
    attachmentUrl: submission.attachmentUrl,
    status: submission.status as CurriculumSubmissionStatus,
    adminNotes: submission.adminNotes,
    reviewedByUserId: submission.reviewedByUserId,
    reviewedByName: submission.reviewedBy
      ? `${submission.reviewedBy.firstName || ''} ${submission.reviewedBy.lastName || ''}`.trim() || 'Unknown'
      : null,
    reviewedAt: submission.reviewedAt?.toISOString() || null,
    approvedBlockId: submission.approvedBlockId,
    createdAt: submission.createdAt.toISOString(),
    updatedAt: submission.updatedAt.toISOString(),
  }
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Submit a curriculum contribution for review
 *
 * Can be submitted by:
 * - Licensees (curriculum for their camps)
 * - CIT volunteers (training ideas)
 * - Directors (drills, activities)
 */
export async function submitCurriculumContribution(
  params: SubmitCurriculumParams
): Promise<{ data: CurriculumSubmissionData | null; error: Error | null }> {
  try {
    const {
      title,
      description,
      sport,
      level = 1,
      tenantId,
      submittedByUserId,
      attachmentUrl,
      videoUrl,
      saveAsDraft = false,
    } = params

    // Create submission record
    const submission = await prisma.curriculumSubmission.create({
      data: {
        tenantId,
        submittedByUserId,
        title,
        description,
        sport: sport || null,
        level,
        videoUrl: videoUrl || null,
        attachmentUrl: attachmentUrl || null,
        status: saveAsDraft ? 'draft' : 'submitted',
      },
      include: {
        submittedBy: {
          select: { firstName: true, lastName: true },
        },
        reviewedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    })

    // If submitted (not draft), notify HQ admins
    if (!saveAsDraft) {
      // Find HQ admin users to notify
      const admins = await prisma.userRoleAssignment.findMany({
        where: {
          role: 'hq_admin',
          isActive: true,
        },
        select: { userId: true },
      })

      const submitterName = `${submission.submittedBy.firstName || ''} ${submission.submittedBy.lastName || ''}`.trim() || 'Someone'

      for (const admin of admins) {
        createNotification({
          userId: admin.userId,
          type: 'system_alert',
          title: 'New Curriculum Submission',
          body: `${submitterName} submitted "${title}" for review.`,
          category: 'system',
          severity: 'info',
          actionUrl: `/admin/curriculum-submissions/${submission.id}`,
        }).catch((err) => console.error('[CurriculumSubmissions] Failed to notify admin:', err))
      }
    }

    return {
      data: toSubmissionData(submission),
      error: null,
    }
  } catch (error) {
    console.error('[CurriculumSubmissions] Failed to submit contribution:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * List curriculum submissions for review
 *
 * - HQ admins can see all submissions
 * - Licensees can see their own tenant's submissions
 */
export async function listCurriculumSubmissionsForReview(params: {
  tenantId?: string
  role: string
  status?: CurriculumSubmissionStatus
  limit?: number
  offset?: number
}): Promise<{
  data: { submissions: CurriculumSubmissionData[]; totalCount: number } | null
  error: Error | null
}> {
  try {
    const { tenantId, role, status, limit = 50, offset = 0 } = params

    // HQ admins see all, licensees see their tenant's submissions
    const isHqAdmin = role === 'hq_admin'

    const where: Prisma.CurriculumSubmissionWhereInput = {
      ...(isHqAdmin ? {} : { tenantId }),
      ...(status ? { status: status as PrismaStatus } : {}),
    }

    const [submissions, totalCount] = await Promise.all([
      prisma.curriculumSubmission.findMany({
        where,
        include: {
          submittedBy: {
            select: { firstName: true, lastName: true },
          },
          reviewedBy: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.curriculumSubmission.count({ where }),
    ])

    return {
      data: {
        submissions: submissions.map(toSubmissionData),
        totalCount,
      },
      error: null,
    }
  } catch (error) {
    console.error('[CurriculumSubmissions] Failed to list submissions:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Review a curriculum submission (approve, reject, or request revision)
 */
export async function reviewCurriculumSubmission(
  params: ReviewCurriculumParams
): Promise<{ data: CurriculumSubmissionData | null; error: Error | null }> {
  try {
    const { submissionId, action, notes, reviewerUserId } = params

    // Map action to status
    const statusMap: Record<string, PrismaStatus> = {
      approve: 'approved',
      reject: 'rejected',
      request_revision: 'revision_requested',
    }

    const newStatus = statusMap[action]

    // Update submission in database
    const submission = await prisma.curriculumSubmission.update({
      where: { id: submissionId },
      data: {
        status: newStatus,
        adminNotes: notes || null,
        reviewedByUserId: reviewerUserId,
        reviewedAt: new Date(),
      },
      include: {
        submittedBy: {
          select: { firstName: true, lastName: true },
        },
        reviewedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    })

    // Notify submitter of review result
    const reviewerName = submission.reviewedBy
      ? `${submission.reviewedBy.firstName || ''} ${submission.reviewedBy.lastName || ''}`.trim()
      : 'Admin'

    let notificationTitle = ''
    let notificationBody = ''

    switch (action) {
      case 'approve':
        notificationTitle = 'Curriculum Approved!'
        notificationBody = `Your submission "${submission.title}" has been approved and added to the curriculum library.`
        break
      case 'reject':
        notificationTitle = 'Curriculum Submission Rejected'
        notificationBody = `Your submission "${submission.title}" was not approved.${notes ? ` Feedback: ${notes}` : ''}`
        break
      case 'request_revision':
        notificationTitle = 'Revision Requested'
        notificationBody = `Please revise your submission "${submission.title}".${notes ? ` Feedback: ${notes}` : ''}`
        break
    }

    createNotification({
      userId: submission.submittedByUserId,
      tenantId: submission.tenantId,
      type: 'system_alert',
      title: notificationTitle,
      body: notificationBody,
      category: 'system',
      severity: action === 'approve' ? 'success' : action === 'reject' ? 'error' : 'warning',
    }).catch((err) => console.error('[CurriculumSubmissions] Failed to notify submitter:', err))

    return {
      data: toSubmissionData(submission),
      error: null,
    }
  } catch (error) {
    console.error('[CurriculumSubmissions] Failed to review submission:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get a specific curriculum submission
 */
export async function getCurriculumSubmission(params: {
  submissionId: string
  userId: string
  tenantId?: string
  role: string
}): Promise<{ data: CurriculumSubmissionData | null; error: Error | null }> {
  try {
    const { submissionId, userId, tenantId, role } = params
    const isHqAdmin = role === 'hq_admin'

    const submission = await prisma.curriculumSubmission.findFirst({
      where: {
        id: submissionId,
        // HQ admins can see all, others can only see their tenant's or their own
        ...(isHqAdmin
          ? {}
          : {
              OR: [
                { tenantId },
                { submittedByUserId: userId },
              ],
            }),
      },
      include: {
        submittedBy: {
          select: { firstName: true, lastName: true },
        },
        reviewedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    })

    if (!submission) {
      return { data: null, error: new Error('Submission not found or access denied') }
    }

    return {
      data: toSubmissionData(submission),
      error: null,
    }
  } catch (error) {
    console.error('[CurriculumSubmissions] Failed to get submission:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update a draft submission before submitting for review
 */
export async function updateCurriculumSubmission(params: {
  submissionId: string
  updates: Partial<SubmitCurriculumParams>
  userId: string
}): Promise<{ data: CurriculumSubmissionData | null; error: Error | null }> {
  try {
    const { submissionId, updates, userId } = params

    // Verify user owns this submission and it's still editable (draft or revision_requested)
    const existing = await prisma.curriculumSubmission.findFirst({
      where: {
        id: submissionId,
        submittedByUserId: userId,
        status: { in: ['draft', 'revision_requested'] },
      },
    })

    if (!existing) {
      return { data: null, error: new Error('Submission not found or cannot be edited') }
    }

    const submission = await prisma.curriculumSubmission.update({
      where: { id: submissionId },
      data: {
        ...(updates.title && { title: updates.title }),
        ...(updates.description && { description: updates.description }),
        ...(updates.sport !== undefined && { sport: updates.sport || null }),
        ...(updates.level && { level: updates.level }),
        ...(updates.videoUrl !== undefined && { videoUrl: updates.videoUrl || null }),
        ...(updates.attachmentUrl !== undefined && { attachmentUrl: updates.attachmentUrl || null }),
        // If was revision_requested and being updated, set back to submitted
        ...(existing.status === 'revision_requested' && { status: 'submitted' as PrismaStatus }),
      },
      include: {
        submittedBy: {
          select: { firstName: true, lastName: true },
        },
        reviewedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    })

    return {
      data: toSubmissionData(submission),
      error: null,
    }
  } catch (error) {
    console.error('[CurriculumSubmissions] Failed to update submission:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Delete a draft submission
 */
export async function deleteCurriculumSubmission(params: {
  submissionId: string
  userId: string
}): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const { submissionId, userId } = params

    // Only allow deleting own drafts
    const result = await prisma.curriculumSubmission.deleteMany({
      where: {
        id: submissionId,
        submittedByUserId: userId,
        status: 'draft',
      },
    })

    return {
      data: { success: result.count > 0 },
      error: null,
    }
  } catch (error) {
    console.error('[CurriculumSubmissions] Failed to delete submission:', error)
    return { data: null, error: error as Error }
  }
}
