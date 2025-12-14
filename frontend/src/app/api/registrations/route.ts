/**
 * Registrations API Routes
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  fetchRegistrationsByParent,
  fetchRegistrationsByCamp,
  fetchRegistrationById,
  countRegistrationsByAthlete,
} from '@/lib/services/registrations'

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'byParent'
  const parentId = request.nextUrl.searchParams.get('parentId')
  const campId = request.nextUrl.searchParams.get('campId')
  const registrationId = request.nextUrl.searchParams.get('registrationId')

  try {
    switch (action) {
      case 'byParent': {
        if (!parentId) return NextResponse.json({ error: 'parentId required' }, { status: 400 })
        const { data, error } = await fetchRegistrationsByParent(parentId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'byCamp': {
        if (!campId) return NextResponse.json({ error: 'campId required' }, { status: 400 })
        const { data, error } = await fetchRegistrationsByCamp(campId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'byId': {
        if (!registrationId) return NextResponse.json({ error: 'registrationId required' }, { status: 400 })
        const { data, error } = await fetchRegistrationById(registrationId)
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
