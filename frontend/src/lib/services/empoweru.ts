/**
 * EmpowerU LMS Service
 *
 * Comprehensive service for the EmpowerU learning management system.
 * Handles modules, quizzes, progress tracking, contributions, and unlock rules.
 */

import prisma from '@/lib/db/client'
import {
  PortalType,
  VideoProvider,
  EmpowerUProgressStatus,
  ContributionStatus,
} from '@/generated/prisma'

// =============================================================================
// Types
// =============================================================================

export type { PortalType, VideoProvider, EmpowerUProgressStatus, ContributionStatus }

export interface EmpowerUModuleWithProgress {
  id: string
  tenant_id: string | null
  title: string
  slug: string
  description: string | null
  portal_type: PortalType
  level: number
  video_provider: VideoProvider
  video_url: string | null
  estimated_minutes: number
  is_published: boolean
  created_by_user_id: string | null
  contribution_id: string | null
  created_at: string
  updated_at: string
  // Progress fields
  progress_status: EmpowerUProgressStatus | null
  quiz_score: number | null
  quiz_passed: boolean | null
  completed_at: string | null
  // Quiz info
  has_quiz: boolean
  // Contributor info (if from contribution)
  contributor?: {
    name: string
    role: string
  } | null
}

export interface EmpowerUQuizDetail {
  id: string
  module_id: string
  title: string
  passing_score: number
  questions: {
    id: string
    question_text: string
    question_type: string
    order_index: number
    options: {
      id: string
      option_text: string
      order_index: number
    }[]
  }[]
}

export interface QuizAnswerInput {
  question_id: string
  selected_option_id: string
}

export interface QuizSubmitResult {
  score: number
  passed: boolean
  total_questions: number
  correct_answers: number
}

export interface EmpowerUContributionDetail {
  id: string
  tenant_id: string | null
  submitted_by_user_id: string
  submitted_by_role: string
  title: string
  description: string | null
  portal_type: PortalType
  video_url: string | null
  attachment_url: string | null
  status: ContributionStatus
  admin_reviewer_id: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
  submitter?: {
    name: string
    email: string
  }
  tenant_name?: string | null
}

export interface UnlockResult {
  feature_code: string
  unlocked_at: string
}

// =============================================================================
// Module Queries
// =============================================================================

/**
 * List modules for a specific portal with user progress
 */
