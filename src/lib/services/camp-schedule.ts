/**
 * Camp Schedule Service (Prisma)
 *
 * Handles camp day-by-day scheduling and curriculum assignment.
 */

import prisma from '@/lib/db/client'
import { SessionDayStatus } from '@/generated/prisma'

// ============================================
// TYPES
// ============================================

export interface CampSessionDay {
  id: string
  camp_id: string
  day_number: number
  actual_date: string | null
  title: string
  theme: string | null
  notes: string | null
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
  schedule_blocks?: ScheduleBlock[]
}

export interface ScheduleBlock {
  id: string
  camp_session_day_id: string
  start_time: string
  end_time: string
  label: string
  description: string | null
  curriculum_block_id: string | null
  location: string | null
  assigned_staff_notes: string | null
  order_index: number
  block_type: BlockType
  color_code: string | null
  created_at: string
  updated_at: string
  curriculum_block?: {
    id: string
    title: string
    description: string | null
    duration_minutes: number
    category: string
    sport: string
  } | null
}

export type BlockType =
  | 'activity'
  | 'transition'
  | 'break'
  | 'meal'
  | 'arrival'
  | 'departure'
  | 'special'
  | 'curriculum'

export interface ScheduleTemplate {
  id: string
  licensee_id: string | null
  name: string
  description: string | null
  default_start_time: string
  default_end_time: string
  total_days: number
  sport: string | null
  is_global: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  blocks?: ScheduleTemplateBlock[]
}

export interface ScheduleTemplateBlock {
  id: string
  template_id: string
  day_number: number
  start_time: string
  end_time: string
  label: string
  description: string | null
  default_location: string | null
  block_type: BlockType
  order_index: number
}

export interface CampCurriculumAssignment {
  id: string
  camp_id: string
  template_id: string
  assigned_by: string | null
  assigned_at: string
  notes: string | null
  template?: {
    id: string
    name: string
    sport: string
    age_min: number | null
    age_max: number | null
    total_days: number
    days?: Array<{
      id: string
      day_number: number
      title: string
      theme: string | null
      blocks?: Array<{
        id: string
        order_index: number
        block: {
          id: string
          title: string
          duration_minutes: number
          category: string
        }
      }>
    }>
  }
}

// Block type configuration for UI
export const BLOCK_TYPES: Array<{
  value: BlockType
  label: string
  color: string
  icon: string
}> = [
  { value: 'arrival', label: 'Arrival/Check-in', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: 'LogIn' },
  { value: 'activity', label: 'Activity', color: 'bg-neon/20 text-neon border-neon/30', icon: 'Zap' },
  { value: 'curriculum', label: 'Curriculum Block', color: 'bg-purple/20 text-purple border-purple/30', icon: 'BookOpen' },
  { value: 'break', label: 'Break', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: 'Coffee' },
  { value: 'meal', label: 'Meal', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: 'Utensils' },
  { value: 'transition', label: 'Transition', color: 'bg-white/10 text-white/60 border-white/20', icon: 'ArrowRight' },
  { value: 'special', label: 'Special Event', color: 'bg-magenta/20 text-magenta border-magenta/30', icon: 'Star' },
  { value: 'departure', label: 'Departure', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: 'LogOut' },
]

// ============================================
// CAMP SESSION DAYS
// ============================================

