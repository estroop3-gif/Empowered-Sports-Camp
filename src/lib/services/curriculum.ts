/**
 * Curriculum Service (Prisma)
 *
 * Handles all database operations for curriculum management.
 * Migrated from Supabase to Prisma.
 */

import prisma from '@/lib/db/client'

// ============================================
// TYPE DEFINITIONS
// ============================================

export type SportType =
  | 'multi_sport'
  | 'basketball'
  | 'soccer'
  | 'volleyball'
  | 'softball'
  | 'flag_football'
  | 'lacrosse'
  | 'field_hockey'
  | 'track_field'
  | 'speed_agility'

export type DifficultyLevel = 'intro' | 'beginner' | 'intermediate' | 'advanced'

export type BlockCategory =
  | 'warmup'
  | 'drill'
  | 'skill_station'
  | 'scrimmage'
  | 'game'
  | 'mindset'
  | 'leadership'
  | 'team_building'
  | 'cooldown'
  | 'water_break'
  | 'transition'
  | 'other'

export type IntensityLevel = 'low' | 'moderate' | 'high' | 'variable'

export interface CurriculumTemplate {
  id: string
  licensee_id: string | null
  sport: SportType
  name: string
  description: string | null
  age_min: number | null
  age_max: number | null
  difficulty: DifficultyLevel
  is_global: boolean
  total_days: number
  is_active: boolean
  is_published: boolean
  // PDF Support
  pdf_url: string | null
  pdf_name: string | null
  is_pdf_only: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  licensee_name?: string | null
  days?: CurriculumTemplateDay[]
}

export interface CurriculumBlock {
  id: string
  licensee_id: string | null
  sport: SportType
  title: string
  description: string | null
  duration_minutes: number
  category: BlockCategory
  intensity: IntensityLevel | null
  equipment_needed: string | null
  setup_notes: string | null
  coaching_points: string | null
  is_global: boolean
  is_active: boolean
  // PDF Support
  pdf_url: string | null
  pdf_name: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  licensee_name?: string | null
}

export interface CurriculumTemplateDay {
  id: string
  template_id: string
  day_number: number
  title: string
  theme: string | null
  notes: string | null
  total_duration_minutes: number
  created_at: string
  updated_at: string
  blocks?: CurriculumDayBlock[]
}

export interface CurriculumDayBlock {
  id: string
  day_id: string
  block_id: string
  order_index: number
  custom_title: string | null
  custom_duration_minutes: number | null
  custom_notes: string | null
  field_location: string | null
  created_at: string
  updated_at: string
  block?: CurriculumBlock
}

export interface CampSessionCurriculum {
  id: string
  camp_id: string
  template_id: string
  assigned_by: string | null
  assigned_at: string
  notes: string | null
  camp?: {
    id: string
    name: string
    sport: string
    start_date: string
    end_date: string
    tenant_id: string | null
  }
  template?: CurriculumTemplate
}

// ============================================
// FILTER INTERFACES
// ============================================

export interface TemplateFilters {
  sport?: SportType | ''
  scope?: 'all' | 'global' | 'licensee'
  difficulty?: DifficultyLevel | ''
  search?: string
  ageMin?: number
  ageMax?: number
}

export interface BlockFilters {
  sport?: SportType | ''
  category?: BlockCategory | ''
  scope?: 'all' | 'global' | 'licensee'
  search?: string
}

// ============================================
// CONSTANTS
// ============================================

export const SPORTS: { value: SportType; label: string }[] = [
  { value: 'multi_sport', label: 'Multi-Sport' },
  { value: 'basketball', label: 'Basketball' },
  { value: 'soccer', label: 'Soccer' },
  { value: 'volleyball', label: 'Volleyball' },
  { value: 'softball', label: 'Softball' },
  { value: 'flag_football', label: 'Flag Football' },
  { value: 'lacrosse', label: 'Lacrosse' },
  { value: 'field_hockey', label: 'Field Hockey' },
  { value: 'track_field', label: 'Track & Field' },
  { value: 'speed_agility', label: 'Speed & Agility' },
]

