/**
 * Curriculum Submissions Service
 *
 * SHELL: Curriculum submission and admin review
 *
 * Handles:
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

// =============================================================================
// Types
// =============================================================================

export type CurriculumSubmissionStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'REVISION_REQUESTED'

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
}

export interface ReviewCurriculumParams {
  submissionId: string
  action: 'APPROVE' | 'REJECT' | 'REQUEST_REVISION'
  notes?: string
  reviewerUserId: string
  tenantId: string
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * SHELL: Submit a curriculum contribution for review
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
      role,
      attachmentUrl,
      videoUrl,
    } = params

    // SHELL: Verify user exists
    const profile = await prisma.profile.findUnique({
      where: { id: submittedByUserId },
    })

    if (!profile) {
      return { data: null, error: new Error('User not found') }
    }

    // SHELL: Create submission record
    // TODO: Implement after curriculum_submissions table is created
    /*
    const submission = await prisma.curriculumSubmission.create({
      data: {
        tenantId,
        submittedByUserId,
        title,
        description,
        sport,
        level,
        videoUrl,
        attachmentUrl,
        status: 'SUBMITTED',
      },
    })
    */

    console.log('[CurriculumSubmissions] SHELL: Would create submission:', {
      title,
      submittedByUserId,
      tenantId,
    })

    // SHELL: Check if this overlaps with EmpowerU Contribution Center
    // Note: This is separate from EmpowerU contributions (which are for training modules).
    // This is for curriculum blocks/templates that can be used in camp schedules.

    const mockSubmission: CurriculumSubmissionData = {
      id: `curriculum_sub_${Date.now()}`,
      tenantId,
      submittedByUserId,
      submittedByName: `${profile.firstName} ${profile.lastName}`,
      title,
      description,
      sport: sport || null,
      level,
      videoUrl: videoUrl || null,
      attachmentUrl: attachmentUrl || null,
      status: 'SUBMITTED',
      adminNotes: null,
      reviewedByUserId: null,
      reviewedByName: null,
      reviewedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // SHELL: Notify admins of new submission
    // TODO: Call createNotification for admin users

    return {
      data: mockSubmission,
      error: null,
    }
  } catch (error) {
    console.error('[CurriculumSubmissions] Failed to submit contribution:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: List curriculum submissions for review
 *
 * - HQ admins can see all submissions
 * - Licensees can see their own submissions
 */
export async function listCurriculumSubmissionsForReview(params: {
  tenantId: string
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

    // SHELL: Build query based on role
    // HQ admins see all, licensees see their tenant's submissions
    const isHqAdmin = role === 'hq_admin'

    // SHELL: Query submissions from database
    // TODO: Implement after curriculum_submissions table is created
    /*
    const submissions = await prisma.curriculumSubmission.findMany({
      where: {
        ...(isHqAdmin ? {} : { tenantId }),
        ...(status ? { status } : {}),
      },
      include: {
        submittedBy: true,
        reviewedBy: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
    */

    console.log('[CurriculumSubmissions] SHELL: Would list submissions for review:', {
      tenantId,
      role,
      status,
    })

    // SHELL: Return mock data
    const mockSubmissions: CurriculumSubmissionData[] = [
      {
        id: 'curriculum_sub_1',
        tenantId,
        submittedByUserId: 'user_1',
        submittedByName: 'Jane Director',
        title: 'Dynamic Warm-Up Routine',
        description: 'A 10-minute warm-up routine designed for ages 8-12 that focuses on mobility and activation.',
        sport: 'General',
        level: 2,
        videoUrl: 'https://youtube.com/watch?v=example',
        attachmentUrl: null,
        status: 'SUBMITTED',
        adminNotes: null,
        reviewedByUserId: null,
        reviewedByName: null,
        reviewedAt: null,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'curriculum_sub_2',
        tenantId,
        submittedByUserId: 'user_2',
        submittedByName: 'Mike CIT',
        title: 'Basketball Dribbling Drills',
        description: 'Three progressive dribbling drills that can be done in stations.',
        sport: 'Basketball',
        level: 3,
        videoUrl: null,
        attachmentUrl: null,
        status: 'UNDER_REVIEW',
        adminNotes: null,
        reviewedByUserId: null,
        reviewedByName: null,
        reviewedAt: null,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ]

    return {
      data: {
        submissions: mockSubmissions,
        totalCount: mockSubmissions.length,
      },
      error: null,
    }
  } catch (error) {
    console.error('[CurriculumSubmissions] Failed to list submissions:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: Review a curriculum submission (approve, reject, or request revision)
 */
export async function reviewCurriculumSubmission(
  params: ReviewCurriculumParams
): Promise<{ data: CurriculumSubmissionData | null; error: Error | null }> {
  try {
    const { submissionId, action, notes, reviewerUserId, tenantId } = params

    // SHELL: Verify reviewer exists and has permission
    const reviewer = await prisma.profile.findUnique({
      where: { id: reviewerUserId },
    })

    if (!reviewer) {
      return { data: null, error: new Error('Reviewer not found') }
    }

    // SHELL: Map action to status
    const statusMap: Record<string, CurriculumSubmissionStatus> = {
      APPROVE: 'APPROVED',
      REJECT: 'REJECTED',
      REQUEST_REVISION: 'REVISION_REQUESTED',
    }

    const newStatus = statusMap[action]

    // SHELL: Update submission in database
    // TODO: Implement after curriculum_submissions table is created
    /*
    const submission = await prisma.curriculumSubmission.update({
      where: { id: submissionId },
      data: {
        status: newStatus,
        adminNotes: notes,
        reviewedByUserId: reviewerUserId,
        reviewedAt: new Date(),
      },
      include: {
        submittedBy: true,
        reviewedBy: true,
      },
    })
    */

    console.log('[CurriculumSubmissions] SHELL: Would review submission:', {
      submissionId,
      action,
      newStatus,
      notes,
    })

    // SHELL: If approved, create curriculum block
    if (action === 'APPROVE') {
      // TODO: Create CurriculumBlock record using existing curriculum.ts service
      // TODO: Add to curriculum library
    }

    // SHELL: Notify submitter of review result
    // TODO: Call createNotification

    const mockSubmission: CurriculumSubmissionData = {
      id: submissionId,
      tenantId,
      submittedByUserId: 'user_1',
      submittedByName: 'Jane Director',
      title: 'Dynamic Warm-Up Routine',
      description: 'A 10-minute warm-up routine...',
      sport: 'General',
      level: 2,
      videoUrl: null,
      attachmentUrl: null,
      status: newStatus,
      adminNotes: notes || null,
      reviewedByUserId: reviewerUserId,
      reviewedByName: `${reviewer.firstName} ${reviewer.lastName}`,
      reviewedAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    }

    return {
      data: mockSubmission,
      error: null,
    }
  } catch (error) {
    console.error('[CurriculumSubmissions] Failed to review submission:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: Get a specific curriculum submission
 */
export async function getCurriculumSubmission(params: {
  submissionId: string
  userId: string
  tenantId: string
  role: string
}): Promise<{ data: CurriculumSubmissionData | null; error: Error | null }> {
  try {
    const { submissionId, userId, tenantId, role } = params

    // SHELL: Query submission from database
    // TODO: Implement after curriculum_submissions table is created

    console.log('[CurriculumSubmissions] SHELL: Would get submission:', submissionId)

    return {
      data: null, // SHELL: Return actual submission
      error: null,
    }
  } catch (error) {
    console.error('[CurriculumSubmissions] Failed to get submission:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: Update a draft submission before submitting for review
 */
export async function updateCurriculumSubmission(params: {
  submissionId: string
  updates: Partial<SubmitCurriculumParams>
  userId: string
  tenantId: string
}): Promise<{ data: CurriculumSubmissionData | null; error: Error | null }> {
  try {
    const { submissionId, updates, userId, tenantId } = params

    // SHELL: Verify user owns this submission and it's still a draft
    // TODO: Implement after curriculum_submissions table is created

    console.log('[CurriculumSubmissions] SHELL: Would update submission:', {
      submissionId,
      updates,
    })

    return {
      data: null, // SHELL: Return updated submission
      error: null,
    }
  } catch (error) {
    console.error('[CurriculumSubmissions] Failed to update submission:', error)
    return { data: null, error: error as Error }
  }
}