export async function getCampDays(campId: string): Promise<{
  data: CampSessionDay[] | null
  error: Error | null
}> {
  try {
    const days = await prisma.campSessionDay.findMany({
      where: { campId },
      include: {
        scheduleBlocks: {
          include: {
            curriculumBlock: {
              select: { id: true, title: true, description: true, durationMinutes: true, category: true, sport: true },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { dayNumber: 'asc' },
    })

    return {
      data: days.map(d => ({
        id: d.id,
        camp_id: d.campId,
        day_number: d.dayNumber,
        actual_date: d.actualDate?.toISOString().split('T')[0] || null,
        title: d.title,
        theme: d.theme,
        notes: d.notes,
        status: d.status as CampSessionDay['status'],
        created_at: d.createdAt.toISOString(),
        updated_at: d.updatedAt.toISOString(),
        schedule_blocks: d.scheduleBlocks.map(sb => ({
          id: sb.id,
          camp_session_day_id: sb.campSessionDayId,
          start_time: sb.startTime.toISOString().slice(11, 16),
          end_time: sb.endTime.toISOString().slice(11, 16),
          label: sb.label,
          description: sb.description,
          curriculum_block_id: sb.curriculumBlockId,
          location: sb.location,
          assigned_staff_notes: sb.assignedStaffNotes,
          order_index: sb.orderIndex,
          block_type: sb.blockType as BlockType,
          color_code: sb.colorCode,
          created_at: sb.createdAt.toISOString(),
          updated_at: sb.updatedAt.toISOString(),
          curriculum_block: sb.curriculumBlock ? {
            id: sb.curriculumBlock.id,
            title: sb.curriculumBlock.title,
            description: sb.curriculumBlock.description,
            duration_minutes: sb.curriculumBlock.durationMinutes,
            category: sb.curriculumBlock.category,
            sport: sb.curriculumBlock.sport,
          } : null,
        })),
      })),
      error: null,
    }
  } catch (err) {
    return { data: null, error: new Error((err as Error).message) }
  }
}

export async function createCampDays(
  campId: string,
  startDate: string,
  endDate: string
): Promise<{ data: CampSessionDay[] | null; error: Error | null }> {
  try {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const days = []
    for (let i = 0; i < dayCount; i++) {
      const date = new Date(start)
      date.setDate(date.getDate() + i)
      days.push({
        campId,
        dayNumber: i + 1,
        actualDate: date,
        title: `Day ${i + 1}`,
        status: 'planned' as SessionDayStatus,
      })
    }

    // Use upsert logic
    const results = []
    for (const day of days) {
      const existing = await prisma.campSessionDay.findFirst({
        where: { campId: day.campId, dayNumber: day.dayNumber },
      })

      if (existing) {
        const updated = await prisma.campSessionDay.update({
          where: { id: existing.id },
          data: { actualDate: day.actualDate, title: day.title },
        })
        results.push(updated)
      } else {
        const created = await prisma.campSessionDay.create({ data: day })
        results.push(created)
      }
    }

    return {
      data: results.map(d => ({
        id: d.id,
        camp_id: d.campId,
        day_number: d.dayNumber,
        actual_date: d.actualDate?.toISOString().split('T')[0] || null,
        title: d.title,
        theme: d.theme,
        notes: d.notes,
        status: d.status as CampSessionDay['status'],
        created_at: d.createdAt.toISOString(),
        updated_at: d.updatedAt.toISOString(),
      })),
      error: null,
    }
  } catch (err) {
    return { data: null, error: new Error((err as Error).message) }
  }
}

export async function updateCampDay(
  dayId: string,
  updates: Partial<Pick<CampSessionDay, 'title' | 'theme' | 'notes' | 'status'>>
): Promise<{ data: CampSessionDay | null; error: Error | null }> {
  try {
    const day = await prisma.campSessionDay.update({
      where: { id: dayId },
      data: updates,
    })

    return {
      data: {
        id: day.id,
        camp_id: day.campId,
        day_number: day.dayNumber,
        actual_date: day.actualDate?.toISOString().split('T')[0] || null,
        title: day.title,
        theme: day.theme,
        notes: day.notes,
        status: day.status as CampSessionDay['status'],
        created_at: day.createdAt.toISOString(),
        updated_at: day.updatedAt.toISOString(),
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: new Error((err as Error).message) }
  }
}

export async function deleteCampDays(campId: string): Promise<{ error: Error | null }> {
  try {
    await prisma.campSessionDay.deleteMany({ where: { campId } })
    return { error: null }
  } catch (err) {
    return { error: new Error((err as Error).message) }
  }
}

// ============================================
// SCHEDULE BLOCKS
// ============================================

export async function getScheduleBlocks(dayId: string): Promise<{
  data: ScheduleBlock[] | null
  error: Error | null
}> {
  try {
    const blocks = await prisma.campSessionScheduleBlock.findMany({
      where: { campSessionDayId: dayId },
      include: {
        curriculumBlock: {
          select: { id: true, title: true, description: true, durationMinutes: true, category: true, sport: true },
        },
      },
      orderBy: { orderIndex: 'asc' },
    })

    return {
      data: blocks.map(sb => ({
        id: sb.id,
        camp_session_day_id: sb.campSessionDayId,
        start_time: sb.startTime.toISOString().slice(11, 16),
        end_time: sb.endTime.toISOString().slice(11, 16),
        label: sb.label,
        description: sb.description,
        curriculum_block_id: sb.curriculumBlockId,
        location: sb.location,
        assigned_staff_notes: sb.assignedStaffNotes,
        order_index: sb.orderIndex,
        block_type: sb.blockType as BlockType,
        color_code: sb.colorCode,
        created_at: sb.createdAt.toISOString(),
        updated_at: sb.updatedAt.toISOString(),
        curriculum_block: sb.curriculumBlock ? {
          id: sb.curriculumBlock.id,
          title: sb.curriculumBlock.title,
          description: sb.curriculumBlock.description,
          duration_minutes: sb.curriculumBlock.durationMinutes,
          category: sb.curriculumBlock.category,
          sport: sb.curriculumBlock.sport,
        } : null,
      })),
      error: null,
    }
  } catch (err) {
    return { data: null, error: new Error((err as Error).message) }
  }
}

export async function createScheduleBlock(block: {
  camp_session_day_id: string
  start_time: string
  end_time: string
  label: string
  description?: string
  curriculum_block_id?: string
  location?: string
  block_type?: BlockType
  order_index?: number
}): Promise<{ data: ScheduleBlock | null; error: Error | null }> {
  try {
    let orderIndex = block.order_index
    if (orderIndex === undefined) {
      const existing = await prisma.campSessionScheduleBlock.findFirst({
        where: { campSessionDayId: block.camp_session_day_id },
        orderBy: { orderIndex: 'desc' },
      })
      orderIndex = existing ? existing.orderIndex + 1 : 0
    }

    const sb = await prisma.campSessionScheduleBlock.create({
      data: {
        campSessionDayId: block.camp_session_day_id,
        startTime: block.start_time,
        endTime: block.end_time,
        label: block.label,
        description: block.description || null,
        curriculumBlockId: block.curriculum_block_id || null,
        location: block.location || null,
        blockType: block.block_type || 'activity',
        orderIndex,
      },
      include: {
        curriculumBlock: {
          select: { id: true, title: true, description: true, durationMinutes: true, category: true, sport: true },
        },
      },
    })

    return {
      data: {
        id: sb.id,
        camp_session_day_id: sb.campSessionDayId,
        start_time: sb.startTime.toISOString().slice(11, 16),
        end_time: sb.endTime.toISOString().slice(11, 16),
        label: sb.label,
        description: sb.description,
        curriculum_block_id: sb.curriculumBlockId,
        location: sb.location,
        assigned_staff_notes: sb.assignedStaffNotes,
        order_index: sb.orderIndex,
        block_type: sb.blockType as BlockType,
        color_code: sb.colorCode,
        created_at: sb.createdAt.toISOString(),
        updated_at: sb.updatedAt.toISOString(),
        curriculum_block: sb.curriculumBlock ? {
          id: sb.curriculumBlock.id,
          title: sb.curriculumBlock.title,
          description: sb.curriculumBlock.description,
          duration_minutes: sb.curriculumBlock.durationMinutes,
          category: sb.curriculumBlock.category,
          sport: sb.curriculumBlock.sport,
        } : null,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: new Error((err as Error).message) }
  }
}

export async function updateScheduleBlock(
  blockId: string,
  updates: Partial<Omit<ScheduleBlock, 'id' | 'created_at' | 'updated_at' | 'curriculum_block'>>
): Promise<{ data: ScheduleBlock | null; error: Error | null }> {
  try {
    const data: Record<string, unknown> = {}
    if (updates.start_time !== undefined) data.startTime = updates.start_time
    if (updates.end_time !== undefined) data.endTime = updates.end_time
    if (updates.label !== undefined) data.label = updates.label
    if (updates.description !== undefined) data.description = updates.description
    if (updates.curriculum_block_id !== undefined) data.curriculumBlockId = updates.curriculum_block_id
    if (updates.location !== undefined) data.location = updates.location
    if (updates.block_type !== undefined) data.blockType = updates.block_type
    if (updates.order_index !== undefined) data.orderIndex = updates.order_index

    const sb = await prisma.campSessionScheduleBlock.update({
      where: { id: blockId },
      data,
      include: {
        curriculumBlock: {
          select: { id: true, title: true, description: true, durationMinutes: true, category: true, sport: true },
        },
      },
    })

    return {
      data: {
        id: sb.id,
        camp_session_day_id: sb.campSessionDayId,
        start_time: sb.startTime.toISOString().slice(11, 16),
        end_time: sb.endTime.toISOString().slice(11, 16),
        label: sb.label,
        description: sb.description,
        curriculum_block_id: sb.curriculumBlockId,
        location: sb.location,
        assigned_staff_notes: sb.assignedStaffNotes,
        order_index: sb.orderIndex,
        block_type: sb.blockType as BlockType,
        color_code: sb.colorCode,
        created_at: sb.createdAt.toISOString(),
        updated_at: sb.updatedAt.toISOString(),
        curriculum_block: sb.curriculumBlock ? {
          id: sb.curriculumBlock.id,
          title: sb.curriculumBlock.title,
          description: sb.curriculumBlock.description,
          duration_minutes: sb.curriculumBlock.durationMinutes,
          category: sb.curriculumBlock.category,
          sport: sb.curriculumBlock.sport,
        } : null,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: new Error((err as Error).message) }
  }
}

export async function deleteScheduleBlock(blockId: string): Promise<{ error: Error | null }> {
  try {
    await prisma.campSessionScheduleBlock.delete({ where: { id: blockId } })
    return { error: null }
  } catch (err) {
    return { error: new Error((err as Error).message) }
  }
}

export async function reorderScheduleBlocks(
  dayId: string,
  orderedBlockIds: string[]
): Promise<{ error: Error | null }> {
  try {
    for (let i = 0; i < orderedBlockIds.length; i++) {
      await prisma.campSessionScheduleBlock.update({
        where: { id: orderedBlockIds[i] },
        data: { orderIndex: i },
      })
    }
    return { error: null }
  } catch (err) {
    return { error: new Error((err as Error).message) }
  }
}

export async function linkCurriculumBlock(
  scheduleBlockId: string,
  curriculumBlockId: string | null
): Promise<{ data: ScheduleBlock | null; error: Error | null }> {
  return updateScheduleBlock(scheduleBlockId, {
    curriculum_block_id: curriculumBlockId,
    block_type: curriculumBlockId ? 'curriculum' : 'activity',
  })
}

// ============================================
// SCHEDULE TEMPLATES
// ============================================

export async function getScheduleTemplates(): Promise<{
  data: ScheduleTemplate[] | null
  error: Error | null
}> {
  try {
    const templates = await prisma.scheduleTemplate.findMany({
      where: { isActive: true },
      include: {
        blocks: { orderBy: [{ dayNumber: 'asc' }, { orderIndex: 'asc' }] },
      },
      orderBy: [{ isGlobal: 'desc' }, { name: 'asc' }],
    })

    return {
      data: templates.map(t => ({
        id: t.id,
        licensee_id: t.licenseeId,
        name: t.name,
        description: t.description,
        default_start_time: t.defaultStartTime.toISOString().slice(11, 16),
        default_end_time: t.defaultEndTime.toISOString().slice(11, 16),
        total_days: t.totalDays,
        sport: t.sport,
        is_global: t.isGlobal,
        is_active: t.isActive,
        created_at: t.createdAt.toISOString(),
        updated_at: t.updatedAt.toISOString(),
        blocks: t.blocks.map(b => ({
          id: b.id,
          template_id: b.templateId,
          day_number: b.dayNumber,
          start_time: b.startTime.toISOString().slice(11, 16),
          end_time: b.endTime.toISOString().slice(11, 16),
          label: b.label,
          description: b.description,
          default_location: b.defaultLocation,
          block_type: b.blockType as BlockType,
          order_index: b.orderIndex,
        })),
      })),
      error: null,
    }
  } catch (err) {
    return { data: null, error: new Error((err as Error).message) }
  }
}

export async function applyScheduleTemplate(
  dayId: string,
  templateId: string,
  dayNumber: number = 1
): Promise<{ data: ScheduleBlock[] | null; error: Error | null }> {
  try {
    let templateBlocks = await prisma.scheduleTemplateBlock.findMany({
      where: { templateId, dayNumber },
      orderBy: { orderIndex: 'asc' },
    })

    if (!templateBlocks.length) {
      templateBlocks = await prisma.scheduleTemplateBlock.findMany({
        where: { templateId, dayNumber: 1 },
        orderBy: { orderIndex: 'asc' },
      })
    }

    if (!templateBlocks.length) {
      return { data: null, error: new Error('No template blocks found') }
    }

    const newBlocks = await Promise.all(
      templateBlocks.map((tb, index) =>
        prisma.campSessionScheduleBlock.create({
          data: {
            campSessionDayId: dayId,
            startTime: tb.startTime,
            endTime: tb.endTime,
            label: tb.label,
            description: tb.description,
            location: tb.defaultLocation,
            blockType: tb.blockType,
            orderIndex: index,
          },
        })
      )
    )

    return {
      data: newBlocks.map(sb => ({
        id: sb.id,
        camp_session_day_id: sb.campSessionDayId,
        start_time: sb.startTime.toISOString().slice(11, 16),
        end_time: sb.endTime.toISOString().slice(11, 16),
        label: sb.label,
        description: sb.description,
        curriculum_block_id: sb.curriculumBlockId,
        location: sb.location,
        assigned_staff_notes: sb.assignedStaffNotes,
        order_index: sb.orderIndex,
        block_type: sb.blockType as BlockType,
        color_code: sb.colorCode,
        created_at: sb.createdAt.toISOString(),
        updated_at: sb.updatedAt.toISOString(),
        curriculum_block: null,
      })),
      error: null,
    }
  } catch (err) {
    return { data: null, error: new Error((err as Error).message) }
  }
}

export async function clearDaySchedule(dayId: string): Promise<{ error: Error | null }> {
  try {
    await prisma.campSessionScheduleBlock.deleteMany({ where: { campSessionDayId: dayId } })
    return { error: null }
  } catch (err) {
    return { error: new Error((err as Error).message) }
  }
}

// ============================================
// CURRICULUM ASSIGNMENT
// ============================================

export async function getCampCurriculumAssignment(campId: string): Promise<{
  data: CampCurriculumAssignment | null
  error: Error | null
}> {
  try {
    const assignment = await prisma.campSessionCurriculum.findUnique({
      where: { campId },
      include: {
        template: {
          include: {
            days: {
              include: {
                dayBlocks: {
                  include: {
                    block: { select: { id: true, title: true, durationMinutes: true, category: true } },
                  },
                  orderBy: { orderIndex: 'asc' },
                },
              },
              orderBy: { dayNumber: 'asc' },
            },
          },
        },
      },
    })

    if (!assignment) {
      return { data: null, error: null }
    }

    return {
      data: {
        id: assignment.id,
        camp_id: assignment.campId,
        template_id: assignment.templateId,
        assigned_by: assignment.assignedBy,
        assigned_at: assignment.assignedAt.toISOString(),
        notes: assignment.notes,
        template: assignment.template ? {
          id: assignment.template.id,
          name: assignment.template.name,
          sport: assignment.template.sport,
          age_min: assignment.template.ageMin,
          age_max: assignment.template.ageMax,
          total_days: assignment.template.totalDays,
          days: assignment.template.days.map(d => ({
            id: d.id,
            day_number: d.dayNumber,
            title: d.title,
            theme: d.theme,
            blocks: d.dayBlocks.map(db => ({
              id: db.id,
              order_index: db.orderIndex,
              block: {
                id: db.block.id,
                title: db.block.title,
                duration_minutes: db.block.durationMinutes,
                category: db.block.category,
              },
            })),
          })),
        } : undefined,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: new Error((err as Error).message) }
  }
}

export async function assignCurriculumTemplate(
  campId: string,
  templateId: string,
  userId?: string
): Promise<{ data: CampCurriculumAssignment | null; error: Error | null }> {
  try {
    const assignment = await prisma.campSessionCurriculum.upsert({
      where: { campId },
      update: {
        templateId,
        assignedBy: userId || null,
        assignedAt: new Date(),
      },
      create: {
        campId,
        templateId,
        assignedBy: userId || null,
      },
      include: {
        template: { select: { id: true, name: true, sport: true, ageMin: true, ageMax: true, totalDays: true } },
      },
    })

    return {
      data: {
        id: assignment.id,
        camp_id: assignment.campId,
        template_id: assignment.templateId,
        assigned_by: assignment.assignedBy,
        assigned_at: assignment.assignedAt.toISOString(),
        notes: assignment.notes,
        template: assignment.template ? {
          id: assignment.template.id,
          name: assignment.template.name,
          sport: assignment.template.sport,
          age_min: assignment.template.ageMin,
          age_max: assignment.template.ageMax,
          total_days: assignment.template.totalDays,
        } : undefined,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: new Error((err as Error).message) }
  }
}

export async function unassignCurriculumTemplate(campId: string): Promise<{ error: Error | null }> {
  try {
    await prisma.campSessionCurriculum.delete({ where: { campId } })
    return { error: null }
  } catch (err) {
    return { error: new Error((err as Error).message) }
  }
}

export async function getAvailableCurriculumBlocks(
  campId: string,
  dayNumber: number
): Promise<{
  data: Array<{
    id: string
    title: string
    description: string | null
    duration_minutes: number
    category: string
    sport: string
  }> | null
  error: Error | null
}> {
  try {
    const assignment = await prisma.campSessionCurriculum.findUnique({
      where: { campId },
      select: { templateId: true },
    })

    if (!assignment) {
      // Return all global blocks as fallback
      const globalBlocks = await prisma.curriculumBlock.findMany({
        where: { isGlobal: true, isActive: true },
        select: { id: true, title: true, description: true, durationMinutes: true, category: true, sport: true },
        orderBy: [{ category: 'asc' }, { title: 'asc' }],
      })

      return {
        data: globalBlocks.map(b => ({
          id: b.id,
          title: b.title,
          description: b.description,
          duration_minutes: b.durationMinutes,
          category: b.category,
          sport: b.sport,
        })),
        error: null,
      }
    }

    const templateDay = await prisma.curriculumTemplateDay.findFirst({
      where: { templateId: assignment.templateId, dayNumber },
    })

    if (!templateDay) {
      // Return all blocks
      const allBlocks = await prisma.curriculumBlock.findMany({
        where: { isActive: true },
        select: { id: true, title: true, description: true, durationMinutes: true, category: true, sport: true },
        orderBy: [{ category: 'asc' }, { title: 'asc' }],
      })

      return {
        data: allBlocks.map(b => ({
          id: b.id,
          title: b.title,
          description: b.description,
          duration_minutes: b.durationMinutes,
          category: b.category,
          sport: b.sport,
        })),
        error: null,
      }
    }

    const dayBlocks = await prisma.curriculumDayBlock.findMany({
      where: { dayId: templateDay.id },
      include: {
        block: { select: { id: true, title: true, description: true, durationMinutes: true, category: true, sport: true } },
      },
      orderBy: { orderIndex: 'asc' },
    })

    return {
      data: dayBlocks.filter(db => db.block).map(db => ({
        id: db.block.id,
        title: db.block.title,
        description: db.block.description,
        duration_minutes: db.block.durationMinutes,
        category: db.block.category,
        sport: db.block.sport,
      })),
      error: null,
    }
  } catch (err) {
    return { data: null, error: new Error((err as Error).message) }
  }
}

export async function getCampWithSchedule(campId: string): Promise<{
  data: {
    id: string
    name: string
    start_date: string
    end_date: string
    start_time: string | null
    end_time: string | null
    sport: string | null
    days: CampSessionDay[]
    curriculum: CampCurriculumAssignment | null
  } | null
  error: Error | null
}> {
  try {
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: { id: true, name: true, startDate: true, endDate: true, startTime: true, endTime: true, sportsOffered: true, programType: true },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp not found') }
    }

    const { data: days, error: daysError } = await getCampDays(campId)
    if (daysError) return { data: null, error: daysError }

    const { data: curriculum, error: curriculumError } = await getCampCurriculumAssignment(campId)
    if (curriculumError) return { data: null, error: curriculumError }

    return {
      data: {
        id: camp.id,
        name: camp.name,
        start_date: camp.startDate.toISOString().split('T')[0],
        end_date: camp.endDate.toISOString().split('T')[0],
        start_time: camp.startTime ? camp.startTime.toISOString().slice(11, 16) : null,
        end_time: camp.endTime ? camp.endTime.toISOString().slice(11, 16) : null,
        sport: camp.sportsOffered?.[0] || camp.programType || 'Multi-Sport',
        days: days || [],
        curriculum,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: new Error((err as Error).message) }
  }
}
