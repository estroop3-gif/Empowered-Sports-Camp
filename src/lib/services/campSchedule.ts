/**
 * Camp Schedule Service
 *
 * Manages camp daily schedules and curriculum integration.
 * Provides CRUD operations for CampSessionDay and CampSessionScheduleBlock.
 */

import prisma from '@/lib/db/client'

// ============================================================================
// TYPES
// ============================================================================

export interface CampScheduleDay {
  id: string
  campId: string
  dayNumber: number
  actualDate: string | null
  title: string
  theme: string | null
  notes: string | null
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  scheduleBlocks: CampScheduleBlock[]
}

export interface CampScheduleBlock {
  id: string
  campSessionDayId: string
  startTime: string // HH:mm format
  endTime: string
  label: string
  description: string | null
  curriculumBlockId: string | null
  curriculumBlock: CurriculumBlockInfo | null
  location: string | null
  assignedStaffNotes: string | null
  orderIndex: number
  blockType: 'activity' | 'transition' | 'break' | 'meal' | 'arrival' | 'departure' | 'special' | 'curriculum'
  colorCode: string | null
}

export interface CurriculumBlockInfo {
  id: string
  title: string
  description: string | null
  sport: string | null
  category: string | null
  durationMinutes: number
  intensity: string | null
  equipmentNeeded: string | null
  setupNotes: string | null
  coachingPoints: string | null
}

export interface CreateDayInput {
  dayNumber: number
  actualDate?: string
  title: string
  theme?: string
  notes?: string
}

export interface UpdateDayInput {
  title?: string
  theme?: string
  notes?: string
  status?: 'planned' | 'in_progress' | 'completed' | 'cancelled'
}

export interface CreateBlockInput {
  startTime: string // HH:mm
  endTime: string
  label: string
  description?: string
  curriculumBlockId?: string
  location?: string
  assignedStaffNotes?: string
  orderIndex?: number
  blockType?: 'activity' | 'transition' | 'break' | 'meal' | 'arrival' | 'departure' | 'special' | 'curriculum'
  colorCode?: string
}

export interface UpdateBlockInput {
  startTime?: string
  endTime?: string
  label?: string
  description?: string
  curriculumBlockId?: string | null
  location?: string
  assignedStaffNotes?: string
  orderIndex?: number
  blockType?: 'activity' | 'transition' | 'break' | 'meal' | 'arrival' | 'departure' | 'special' | 'curriculum'
  colorCode?: string
}

// ============================================================================
// HELPERS
// ============================================================================

function formatTimeFromDB(time: Date | null): string {
  if (!time) return '00:00'
  // Time is stored as DateTime, extract HH:mm
  return time.toISOString().slice(11, 16)
}

function parseTimeForDB(timeStr: string): Date {
  // Convert HH:mm to a Date object (using arbitrary date)
  return new Date(`1970-01-01T${timeStr}:00.000Z`)
}

function mapBlockType(dbType: string): CampScheduleBlock['blockType'] {
  const validTypes = ['activity', 'transition', 'break', 'meal', 'arrival', 'departure', 'special', 'curriculum']
  return validTypes.includes(dbType) ? dbType as CampScheduleBlock['blockType'] : 'activity'
}

