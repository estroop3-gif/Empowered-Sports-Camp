/**
 * SHELL: Curriculum Review API
 *
 * POST /api/curriculum/review
 * Reviews (approve/reject/request revision) a curriculum submission.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import { reviewCurriculumSubmission } from '@/lib/services/curriculum-submissions'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { submissionId, action, notes } = body

    if (!submissionId) {
      return NextResponse.json(
        { error: 'submissionId is required' },
        { status: 400 }
      )
    }

    if (!action || !['APPROVE', 'REJECT', 'REQUEST_REVISION'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be APPROVE, REJECT, or REQUEST_REVISION' },
        { status: 400 }
      )
    }

    // SHELL: Only HQ admins can review curriculum submissions
    if (user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await reviewCurriculumSubmission({
      submissionId,
      action,
      notes,
      reviewerUserId: user.id,
      tenantId: user.tenantId || '',
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] Curriculum review error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
