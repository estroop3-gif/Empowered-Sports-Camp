/**
 * Admin Single Athlete API
 *
 * GET /api/admin/athletes/[athleteId] - Get athlete details
 * PUT /api/admin/athletes/[athleteId] - Update athlete
 * DELETE /api/admin/athletes/[athleteId] - Archive athlete
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth/server'
import {
  getAthleteById,
  listAthleteRegistrations,
  updateAthleteAdmin,
  archiveAthlete,
  reactivateAthlete,
} from '@/lib/services/athletes-admin'

interface RouteParams {
  params: Promise<{ athleteId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { athleteId } = await params
    const searchParams = request.nextUrl.searchParams
    const includeRegistrations = searchParams.get('includeRegistrations') === 'true'

    const { data: athlete, error } = await getAthleteById({
      athleteId,
      role: user.role,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!athlete) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 })
    }

    let registrations = null
    if (includeRegistrations) {
      const { data: regs } = await listAthleteRegistrations({
        athleteId,
        role: user.role,
      })
      registrations = regs
    }

    return NextResponse.json({
      athlete,
      registrations,
    })
  } catch (error) {
    console.error('[API] GET /api/admin/athletes/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { athleteId } = await params
    const body = await request.json()

    const { data, error } = await updateAthleteAdmin({
      athleteId,
      role: user.role,
      input: body,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ athlete: data })
  } catch (error) {
    console.error('[API] PUT /api/admin/athletes/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { athleteId } = await params
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')

    if (action === 'reactivate') {
      const { data, error } = await reactivateAthlete({
        athleteId,
        role: user.role,
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    }

    // Default: archive
    const { data, error } = await archiveAthlete({
      athleteId,
      role: user.role,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[API] DELETE /api/admin/athletes/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
