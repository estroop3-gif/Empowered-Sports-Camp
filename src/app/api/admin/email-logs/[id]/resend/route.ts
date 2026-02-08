/**
 * Admin Email Resend API
 *
 * POST /api/admin/email-logs/[id]/resend
 * Re-sends a previously sent email (useful for failed emails)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getAuthUser } from '@/lib/auth/server'
import { sendEmail, logEmail } from '@/lib/email/resend-client'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Fetch the original email log
    const originalLog = await prisma.emailLog.findUnique({
      where: { id },
    })

    if (!originalLog) {
      return NextResponse.json({ error: 'Email log not found' }, { status: 404 })
    }

    // Get HTML from the payload
    const payload = originalLog.payload as Record<string, unknown> | null
    const html = (payload?.html as string) || (payload?.htmlBody as string)

    if (!html) {
      return NextResponse.json(
        { error: 'No HTML body found in original email. Cannot resend.' },
        { status: 400 }
      )
    }

    // Resend the email
    const result = await sendEmail({
      to: originalLog.toEmail,
      subject: originalLog.subject,
      html,
      from: originalLog.fromEmail || undefined,
    })

    // Log the resend
    await logEmail({
      toEmail: originalLog.toEmail,
      fromEmail: originalLog.fromEmail || undefined,
      subject: originalLog.subject,
      emailType: originalLog.emailType,
      tenantId: originalLog.tenantId,
      userId: originalLog.userId,
      status: result.success ? 'sent' : 'failed',
      providerMessageId: result.messageId,
      errorMessage: result.error,
      payload: { ...(payload || {}), resentFromLogId: id },
    })

    if (!result.success) {
      return NextResponse.json(
        { error: `Failed to resend: ${result.error}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: { success: true, messageId: result.messageId },
    })
  } catch (error) {
    console.error('[API] Email resend error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
