/**
 * Admin Email Template Detail API
 *
 * GET /api/admin/email-templates/[id] - Get single template
 * PUT /api/admin/email-templates/[id] - Update template
 * DELETE /api/admin/email-templates/[id] - Delete template
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getAuthUser } from '@/lib/auth/server'
import { invalidateTemplateCache } from '@/lib/services/email'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['hq_admin', 'licensee_owner']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const template = await prisma.emailTemplate.findUnique({
      where: { id },
      include: {
        tenant: {
          select: { name: true },
        },
      },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ data: template })
  } catch (error) {
    console.error('[API] Get email template error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Forbidden - HQ admin only' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, subject, bodyHtml, bodyText, description, isActive } = body

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        subject: subject !== undefined ? subject : undefined,
        bodyHtml: bodyHtml !== undefined ? bodyHtml : undefined,
        bodyText: bodyText !== undefined ? bodyText : undefined,
        description: description !== undefined ? description : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        updatedBy: user.id,
      },
    })

    // Invalidate cache so updated template is used
    invalidateTemplateCache()

    return NextResponse.json({ data: template })
  } catch (error) {
    console.error('[API] Update email template error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Forbidden - HQ admin only' }, { status: 403 })
    }

    const { id } = await params

    await prisma.emailTemplate.delete({
      where: { id },
    })

    // Invalidate cache
    invalidateTemplateCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Delete email template error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
