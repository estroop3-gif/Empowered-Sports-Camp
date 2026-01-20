/**
 * SHELL: Daily Recap Email API
 *
 * POST /api/email/daily-recap
 * Sends daily recap email to parents after camp day.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import { sendDailyRecapEmailBatch } from '@/lib/services/email'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { campDayId } = body

    if (!campDayId) {
      return NextResponse.json(
        { error: 'campDayId is required' },
        { status: 400 }
      )
    }

    // SHELL: Only directors and above can trigger daily recap emails
    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    const { data, error } = await sendDailyRecapEmailBatch({ campDayId, tenantId: user.tenantId })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] Daily recap email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
