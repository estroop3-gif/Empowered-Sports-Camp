/**
 * Schedule Templates API
 *
 * GET /api/schedule-templates - List all schedule templates
 * POST /api/schedule-templates - Create a new schedule template
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  getScheduleTemplates,
  createScheduleTemplate,
} from '@/lib/services/campSchedule'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const licenseeId = searchParams.get('licenseeId') || user.tenantId || undefined
    const includeGlobal = searchParams.get('includeGlobal') !== 'false'

    const templates = await getScheduleTemplates({ licenseeId, includeGlobal })

    return NextResponse.json({ data: templates })
  } catch (error) {
    console.error('[GET /api/schedule-templates] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.name) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      )
    }

    const template = await createScheduleTemplate(
      {
        name: body.name,
        description: body.description,
        defaultStartTime: body.defaultStartTime,
        defaultEndTime: body.defaultEndTime,
        totalDays: body.totalDays,
        sport: body.sport,
        isGlobal: user.role === 'admin' ? body.isGlobal : false,
      },
      user.id,
      body.licenseeId || user.tenantId
    )

    return NextResponse.json({ data: template }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/schedule-templates] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
