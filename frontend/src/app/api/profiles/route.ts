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
        // Users can only fetch their own profile unless admin
        if (!isAdmin && profileId !== user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        const { data, error } = await fetchProfileById(profileId)
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
        // Users can only update their own profile unless admin
        if (!isAdmin && profileId !== user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        const { data: profile, error } = await updateProfile(profileId, updates)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data: profile })
      }

      case 'completeOnboarding': {
        const { profileId } = data
        if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })
        // Users can only complete their own onboarding
        if (!isAdmin && profileId !== user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        const { error } = await completeOnboarding(profileId)
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
