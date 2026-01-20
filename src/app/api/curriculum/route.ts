/**
 * Curriculum API Routes
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  getBlocks,
  getBlockById,
  createBlock,
  updateBlock,
  deleteBlock,
  addTemplateDay,
  updateTemplateDay,
  deleteTemplateDay,
  addBlockToDay,
  updateDayBlock,
  removeBlockFromDay,
  reorderDayBlocks,
  getCurriculumAssignments,
  assignTemplateToCamp,
  unassignTemplateFromCamp,
  getCampCurriculum,
  getCampsForAssignment,
} from '@/lib/services/curriculum'

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'templates'
  const id = request.nextUrl.searchParams.get('id')
  const campId = request.nextUrl.searchParams.get('campId')

  // Filter params
  const sport = request.nextUrl.searchParams.get('sport')
  const scope = request.nextUrl.searchParams.get('scope')
  const difficulty = request.nextUrl.searchParams.get('difficulty')
  const search = request.nextUrl.searchParams.get('search')
  const ageMin = request.nextUrl.searchParams.get('ageMin')
  const ageMax = request.nextUrl.searchParams.get('ageMax')
  const category = request.nextUrl.searchParams.get('category')

  try {
    switch (action) {
      case 'templates': {
        const filters = {
          sport: sport || undefined,
          scope: scope as 'all' | 'global' | 'licensee' | undefined,
          difficulty: difficulty || undefined,
          search: search || undefined,
          ageMin: ageMin ? parseInt(ageMin) : undefined,
          ageMax: ageMax ? parseInt(ageMax) : undefined,
        }
        const { data, error } = await getTemplates(filters as Parameters<typeof getTemplates>[0])
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'templateById': {
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const { data, error } = await getTemplateById(id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'blocks': {
        const filters = {
          sport: sport || undefined,
          category: category || undefined,
          scope: scope as 'all' | 'global' | 'licensee' | undefined,
          search: search || undefined,
        }
        const { data, error } = await getBlocks(filters as Parameters<typeof getBlocks>[0])
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'blockById': {
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const { data, error } = await getBlockById(id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'assignments': {
        const { data, error } = await getCurriculumAssignments()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'campCurriculum': {
        if (!campId) return NextResponse.json({ error: 'campId required' }, { status: 400 })
        const { data, error } = await getCampCurriculum(campId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'campsForAssignment': {
        const { data, error } = await getCampsForAssignment()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, ...data } = body

  try {
    switch (action) {
      // Template mutations
      case 'createTemplate': {
        const { userId, ...input } = data
        const { data: template, error } = await createTemplate(input, userId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data: template })
      }

      case 'updateTemplate': {
        const { id, ...input } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const { data: template, error } = await updateTemplate(id, input)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data: template })
      }

      case 'deleteTemplate': {
        const { id } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const { success, error } = await deleteTemplate(id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success })
      }

      case 'duplicateTemplate': {
        const { sourceTemplateId, licenseeId, newName } = data
        if (!sourceTemplateId || !newName) {
          return NextResponse.json({ error: 'sourceTemplateId and newName required' }, { status: 400 })
        }
        const { data: template, error } = await duplicateTemplate(sourceTemplateId, licenseeId, newName)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data: template })
      }

      // Block mutations
      case 'createBlock': {
        const { userId, ...input } = data
        const { data: block, error } = await createBlock(input, userId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data: block })
      }

      case 'updateBlock': {
        const { id, ...input } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const { data: block, error } = await updateBlock(id, input)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data: block })
      }

      case 'deleteBlock': {
        const { id } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const { success, error } = await deleteBlock(id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success })
      }

      // Template day mutations
      case 'addTemplateDay': {
        const { data: day, error } = await addTemplateDay(data)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data: day })
      }

      case 'updateTemplateDay': {
        const { id, ...input } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const { data: day, error } = await updateTemplateDay(id, input)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data: day })
      }

      case 'deleteTemplateDay': {
        const { id } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const { success, error } = await deleteTemplateDay(id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success })
      }

      // Day block mutations
      case 'addBlockToDay': {
        const { data: dayBlock, error } = await addBlockToDay(data)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data: dayBlock })
      }

      case 'updateDayBlock': {
        const { id, ...input } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const { data: dayBlock, error } = await updateDayBlock(id, input)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data: dayBlock })
      }

      case 'removeBlockFromDay': {
        const { id } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const { success, error } = await removeBlockFromDay(id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success })
      }

      case 'reorderDayBlocks': {
        const { dayId, blockOrder } = data
        if (!dayId || !blockOrder) {
          return NextResponse.json({ error: 'dayId and blockOrder required' }, { status: 400 })
        }
        const { success, error } = await reorderDayBlocks(dayId, blockOrder)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success })
      }

      // Assignment mutations
      case 'assignTemplateToCamp': {
        const { userId, ...input } = data
        const { data: assignment, error } = await assignTemplateToCamp(input, userId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data: assignment })
      }

      case 'unassignTemplateFromCamp': {
        const { campId } = data
        if (!campId) return NextResponse.json({ error: 'campId required' }, { status: 400 })
        const { success, error } = await unassignTemplateFromCamp(campId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
