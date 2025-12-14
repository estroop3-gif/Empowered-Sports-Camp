/**
 * Profiles API Routes
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  fetchProfileById,
  fetchProfileByEmail,
  createProfile,
  updateProfile,
  completeOnboarding,
} from '@/lib/services/profiles'

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'byId'
  const profileId = request.nextUrl.searchParams.get('profileId')
  const email = request.nextUrl.searchParams.get('email')

  try {
    switch (action) {
      case 'byId': {
        if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })
        const { data, error } = await fetchProfileById(profileId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'byEmail': {
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
  const body = await request.json()
  const { action, ...data } = body

  try {
    switch (action) {
      case 'create': {
        const { data: profile, error } = await createProfile(data)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data: profile })
      }

      case 'update': {
        const { profileId, ...updates } = data
        if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })
        const { data: profile, error } = await updateProfile(profileId, updates)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data: profile })
      }

      case 'completeOnboarding': {
        const { profileId } = data
        if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })
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
