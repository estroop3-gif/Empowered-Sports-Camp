/**
 * SHELL: List Curriculum Submissions API
 *
 * GET /api/curriculum/submissions
 * Lists curriculum submissions for review (admin) or own submissions (user).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import { listCurriculumSubmissionsForReview } from '@/lib/services/curriculum-submissions'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // SHELL: Admins see all, others see their own
    const allowedRoles = ['hq_admin', 'licensee_owner', 'director', 'cit_volunteer']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await listCurriculumSubmissionsForReview({
      tenantId: user.tenantId || '',
      role: user.role,
      status: status?.toLowerCase() as 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'revision_requested' | undefined,
      limit,
      offset,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] List curriculum submissions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
