/**
 * List Reports API
 *
 * GET /api/reports/list
 * Lists generated PDF reports for the current tenant.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import { listReports, type ReportType } from '@/lib/services/reports'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') as ReportType | null
    const limit = parseInt(searchParams.get('limit') || '50')

    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await listReports({
      tenantId: user.tenantId || '',
      type: type || undefined,
      limit,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] List reports error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
