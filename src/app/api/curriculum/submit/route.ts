/**
 * SHELL: Curriculum Submission API
 *
 * POST /api/curriculum/submit
 * Submits a curriculum contribution for review.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import { submitCurriculumContribution } from '@/lib/services/curriculum-submissions'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, sport, level, attachmentUrl, videoUrl } = body

    if (!title || !description) {
      return NextResponse.json(
        { error: 'title and description are required' },
        { status: 400 }
      )
    }

    // SHELL: Allow directors, CIT volunteers, and licensees to submit
    const allowedRoles = ['hq_admin', 'licensee_owner', 'director', 'cit_volunteer']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await submitCurriculumContribution({
      title,
      description,
      sport,
      level,
      attachmentUrl,
      videoUrl,
      tenantId: user.tenantId || '',
      submittedByUserId: user.id,
      role: user.role,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] Curriculum submit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
