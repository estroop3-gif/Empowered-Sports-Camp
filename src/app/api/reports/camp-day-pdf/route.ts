/**
 * SHELL: Camp Day PDF Report API
 *
 * POST /api/reports/camp-day-pdf
 * Generates an end-of-day report for Camp Day flow.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import { generateCampDayPdfReport } from '@/lib/services/reports'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { campDayId } = body

    if (!campDayId) {
      return NextResponse.json({ error: 'campDayId is required' }, { status: 400 })
    }

    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await generateCampDayPdfReport({
      campDayId,
      tenantId: user.tenantId || '',
      role: user.role,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] Camp day PDF report error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
