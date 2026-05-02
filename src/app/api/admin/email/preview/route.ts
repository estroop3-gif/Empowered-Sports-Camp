/**
 * Admin Email — Preview Branded Email HTML
 *
 * POST /api/admin/email/preview
 * Returns the fully branded HTML for preview purposes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import {
  brandWrap,
  emailLabel,
  emailHeading,
  emailParagraph,
  emailButton,
  APP_URL,
  BRAND,
} from '@/lib/email/brand-layout'

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  notification: { label: 'CAMP NOTIFICATION', color: BRAND.purple },
  reminder: { label: 'CAMP REMINDER', color: BRAND.magenta },
  update: { label: 'CAMP UPDATE', color: BRAND.neon },
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user || user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { body, emailType, subject, campName } = await request.json()

    if (!body || !subject) {
      return NextResponse.json({ error: 'body and subject are required' }, { status: 400 })
    }

    const config = TYPE_CONFIG[emailType] || TYPE_CONFIG.notification

    // Replace template variables with sample values for preview
    const previewBody = body
      .replace(/\{\{parentFirstName\}\}/g, 'Sarah')
      .replace(/\{\{camperFirstName\}\}/g, 'Alex')
      .replace(/\{\{campName\}\}/g, campName || 'Summer Sports Camp')

    const previewSubject = subject
      .replace(/\{\{parentFirstName\}\}/g, 'Sarah')
      .replace(/\{\{camperFirstName\}\}/g, 'Alex')
      .replace(/\{\{campName\}\}/g, campName || 'Summer Sports Camp')

    // Build branded HTML
    const paragraphs = previewBody.split(/\n\n+/).filter(Boolean)
    const bodyContent = [
      emailLabel(config.label, config.color),
      emailHeading(previewSubject),
      ...paragraphs.map((p: string) => emailParagraph(p.replace(/\n/g, '<br>'))),
      emailButton('View Dashboard', `${APP_URL}/parent/dashboard`),
    ].join('\n')

    const html = brandWrap(bodyContent)

    return NextResponse.json({ data: { html } })
  } catch (error) {
    console.error('[API] Admin email preview error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
