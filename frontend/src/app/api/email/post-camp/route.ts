/**
 * SHELL: Post-Camp Email API
 *
 * POST /api/email/post-camp
 * Sends post-camp survey/thank you email to parents.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import { sendPostCampEmail } from '@/lib/services/email'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { campSessionId } = body

    if (!campSessionId) {
      return NextResponse.json(
        { error: 'campSessionId is required' },
        { status: 400 }
      )
    }

    // SHELL: Only directors and above can trigger post-camp emails
    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    const { data, error } = await sendPostCampEmail({ campSessionId, tenantId: user.tenantId })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] Post-camp email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
