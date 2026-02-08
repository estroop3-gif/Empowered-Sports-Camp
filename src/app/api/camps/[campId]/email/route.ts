/**
 * Camp Email Send API
 *
 * POST /api/camps/[campId]/email
 * Sends blast or individual emails to camp parents
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getAuthUser } from '@/lib/auth/server'
import { sendEmail, logEmail } from '@/lib/email/resend-client'

interface RouteParams {
  params: Promise<{ campId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { campId } = await params
    const body = await request.json()
    const { mode, recipientIds, subject, html } = body

    if (!subject || !html) {
      return NextResponse.json(
        { error: 'subject and html are required' },
        { status: 400 }
      )
    }

    // Get camp info for template variables
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: { name: true, tenantId: true },
    })

    if (!camp) {
      return NextResponse.json({ error: 'Camp not found' }, { status: 404 })
    }

    // Determine recipients
    let recipients: { email: string; parentFirstName: string; camperFirstName: string; userId: string }[]

    if (mode === 'individual' && recipientIds && recipientIds.length > 0) {
      // Individual mode - send to specific parents
      const registrations = await prisma.registration.findMany({
        where: {
          campId,
          parentId: { in: recipientIds },
          status: { in: ['confirmed'] },
        },
        include: {
          parent: { select: { id: true, email: true, firstName: true } },
          athlete: { select: { firstName: true } },
        },
      })

      // Group by parent
      const parentMap = new Map<string, { email: string; parentFirstName: string; camperFirstName: string; userId: string }>()
      for (const reg of registrations) {
        if (!reg.parent?.email) continue
        const existing = parentMap.get(reg.parent.id)
        if (existing) {
          existing.camperFirstName += ` and ${reg.athlete?.firstName || 'Camper'}`
        } else {
          parentMap.set(reg.parent.id, {
            email: reg.parent.email,
            parentFirstName: reg.parent.firstName || 'Parent',
            camperFirstName: reg.athlete?.firstName || 'Camper',
            userId: reg.parent.id,
          })
        }
      }
      recipients = Array.from(parentMap.values())
    } else {
      // Blast mode - send to all registered parents
      const registrations = await prisma.registration.findMany({
        where: {
          campId,
          status: { in: ['confirmed'] },
        },
        include: {
          parent: { select: { id: true, email: true, firstName: true } },
          athlete: { select: { firstName: true } },
        },
      })

      const parentMap = new Map<string, { email: string; parentFirstName: string; camperFirstName: string; userId: string }>()
      for (const reg of registrations) {
        if (!reg.parent?.email) continue
        const existing = parentMap.get(reg.parent.id)
        if (existing) {
          existing.camperFirstName += ` and ${reg.athlete?.firstName || 'Camper'}`
        } else {
          parentMap.set(reg.parent.id, {
            email: reg.parent.email,
            parentFirstName: reg.parent.firstName || 'Parent',
            camperFirstName: reg.athlete?.firstName || 'Camper',
            userId: reg.parent.id,
          })
        }
      }
      recipients = Array.from(parentMap.values())
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients found for this camp' },
        { status: 400 }
      )
    }

    let sent = 0
    let failed = 0

    for (const recipient of recipients) {
      // Substitute template variables
      const personalizedHtml = html
        .replace(/\{\{parentFirstName\}\}/g, recipient.parentFirstName)
        .replace(/\{\{camperFirstName\}\}/g, recipient.camperFirstName)
        .replace(/\{\{campName\}\}/g, camp.name)

      const personalizedSubject = subject
        .replace(/\{\{parentFirstName\}\}/g, recipient.parentFirstName)
        .replace(/\{\{camperFirstName\}\}/g, recipient.camperFirstName)
        .replace(/\{\{campName\}\}/g, camp.name)

      const result = await sendEmail({
        to: recipient.email,
        subject: personalizedSubject,
        html: personalizedHtml,
      })

      await logEmail({
        toEmail: recipient.email,
        subject: personalizedSubject,
        emailType: 'staff_message',
        tenantId: camp.tenantId,
        userId: recipient.userId,
        status: result.success ? 'sent' : 'failed',
        providerMessageId: result.messageId,
        errorMessage: result.error,
        payload: { html: personalizedHtml, campId, mode, sentBy: user.id },
      })

      if (result.success) {
        sent++
      } else {
        failed++
      }
    }

    return NextResponse.json({
      data: { sent, failed, total: recipients.length },
    })
  } catch (error) {
    console.error('[API] Camp email send error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