export const DIFFICULTIES: { value: DifficultyLevel; label: string }[] = [
  { value: 'intro', label: 'Intro' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

export const BLOCK_CATEGORIES: { value: BlockCategory; label: string; color: string }[] = [
  { value: 'warmup', label: 'Warmup', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'drill', label: 'Drill', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'skill_station', label: 'Skill Station', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'scrimmage', label: 'Scrimmage', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'game', label: 'Game', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'mindset', label: 'Mindset', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  { value: 'leadership', label: 'Leadership', color: 'bg-magenta/20 text-magenta border-magenta/30' },
  { value: 'team_building', label: 'Team Building', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { value: 'cooldown', label: 'Cooldown', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'water_break', label: 'Water Break', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  { value: 'transition', label: 'Transition', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  { value: 'other', label: 'Other', color: 'bg-white/10 text-white/60 border-white/20' },
]

export const INTENSITIES: { value: IntensityLevel; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
  { value: 'variable', label: 'Variable' },
]

// ============================================
// TEMPLATE QUERIES
// ============================================

export async function getTemplates(filters?: TemplateFilters): Promise<{
  data: CurriculumTemplate[] | null
  error: Error | null
}> {
  try {
    const where: Record<string, unknown> = { isActive: true }

    if (filters?.sport) {
      where.sport = filters.sport
    }
    if (filters?.difficulty) {
      where.difficulty = filters.difficulty
    }
    if (filters?.scope === 'global') {
      where.isGlobal = true
    } else if (filters?.scope === 'licensee') {
      where.isGlobal = false
    }
    if (filters?.ageMin) {
      where.ageMax = { gte: filters.ageMin }
    }
    if (filters?.ageMax) {
      where.ageMin = { lte: filters.ageMax }
    }

    const templates = await prisma.curriculumTemplate.findMany({
      where,
      include: {
        licensee: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    let result: CurriculumTemplate[] = templates.map(t => ({
      id: t.id,
      licensee_id: t.licenseeId,
      sport: t.sport as SportType,
      name: t.name,
      description: t.description,
      age_min: t.ageMin,
      age_max: t.ageMax,
      difficulty: t.difficulty as DifficultyLevel,
      is_global: t.isGlobal,
      total_days: t.totalDays,
      is_active: t.isActive,
      is_published: t.isPublished,
      pdf_url: t.pdfUrl,
      pdf_name: t.pdfName,
      is_pdf_only: t.isPdfOnly,
      created_by: t.createdBy,
      created_at: t.createdAt.toISOString(),
      updated_at: t.updatedAt.toISOString(),
      licensee_name: t.licensee?.name || null,
    }))

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(t =>
        t.name.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower)
      )
    }

    return { data: result, error: null }
  } catch (err) {
    console.error('Error fetching templates:', err)
    return { data: null, error: err as Error }
  }
}

export async function getTemplateById(id: string): Promise<{
  data: CurriculumTemplate | null
  error: Error | null
}> {
  try {
    const template = await prisma.curriculumTemplate.findUnique({
      where: { id },
      include: {
        licensee: { select: { id: true, name: true } },
        days: {
          orderBy: { dayNumber: 'asc' },
          include: {
            dayBlocks: {
              orderBy: { orderIndex: 'asc' },
              include: {
                block: true,
              },
            },
          },
        },
      },
    })

    if (!template) {
      return { data: null, error: null }
    }

    const result: CurriculumTemplate = {
      id: template.id,
      licensee_id: template.licenseeId,
      sport: template.sport as SportType,
      name: template.name,
      description: template.description,
      age_min: template.ageMin,
      age_max: template.ageMax,
      difficulty: template.difficulty as DifficultyLevel,
      is_global: template.isGlobal,
      total_days: template.totalDays,
      is_active: template.isActive,
      is_published: template.isPublished,
      pdf_url: template.pdfUrl,
      pdf_name: template.pdfName,
      is_pdf_only: template.isPdfOnly,
      created_by: template.createdBy,
      created_at: template.createdAt.toISOString(),
      updated_at: template.updatedAt.toISOString(),
      licensee_name: template.licensee?.name || null,
      days: template.days.map(d => ({
        id: d.id,
        template_id: d.templateId,
        day_number: d.dayNumber,
        title: d.title,
        theme: d.theme,
        notes: d.notes,
        total_duration_minutes: d.totalDurationMinutes,
        created_at: d.createdAt.toISOString(),
        updated_at: d.updatedAt.toISOString(),
        blocks: d.dayBlocks.map(db => ({
          id: db.id,
          day_id: db.dayId,
          block_id: db.blockId,
          order_index: db.orderIndex,
          custom_title: db.customTitle,
          custom_duration_minutes: db.customDurationMinutes,
          custom_notes: db.customNotes,
          field_location: db.fieldLocation,
          created_at: db.createdAt.toISOString(),
          updated_at: db.updatedAt.toISOString(),
          block: db.block ? {
            id: db.block.id,
            licensee_id: db.block.licenseeId,
            sport: db.block.sport as SportType,
            title: db.block.title,
            description: db.block.description,
            duration_minutes: db.block.durationMinutes,
            category: db.block.category as BlockCategory,
            intensity: db.block.intensity as IntensityLevel | null,
            equipment_needed: db.block.equipmentNeeded,
            setup_notes: db.block.setupNotes,
            coaching_points: db.block.coachingPoints,
            is_global: db.block.isGlobal,
            is_active: db.block.isActive,
            pdf_url: db.block.pdfUrl,
            pdf_name: db.block.pdfName,
            created_by: db.block.createdBy,
            created_at: db.block.createdAt.toISOString(),
            updated_at: db.block.updatedAt.toISOString(),
          } : undefined,
        })),
      })),
    }

    return { data: result, error: null }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

export interface CreateTemplateInput {
  licensee_id?: string | null
  sport: SportType
  name: string
  description?: string
  age_min?: number
  age_max?: number
  difficulty?: DifficultyLevel
  is_global?: boolean
  total_days?: number
  // PDF Support
  pdf_url?: string | null
  pdf_name?: string | null
  is_pdf_only?: boolean
}

export async function createTemplate(input: CreateTemplateInput, userId?: string): Promise<{
  data: CurriculumTemplate | null
  error: Error | null
}> {
  try {
    const template = await prisma.curriculumTemplate.create({
      data: {
        licenseeId: input.licensee_id || null,
        sport: input.sport,
        name: input.name,
        description: input.description || null,
        ageMin: input.age_min || null,
        ageMax: input.age_max || null,
        difficulty: input.difficulty || 'intro',
        isGlobal: input.is_global || false,
        totalDays: input.total_days || 1,
        pdfUrl: input.pdf_url || null,
        pdfName: input.pdf_name || null,
        isPdfOnly: input.is_pdf_only || false,
        createdBy: userId || null,
      },
    })

    return {
      data: {
        id: template.id,
        licensee_id: template.licenseeId,
        sport: template.sport as SportType,
        name: template.name,
        description: template.description,
        age_min: template.ageMin,
        age_max: template.ageMax,
        difficulty: template.difficulty as DifficultyLevel,
        is_global: template.isGlobal,
        total_days: template.totalDays,
        is_active: template.isActive,
        is_published: template.isPublished,
        pdf_url: template.pdfUrl,
        pdf_name: template.pdfName,
        is_pdf_only: template.isPdfOnly,
        created_by: template.createdBy,
        created_at: template.createdAt.toISOString(),
        updated_at: template.updatedAt.toISOString(),
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

export async function updateTemplate(
  id: string,
  input: Partial<CreateTemplateInput>
): Promise<{
  data: CurriculumTemplate | null
  error: Error | null
}> {
  try {
    const updates: Record<string, unknown> = {}
    if (input.name !== undefined) updates.name = input.name
    if (input.description !== undefined) updates.description = input.description
    if (input.sport !== undefined) updates.sport = input.sport
    if (input.age_min !== undefined) updates.ageMin = input.age_min
    if (input.age_max !== undefined) updates.ageMax = input.age_max
    if (input.difficulty !== undefined) updates.difficulty = input.difficulty
    if (input.is_global !== undefined) updates.isGlobal = input.is_global
    if (input.total_days !== undefined) updates.totalDays = input.total_days
    if (input.pdf_url !== undefined) updates.pdfUrl = input.pdf_url
    if (input.pdf_name !== undefined) updates.pdfName = input.pdf_name
    if (input.is_pdf_only !== undefined) updates.isPdfOnly = input.is_pdf_only

    const template = await prisma.curriculumTemplate.update({
      where: { id },
      data: updates,
    })

    return {
      data: {
        id: template.id,
        licensee_id: template.licenseeId,
        sport: template.sport as SportType,
        name: template.name,
        description: template.description,
        age_min: template.ageMin,
        age_max: template.ageMax,
        difficulty: template.difficulty as DifficultyLevel,
        is_global: template.isGlobal,
        total_days: template.totalDays,
        is_active: template.isActive,
        is_published: template.isPublished,
        pdf_url: template.pdfUrl,
        pdf_name: template.pdfName,
        is_pdf_only: template.isPdfOnly,
        created_by: template.createdBy,
        created_at: template.createdAt.toISOString(),
        updated_at: template.updatedAt.toISOString(),
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

export async function deleteTemplate(id: string): Promise<{
  success: boolean
  error: Error | null
}> {
  try {
    await prisma.curriculumTemplate.update({
      where: { id },
      data: { isActive: false },
    })
    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: err as Error }
  }
}

export async function duplicateTemplate(
  sourceTemplateId: string,
  licenseeId: string | null,
  newName: string
): Promise<{
  data: CurriculumTemplate | null
  error: Error | null
}> {
  try {
    // Fetch the source template with all days and block assignments
    const sourceTemplate = await prisma.curriculumTemplate.findUnique({
      where: { id: sourceTemplateId },
      include: {
        days: {
          include: {
            dayBlocks: {
              orderBy: { orderIndex: 'asc' }
            }
          },
          orderBy: { dayNumber: 'asc' }
        },
        licensee: { select: { id: true, name: true } }
      }
    })

    if (!sourceTemplate) {
      return { data: null, error: new Error('Source template not found') }
    }

    // Create the new template
    const newTemplate = await prisma.curriculumTemplate.create({
      data: {
        name: newName,
        sport: sourceTemplate.sport,
        description: sourceTemplate.description,
        ageMin: sourceTemplate.ageMin,
        ageMax: sourceTemplate.ageMax,
        difficulty: sourceTemplate.difficulty,
        totalDays: sourceTemplate.totalDays,
        licenseeId: licenseeId ?? sourceTemplate.licenseeId,
        isGlobal: false, // Duplicates are always non-global
        isPublished: false, // Duplicates start unpublished
        isActive: true,
        pdfUrl: sourceTemplate.pdfUrl,
        pdfName: sourceTemplate.pdfName,
        isPdfOnly: sourceTemplate.isPdfOnly,
        createdBy: sourceTemplate.createdBy,
      }
    })

    // Copy all days and their block assignments
    for (const day of sourceTemplate.days) {
      const newDay = await prisma.curriculumTemplateDay.create({
        data: {
          templateId: newTemplate.id,
          dayNumber: day.dayNumber,
          title: day.title,
          theme: day.theme,
          notes: day.notes,
          totalDurationMinutes: day.totalDurationMinutes,
        }
      })

      // Copy block assignments for this day
      if (day.dayBlocks.length > 0) {
        await prisma.curriculumDayBlock.createMany({
          data: day.dayBlocks.map(block => ({
            dayId: newDay.id,
            blockId: block.blockId,
            orderIndex: block.orderIndex,
            customTitle: block.customTitle,
            customDurationMinutes: block.customDurationMinutes,
            customNotes: block.customNotes,
            fieldLocation: block.fieldLocation,
          }))
        })
      }
    }

    // Fetch the complete new template
    const completeTemplate = await prisma.curriculumTemplate.findUnique({
      where: { id: newTemplate.id },
      include: {
        days: {
          include: {
            dayBlocks: {
              include: {
                block: true
              },
              orderBy: { orderIndex: 'asc' }
            }
          },
          orderBy: { dayNumber: 'asc' }
        },
        licensee: { select: { id: true, name: true } }
      }
    })

    if (!completeTemplate) {
      return { data: null, error: new Error('Failed to fetch duplicated template') }
    }

    // Map to expected format
    const result: CurriculumTemplate = {
      id: completeTemplate.id,
      licensee_id: completeTemplate.licenseeId,
      name: completeTemplate.name,
      sport: completeTemplate.sport as SportType,
      description: completeTemplate.description,
      age_min: completeTemplate.ageMin,
      age_max: completeTemplate.ageMax,
      difficulty: completeTemplate.difficulty as DifficultyLevel,
      total_days: completeTemplate.totalDays,
      is_global: completeTemplate.isGlobal,
      is_active: completeTemplate.isActive,
      is_published: completeTemplate.isPublished,
      pdf_url: completeTemplate.pdfUrl,
      pdf_name: completeTemplate.pdfName,
      is_pdf_only: completeTemplate.isPdfOnly,
      created_by: completeTemplate.createdBy,
      created_at: completeTemplate.createdAt.toISOString(),
      updated_at: completeTemplate.updatedAt.toISOString(),
      licensee_name: completeTemplate.licensee?.name || null,
      days: completeTemplate.days.map(d => ({
        id: d.id,
        template_id: d.templateId,
        day_number: d.dayNumber,
        title: d.title,
        theme: d.theme,
        notes: d.notes,
        total_duration_minutes: d.totalDurationMinutes,
        created_at: d.createdAt.toISOString(),
        updated_at: d.updatedAt.toISOString(),
        blocks: d.dayBlocks.map(db => ({
          id: db.id,
          day_id: db.dayId,
          block_id: db.blockId,
          order_index: db.orderIndex,
          custom_title: db.customTitle,
          custom_duration_minutes: db.customDurationMinutes,
          custom_notes: db.customNotes,
          field_location: db.fieldLocation,
          created_at: db.createdAt.toISOString(),
          updated_at: db.updatedAt.toISOString(),
          block: db.block ? {
            id: db.block.id,
            licensee_id: db.block.licenseeId,
            sport: db.block.sport as SportType,
            title: db.block.title,
            description: db.block.description,
            duration_minutes: db.block.durationMinutes,
            category: db.block.category as BlockCategory,
            intensity: db.block.intensity as IntensityLevel | null,
            equipment_needed: db.block.equipmentNeeded,
            setup_notes: db.block.setupNotes,
            coaching_points: db.block.coachingPoints,
            is_global: db.block.isGlobal,
            is_active: db.block.isActive,
            pdf_url: db.block.pdfUrl,
            pdf_name: db.block.pdfName,
            created_by: db.block.createdBy,
            created_at: db.block.createdAt.toISOString(),
            updated_at: db.block.updatedAt.toISOString(),
          } : undefined
        }))
      }))
    }

    return { data: result, error: null }
  } catch (err) {
    console.error('Error duplicating template:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================
// BLOCK QUERIES
// ============================================

export async function getBlocks(filters?: BlockFilters): Promise<{
  data: CurriculumBlock[] | null
  error: Error | null
}> {
  try {
    const where: Record<string, unknown> = { isActive: true }

    if (filters?.sport) {
      where.sport = filters.sport
    }
    if (filters?.category) {
      where.category = filters.category
    }
    if (filters?.scope === 'global') {
      where.isGlobal = true
    } else if (filters?.scope === 'licensee') {
      where.isGlobal = false
    }

    const blocks = await prisma.curriculumBlock.findMany({
      where,
      include: {
        licensee: { select: { id: true, name: true } },
      },
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
    })

    let result: CurriculumBlock[] = blocks.map(b => ({
      id: b.id,
      licensee_id: b.licenseeId,
      sport: b.sport as SportType,
      title: b.title,
      description: b.description,
      duration_minutes: b.durationMinutes,
      category: b.category as BlockCategory,
      intensity: b.intensity as IntensityLevel | null,
      equipment_needed: b.equipmentNeeded,
      setup_notes: b.setupNotes,
      coaching_points: b.coachingPoints,
      is_global: b.isGlobal,
      is_active: b.isActive,
      pdf_url: b.pdfUrl,
      pdf_name: b.pdfName,
      created_by: b.createdBy,
      created_at: b.createdAt.toISOString(),
      updated_at: b.updatedAt.toISOString(),
      licensee_name: b.licensee?.name || null,
    }))

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(b =>
        b.title.toLowerCase().includes(searchLower) ||
        b.description?.toLowerCase().includes(searchLower)
      )
    }

    return { data: result, error: null }
  } catch (err) {
    console.error('Error fetching blocks:', err)
    return { data: null, error: err as Error }
  }
}

export async function getBlockById(id: string): Promise<{
  data: CurriculumBlock | null
  error: Error | null
}> {
  try {
    const block = await prisma.curriculumBlock.findUnique({
      where: { id },
      include: {
        licensee: { select: { id: true, name: true } },
      },
    })

    if (!block) {
      return { data: null, error: null }
    }

    return {
      data: {
        id: block.id,
        licensee_id: block.licenseeId,
        sport: block.sport as SportType,
        title: block.title,
        description: block.description,
        duration_minutes: block.durationMinutes,
        category: block.category as BlockCategory,
        intensity: block.intensity as IntensityLevel | null,
        equipment_needed: block.equipmentNeeded,
        setup_notes: block.setupNotes,
        coaching_points: block.coachingPoints,
        is_global: block.isGlobal,
        is_active: block.isActive,
        pdf_url: block.pdfUrl,
        pdf_name: block.pdfName,
        created_by: block.createdBy,
        created_at: block.createdAt.toISOString(),
        updated_at: block.updatedAt.toISOString(),
        licensee_name: block.licensee?.name || null,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

export interface CreateBlockInput {
  licensee_id?: string | null
  sport: SportType
  title: string
  description?: string
  duration_minutes: number
  category: BlockCategory
  intensity?: IntensityLevel
  equipment_needed?: string
  setup_notes?: string
  coaching_points?: string
  is_global?: boolean
  // PDF Support
  pdf_url?: string | null
  pdf_name?: string | null
}

export async function createBlock(input: CreateBlockInput, userId?: string): Promise<{
  data: CurriculumBlock | null
  error: Error | null
}> {
  try {
    const block = await prisma.curriculumBlock.create({
      data: {
        licenseeId: input.licensee_id || null,
        sport: input.sport,
        title: input.title,
        description: input.description || null,
        durationMinutes: input.duration_minutes,
        category: input.category,
        intensity: input.intensity || 'moderate',
        equipmentNeeded: input.equipment_needed || null,
        setupNotes: input.setup_notes || null,
        coachingPoints: input.coaching_points || null,
        isGlobal: input.is_global || false,
        pdfUrl: input.pdf_url || null,
        pdfName: input.pdf_name || null,
        createdBy: userId || null,
      },
    })

    return {
      data: {
        id: block.id,
        licensee_id: block.licenseeId,
        sport: block.sport as SportType,
        title: block.title,
        description: block.description,
        duration_minutes: block.durationMinutes,
        category: block.category as BlockCategory,
        intensity: block.intensity as IntensityLevel | null,
        equipment_needed: block.equipmentNeeded,
        setup_notes: block.setupNotes,
        coaching_points: block.coachingPoints,
        is_global: block.isGlobal,
        is_active: block.isActive,
        pdf_url: block.pdfUrl,
        pdf_name: block.pdfName,
        created_by: block.createdBy,
        created_at: block.createdAt.toISOString(),
        updated_at: block.updatedAt.toISOString(),
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

export async function updateBlock(
  id: string,
  input: Partial<CreateBlockInput>
): Promise<{
  data: CurriculumBlock | null
  error: Error | null
}> {
  try {
    const updates: Record<string, unknown> = {}
    if (input.title !== undefined) updates.title = input.title
    if (input.description !== undefined) updates.description = input.description
    if (input.sport !== undefined) updates.sport = input.sport
    if (input.duration_minutes !== undefined) updates.durationMinutes = input.duration_minutes
    if (input.category !== undefined) updates.category = input.category
    if (input.intensity !== undefined) updates.intensity = input.intensity
    if (input.equipment_needed !== undefined) updates.equipmentNeeded = input.equipment_needed
    if (input.setup_notes !== undefined) updates.setupNotes = input.setup_notes
    if (input.coaching_points !== undefined) updates.coachingPoints = input.coaching_points
    if (input.is_global !== undefined) updates.isGlobal = input.is_global
    if (input.pdf_url !== undefined) updates.pdfUrl = input.pdf_url
    if (input.pdf_name !== undefined) updates.pdfName = input.pdf_name

    const block = await prisma.curriculumBlock.update({
      where: { id },
      data: updates,
    })

    return {
      data: {
        id: block.id,
        licensee_id: block.licenseeId,
        sport: block.sport as SportType,
        title: block.title,
        description: block.description,
        duration_minutes: block.durationMinutes,
        category: block.category as BlockCategory,
        intensity: block.intensity as IntensityLevel | null,
        equipment_needed: block.equipmentNeeded,
        setup_notes: block.setupNotes,
        coaching_points: block.coachingPoints,
        is_global: block.isGlobal,
        is_active: block.isActive,
        pdf_url: block.pdfUrl,
        pdf_name: block.pdfName,
        created_by: block.createdBy,
        created_at: block.createdAt.toISOString(),
        updated_at: block.updatedAt.toISOString(),
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

export async function deleteBlock(id: string): Promise<{
  success: boolean
  error: Error | null
}> {
  try {
    await prisma.curriculumBlock.update({
      where: { id },
      data: { isActive: false },
    })
    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: err as Error }
  }
}

// ============================================
// TEMPLATE DAY QUERIES
// ============================================

export async function addTemplateDay(input: {
  template_id: string
  day_number: number
  title: string
  theme?: string
  notes?: string
}): Promise<{
  data: CurriculumTemplateDay | null
  error: Error | null
}> {
  try {
    const day = await prisma.curriculumTemplateDay.create({
      data: {
        templateId: input.template_id,
        dayNumber: input.day_number,
        title: input.title,
        theme: input.theme || null,
        notes: input.notes || null,
      },
    })

    // Update template's total_days count
    await prisma.curriculumTemplate.updateMany({
      where: { id: input.template_id, totalDays: { lt: input.day_number } },
      data: { totalDays: input.day_number },
    })

    return {
      data: {
        id: day.id,
        template_id: day.templateId,
        day_number: day.dayNumber,
        title: day.title,
        theme: day.theme,
        notes: day.notes,
        total_duration_minutes: day.totalDurationMinutes,
        created_at: day.createdAt.toISOString(),
        updated_at: day.updatedAt.toISOString(),
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

export async function updateTemplateDay(
  id: string,
  input: { title?: string; theme?: string; notes?: string }
): Promise<{
  data: CurriculumTemplateDay | null
  error: Error | null
}> {
  try {
    const day = await prisma.curriculumTemplateDay.update({
      where: { id },
      data: input,
    })

    return {
      data: {
        id: day.id,
        template_id: day.templateId,
        day_number: day.dayNumber,
        title: day.title,
        theme: day.theme,
        notes: day.notes,
        total_duration_minutes: day.totalDurationMinutes,
        created_at: day.createdAt.toISOString(),
        updated_at: day.updatedAt.toISOString(),
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

export async function deleteTemplateDay(id: string): Promise<{
  success: boolean
  error: Error | null
}> {
  try {
    await prisma.curriculumTemplateDay.delete({ where: { id } })
    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: err as Error }
  }
}

// ============================================
// DAY BLOCK QUERIES
// ============================================

export async function addBlockToDay(input: {
  day_id: string
  block_id: string
  order_index: number
  custom_notes?: string
  field_location?: string
}): Promise<{
  data: CurriculumDayBlock | null
  error: Error | null
}> {
  try {
    const dayBlock = await prisma.curriculumDayBlock.create({
      data: {
        dayId: input.day_id,
        blockId: input.block_id,
        orderIndex: input.order_index,
        customNotes: input.custom_notes || null,
        fieldLocation: input.field_location || null,
      },
      include: { block: true },
    })

    return {
      data: {
        id: dayBlock.id,
        day_id: dayBlock.dayId,
        block_id: dayBlock.blockId,
        order_index: dayBlock.orderIndex,
        custom_title: dayBlock.customTitle,
        custom_duration_minutes: dayBlock.customDurationMinutes,
        custom_notes: dayBlock.customNotes,
        field_location: dayBlock.fieldLocation,
        created_at: dayBlock.createdAt.toISOString(),
        updated_at: dayBlock.updatedAt.toISOString(),
        block: dayBlock.block ? {
          id: dayBlock.block.id,
          licensee_id: dayBlock.block.licenseeId,
          sport: dayBlock.block.sport as SportType,
          title: dayBlock.block.title,
          description: dayBlock.block.description,
          duration_minutes: dayBlock.block.durationMinutes,
          category: dayBlock.block.category as BlockCategory,
          intensity: dayBlock.block.intensity as IntensityLevel | null,
          equipment_needed: dayBlock.block.equipmentNeeded,
          setup_notes: dayBlock.block.setupNotes,
          coaching_points: dayBlock.block.coachingPoints,
          is_global: dayBlock.block.isGlobal,
          is_active: dayBlock.block.isActive,
          pdf_url: dayBlock.block.pdfUrl,
          pdf_name: dayBlock.block.pdfName,
          created_by: dayBlock.block.createdBy,
          created_at: dayBlock.block.createdAt.toISOString(),
          updated_at: dayBlock.block.updatedAt.toISOString(),
        } : undefined,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

export async function updateDayBlock(
  id: string,
  input: {
    order_index?: number
    custom_title?: string
    custom_duration_minutes?: number
    custom_notes?: string
    field_location?: string
  }
): Promise<{
  data: CurriculumDayBlock | null
  error: Error | null
}> {
  try {
    const updates: Record<string, unknown> = {}
    if (input.order_index !== undefined) updates.orderIndex = input.order_index
    if (input.custom_title !== undefined) updates.customTitle = input.custom_title
    if (input.custom_duration_minutes !== undefined) updates.customDurationMinutes = input.custom_duration_minutes
    if (input.custom_notes !== undefined) updates.customNotes = input.custom_notes
    if (input.field_location !== undefined) updates.fieldLocation = input.field_location

    const dayBlock = await prisma.curriculumDayBlock.update({
      where: { id },
      data: updates,
      include: { block: true },
    })

    return {
      data: {
        id: dayBlock.id,
        day_id: dayBlock.dayId,
        block_id: dayBlock.blockId,
        order_index: dayBlock.orderIndex,
        custom_title: dayBlock.customTitle,
        custom_duration_minutes: dayBlock.customDurationMinutes,
        custom_notes: dayBlock.customNotes,
        field_location: dayBlock.fieldLocation,
        created_at: dayBlock.createdAt.toISOString(),
        updated_at: dayBlock.updatedAt.toISOString(),
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

export async function removeBlockFromDay(id: string): Promise<{
  success: boolean
  error: Error | null
}> {
  try {
    await prisma.curriculumDayBlock.delete({ where: { id } })
    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: err as Error }
  }
}

export async function reorderDayBlocks(
  dayId: string,
  blockOrder: { id: string; order_index: number }[]
): Promise<{
  success: boolean
  error: Error | null
}> {
  try {
    for (const item of blockOrder) {
      await prisma.curriculumDayBlock.update({
        where: { id: item.id },
        data: { orderIndex: item.order_index },
      })
    }
    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: err as Error }
  }
}

// ============================================
// ASSIGNMENT QUERIES
// ============================================

export async function getCurriculumAssignments(): Promise<{
  data: CampSessionCurriculum[] | null
  error: Error | null
}> {
  try {
    const assignments = await prisma.campSessionCurriculum.findMany({
      include: {
        camp: {
          select: { id: true, name: true, programType: true, sportsOffered: true, startDate: true, endDate: true, tenantId: true },
        },
        template: {
          select: { id: true, name: true, sport: true, difficulty: true, ageMin: true, ageMax: true },
        },
      },
      orderBy: { assignedAt: 'desc' },
    })

    return {
      data: assignments.map(a => ({
        id: a.id,
        camp_id: a.campId,
        template_id: a.templateId,
        assigned_by: a.assignedBy,
        assigned_at: a.assignedAt.toISOString(),
        notes: a.notes,
        camp: a.camp ? {
          id: a.camp.id,
          name: a.camp.name,
          sport: a.camp.sportsOffered?.[0] || a.camp.programType || '',
          start_date: a.camp.startDate.toISOString().split('T')[0],
          end_date: a.camp.endDate.toISOString().split('T')[0],
          tenant_id: a.camp.tenantId,
        } : undefined,
        template: a.template ? {
          id: a.template.id,
          licensee_id: null,
          sport: a.template.sport as SportType,
          name: a.template.name,
          description: null,
          age_min: a.template.ageMin,
          age_max: a.template.ageMax,
          difficulty: a.template.difficulty as DifficultyLevel,
          is_global: false,
          total_days: 0,
          is_active: true,
          is_published: true,
          pdf_url: null,
          pdf_name: null,
          is_pdf_only: false,
          created_by: null,
          created_at: '',
          updated_at: '',
        } : undefined,
      })),
      error: null,
    }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

export async function assignTemplateToCamp(input: {
  camp_id: string
  template_id: string
  notes?: string
}, userId?: string): Promise<{
  data: CampSessionCurriculum | null
  error: Error | null
}> {
  try {
    const assignment = await prisma.campSessionCurriculum.upsert({
      where: { campId: input.camp_id },
      update: {
        templateId: input.template_id,
        assignedBy: userId || null,
        assignedAt: new Date(),
        notes: input.notes || null,
      },
      create: {
        campId: input.camp_id,
        templateId: input.template_id,
        assignedBy: userId || null,
        notes: input.notes || null,
      },
      include: { template: true },
    })

    return {
      data: {
        id: assignment.id,
        camp_id: assignment.campId,
        template_id: assignment.templateId,
        assigned_by: assignment.assignedBy,
        assigned_at: assignment.assignedAt.toISOString(),
        notes: assignment.notes,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

export async function unassignTemplateFromCamp(campId: string): Promise<{
  success: boolean
  error: Error | null
}> {
  try {
    await prisma.campSessionCurriculum.delete({ where: { campId } })
    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: err as Error }
  }
}

export async function getCampCurriculum(campId: string): Promise<{
  data: CurriculumTemplate | null
  error: Error | null
}> {
  try {
    const assignment = await prisma.campSessionCurriculum.findUnique({
      where: { campId },
      select: { templateId: true },
    })

    if (!assignment) {
      return { data: null, error: null }
    }

    return getTemplateById(assignment.templateId)
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

export async function getCampsForAssignment(): Promise<{
  data: Array<{
    id: string
    name: string
    sport: string
    start_date: string
    end_date: string
    tenant_id: string | null
    assigned_template_id?: string
    assigned_template_name?: string
  }> | null
  error: Error | null
}> {
  try {
    const camps = await prisma.camp.findMany({
      where: { endDate: { gte: new Date() } },
      select: {
        id: true,
        name: true,
        programType: true,
        sportsOffered: true,
        startDate: true,
        endDate: true,
        tenantId: true,
        campSessionCurriculum: {
          select: {
            template: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { startDate: 'asc' },
    })

    return {
      data: camps.map(c => ({
        id: c.id,
        name: c.name,
        sport: c.sportsOffered?.[0] || c.programType || '',
        start_date: c.startDate.toISOString().split('T')[0],
        end_date: c.endDate.toISOString().split('T')[0],
        tenant_id: c.tenantId,
        assigned_template_id: c.campSessionCurriculum?.template?.id,
        assigned_template_name: c.campSessionCurriculum?.template?.name,
      })),
      error: null,
    }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}
