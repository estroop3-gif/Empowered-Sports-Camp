/**
 * SHELL: Curriculum PDF Export API
 *
 * POST /api/reports/curriculum-pdf
 * Exports curriculum templates/blocks as PDF.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import { exportCurriculumPdf } from '@/lib/services/reports'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { curriculumId } = body

    if (!curriculumId) {
      return NextResponse.json(
        { error: 'curriculumId required' },
        { status: 400 }
      )
    }

    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await exportCurriculumPdf({
      curriculumId,
      tenantId: user.tenantId || '',
      role: user.role,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] Curriculum PDF export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
