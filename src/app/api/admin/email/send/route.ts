/**
 * Admin Email Send API
 *
 * POST /api/admin/email/send
 * Sends ad-hoc emails from the admin compose page
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import { sendEmail, logEmail, DEFAULT_FROM } from '@/lib/email/resend-client'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { to, subject, html, emailType } = body

    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json({ error: 'to must be a non-empty array of email addresses' }, { status: 400 })
    }

    if (!subject || !html) {
      return NextResponse.json({ error: 'subject and html are required' }, { status: 400 })
    }

    let sent = 0
    let failed = 0

    for (const email of to) {
      const result = await sendEmail({
        to: email,
        subject,
        html,
      })

      await logEmail({
        toEmail: email,
        subject,
        emailType: emailType || 'broadcast',
        status: result.success ? 'sent' : 'failed',
        providerMessageId: result.messageId,
        errorMessage: result.error,
        userId: user.id,
        payload: { html, sentBy: user.id, sentByEmail: user.email },
      })

      if (result.success) {
        sent++
      } else {
        failed++
      }
    }

    return NextResponse.json({
      data: { sent, failed, total: to.length },
    })
  } catch (error) {
    console.error('[API] Admin email send error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
