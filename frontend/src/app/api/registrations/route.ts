/**
 * Registrations API Routes
 *
 * Protected routes for accessing registration data.
 * Parents can only access their own registrations.
 * Staff can access camp registrations they're assigned to.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  fetchRegistrationsByParent,
  fetchRegistrationsByCamp,
  fetchRegistrationById,
  countRegistrationsByAthlete,
} from '@/lib/services/registrations'

export async function GET(request: NextRequest) {
  // Authenticate user
  const user = await getAuthenticatedUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const action = request.nextUrl.searchParams.get('action') || 'byParent'
  const parentId = request.nextUrl.searchParams.get('parentId')
  const campId = request.nextUrl.searchParams.get('campId')
  const registrationId = request.nextUrl.searchParams.get('registrationId')

  const isStaff = ['hq_admin', 'licensee_owner', 'director', 'coach'].includes(user.role?.toLowerCase() || '')

  try {
    switch (action) {
      case 'myRegistrations': {
        // Use the authenticated user's profile ID directly (no param needed)
        // This handles the Cognito sub vs Profile ID mismatch issue
        const { data, error } = await fetchRegistrationsByParent(user.id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'byParent': {
        if (!parentId) return NextResponse.json({ error: 'parentId required' }, { status: 400 })
        // Staff can fetch any parent's registrations
        // Non-staff can only fetch their own - we ignore the passed parentId and use user.id
        // This handles the Cognito sub vs Profile ID mismatch (client sends Cognito sub,
        // but server has mapped user.id to the profile ID)
        const queryParentId = isStaff ? parentId : user.id
        const { data, error } = await fetchRegistrationsByParent(queryParentId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'byCamp': {
        if (!campId) return NextResponse.json({ error: 'campId required' }, { status: 400 })
        // Only staff can fetch camp registrations
        if (!isStaff) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        const { data, error } = await fetchRegistrationsByCamp(campId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'byId': {
        if (!registrationId) return NextResponse.json({ error: 'registrationId required' }, { status: 400 })
        const { data, error } = await fetchRegistrationById(registrationId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        // Check ownership - staff or the parent who made the registration
        if (!isStaff && data?.parent_id !== user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
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
  // Authenticate user
  const user = await getAuthenticatedUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { action, ...data } = body

  try {
    switch (action) {
      case 'countByAthlete': {
        const { athleteIds } = data
        if (!athleteIds || !Array.isArray(athleteIds)) {
          return NextResponse.json({ error: 'athleteIds array required' }, { status: 400 })
        }
        const { data: counts, error } = await countRegistrationsByAthlete(athleteIds)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        // Convert Map to object for JSON serialization
        const countsObj: Record<string, { upcoming: number; completed: number }> = {}
        if (counts) {
          counts.forEach((value, key) => {
            countsObj[key] = value
          })
        }
        return NextResponse.json({ data: countsObj })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