export async function listModulesForPortal(params: {
  portalType: PortalType
  role: string
  tenantId?: string | null
  userId: string
}): Promise<{ data: EmpowerUModuleWithProgress[] | null; error: Error | null }> {
  try {
    const { portalType, tenantId, userId } = params

    // Get modules for this portal (global + tenant-specific)
    const modules = await prisma.empowerUModule.findMany({
      where: {
        portalType,
        isPublished: true,
        OR: [
          { tenantId: null }, // Global modules
          ...(tenantId ? [{ tenantId }] : []),
        ],
      },
      include: {
        quiz: {
          select: { id: true },
        },
        contribution: {
          select: {
            submittedByUserId: true,
            submittedByRole: true,
          },
        },
      },
      orderBy: [{ level: 'asc' }, { createdAt: 'asc' }],
    })

    // Get user progress for these modules
    const moduleIds = modules.map((m) => m.id)
    const progress = await prisma.empowerUModuleProgress.findMany({
      where: {
        userId,
        moduleId: { in: moduleIds },
        ...(tenantId ? { tenantId } : {}),
      },
    })

    const progressMap = new Map(progress.map((p) => [p.moduleId, p]))

    // Get contributor names
    const contributorIds = modules
      .filter((m) => m.contribution?.submittedByUserId)
      .map((m) => m.contribution!.submittedByUserId)

    const contributors = contributorIds.length > 0
      ? await prisma.profile.findMany({
          where: { id: { in: contributorIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : []

    const contributorMap = new Map(
      contributors.map((c) => [c.id, `${c.firstName || ''} ${c.lastName || ''}`.trim()])
    )

    const data: EmpowerUModuleWithProgress[] = modules.map((m) => {
      const prog = progressMap.get(m.id)
      const contributorName = m.contribution?.submittedByUserId
        ? contributorMap.get(m.contribution.submittedByUserId)
        : null

      return {
        id: m.id,
        tenant_id: m.tenantId,
        title: m.title,
        slug: m.slug,
        description: m.description,
        portal_type: m.portalType,
        level: m.level,
        video_provider: m.videoProvider,
        video_url: m.videoUrl,
        estimated_minutes: m.estimatedMinutes,
        is_published: m.isPublished,
        created_by_user_id: m.createdByUserId,
        contribution_id: m.contributionId,
        created_at: m.createdAt.toISOString(),
        updated_at: m.updatedAt.toISOString(),
        progress_status: prog?.status || null,
        quiz_score: prog?.quizScore || null,
        quiz_passed: prog?.quizPassed || null,
        completed_at: prog?.completedAt?.toISOString() || null,
        has_quiz: !!m.quiz,
        contributor: contributorName
          ? {
              name: contributorName,
              role: m.contribution?.submittedByRole || '',
            }
          : null,
      }
    })

    return { data, error: null }
  } catch (error) {
    console.error('[EmpowerU] Failed to list modules:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get detailed module info including quiz
 */
export async function getModuleDetail(params: {
  slug: string
  portalType: PortalType
  role: string
  tenantId?: string | null
  userId: string
}): Promise<{
  data: {
    module: EmpowerUModuleWithProgress
    quiz: EmpowerUQuizDetail | null
  } | null
  error: Error | null
}> {
  try {
    const { slug, portalType, tenantId, userId } = params

    const module = await prisma.empowerUModule.findFirst({
      where: {
        slug,
        portalType,
        isPublished: true,
        OR: [
          { tenantId: null },
          ...(tenantId ? [{ tenantId }] : []),
        ],
      },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
              include: {
                options: {
                  orderBy: { orderIndex: 'asc' },
                  select: {
                    id: true,
                    optionText: true,
                    orderIndex: true,
                    // Don't include isCorrect for quiz taking
                  },
                },
              },
            },
          },
        },
        contribution: {
          select: {
            submittedByUserId: true,
            submittedByRole: true,
          },
        },
      },
    })

    if (!module) {
      return { data: null, error: new Error('Module not found') }
    }

    // Get user progress
    const progress = await prisma.empowerUModuleProgress.findFirst({
      where: {
        moduleId: module.id,
        userId,
        ...(tenantId ? { tenantId } : {}),
      },
    })

    // Get contributor name
    let contributorName: string | null = null
    if (module.contribution?.submittedByUserId) {
      const contributor = await prisma.profile.findUnique({
        where: { id: module.contribution.submittedByUserId },
        select: { firstName: true, lastName: true },
      })
      if (contributor) {
        contributorName = `${contributor.firstName || ''} ${contributor.lastName || ''}`.trim()
      }
    }

    const moduleData: EmpowerUModuleWithProgress = {
      id: module.id,
      tenant_id: module.tenantId,
      title: module.title,
      slug: module.slug,
      description: module.description,
      portal_type: module.portalType,
      level: module.level,
      video_provider: module.videoProvider,
      video_url: module.videoUrl,
      estimated_minutes: module.estimatedMinutes,
      is_published: module.isPublished,
      created_by_user_id: module.createdByUserId,
      contribution_id: module.contributionId,
      created_at: module.createdAt.toISOString(),
      updated_at: module.updatedAt.toISOString(),
      progress_status: progress?.status || null,
      quiz_score: progress?.quizScore || null,
      quiz_passed: progress?.quizPassed || null,
      completed_at: progress?.completedAt?.toISOString() || null,
      has_quiz: !!module.quiz,
      contributor: contributorName
        ? {
            name: contributorName,
            role: module.contribution?.submittedByRole || '',
          }
        : null,
    }

    const quizData: EmpowerUQuizDetail | null = module.quiz
      ? {
          id: module.quiz.id,
          module_id: module.quiz.moduleId,
          title: module.quiz.title,
          passing_score: module.quiz.passingScore,
          questions: module.quiz.questions.map((q) => ({
            id: q.id,
            question_text: q.questionText,
            question_type: q.questionType,
            order_index: q.orderIndex,
            options: q.options.map((o) => ({
              id: o.id,
              option_text: o.optionText,
              order_index: o.orderIndex,
            })),
          })),
        }
      : null

    return {
      data: { module: moduleData, quiz: quizData },
      error: null,
    }
  } catch (error) {
    console.error('[EmpowerU] Failed to get module detail:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Progress Management
// =============================================================================

/**
 * Start a module (create or update progress to IN_PROGRESS)
 */
export async function startModule(params: {
  moduleId: string
  userId: string
  role: string
  tenantId?: string | null
}): Promise<{ data: { status: EmpowerUProgressStatus } | null; error: Error | null }> {
  try {
    const { moduleId, userId, role, tenantId } = params

    // Handle nullable tenantId in composite unique key
    const normalizedTenantId = tenantId ?? null

    const progress = await prisma.empowerUModuleProgress.upsert({
      where: {
        moduleId_userId_tenantId: {
          moduleId,
          userId,
          tenantId: normalizedTenantId as string,
        },
      },
      update: {
        status: EmpowerUProgressStatus.IN_PROGRESS,
      },
      create: {
        moduleId,
        userId,
        role,
        tenantId: normalizedTenantId,
        status: EmpowerUProgressStatus.IN_PROGRESS,
      },
    })

    return {
      data: { status: progress.status },
      error: null,
    }
  } catch (error) {
    console.error('[EmpowerU] Failed to start module:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Submit quiz answers and grade
 */
export async function submitQuiz(params: {
  moduleId: string
  userId: string
  answers: QuizAnswerInput[]
  role: string
  tenantId?: string | null
}): Promise<{ data: QuizSubmitResult | null; error: Error | null }> {
  try {
    const { moduleId, userId, answers, role, tenantId } = params

    // Get the quiz with correct answers
    const quiz = await prisma.empowerUQuiz.findFirst({
      where: { moduleId },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    })

    if (!quiz) {
      return { data: null, error: new Error('Quiz not found') }
    }

    // Grade the quiz
    let correctCount = 0
    const totalQuestions = quiz.questions.length

    for (const answer of answers) {
      const question = quiz.questions.find((q) => q.id === answer.question_id)
      if (question) {
        const correctOption = question.options.find((o) => o.isCorrect)
        if (correctOption && correctOption.id === answer.selected_option_id) {
          correctCount++
        }
      }
    }

    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
    const passed = score >= quiz.passingScore

    // Handle nullable tenantId in composite unique key
    const normalizedTenantId = tenantId ?? null

    // Update progress
    await prisma.empowerUModuleProgress.upsert({
      where: {
        moduleId_userId_tenantId: {
          moduleId,
          userId,
          tenantId: normalizedTenantId as string,
        },
      },
      update: {
        quizScore: score,
        quizPassed: passed,
        ...(passed
          ? {
              status: EmpowerUProgressStatus.COMPLETED,
              completedAt: new Date(),
            }
          : {}),
      },
      create: {
        moduleId,
        userId,
        role,
        tenantId: normalizedTenantId,
        quizScore: score,
        quizPassed: passed,
        status: passed ? EmpowerUProgressStatus.COMPLETED : EmpowerUProgressStatus.IN_PROGRESS,
        ...(passed ? { completedAt: new Date() } : {}),
      },
    })

    return {
      data: {
        score,
        passed,
        total_questions: totalQuestions,
        correct_answers: correctCount,
      },
      error: null,
    }
  } catch (error) {
    console.error('[EmpowerU] Failed to submit quiz:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Unlock System
// =============================================================================

/**
 * Evaluate and grant unlocks based on completed modules
 */
export async function evaluateUnlocks(params: {
  userId: string
  role: string
  tenantId?: string | null
  portalType: PortalType
}): Promise<{ data: UnlockResult[] | null; error: Error | null }> {
  try {
    const { userId, tenantId, portalType } = params

    // Get all unlock rules for this portal
    const rules = await prisma.empowerUUnlockRule.findMany({
      where: { portalType },
      include: {
        requiredModules: {
          include: {
            module: {
              select: { id: true },
            },
          },
        },
      },
    })

    // Get user's completed modules with passing quiz
    const completedProgress = await prisma.empowerUModuleProgress.findMany({
      where: {
        userId,
        ...(tenantId ? { tenantId } : {}),
        status: EmpowerUProgressStatus.COMPLETED,
        quizPassed: true,
      },
      select: { moduleId: true },
    })

    const completedModuleIds = new Set(completedProgress.map((p) => p.moduleId))

    // Get existing unlocks
    const existingUnlocks = await prisma.empowerUUserUnlock.findMany({
      where: {
        userId,
        ...(tenantId ? { tenantId } : {}),
      },
      select: { featureCode: true },
    })

    const existingCodes = new Set(existingUnlocks.map((u) => u.featureCode))

    // Check each rule and create new unlocks
    const newUnlocks: UnlockResult[] = []

    for (const rule of rules) {
      // Skip if already unlocked
      if (existingCodes.has(rule.unlockFeatureCode)) {
        continue
      }

      // Check if all required modules are completed
      const requiredModuleIds = rule.requiredModules.map((rm) => rm.module.id)
      const allCompleted = requiredModuleIds.every((id) => completedModuleIds.has(id))

      if (allCompleted && requiredModuleIds.length > 0) {
        // Grant the unlock
        const unlock = await prisma.empowerUUserUnlock.create({
          data: {
            userId,
            tenantId: tenantId || null,
            featureCode: rule.unlockFeatureCode,
          },
        })

        newUnlocks.push({
          feature_code: unlock.featureCode,
          unlocked_at: unlock.unlockedAt.toISOString(),
        })
      }
    }

    return { data: newUnlocks, error: null }
  } catch (error) {
    console.error('[EmpowerU] Failed to evaluate unlocks:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get all unlocks for a user
 */
export async function getUserUnlocks(params: {
  userId: string
  role: string
  tenantId?: string | null
}): Promise<{ data: string[] | null; error: Error | null }> {
  try {
    const { userId, tenantId } = params

    const unlocks = await prisma.empowerUUserUnlock.findMany({
      where: {
        userId,
        ...(tenantId ? { tenantId } : {}),
      },
      select: { featureCode: true },
    })

    return {
      data: unlocks.map((u) => u.featureCode),
      error: null,
    }
  } catch (error) {
    console.error('[EmpowerU] Failed to get user unlocks:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Check if user has a specific unlock
 */
export async function hasUnlock(params: {
  userId: string
  featureCode: string
  tenantId?: string | null
}): Promise<boolean> {
  try {
    const { userId, featureCode, tenantId } = params

    const unlock = await prisma.empowerUUserUnlock.findFirst({
      where: {
        userId,
        featureCode,
        ...(tenantId ? { tenantId } : {}),
      },
    })

    return !!unlock
  } catch (error) {
    console.error('[EmpowerU] Failed to check unlock:', error)
    return false
  }
}

// =============================================================================
// Contribution Center
// =============================================================================

/**
 * Submit a new contribution
 */
export async function submitContribution(params: {
  title: string
  description?: string
  portalType: PortalType
  videoUrl?: string
  attachmentUrl?: string
  userId: string
  role: string
  tenantId?: string | null
}): Promise<{ data: EmpowerUContributionDetail | null; error: Error | null }> {
  try {
    const { title, description, portalType, videoUrl, attachmentUrl, userId, role, tenantId } =
      params

    const contribution = await prisma.empowerUContribution.create({
      data: {
        tenantId: tenantId || null,
        submittedByUserId: userId,
        submittedByRole: role,
        title,
        description: description || null,
        portalType,
        videoUrl: videoUrl || null,
        attachmentUrl: attachmentUrl || null,
        status: ContributionStatus.PENDING,
      },
    })

    return {
      data: {
        id: contribution.id,
        tenant_id: contribution.tenantId,
        submitted_by_user_id: contribution.submittedByUserId,
        submitted_by_role: contribution.submittedByRole,
        title: contribution.title,
        description: contribution.description,
        portal_type: contribution.portalType,
        video_url: contribution.videoUrl,
        attachment_url: contribution.attachmentUrl,
        status: contribution.status,
        admin_reviewer_id: contribution.adminReviewerId,
        admin_notes: contribution.adminNotes,
        created_at: contribution.createdAt.toISOString(),
        updated_at: contribution.updatedAt.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[EmpowerU] Failed to submit contribution:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * List contributions for review (admin/licensee only)
 */
export async function listContributionsForReview(params: {
  tenantId?: string | null
  role: string
  status?: ContributionStatus[]
}): Promise<{ data: EmpowerUContributionDetail[] | null; error: Error | null }> {
  try {
    const { tenantId, role, status } = params

    // Only hq_admin and licensee_owner can review
    if (!['hq_admin', 'licensee_owner'].includes(role)) {
      return { data: null, error: new Error('Not authorized to review contributions') }
    }

    const where: Record<string, unknown> = {}

    // Filter by status (default to pending and revision requested)
    if (status && status.length > 0) {
      where.status = { in: status }
    } else {
      where.status = {
        in: [ContributionStatus.PENDING, ContributionStatus.REVISION_REQUESTED],
      }
    }

    // Licensee owner can only see their tenant's contributions
    if (role === 'licensee_owner' && tenantId) {
      where.tenantId = tenantId
    }

    const contributions = await prisma.empowerUContribution.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // Get submitter info
    const submitterIds = contributions.map((c) => c.submittedByUserId)
    const submitters = await prisma.profile.findMany({
      where: { id: { in: submitterIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    })
    const submitterMap = new Map(submitters.map((s) => [s.id, s]))

    // Get tenant names
    const tenantIds = contributions.filter((c) => c.tenantId).map((c) => c.tenantId!)
    const tenants =
      tenantIds.length > 0
        ? await prisma.tenant.findMany({
            where: { id: { in: tenantIds } },
            select: { id: true, name: true },
          })
        : []
    const tenantMap = new Map(tenants.map((t) => [t.id, t.name]))

    const data: EmpowerUContributionDetail[] = contributions.map((c) => {
      const submitter = submitterMap.get(c.submittedByUserId)
      return {
        id: c.id,
        tenant_id: c.tenantId,
        submitted_by_user_id: c.submittedByUserId,
        submitted_by_role: c.submittedByRole,
        title: c.title,
        description: c.description,
        portal_type: c.portalType,
        video_url: c.videoUrl,
        attachment_url: c.attachmentUrl,
        status: c.status,
        admin_reviewer_id: c.adminReviewerId,
        admin_notes: c.adminNotes,
        created_at: c.createdAt.toISOString(),
        updated_at: c.updatedAt.toISOString(),
        submitter: submitter
          ? {
              name: `${submitter.firstName || ''} ${submitter.lastName || ''}`.trim(),
              email: submitter.email,
            }
          : undefined,
        tenant_name: c.tenantId ? tenantMap.get(c.tenantId) : null,
      }
    })

    return { data, error: null }
  } catch (error) {
    console.error('[EmpowerU] Failed to list contributions:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get user's own contributions
 */
export async function getUserContributions(params: {
  userId: string
  tenantId?: string | null
}): Promise<{ data: EmpowerUContributionDetail[] | null; error: Error | null }> {
  try {
    const { userId, tenantId } = params

    const contributions = await prisma.empowerUContribution.findMany({
      where: {
        submittedByUserId: userId,
        ...(tenantId ? { tenantId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    const data: EmpowerUContributionDetail[] = contributions.map((c) => ({
      id: c.id,
      tenant_id: c.tenantId,
      submitted_by_user_id: c.submittedByUserId,
      submitted_by_role: c.submittedByRole,
      title: c.title,
      description: c.description,
      portal_type: c.portalType,
      video_url: c.videoUrl,
      attachment_url: c.attachmentUrl,
      status: c.status,
      admin_reviewer_id: c.adminReviewerId,
      admin_notes: c.adminNotes,
      created_at: c.createdAt.toISOString(),
      updated_at: c.updatedAt.toISOString(),
    }))

    return { data, error: null }
  } catch (error) {
    console.error('[EmpowerU] Failed to get user contributions:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Review a contribution (approve/reject/request revision)
 */
export async function reviewContribution(params: {
  contributionId: string
  action: 'APPROVE' | 'REJECT' | 'REQUEST_REVISION'
  adminNotes?: string
  adminUserId: string
  tenantId?: string | null
}): Promise<{
  data: {
    contribution: EmpowerUContributionDetail
    createdModule?: { id: string; slug: string }
  } | null
  error: Error | null
}> {
  try {
    const { contributionId, action, adminNotes, adminUserId } = params

    const statusMap = {
      APPROVE: ContributionStatus.APPROVED,
      REJECT: ContributionStatus.REJECTED,
      REQUEST_REVISION: ContributionStatus.REVISION_REQUESTED,
    }

    const contribution = await prisma.empowerUContribution.update({
      where: { id: contributionId },
      data: {
        status: statusMap[action],
        adminReviewerId: adminUserId,
        adminNotes: adminNotes || null,
      },
    })

    let createdModule: { id: string; slug: string } | undefined

    // If approved, create a module from the contribution
    if (action === 'APPROVE') {
      const slug = contribution.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      const module = await prisma.empowerUModule.create({
        data: {
          tenantId: contribution.tenantId,
          title: contribution.title,
          slug: `${slug}-${Date.now()}`, // Ensure uniqueness
          description: contribution.description,
          portalType: contribution.portalType,
          level: 99, // Default to high level, admin can adjust
          videoProvider: VideoProvider.YOUTUBE,
          videoUrl: contribution.videoUrl,
          estimatedMinutes: 15,
          isPublished: false, // Admin must publish manually
          createdByUserId: adminUserId,
          contributionId: contribution.id,
        },
      })

      createdModule = { id: module.id, slug: module.slug }
    }

    return {
      data: {
        contribution: {
          id: contribution.id,
          tenant_id: contribution.tenantId,
          submitted_by_user_id: contribution.submittedByUserId,
          submitted_by_role: contribution.submittedByRole,
          title: contribution.title,
          description: contribution.description,
          portal_type: contribution.portalType,
          video_url: contribution.videoUrl,
          attachment_url: contribution.attachmentUrl,
          status: contribution.status,
          admin_reviewer_id: contribution.adminReviewerId,
          admin_notes: contribution.adminNotes,
          created_at: contribution.createdAt.toISOString(),
          updated_at: contribution.updatedAt.toISOString(),
        },
        createdModule,
      },
      error: null,
    }
  } catch (error) {
    console.error('[EmpowerU] Failed to review contribution:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Shared Library
// =============================================================================

/**
 * List all published modules for the shared library
 */
export async function listLibraryContent(params: {
  portalType?: PortalType
  search?: string
  tenantId?: string | null
  role: string
}): Promise<{ data: EmpowerUModuleWithProgress[] | null; error: Error | null }> {
  try {
    const { portalType, search, tenantId } = params

    const where: Record<string, unknown> = {
      isPublished: true,
    }

    // Filter by portal type if specified
    if (portalType) {
      where.portalType = portalType
    }

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Include global and tenant-specific content
    where.AND = [
      {
        OR: [{ tenantId: null }, ...(tenantId ? [{ tenantId }] : [])],
      },
    ]

    const modules = await prisma.empowerUModule.findMany({
      where,
      include: {
        quiz: {
          select: { id: true },
        },
        contribution: {
          select: {
            submittedByUserId: true,
            submittedByRole: true,
          },
        },
      },
      orderBy: [{ portalType: 'asc' }, { level: 'asc' }],
    })

    // Get contributor names
    const contributorIds = modules
      .filter((m) => m.contribution?.submittedByUserId)
      .map((m) => m.contribution!.submittedByUserId)

    const contributors =
      contributorIds.length > 0
        ? await prisma.profile.findMany({
            where: { id: { in: contributorIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : []

    const contributorMap = new Map(
      contributors.map((c) => [c.id, `${c.firstName || ''} ${c.lastName || ''}`.trim()])
    )

    const data: EmpowerUModuleWithProgress[] = modules.map((m) => {
      const contributorName = m.contribution?.submittedByUserId
        ? contributorMap.get(m.contribution.submittedByUserId)
        : null

      return {
        id: m.id,
        tenant_id: m.tenantId,
        title: m.title,
        slug: m.slug,
        description: m.description,
        portal_type: m.portalType,
        level: m.level,
        video_provider: m.videoProvider,
        video_url: m.videoUrl,
        estimated_minutes: m.estimatedMinutes,
        is_published: m.isPublished,
        created_by_user_id: m.createdByUserId,
        contribution_id: m.contributionId,
        created_at: m.createdAt.toISOString(),
        updated_at: m.updatedAt.toISOString(),
        progress_status: null,
        quiz_score: null,
        quiz_passed: null,
        completed_at: null,
        has_quiz: !!m.quiz,
        contributor: contributorName
          ? {
              name: contributorName,
              role: m.contribution?.submittedByRole || '',
            }
          : null,
      }
    })

    return { data, error: null }
  } catch (error) {
    console.error('[EmpowerU] Failed to list library content:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Admin Functions
// =============================================================================

/**
 * Create a new module (admin only)
 */
export async function createModule(params: {
  title: string
  slug?: string
  description?: string
  portalType: PortalType
  level?: number
  videoProvider?: VideoProvider
  videoUrl?: string
  estimatedMinutes?: number
  isPublished?: boolean
  tenantId?: string | null
  createdByUserId: string
}): Promise<{ data: EmpowerUModuleWithProgress | null; error: Error | null }> {
  try {
    const {
      title,
      slug,
      description,
      portalType,
      level,
      videoProvider,
      videoUrl,
      estimatedMinutes,
      isPublished,
      tenantId,
      createdByUserId,
    } = params

    const finalSlug =
      slug ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

    const module = await prisma.empowerUModule.create({
      data: {
        tenantId: tenantId || null,
        title,
        slug: finalSlug,
        description: description || null,
        portalType,
        level: level || 1,
        videoProvider: videoProvider || VideoProvider.YOUTUBE,
        videoUrl: videoUrl || null,
        estimatedMinutes: estimatedMinutes || 30,
        isPublished: isPublished || false,
        createdByUserId,
      },
      include: {
        quiz: { select: { id: true } },
      },
    })

    return {
      data: {
        id: module.id,
        tenant_id: module.tenantId,
        title: module.title,
        slug: module.slug,
        description: module.description,
        portal_type: module.portalType,
        level: module.level,
        video_provider: module.videoProvider,
        video_url: module.videoUrl,
        estimated_minutes: module.estimatedMinutes,
        is_published: module.isPublished,
        created_by_user_id: module.createdByUserId,
        contribution_id: module.contributionId,
        created_at: module.createdAt.toISOString(),
        updated_at: module.updatedAt.toISOString(),
        progress_status: null,
        quiz_score: null,
        quiz_passed: null,
        completed_at: null,
        has_quiz: !!module.quiz,
        contributor: null,
      },
      error: null,
    }
  } catch (error) {
    console.error('[EmpowerU] Failed to create module:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update a module (admin only)
 */
export async function updateModule(params: {
  moduleId: string
  title?: string
  description?: string
  level?: number
  videoUrl?: string
  estimatedMinutes?: number
  isPublished?: boolean
}): Promise<{ data: EmpowerUModuleWithProgress | null; error: Error | null }> {
  try {
    const { moduleId, ...updates } = params

    const updateData: Record<string, unknown> = {}
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.level !== undefined) updateData.level = updates.level
    if (updates.videoUrl !== undefined) updateData.videoUrl = updates.videoUrl
    if (updates.estimatedMinutes !== undefined) updateData.estimatedMinutes = updates.estimatedMinutes
    if (updates.isPublished !== undefined) updateData.isPublished = updates.isPublished

    const module = await prisma.empowerUModule.update({
      where: { id: moduleId },
      data: updateData,
      include: {
        quiz: { select: { id: true } },
      },
    })

    return {
      data: {
        id: module.id,
        tenant_id: module.tenantId,
        title: module.title,
        slug: module.slug,
        description: module.description,
        portal_type: module.portalType,
        level: module.level,
        video_provider: module.videoProvider,
        video_url: module.videoUrl,
        estimated_minutes: module.estimatedMinutes,
        is_published: module.isPublished,
        created_by_user_id: module.createdByUserId,
        contribution_id: module.contributionId,
        created_at: module.createdAt.toISOString(),
        updated_at: module.updatedAt.toISOString(),
        progress_status: null,
        quiz_score: null,
        quiz_passed: null,
        completed_at: null,
        has_quiz: !!module.quiz,
        contributor: null,
      },
      error: null,
    }
  } catch (error) {
    console.error('[EmpowerU] Failed to update module:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Create or update a quiz for a module
 */
export async function upsertQuiz(params: {
  moduleId: string
  title: string
  passingScore?: number
  questions: {
    questionText: string
    options: {
      optionText: string
      isCorrect: boolean
    }[]
  }[]
}): Promise<{ data: EmpowerUQuizDetail | null; error: Error | null }> {
  try {
    const { moduleId, title, passingScore, questions } = params

    // Delete existing quiz if any
    await prisma.empowerUQuiz.deleteMany({
      where: { moduleId },
    })

    // Create new quiz
    const quiz = await prisma.empowerUQuiz.create({
      data: {
        moduleId,
        title,
        passingScore: passingScore || 80,
        questions: {
          create: questions.map((q, qIndex) => ({
            questionText: q.questionText,
            orderIndex: qIndex,
            options: {
              create: q.options.map((o, oIndex) => ({
                optionText: o.optionText,
                isCorrect: o.isCorrect,
                orderIndex: oIndex,
              })),
            },
          })),
        },
      },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            options: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    })

    return {
      data: {
        id: quiz.id,
        module_id: quiz.moduleId,
        title: quiz.title,
        passing_score: quiz.passingScore,
        questions: quiz.questions.map((q) => ({
          id: q.id,
          question_text: q.questionText,
          question_type: q.questionType,
          order_index: q.orderIndex,
          options: q.options.map((o) => ({
            id: o.id,
            option_text: o.optionText,
            order_index: o.orderIndex,
          })),
        })),
      },
      error: null,
    }
  } catch (error) {
    console.error('[EmpowerU] Failed to upsert quiz:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Create an unlock rule
 */
export async function createUnlockRule(params: {
  portalType: PortalType
  unlockFeatureCode: string
  description?: string
  requiredModuleIds: string[]
}): Promise<{ error: Error | null }> {
  try {
    const { portalType, unlockFeatureCode, description, requiredModuleIds } = params

    await prisma.empowerUUnlockRule.create({
      data: {
        portalType,
        unlockFeatureCode,
        description: description || null,
        requiredModules: {
          create: requiredModuleIds.map((moduleId) => ({
            moduleId,
          })),
        },
      },
    })

    return { error: null }
  } catch (error) {
    console.error('[EmpowerU] Failed to create unlock rule:', error)
    return { error: error as Error }
  }
}
