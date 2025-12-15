/**
 * SHELL: Camp Confirmation Email API
 *
 * POST /api/email/camp-confirmation
 * Sends camp registration confirmation email.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import { sendCampConfirmationEmail } from '@/lib/services/email'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { registrationId } = body

    if (!registrationId) {
      return NextResponse.json(
        { error: 'registrationId is required' },
        { status: 400 }
      )
    }

    // SHELL: Check permissions - must be admin, licensee, or the registering parent
    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    if (!allowedRoles.includes(user.role) && user.role !== 'parent') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await sendCampConfirmationEmail({
      registrationId,
      tenantId: user.tenantId || '',
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] Camp confirmation email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
