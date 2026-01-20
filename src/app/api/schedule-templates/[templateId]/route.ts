/**
 * Schedule Template API
 *
 * GET /api/schedule-templates/[templateId] - Get a single template
 * PUT /api/schedule-templates/[templateId] - Update a template
 * DELETE /api/schedule-templates/[templateId] - Delete a template
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  getScheduleTemplate,
  updateScheduleTemplate,
  deleteScheduleTemplate,
} from '@/lib/services/campSchedule'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { templateId } = await params

    const template = await getScheduleTemplate(templateId)
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ data: template })
  } catch (error) {
    console.error('[GET /api/schedule-templates/[templateId]] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { templateId } = await params
    const body = await request.json()

    // Check template exists and user has permission
    const existing = await getScheduleTemplate(templateId)
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Only allow updating own templates or admin updating global
    if (existing.licenseeId && existing.licenseeId !== user.tenantId && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const template = await updateScheduleTemplate(templateId, {
      name: body.name,
      description: body.description,
      defaultStartTime: body.defaultStartTime,
      defaultEndTime: body.defaultEndTime,
      totalDays: body.totalDays,
      sport: body.sport,
      isGlobal: user.role === 'admin' ? body.isGlobal : existing.isGlobal,
    })

    return NextResponse.json({ data: template })
  } catch (error) {
    console.error('[PUT /api/schedule-templates/[templateId]] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { templateId } = await params

    // Check template exists and user has permission
    const existing = await getScheduleTemplate(templateId)
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Only allow deleting own templates or admin
    if (existing.licenseeId && existing.licenseeId !== user.tenantId && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await deleteScheduleTemplate(templateId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/schedule-templates/[templateId]] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
