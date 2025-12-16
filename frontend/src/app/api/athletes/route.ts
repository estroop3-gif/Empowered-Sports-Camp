/**
 * Athletes API Routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  fetchAthletesByParent,
  fetchAthleteById,
  createAthlete,
  updateAthlete,
  deleteAthlete,
} from '@/lib/services/athletes'

export async function GET(request: NextRequest) {
  // Authenticate user
  const user = await getAuthenticatedUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const action = request.nextUrl.searchParams.get('action') || 'byParent'
  const parentId = request.nextUrl.searchParams.get('parentId')
  const athleteId = request.nextUrl.searchParams.get('athleteId')

  const isStaff = ['hq_admin', 'licensee_owner', 'director', 'coach'].includes(user.role?.toLowerCase() || '')

  try {
    switch (action) {
      case 'byParent': {
        if (!parentId) return NextResponse.json({ error: 'parentId required' }, { status: 400 })
        // Staff can fetch any parent's athletes
        // Non-staff can only fetch their own - we use user.id (profile ID) for the query
        // This handles the Cognito sub vs Profile ID mismatch
        const queryParentId = isStaff ? parentId : user.id
        const { data, error } = await fetchAthletesByParent(queryParentId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'byId': {
        if (!athleteId) return NextResponse.json({ error: 'athleteId required' }, { status: 400 })
        const { data, error } = await fetchAthleteById(athleteId)
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
      case 'create': {
        const { data: athlete, error } = await createAthlete(data)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data: athlete })
      }

      case 'update': {
        const { athleteId, ...updates } = data
        if (!athleteId) return NextResponse.json({ error: 'athleteId required' }, { status: 400 })
        const { data: athlete, error } = await updateAthlete(athleteId, updates)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data: athlete })
      }

      case 'delete': {
        const { athleteId, parentId } = data
        if (!athleteId || !parentId) {
          return NextResponse.json({ error: 'athleteId and parentId required' }, { status: 400 })
        }
        const { error } = await deleteAthlete(athleteId, parentId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
