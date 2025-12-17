/**
 * Save Camp Schedule as Template API
 *
 * POST /api/camps/[campId]/hq/schedule/save-as-template - Save current camp schedule as a reusable template
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { saveCampScheduleAsTemplate } from '@/lib/services/campSchedule'

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

    if (!body.name) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      )
    }

    const template = await saveCampScheduleAsTemplate(
      campId,
      body.name,
      body.description,
      user.id,
      body.licenseeId || user.tenantId
    )

    return NextResponse.json({
      data: template,
      message: `Schedule saved as template "${template.name}" with ${template.blocks.length} blocks`,
    })
  } catch (error) {
    console.error('[POST /api/camps/[campId]/hq/schedule/save-as-template] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
