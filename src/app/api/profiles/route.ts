/**
 * Profiles API Routes
 *
 * Users can only access/modify their own profile.
 * Admins can access any profile.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  fetchProfileById,
  fetchProfileByEmail,
  fetchProfileWithAthletes,
  createProfile,
  updateProfile,
  completeOnboarding,
} from '@/lib/services/profiles'

export async function GET(request: NextRequest) {
  // Authenticate user
  const user = await getAuthenticatedUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const action = request.nextUrl.searchParams.get('action') || 'byId'
  const profileId = request.nextUrl.searchParams.get('profileId')
  const email = request.nextUrl.searchParams.get('email')

  const isAdmin = user.role?.toLowerCase() === 'hq_admin'

  try {
    switch (action) {
      case 'byId': {
        if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })
        // Admin can fetch any profile
        // Non-admin users can only fetch their own - we use user.id (profile ID) for the query
        // This handles the Cognito sub vs Profile ID mismatch
        const queryProfileId = isAdmin ? profileId : user.id
        const { data, error } = await fetchProfileById(queryProfileId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'byEmail': {
        // Only admins can look up users by email
        if (!isAdmin) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })
        const { data, error } = await fetchProfileByEmail(email)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'withAthletes': {
        // Get own profile with athletes (for registration flow)
        const { data, error } = await fetchProfileWithAthletes(user.id)
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
  // Authenticate user
  const user = await getAuthenticatedUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isAdmin = user.role?.toLowerCase() === 'hq_admin'

  const body = await request.json()
  const { action, ...data } = body

  try {
    switch (action) {
      case 'create': {
        // Only allow creating a profile for the authenticated user, or admin
        if (!isAdmin && data.id && data.id !== user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        const { data: profile, error } = await createProfile(data)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data: profile })
      }

      case 'update': {
        const { profileId, ...updates } = data
        if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })
        // Admin can update any profile
        // Non-admin users can only update their own - we use user.id (profile ID)
        // This handles the Cognito sub vs Profile ID mismatch
        const queryProfileId = isAdmin ? profileId : user.id
        const { data: profile, error } = await updateProfile(queryProfileId, updates)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data: profile })
      }

      case 'completeOnboarding': {
        const { profileId } = data
        if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })
        // Admin can complete any profile's onboarding
        // Non-admin users can only complete their own - we use user.id (profile ID)
        // This handles the Cognito sub vs Profile ID mismatch
        const queryProfileId = isAdmin ? profileId : user.id
        const { error } = await completeOnboarding(queryProfileId)
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
