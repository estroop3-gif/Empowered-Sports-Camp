/**
 * SHELL: Session PDF Report API
 *
 * POST /api/reports/session-pdf
 * Generates a full PDF report for a camp session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import { generateSessionPdfReport } from '@/lib/services/reports'

export async function POST(request: NextRequest) {
  try {
    // SHELL: Get authenticated user
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { campSessionId } = body

    if (!campSessionId) {
      return NextResponse.json({ error: 'campSessionId is required' }, { status: 400 })
    }

    // SHELL: Check role permissions
    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // SHELL: Generate report
    const { data, error } = await generateSessionPdfReport({
      campSessionId,
      tenantId: user.tenantId || '',
      role: user.role,
    })

    if (error) {
      console.error('[API] Session PDF report error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] Session PDF report error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
