/**
 * Apply Schedule Template API
 *
 * POST /api/camps/[campId]/hq/schedule/apply-template - Apply a schedule template to this camp
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { applyScheduleTemplate, getScheduleTemplate } from '@/lib/services/campSchedule'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { campId } = await params
    const body = await request.json()

    if (!body.templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    // Verify template exists
    const template = await getScheduleTemplate(body.templateId)
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    const result = await applyScheduleTemplate(campId, body.templateId)

    return NextResponse.json({
      data: result,
      message: `Applied template "${template.name}": created ${result.daysCreated} days with ${result.blocksCreated} blocks`,
    })
  } catch (error) {
    console.error('[POST /api/camps/[campId]/hq/schedule/apply-template] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
