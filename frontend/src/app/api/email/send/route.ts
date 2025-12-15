/**
 * SHELL: Generic Email Send API
 *
 * POST /api/email/send
 * Sends a transactional email via Resend.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import { sendTransactionalEmail, EmailTemplateCode } from '@/lib/services/email'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { to, templateCode, context } = body

    if (!to || !templateCode) {
      return NextResponse.json(
        { error: 'to and templateCode are required' },
        { status: 400 }
      )
    }

    // SHELL: Only admins and licensees can send arbitrary emails
    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    const { data, error } = await sendTransactionalEmail({
      to,
      templateCode: templateCode as EmailTemplateCode,
      context: context || {},
      tenantId: user.tenantId,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] Email send error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
