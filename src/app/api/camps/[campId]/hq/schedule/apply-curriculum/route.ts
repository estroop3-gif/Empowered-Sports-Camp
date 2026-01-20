/**
 * Apply Curriculum to Schedule API
 *
 * POST /api/camps/[campId]/hq/schedule/apply-curriculum - Generate schedule from curriculum template
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  getCampAssignedCurriculum,
  applyCurriculumToSchedule,
} from '@/lib/services/campSchedule'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const { campId } = await params

    const assignment = await getCampAssignedCurriculum(campId)

    if (!assignment) {
      return NextResponse.json({ data: null })
    }

    return NextResponse.json({
      data: {
        id: assignment.id,
        templateId: assignment.templateId,
        templateName: assignment.template.name,
        templateSport: assignment.template.sport,
        totalDays: assignment.template.totalDays,
        assignedAt: assignment.assignedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[GET /api/camps/[campId]/hq/schedule/apply-curriculum] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    // Get template ID from body or from assigned curriculum
    let templateId = body.templateId
    if (!templateId) {
      const assignment = await getCampAssignedCurriculum(campId)
      if (!assignment) {
        return NextResponse.json(
          { error: 'No curriculum template assigned to this camp' },
          { status: 400 }
        )
      }
      templateId = assignment.templateId
    }

    const campStartTime = body.campStartTime || '09:00'

    const result = await applyCurriculumToSchedule(campId, templateId, campStartTime)

    return NextResponse.json({
      data: result,
      message: `Created ${result.daysCreated} days with ${result.blocksCreated} blocks`,
    })
  } catch (error) {
    console.error('[POST /api/camps/[campId]/hq/schedule/apply-curriculum] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