function mapDayStatus(dbStatus: string): CampScheduleDay['status'] {
  const validStatuses = ['planned', 'in_progress', 'completed', 'cancelled']
  return validStatuses.includes(dbStatus) ? dbStatus as CampScheduleDay['status'] : 'planned'
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all schedule days for a camp with their blocks
 */
export async function getCampScheduleDays(campId: string): Promise<CampScheduleDay[]> {
  const days = await prisma.campSessionDay.findMany({
    where: { campId },
    include: {
      scheduleBlocks: {
        include: {
          curriculumBlock: true,
        },
        orderBy: [
          { orderIndex: 'asc' },
          { startTime: 'asc' },
        ],
      },
    },
    orderBy: { dayNumber: 'asc' },
  })

  return days.map(day => ({
    id: day.id,
    campId: day.campId,
    dayNumber: day.dayNumber,
    actualDate: day.actualDate?.toISOString().split('T')[0] || null,
    title: day.title,
    theme: day.theme,
    notes: day.notes,
    status: mapDayStatus(day.status),
    scheduleBlocks: day.scheduleBlocks.map(block => ({
      id: block.id,
      campSessionDayId: block.campSessionDayId,
      startTime: formatTimeFromDB(block.startTime),
      endTime: formatTimeFromDB(block.endTime),
      label: block.label,
      description: block.description,
      curriculumBlockId: block.curriculumBlockId,
      curriculumBlock: block.curriculumBlock ? {
        id: block.curriculumBlock.id,
        title: block.curriculumBlock.title,
        description: block.curriculumBlock.description,
        sport: block.curriculumBlock.sport,
        category: block.curriculumBlock.category,
        durationMinutes: block.curriculumBlock.durationMinutes,
        intensity: block.curriculumBlock.intensity,
        equipmentNeeded: block.curriculumBlock.equipmentNeeded,
        setupNotes: block.curriculumBlock.setupNotes,
        coachingPoints: block.curriculumBlock.coachingPoints,
      } : null,
      location: block.location,
      assignedStaffNotes: block.assignedStaffNotes,
      orderIndex: block.orderIndex,
      blockType: mapBlockType(block.blockType),
      colorCode: block.colorCode,
    })),
  }))
}

/**
 * Get a single schedule day with its blocks
 */
export async function getCampScheduleDay(dayId: string): Promise<CampScheduleDay | null> {
  const day = await prisma.campSessionDay.findUnique({
    where: { id: dayId },
    include: {
      scheduleBlocks: {
        include: {
          curriculumBlock: true,
        },
        orderBy: [
          { orderIndex: 'asc' },
          { startTime: 'asc' },
        ],
      },
    },
  })

  if (!day) return null

  return {
    id: day.id,
    campId: day.campId,
    dayNumber: day.dayNumber,
    actualDate: day.actualDate?.toISOString().split('T')[0] || null,
    title: day.title,
    theme: day.theme,
    notes: day.notes,
    status: mapDayStatus(day.status),
    scheduleBlocks: day.scheduleBlocks.map(block => ({
      id: block.id,
      campSessionDayId: block.campSessionDayId,
      startTime: formatTimeFromDB(block.startTime),
      endTime: formatTimeFromDB(block.endTime),
      label: block.label,
      description: block.description,
      curriculumBlockId: block.curriculumBlockId,
      curriculumBlock: block.curriculumBlock ? {
        id: block.curriculumBlock.id,
        title: block.curriculumBlock.title,
        description: block.curriculumBlock.description,
        sport: block.curriculumBlock.sport,
        category: block.curriculumBlock.category,
        durationMinutes: block.curriculumBlock.durationMinutes,
        intensity: block.curriculumBlock.intensity,
        equipmentNeeded: block.curriculumBlock.equipmentNeeded,
        setupNotes: block.curriculumBlock.setupNotes,
        coachingPoints: block.curriculumBlock.coachingPoints,
      } : null,
      location: block.location,
      assignedStaffNotes: block.assignedStaffNotes,
      orderIndex: block.orderIndex,
      blockType: mapBlockType(block.blockType),
      colorCode: block.colorCode,
    })),
  }
}

/**
 * Get curriculum assigned to a camp
 */
export async function getCampAssignedCurriculum(campId: string) {
  const assignment = await prisma.campSessionCurriculum.findUnique({
    where: { campId },
    include: {
      template: {
        include: {
          days: {
            include: {
              dayBlocks: {
                include: {
                  block: true,
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

  return assignment
}

// ============================================================================
// MUTATIONS - DAYS
// ============================================================================

/**
 * Create a new schedule day
 */
export async function createCampSessionDay(campId: string, input: CreateDayInput): Promise<CampScheduleDay> {
  const day = await prisma.campSessionDay.create({
    data: {
      campId,
      dayNumber: input.dayNumber,
      actualDate: input.actualDate ? new Date(input.actualDate) : null,
      title: input.title,
      theme: input.theme || null,
      notes: input.notes || null,
      status: 'planned',
    },
    include: {
      scheduleBlocks: {
        include: {
          curriculumBlock: true,
        },
        orderBy: { orderIndex: 'asc' },
      },
    },
  })

  return {
    id: day.id,
    campId: day.campId,
    dayNumber: day.dayNumber,
    actualDate: day.actualDate?.toISOString().split('T')[0] || null,
    title: day.title,
    theme: day.theme,
    notes: day.notes,
    status: mapDayStatus(day.status),
    scheduleBlocks: [],
  }
}

/**
 * Update a schedule day
 */
export async function updateCampSessionDay(dayId: string, input: UpdateDayInput): Promise<CampScheduleDay> {
  const day = await prisma.campSessionDay.update({
    where: { id: dayId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.theme !== undefined && { theme: input.theme }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.status !== undefined && { status: input.status }),
    },
    include: {
      scheduleBlocks: {
        include: {
          curriculumBlock: true,
        },
        orderBy: { orderIndex: 'asc' },
      },
    },
  })

  return {
    id: day.id,
    campId: day.campId,
    dayNumber: day.dayNumber,
    actualDate: day.actualDate?.toISOString().split('T')[0] || null,
    title: day.title,
    theme: day.theme,
    notes: day.notes,
    status: mapDayStatus(day.status),
    scheduleBlocks: day.scheduleBlocks.map(block => ({
      id: block.id,
      campSessionDayId: block.campSessionDayId,
      startTime: formatTimeFromDB(block.startTime),
      endTime: formatTimeFromDB(block.endTime),
      label: block.label,
      description: block.description,
      curriculumBlockId: block.curriculumBlockId,
      curriculumBlock: block.curriculumBlock ? {
        id: block.curriculumBlock.id,
        title: block.curriculumBlock.title,
        description: block.curriculumBlock.description,
        sport: block.curriculumBlock.sport,
        category: block.curriculumBlock.category,
        durationMinutes: block.curriculumBlock.durationMinutes,
        intensity: block.curriculumBlock.intensity,
        equipmentNeeded: block.curriculumBlock.equipmentNeeded,
        setupNotes: block.curriculumBlock.setupNotes,
        coachingPoints: block.curriculumBlock.coachingPoints,
      } : null,
      location: block.location,
      assignedStaffNotes: block.assignedStaffNotes,
      orderIndex: block.orderIndex,
      blockType: mapBlockType(block.blockType),
      colorCode: block.colorCode,
    })),
  }
}

/**
 * Delete a schedule day
 */
export async function deleteCampSessionDay(dayId: string): Promise<void> {
  await prisma.campSessionDay.delete({
    where: { id: dayId },
  })
}

// ============================================================================
// MUTATIONS - BLOCKS
// ============================================================================

/**
 * Create a schedule block
 */
export async function createScheduleBlock(dayId: string, input: CreateBlockInput): Promise<CampScheduleBlock> {
  // Get current max order index
  const maxOrder = await prisma.campSessionScheduleBlock.aggregate({
    where: { campSessionDayId: dayId },
    _max: { orderIndex: true },
  })

  const block = await prisma.campSessionScheduleBlock.create({
    data: {
      campSessionDayId: dayId,
      startTime: parseTimeForDB(input.startTime),
      endTime: parseTimeForDB(input.endTime),
      label: input.label,
      description: input.description || null,
      curriculumBlockId: input.curriculumBlockId || null,
      location: input.location || null,
      assignedStaffNotes: input.assignedStaffNotes || null,
      orderIndex: input.orderIndex ?? (maxOrder._max.orderIndex ?? -1) + 1,
      blockType: input.blockType || 'activity',
      colorCode: input.colorCode || null,
    },
    include: {
      curriculumBlock: true,
    },
  })

  return {
    id: block.id,
    campSessionDayId: block.campSessionDayId,
    startTime: formatTimeFromDB(block.startTime),
    endTime: formatTimeFromDB(block.endTime),
    label: block.label,
    description: block.description,
    curriculumBlockId: block.curriculumBlockId,
    curriculumBlock: block.curriculumBlock ? {
      id: block.curriculumBlock.id,
      title: block.curriculumBlock.title,
      description: block.curriculumBlock.description,
      sport: block.curriculumBlock.sport,
      category: block.curriculumBlock.category,
      durationMinutes: block.curriculumBlock.durationMinutes,
      intensity: block.curriculumBlock.intensity,
      equipmentNeeded: block.curriculumBlock.equipmentNeeded,
      setupNotes: block.curriculumBlock.setupNotes,
      coachingPoints: block.curriculumBlock.coachingPoints,
    } : null,
    location: block.location,
    assignedStaffNotes: block.assignedStaffNotes,
    orderIndex: block.orderIndex,
    blockType: mapBlockType(block.blockType),
    colorCode: block.colorCode,
  }
}

/**
 * Update a schedule block
 */
export async function updateScheduleBlock(blockId: string, input: UpdateBlockInput): Promise<CampScheduleBlock> {
  const block = await prisma.campSessionScheduleBlock.update({
    where: { id: blockId },
    data: {
      ...(input.startTime !== undefined && { startTime: parseTimeForDB(input.startTime) }),
      ...(input.endTime !== undefined && { endTime: parseTimeForDB(input.endTime) }),
      ...(input.label !== undefined && { label: input.label }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.curriculumBlockId !== undefined && { curriculumBlockId: input.curriculumBlockId }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.assignedStaffNotes !== undefined && { assignedStaffNotes: input.assignedStaffNotes }),
      ...(input.orderIndex !== undefined && { orderIndex: input.orderIndex }),
      ...(input.blockType !== undefined && { blockType: input.blockType }),
      ...(input.colorCode !== undefined && { colorCode: input.colorCode }),
    },
    include: {
      curriculumBlock: true,
    },
  })

  return {
    id: block.id,
    campSessionDayId: block.campSessionDayId,
    startTime: formatTimeFromDB(block.startTime),
    endTime: formatTimeFromDB(block.endTime),
    label: block.label,
    description: block.description,
    curriculumBlockId: block.curriculumBlockId,
    curriculumBlock: block.curriculumBlock ? {
      id: block.curriculumBlock.id,
      title: block.curriculumBlock.title,
      description: block.curriculumBlock.description,
      sport: block.curriculumBlock.sport,
      category: block.curriculumBlock.category,
      durationMinutes: block.curriculumBlock.durationMinutes,
      intensity: block.curriculumBlock.intensity,
      equipmentNeeded: block.curriculumBlock.equipmentNeeded,
      setupNotes: block.curriculumBlock.setupNotes,
      coachingPoints: block.curriculumBlock.coachingPoints,
    } : null,
    location: block.location,
    assignedStaffNotes: block.assignedStaffNotes,
    orderIndex: block.orderIndex,
    blockType: mapBlockType(block.blockType),
    colorCode: block.colorCode,
  }
}

/**
 * Delete a schedule block
 */
export async function deleteScheduleBlock(blockId: string): Promise<void> {
  await prisma.campSessionScheduleBlock.delete({
    where: { id: blockId },
  })
}

/**
 * Reorder schedule blocks within a day
 */
export async function reorderScheduleBlocks(
  dayId: string,
  blockOrder: { id: string; orderIndex: number }[]
): Promise<void> {
  await prisma.$transaction(
    blockOrder.map(({ id, orderIndex }) =>
      prisma.campSessionScheduleBlock.update({
        where: { id },
        data: { orderIndex },
      })
    )
  )
}

// ============================================================================
// CURRICULUM INTEGRATION
// ============================================================================

/**
 * Apply a curriculum template to create schedule days and blocks
 */
export async function applyCurriculumToSchedule(
  campId: string,
  templateId: string,
  campStartTime: string = '09:00'
): Promise<{ daysCreated: number; blocksCreated: number }> {
  // Get the camp to calculate actual dates
  const camp = await prisma.camp.findUnique({
    where: { id: campId },
    select: { startDate: true, endDate: true },
  })

  if (!camp) throw new Error('Camp not found')

  // Get the curriculum template with all days and blocks
  const template = await prisma.curriculumTemplate.findUnique({
    where: { id: templateId },
    include: {
      days: {
        include: {
          dayBlocks: {
            include: {
              block: true,
            },
            orderBy: { orderIndex: 'asc' },
          },
        },
        orderBy: { dayNumber: 'asc' },
      },
    },
  })

  if (!template) throw new Error('Curriculum template not found')

  let daysCreated = 0
  let blocksCreated = 0

  // Delete existing schedule days for this camp (clean slate)
  await prisma.campSessionDay.deleteMany({
    where: { campId },
  })

  // Create schedule days and blocks from template
  for (const templateDay of template.days) {
    // Calculate actual date for this day
    const actualDate = new Date(camp.startDate)
    actualDate.setDate(actualDate.getDate() + templateDay.dayNumber - 1)

    // Create the schedule day
    const scheduleDay = await prisma.campSessionDay.create({
      data: {
        campId,
        dayNumber: templateDay.dayNumber,
        actualDate,
        title: templateDay.title,
        theme: templateDay.theme,
        notes: templateDay.notes,
        status: 'planned',
      },
    })
    daysCreated++

    // Calculate start times for each block
    let currentTime = parseTimeString(campStartTime)

    for (const dayBlock of templateDay.dayBlocks) {
      const block = dayBlock.block
      const duration = dayBlock.customDurationMinutes || block.durationMinutes

      const startTime = formatTimeString(currentTime)
      currentTime = addMinutes(currentTime, duration)
      const endTime = formatTimeString(currentTime)

      await prisma.campSessionScheduleBlock.create({
        data: {
          campSessionDayId: scheduleDay.id,
          startTime: parseTimeForDB(startTime),
          endTime: parseTimeForDB(endTime),
          label: dayBlock.customTitle || block.title,
          description: dayBlock.customNotes || block.description,
          curriculumBlockId: block.id,
          location: dayBlock.fieldLocation,
          orderIndex: dayBlock.orderIndex,
          blockType: 'curriculum',
          colorCode: getCategoryColor(block.category),
        },
      })
      blocksCreated++
    }
  }

  return { daysCreated, blocksCreated }
}

/**
 * Copy schedule from one day to another
 */
export async function copyDaySchedule(
  sourceDayId: string,
  targetDayId: string,
  replaceExisting: boolean = true
): Promise<{ blocksCopied: number }> {
  // Get source day blocks
  const sourceBlocks = await prisma.campSessionScheduleBlock.findMany({
    where: { campSessionDayId: sourceDayId },
    orderBy: { orderIndex: 'asc' },
  })

  if (replaceExisting) {
    // Delete existing blocks in target day
    await prisma.campSessionScheduleBlock.deleteMany({
      where: { campSessionDayId: targetDayId },
    })
  }

  // Get max order index in target if not replacing
  let orderOffset = 0
  if (!replaceExisting) {
    const maxOrder = await prisma.campSessionScheduleBlock.aggregate({
      where: { campSessionDayId: targetDayId },
      _max: { orderIndex: true },
    })
    orderOffset = (maxOrder._max.orderIndex ?? -1) + 1
  }

  // Copy blocks to target day
  const createdBlocks = await prisma.$transaction(
    sourceBlocks.map((block, index) =>
      prisma.campSessionScheduleBlock.create({
        data: {
          campSessionDayId: targetDayId,
          startTime: block.startTime,
          endTime: block.endTime,
          label: block.label,
          description: block.description,
          curriculumBlockId: block.curriculumBlockId,
          location: block.location,
          assignedStaffNotes: block.assignedStaffNotes,
          orderIndex: orderOffset + index,
          blockType: block.blockType,
          colorCode: block.colorCode,
        },
      })
    )
  )

  return { blocksCopied: createdBlocks.length }
}

// ============================================================================
// UTILITIES
// ============================================================================

function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return { hours, minutes }
}

function formatTimeString(time: { hours: number; minutes: number }): string {
  return `${time.hours.toString().padStart(2, '0')}:${time.minutes.toString().padStart(2, '0')}`
}

function addMinutes(time: { hours: number; minutes: number }, minutes: number): { hours: number; minutes: number } {
  const totalMinutes = time.hours * 60 + time.minutes + minutes
  return {
    hours: Math.floor(totalMinutes / 60) % 24,
    minutes: totalMinutes % 60,
  }
}

function getCategoryColor(category: string | null): string | null {
  const colors: Record<string, string> = {
    warmup: '#10b981', // emerald
    drill: '#3b82f6', // blue
    skill_station: '#8b5cf6', // violet
    scrimmage: '#f59e0b', // amber
    game: '#ef4444', // red
    mindset: '#ec4899', // pink
    leadership: '#6366f1', // indigo
    team_building: '#14b8a6', // teal
    cooldown: '#6b7280', // gray
    water_break: '#06b6d4', // cyan
    transition: '#9ca3af', // gray-400
  }
  return category ? colors[category] || null : null
}

// ============================================================================
// SCHEDULE TEMPLATES
// ============================================================================

export interface ScheduleTemplate {
  id: string
  licenseeId: string | null
  name: string
  description: string | null
  defaultStartTime: string
  defaultEndTime: string
  totalDays: number
  sport: string | null
  isGlobal: boolean
  isActive: boolean
  createdBy: string | null
  createdAt: string
  blocks: ScheduleTemplateBlock[]
}

export interface ScheduleTemplateBlock {
  id: string
  templateId: string
  dayNumber: number
  startTime: string
  endTime: string
  label: string
  description: string | null
  defaultLocation: string | null
  blockType: string
  orderIndex: number
}

export interface CreateTemplateInput {
  name: string
  description?: string
  defaultStartTime?: string
  defaultEndTime?: string
  totalDays?: number
  sport?: string
  isGlobal?: boolean
}

export interface CreateTemplateBlockInput {
  dayNumber: number
  startTime: string
  endTime: string
  label: string
  description?: string
  defaultLocation?: string
  blockType?: string
  orderIndex?: number
}

/**
 * Get all schedule templates
 */
export async function getScheduleTemplates(options: {
  licenseeId?: string
  includeGlobal?: boolean
} = {}): Promise<ScheduleTemplate[]> {
  const { licenseeId, includeGlobal = true } = options

  const where: Record<string, unknown> = { isActive: true }

  if (licenseeId) {
    if (includeGlobal) {
      where.OR = [
        { licenseeId },
        { isGlobal: true },
      ]
    } else {
      where.licenseeId = licenseeId
    }
  } else if (includeGlobal) {
    where.isGlobal = true
  }

  const templates = await prisma.scheduleTemplate.findMany({
    where,
    include: {
      blocks: {
        orderBy: [
          { dayNumber: 'asc' },
          { orderIndex: 'asc' },
        ],
      },
    },
    orderBy: { name: 'asc' },
  })

  return templates.map(t => ({
    id: t.id,
    licenseeId: t.licenseeId,
    name: t.name,
    description: t.description,
    defaultStartTime: formatTimeFromDB(t.defaultStartTime),
    defaultEndTime: formatTimeFromDB(t.defaultEndTime),
    totalDays: t.totalDays,
    sport: t.sport,
    isGlobal: t.isGlobal,
    isActive: t.isActive,
    createdBy: t.createdBy,
    createdAt: t.createdAt.toISOString(),
    blocks: t.blocks.map(b => ({
      id: b.id,
      templateId: b.templateId,
      dayNumber: b.dayNumber,
      startTime: formatTimeFromDB(b.startTime),
      endTime: formatTimeFromDB(b.endTime),
      label: b.label,
      description: b.description,
      defaultLocation: b.defaultLocation,
      blockType: b.blockType,
      orderIndex: b.orderIndex,
    })),
  }))
}

/**
 * Get a single schedule template
 */
export async function getScheduleTemplate(templateId: string): Promise<ScheduleTemplate | null> {
  const template = await prisma.scheduleTemplate.findUnique({
    where: { id: templateId },
    include: {
      blocks: {
        orderBy: [
          { dayNumber: 'asc' },
          { orderIndex: 'asc' },
        ],
      },
    },
  })

  if (!template) return null

  return {
    id: template.id,
    licenseeId: template.licenseeId,
    name: template.name,
    description: template.description,
    defaultStartTime: formatTimeFromDB(template.defaultStartTime),
    defaultEndTime: formatTimeFromDB(template.defaultEndTime),
    totalDays: template.totalDays,
    sport: template.sport,
    isGlobal: template.isGlobal,
    isActive: template.isActive,
    createdBy: template.createdBy,
    createdAt: template.createdAt.toISOString(),
    blocks: template.blocks.map(b => ({
      id: b.id,
      templateId: b.templateId,
      dayNumber: b.dayNumber,
      startTime: formatTimeFromDB(b.startTime),
      endTime: formatTimeFromDB(b.endTime),
      label: b.label,
      description: b.description,
      defaultLocation: b.defaultLocation,
      blockType: b.blockType,
      orderIndex: b.orderIndex,
    })),
  }
}

/**
 * Create a new schedule template
 */
export async function createScheduleTemplate(
  input: CreateTemplateInput,
  userId?: string,
  licenseeId?: string
): Promise<ScheduleTemplate> {
  const template = await prisma.scheduleTemplate.create({
    data: {
      name: input.name,
      description: input.description || null,
      defaultStartTime: parseTimeForDB(input.defaultStartTime || '09:00'),
      defaultEndTime: parseTimeForDB(input.defaultEndTime || '15:00'),
      totalDays: input.totalDays || 1,
      sport: input.sport || null,
      isGlobal: input.isGlobal || false,
      licenseeId: licenseeId || null,
      createdBy: userId || null,
    },
    include: {
      blocks: true,
    },
  })

  return {
    id: template.id,
    licenseeId: template.licenseeId,
    name: template.name,
    description: template.description,
    defaultStartTime: formatTimeFromDB(template.defaultStartTime),
    defaultEndTime: formatTimeFromDB(template.defaultEndTime),
    totalDays: template.totalDays,
    sport: template.sport,
    isGlobal: template.isGlobal,
    isActive: template.isActive,
    createdBy: template.createdBy,
    createdAt: template.createdAt.toISOString(),
    blocks: [],
  }
}

/**
 * Update a schedule template
 */
export async function updateScheduleTemplate(
  templateId: string,
  input: Partial<CreateTemplateInput>
): Promise<ScheduleTemplate> {
  const template = await prisma.scheduleTemplate.update({
    where: { id: templateId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.defaultStartTime !== undefined && { defaultStartTime: parseTimeForDB(input.defaultStartTime) }),
      ...(input.defaultEndTime !== undefined && { defaultEndTime: parseTimeForDB(input.defaultEndTime) }),
      ...(input.totalDays !== undefined && { totalDays: input.totalDays }),
      ...(input.sport !== undefined && { sport: input.sport }),
      ...(input.isGlobal !== undefined && { isGlobal: input.isGlobal }),
    },
    include: {
      blocks: {
        orderBy: [
          { dayNumber: 'asc' },
          { orderIndex: 'asc' },
        ],
      },
    },
  })

  return {
    id: template.id,
    licenseeId: template.licenseeId,
    name: template.name,
    description: template.description,
    defaultStartTime: formatTimeFromDB(template.defaultStartTime),
    defaultEndTime: formatTimeFromDB(template.defaultEndTime),
    totalDays: template.totalDays,
    sport: template.sport,
    isGlobal: template.isGlobal,
    isActive: template.isActive,
    createdBy: template.createdBy,
    createdAt: template.createdAt.toISOString(),
    blocks: template.blocks.map(b => ({
      id: b.id,
      templateId: b.templateId,
      dayNumber: b.dayNumber,
      startTime: formatTimeFromDB(b.startTime),
      endTime: formatTimeFromDB(b.endTime),
      label: b.label,
      description: b.description,
      defaultLocation: b.defaultLocation,
      blockType: b.blockType,
      orderIndex: b.orderIndex,
    })),
  }
}

/**
 * Delete a schedule template
 */
export async function deleteScheduleTemplate(templateId: string): Promise<void> {
  await prisma.scheduleTemplate.delete({
    where: { id: templateId },
  })
}

/**
 * Add a block to a schedule template
 */
export async function addTemplateBlock(
  templateId: string,
  input: CreateTemplateBlockInput
): Promise<ScheduleTemplateBlock> {
  // Get max order index for this day
  const maxOrder = await prisma.scheduleTemplateBlock.aggregate({
    where: { templateId, dayNumber: input.dayNumber },
    _max: { orderIndex: true },
  })

  const block = await prisma.scheduleTemplateBlock.create({
    data: {
      templateId,
      dayNumber: input.dayNumber,
      startTime: parseTimeForDB(input.startTime),
      endTime: parseTimeForDB(input.endTime),
      label: input.label,
      description: input.description || null,
      defaultLocation: input.defaultLocation || null,
      blockType: (input.blockType as 'activity' | 'transition' | 'break' | 'meal' | 'arrival' | 'departure' | 'special' | 'curriculum') || 'activity',
      orderIndex: input.orderIndex ?? (maxOrder._max.orderIndex ?? -1) + 1,
    },
  })

  return {
    id: block.id,
    templateId: block.templateId,
    dayNumber: block.dayNumber,
    startTime: formatTimeFromDB(block.startTime),
    endTime: formatTimeFromDB(block.endTime),
    label: block.label,
    description: block.description,
    defaultLocation: block.defaultLocation,
    blockType: block.blockType,
    orderIndex: block.orderIndex,
  }
}

/**
 * Delete a template block
 */
export async function deleteTemplateBlock(blockId: string): Promise<void> {
  await prisma.scheduleTemplateBlock.delete({
    where: { id: blockId },
  })
}

/**
 * Save a camp's current schedule as a template
 */
export async function saveCampScheduleAsTemplate(
  campId: string,
  templateName: string,
  templateDescription?: string,
  userId?: string,
  licenseeId?: string
): Promise<ScheduleTemplate> {
  // Get camp schedule days and blocks
  const days = await getCampScheduleDays(campId)

  if (days.length === 0) {
    throw new Error('Camp has no schedule to save as template')
  }

  // Determine default start/end times from first day
  const firstDayBlocks = days[0]?.scheduleBlocks || []
  const defaultStartTime = firstDayBlocks[0]?.startTime || '09:00'
  const lastBlock = firstDayBlocks[firstDayBlocks.length - 1]
  const defaultEndTime = lastBlock?.endTime || '15:00'

  // Create the template
  const template = await prisma.scheduleTemplate.create({
    data: {
      name: templateName,
      description: templateDescription || null,
      defaultStartTime: parseTimeForDB(defaultStartTime),
      defaultEndTime: parseTimeForDB(defaultEndTime),
      totalDays: days.length,
      licenseeId: licenseeId || null,
      createdBy: userId || null,
      isGlobal: false,
    },
  })

  // Create template blocks from camp schedule
  const blockPromises: Promise<unknown>[] = []
  for (const day of days) {
    for (const block of day.scheduleBlocks) {
      blockPromises.push(
        prisma.scheduleTemplateBlock.create({
          data: {
            templateId: template.id,
            dayNumber: day.dayNumber,
            startTime: parseTimeForDB(block.startTime),
            endTime: parseTimeForDB(block.endTime),
            label: block.label,
            description: block.description,
            defaultLocation: block.location,
            blockType: block.blockType as 'activity' | 'transition' | 'break' | 'meal' | 'arrival' | 'departure' | 'special' | 'curriculum',
            orderIndex: block.orderIndex,
          },
        })
      )
    }
  }

  await Promise.all(blockPromises)

  // Return the created template
  return getScheduleTemplate(template.id) as Promise<ScheduleTemplate>
}

/**
 * Apply a schedule template to a camp
 */
export async function applyScheduleTemplate(
  campId: string,
  templateId: string
): Promise<{ daysCreated: number; blocksCreated: number }> {
  // Get the camp to calculate actual dates
  const camp = await prisma.camp.findUnique({
    where: { id: campId },
    select: { startDate: true },
  })

  if (!camp) throw new Error('Camp not found')

  // Get the template
  const template = await getScheduleTemplate(templateId)
  if (!template) throw new Error('Template not found')

  // Delete existing schedule
  await prisma.campSessionDay.deleteMany({
    where: { campId },
  })

  let daysCreated = 0
  let blocksCreated = 0

  // Group blocks by day
  const blocksByDay = new Map<number, ScheduleTemplateBlock[]>()
  for (const block of template.blocks) {
    const existing = blocksByDay.get(block.dayNumber) || []
    existing.push(block)
    blocksByDay.set(block.dayNumber, existing)
  }

  // Create days and blocks
  for (let dayNum = 1; dayNum <= template.totalDays; dayNum++) {
    const actualDate = new Date(camp.startDate)
    actualDate.setDate(actualDate.getDate() + dayNum - 1)

    const scheduleDay = await prisma.campSessionDay.create({
      data: {
        campId,
        dayNumber: dayNum,
        actualDate,
        title: `Day ${dayNum}`,
        status: 'planned',
      },
    })
    daysCreated++

    const dayBlocks = blocksByDay.get(dayNum) || []
    for (const block of dayBlocks) {
      await prisma.campSessionScheduleBlock.create({
        data: {
          campSessionDayId: scheduleDay.id,
          startTime: parseTimeForDB(block.startTime),
          endTime: parseTimeForDB(block.endTime),
          label: block.label,
          description: block.description,
          location: block.defaultLocation,
          blockType: block.blockType as 'activity' | 'transition' | 'break' | 'meal' | 'arrival' | 'departure' | 'special' | 'curriculum',
          orderIndex: block.orderIndex,
        },
      })
      blocksCreated++
    }
  }

  return { daysCreated, blocksCreated }
}
