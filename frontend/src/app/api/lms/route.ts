/**
 * LMS API Routes
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  fetchModules,
  fetchUserProgress,
  fetchAllProgress,
  startModule,
  completeModule,
  updateProgress,
  createModule,
  updateModule,
  deleteModule,
  fetchProgressSummary,
  setTrainingStatus,
} from '@/lib/services/lms'

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'modules'
  const profileId = request.nextUrl.searchParams.get('profileId')
  const role = request.nextUrl.searchParams.get('role')
  const moduleIds = request.nextUrl.searchParams.get('moduleIds')
  const roleFilter = request.nextUrl.searchParams.get('roleFilter')

  try {
    switch (action) {
      case 'modules': {
        const { data, error } = await fetchModules({
          role: role || undefined,
        })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'userProgress': {
        if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })
        const ids = moduleIds ? moduleIds.split(',') : undefined
        const { data, error } = await fetchUserProgress(profileId, ids)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'allProgress': {
        const { data, error } = await fetchAllProgress()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'progressSummary': {
        const { data, error } = await fetchProgressSummary(roleFilter || undefined)
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
      case 'startModule': {
        const { profileId, moduleId } = data
        if (!profileId || !moduleId) {
          return NextResponse.json({ error: 'profileId and moduleId required' }, { status: 400 })
        }
        const result = await startModule(profileId, moduleId)
        if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
        return NextResponse.json({ data: result.data })
      }

      case 'completeModule': {
        const { profileId, moduleId, quizScore, quizPassed } = data
        if (!profileId || !moduleId) {
          return NextResponse.json({ error: 'profileId and moduleId required' }, { status: 400 })
        }
        const result = await completeModule(profileId, moduleId, quizScore, quizPassed)
        if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
        return NextResponse.json({ data: result.data })
      }

      case 'updateProgress': {
        const { profileId, moduleId, progressPercent } = data
        if (!profileId || !moduleId || progressPercent === undefined) {
          return NextResponse.json({ error: 'profileId, moduleId, and progressPercent required' }, { status: 400 })
        }
        const result = await updateProgress(profileId, moduleId, progressPercent)
        if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
        return NextResponse.json({ data: result.data })
      }

      case 'createModule': {
        const result = await createModule(data)
        if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
        return NextResponse.json({ data: result.data })
      }

      case 'updateModule': {
        const { id, ...moduleData } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const result = await updateModule(id, moduleData)
        if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
        return NextResponse.json({ data: result.data })
      }

      case 'deleteModule': {
        const { moduleId } = data
        if (!moduleId) return NextResponse.json({ error: 'moduleId required' }, { status: 400 })
        const result = await deleteModule(moduleId)
        if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
        return NextResponse.json({ success: true })
      }

      case 'setTrainingStatus': {
        // Admin action to grant/revoke training credentials
        const { profileId, trainingType, completed } = data
        if (!profileId || !trainingType || completed === undefined) {
          return NextResponse.json({ error: 'profileId, trainingType, and completed required' }, { status: 400 })
        }
        if (!['core', 'director', 'volunteer', 'all'].includes(trainingType)) {
          return NextResponse.json({ error: 'Invalid trainingType' }, { status: 400 })
        }
        const result = await setTrainingStatus(profileId, trainingType, completed)
        if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
        return NextResponse.json({ data: result.data })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
