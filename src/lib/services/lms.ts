/**
 * LMS Service
 *
 * Prisma-based service for LMS modules and progress tracking.
 */

import prisma from '@/lib/db/client'
import { notifyLmsModuleCompleted, notifyLmsQuizPassed } from './notifications'

// =============================================================================
// Types (snake_case for backward compatibility with pages)
// =============================================================================

export interface LmsModule {
  id: string
  slug: string
  title: string
  description: string | null
  duration_minutes: number
  content_url: string | null
  required_for_roles: string[]
  order_index: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LmsProgress {
  id: string
  profile_id: string
  module_id: string
  started_at: string | null
  completed_at: string | null
  progress_percent: number
  quiz_score: number | null
  quiz_passed: boolean | null
  created_at: string
  updated_at: string
}

// =============================================================================
// Module Queries
// =============================================================================

/**
 * Fetch all active modules (optionally filtered by role)
 */
export async function fetchModules(options?: {
  role?: string
  includeInactive?: boolean
}): Promise<{ data: LmsModule[] | null; error: Error | null }> {
  try {
    const where: Record<string, unknown> = {}

    if (!options?.includeInactive) {
      where.isActive = true
    }

    if (options?.role) {
      where.requiredForRoles = { has: options.role }
    }

    const modules = await prisma.lmsModule.findMany({
      where,
      orderBy: { orderIndex: 'asc' },
    })

    return {
      data: modules.map((m) => ({
        id: m.id,
        slug: m.slug,
        title: m.title,
        description: m.description,
        duration_minutes: m.durationMinutes,
        content_url: m.contentUrl,
        required_for_roles: m.requiredForRoles,
        order_index: m.orderIndex,
        is_active: m.isActive,
        created_at: m.createdAt.toISOString(),
        updated_at: m.updatedAt.toISOString(),
      })),
      error: null,
    }
  } catch (error) {
    console.error('[LMS] Failed to fetch modules:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Fetch a single module by ID
 */
export async function fetchModuleById(
  moduleId: string
): Promise<{ data: LmsModule | null; error: Error | null }> {
  try {
    const module = await prisma.lmsModule.findUnique({
      where: { id: moduleId },
    })

    if (!module) {
      return { data: null, error: null }
    }

    return {
      data: {
        id: module.id,
        slug: module.slug,
        title: module.title,
        description: module.description,
        duration_minutes: module.durationMinutes,
        content_url: module.contentUrl,
        required_for_roles: module.requiredForRoles,
        order_index: module.orderIndex,
        is_active: module.isActive,
        created_at: module.createdAt.toISOString(),
        updated_at: module.updatedAt.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[LMS] Failed to fetch module:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Progress Queries
// =============================================================================

/**
 * Fetch progress for a user (optionally filtered by module IDs)
 */
export async function fetchUserProgress(
  profileId: string,
  moduleIds?: string[]
): Promise<{ data: LmsProgress[] | null; error: Error | null }> {
  try {
    const where: Record<string, unknown> = { profileId }

    if (moduleIds && moduleIds.length > 0) {
      where.moduleId = { in: moduleIds }
    }

    const progress = await prisma.lmsProgress.findMany({
      where,
    })

    return {
      data: progress.map((p) => ({
        id: p.id,
        profile_id: p.profileId,
        module_id: p.moduleId,
        started_at: p.startedAt?.toISOString() || null,
        completed_at: p.completedAt?.toISOString() || null,
        progress_percent: p.progressPercent,
        quiz_score: p.quizScore,
        quiz_passed: p.quizPassed,
        created_at: p.createdAt.toISOString(),
        updated_at: p.updatedAt.toISOString(),
      })),
      error: null,
    }
  } catch (error) {
    console.error('[LMS] Failed to fetch user progress:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Fetch all progress records (for admin)
 */
export async function fetchAllProgress(): Promise<{
  data: LmsProgress[] | null
  error: Error | null
}> {
  try {
    const progress = await prisma.lmsProgress.findMany({
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
    })

    return {
      data: progress.map((p) => ({
        id: p.id,
        profile_id: p.profileId,
        module_id: p.moduleId,
        started_at: p.startedAt?.toISOString() || null,
        completed_at: p.completedAt?.toISOString() || null,
        progress_percent: p.progressPercent,
        quiz_score: p.quizScore,
        quiz_passed: p.quizPassed,
        created_at: p.createdAt.toISOString(),
        updated_at: p.updatedAt.toISOString(),
      })),
      error: null,
    }
  } catch (error) {
    console.error('[LMS] Failed to fetch all progress:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Progress Mutations
// =============================================================================

/**
 * Start a module (create or update progress record)
 */
export async function startModule(
  profileId: string,
  moduleId: string
): Promise<{ data: LmsProgress | null; error: Error | null }> {
  try {
    const progress = await prisma.lmsProgress.upsert({
      where: {
        profileId_moduleId: { profileId, moduleId },
      },
      update: {
        startedAt: new Date(),
      },
      create: {
        profileId,
        moduleId,
        startedAt: new Date(),
        progressPercent: 0,
      },
    })

    return {
      data: {
        id: progress.id,
        profile_id: progress.profileId,
        module_id: progress.moduleId,
        started_at: progress.startedAt?.toISOString() || null,
        completed_at: progress.completedAt?.toISOString() || null,
        progress_percent: progress.progressPercent,
        quiz_score: progress.quizScore,
        quiz_passed: progress.quizPassed,
        created_at: progress.createdAt.toISOString(),
        updated_at: progress.updatedAt.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[LMS] Failed to start module:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Complete a module
 */
export async function completeModule(
  profileId: string,
  moduleId: string,
  quizScore?: number,
  quizPassed?: boolean
): Promise<{ data: LmsProgress | null; error: Error | null }> {
  try {
    // Get the module name for notification
    const module = await prisma.lmsModule.findUnique({
      where: { id: moduleId },
      select: { title: true },
    })

    const progress = await prisma.lmsProgress.upsert({
      where: {
        profileId_moduleId: { profileId, moduleId },
      },
      update: {
        completedAt: new Date(),
        progressPercent: 100,
        ...(quizScore !== undefined && { quizScore }),
        ...(quizPassed !== undefined && { quizPassed }),
      },
      create: {
        profileId,
        moduleId,
        startedAt: new Date(),
        completedAt: new Date(),
        progressPercent: 100,
        ...(quizScore !== undefined && { quizScore }),
        ...(quizPassed !== undefined && { quizPassed }),
      },
    })

    // Send notifications for module completion
    if (module) {
      notifyLmsModuleCompleted({
        userId: profileId,
        moduleName: module.title,
      }).catch((err) => console.error('[LMS] Failed to send module completion notification:', err))

      // If quiz was passed, send additional notification
      if (quizPassed && quizScore !== undefined) {
        notifyLmsQuizPassed({
          userId: profileId,
          moduleName: module.title,
          score: quizScore,
        }).catch((err) => console.error('[LMS] Failed to send quiz passed notification:', err))
      }
    }

    return {
      data: {
        id: progress.id,
        profile_id: progress.profileId,
        module_id: progress.moduleId,
        started_at: progress.startedAt?.toISOString() || null,
        completed_at: progress.completedAt?.toISOString() || null,
        progress_percent: progress.progressPercent,
        quiz_score: progress.quizScore,
        quiz_passed: progress.quizPassed,
        created_at: progress.createdAt.toISOString(),
        updated_at: progress.updatedAt.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[LMS] Failed to complete module:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update progress percentage
 */
export async function updateProgress(
  profileId: string,
  moduleId: string,
  progressPercent: number
): Promise<{ data: LmsProgress | null; error: Error | null }> {
  try {
    const progress = await prisma.lmsProgress.upsert({
      where: {
        profileId_moduleId: { profileId, moduleId },
      },
      update: {
        progressPercent,
        ...(progressPercent === 100 && { completedAt: new Date() }),
      },
      create: {
        profileId,
        moduleId,
        startedAt: new Date(),
        progressPercent,
        ...(progressPercent === 100 && { completedAt: new Date() }),
      },
    })

    return {
      data: {
        id: progress.id,
        profile_id: progress.profileId,
        module_id: progress.moduleId,
        started_at: progress.startedAt?.toISOString() || null,
        completed_at: progress.completedAt?.toISOString() || null,
        progress_percent: progress.progressPercent,
        quiz_score: progress.quizScore,
        quiz_passed: progress.quizPassed,
        created_at: progress.createdAt.toISOString(),
        updated_at: progress.updatedAt.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[LMS] Failed to update progress:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Admin Module Mutations
// =============================================================================

export interface CreateModuleInput {
  title: string
  slug?: string
  description?: string
  duration_minutes?: number
  content_url?: string
  required_for_roles?: string[]
  order_index?: number
  is_active?: boolean
}

export interface UpdateModuleInput {
  title?: string
  slug?: string
  description?: string
  duration_minutes?: number
  content_url?: string | null
  required_for_roles?: string[]
  order_index?: number
  is_active?: boolean
}

/**
 * Create a new module (admin only)
 */
export async function createModule(
  input: CreateModuleInput
): Promise<{ data: LmsModule | null; error: Error | null }> {
  try {
    const module = await prisma.lmsModule.create({
      data: {
        title: input.title,
        slug: input.slug || input.title.toLowerCase().replace(/\s+/g, '-'),
        description: input.description || null,
        durationMinutes: input.duration_minutes || 15,
        contentUrl: input.content_url || null,
        requiredForRoles: input.required_for_roles || [],
        orderIndex: input.order_index || 0,
        isActive: input.is_active ?? true,
      },
    })

    return {
      data: {
        id: module.id,
        slug: module.slug,
        title: module.title,
        description: module.description,
        duration_minutes: module.durationMinutes,
        content_url: module.contentUrl,
        required_for_roles: module.requiredForRoles,
        order_index: module.orderIndex,
        is_active: module.isActive,
        created_at: module.createdAt.toISOString(),
        updated_at: module.updatedAt.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[LMS] Failed to create module:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update a module (admin only)
 */
export async function updateModule(
  moduleId: string,
  input: UpdateModuleInput
): Promise<{ data: LmsModule | null; error: Error | null }> {
  try {
    const updateData: Record<string, unknown> = {}

    if (input.title !== undefined) updateData.title = input.title
    if (input.slug !== undefined) updateData.slug = input.slug
    if (input.description !== undefined) updateData.description = input.description
    if (input.duration_minutes !== undefined) updateData.durationMinutes = input.duration_minutes
    if (input.content_url !== undefined) updateData.contentUrl = input.content_url
    if (input.required_for_roles !== undefined) updateData.requiredForRoles = input.required_for_roles
    if (input.order_index !== undefined) updateData.orderIndex = input.order_index
    if (input.is_active !== undefined) updateData.isActive = input.is_active

    const module = await prisma.lmsModule.update({
      where: { id: moduleId },
      data: updateData,
    })

    return {
      data: {
        id: module.id,
        slug: module.slug,
        title: module.title,
        description: module.description,
        duration_minutes: module.durationMinutes,
        content_url: module.contentUrl,
        required_for_roles: module.requiredForRoles,
        order_index: module.orderIndex,
        is_active: module.isActive,
        created_at: module.createdAt.toISOString(),
        updated_at: module.updatedAt.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[LMS] Failed to update module:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Delete a module (admin only)
 */
export async function deleteModule(
  moduleId: string
): Promise<{ error: Error | null }> {
  try {
    await prisma.lmsModule.delete({
      where: { id: moduleId },
    })

    return { error: null }
  } catch (error) {
    console.error('[LMS] Failed to delete module:', error)
    return { error: error as Error }
  }
}

// =============================================================================
// Admin Progress Queries
// =============================================================================

export interface UserProgressSummary {
  profile_id: string
  profile: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
  }
  role: string
  modules_completed: number
  modules_total: number
  last_activity: string | null
}

/**
 * Fetch progress summary for all users (admin only)
 */
export async function fetchProgressSummary(
  roleFilter?: string
): Promise<{ data: UserProgressSummary[] | null; error: Error | null }> {
  try {
    // Get all users with roles that require LMS
    const rolesWithLms = ['director', 'cit_volunteer', 'coach', 'licensee_owner']

    const where: Record<string, unknown> = {
      role: roleFilter ? roleFilter : { in: rolesWithLms },
      isActive: true,
    }

    const userRoles = await prisma.userRoleAssignment.findMany({
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
    })

    // Get all active modules
    const modules = await prisma.lmsModule.findMany({
      where: { isActive: true },
      select: { id: true, requiredForRoles: true },
    })

    // Get all progress records
    const allProgress = await prisma.lmsProgress.findMany({
      select: {
        profileId: true,
        moduleId: true,
        completedAt: true,
      },
    })

    // Build progress map
    const progressMap = new Map<string, { completed: Set<string>; lastActivity: string | null }>()
    allProgress.forEach((p) => {
      if (!progressMap.has(p.profileId)) {
        progressMap.set(p.profileId, { completed: new Set(), lastActivity: null })
      }
      const entry = progressMap.get(p.profileId)!
      if (p.completedAt) {
        entry.completed.add(p.moduleId)
        const completedStr = p.completedAt.toISOString()
        if (!entry.lastActivity || completedStr > entry.lastActivity) {
          entry.lastActivity = completedStr
        }
      }
    })

    // Calculate progress for each user
    const summaries: UserProgressSummary[] = userRoles.map((ur) => {
      const userModules = modules.filter((m) => m.requiredForRoles.includes(ur.role))
      const userProgressEntry = progressMap.get(ur.profile.id)
      const completedModules = userModules.filter((m) =>
        userProgressEntry?.completed.has(m.id)
      ).length

      return {
        profile_id: ur.profile.id,
        profile: {
          id: ur.profile.id,
          email: ur.profile.email,
          first_name: ur.profile.firstName,
          last_name: ur.profile.lastName,
        },
        role: ur.role,
        modules_completed: completedModules,
        modules_total: userModules.length,
        last_activity: userProgressEntry?.lastActivity || null,
      }
    })

    return { data: summaries, error: null }
  } catch (error) {
    console.error('[LMS] Failed to fetch progress summary:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Admin Training Status Management
// =============================================================================

export interface TrainingStatusResult {
  profile_id: string
  has_completed_lms_core: boolean
  has_completed_lms_director: boolean
  has_completed_lms_volunteer: boolean
}

/**
 * Set training completion status for a user (admin only)
 *
 * @param profileId - The profile ID to update
 * @param trainingType - 'core', 'director', 'volunteer', or 'all'
 * @param completed - Whether to mark as completed (true) or incomplete (false)
 */
export async function setTrainingStatus(
  profileId: string,
  trainingType: 'core' | 'director' | 'volunteer' | 'all',
  completed: boolean
): Promise<{ data: TrainingStatusResult | null; error: Error | null }> {
  try {
    const updateData: Record<string, boolean> = {}

    if (trainingType === 'all') {
      updateData.hasCompletedLmsCore = completed
      updateData.hasCompletedLmsDirector = completed
      updateData.hasCompletedLmsVolunteer = completed
    } else if (trainingType === 'core') {
      updateData.hasCompletedLmsCore = completed
    } else if (trainingType === 'director') {
      updateData.hasCompletedLmsDirector = completed
    } else if (trainingType === 'volunteer') {
      updateData.hasCompletedLmsVolunteer = completed
    }

    const profile = await prisma.profile.update({
      where: { id: profileId },
      data: updateData,
      select: {
        id: true,
        hasCompletedLmsCore: true,
        hasCompletedLmsDirector: true,
        hasCompletedLmsVolunteer: true,
      },
    })

    console.log(`[LMS] Training status updated for ${profileId}: ${trainingType} = ${completed}`)

    return {
      data: {
        profile_id: profile.id,
        has_completed_lms_core: profile.hasCompletedLmsCore,
        has_completed_lms_director: profile.hasCompletedLmsDirector,
        has_completed_lms_volunteer: profile.hasCompletedLmsVolunteer,
      },
      error: null,
    }
  } catch (error) {
    console.error('[LMS] Failed to set training status:', error)
    return { data: null, error: error as Error }
  }
}
