/**
 * Admin Email Logs API
 *
 * GET /api/admin/email-logs
 * Returns email logs for admin visibility
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getAuthUser } from '@/lib/auth/server'
import { EmailType, EmailStatus } from '@/generated/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin roles can view email logs
    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    if (!allowedRoles.includes(user.role)) {
      console.log('[API] Email logs - User role not allowed:', user.role)
      return NextResponse.json({ error: `Forbidden - Role '${user.role}' cannot access email logs.` }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const emailType = searchParams.get('type') as EmailType | null
    const status = searchParams.get('status') as EmailStatus | null
    const search = searchParams.get('search')
    const countsOnly = searchParams.get('counts') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: {
      tenantId?: string
      emailType?: EmailType
      status?: EmailStatus
      OR?: { toEmail?: { contains: string; mode: 'insensitive' }; subject?: { contains: string; mode: 'insensitive' } }[]
    } = {}

    // Tenant scoping
    if (user.role !== 'hq_admin' && user.tenantId) {
      where.tenantId = user.tenantId
    }

    if (emailType) {
      where.emailType = emailType
    }

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { toEmail: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ]
    }

    // If just counts requested
    if (countsOnly) {
      const [sent, failed, bounced, delivered, total] = await Promise.all([
        prisma.emailLog.count({ where: { ...where, status: 'sent' } }),
        prisma.emailLog.count({ where: { ...where, status: 'failed' } }),
        prisma.emailLog.count({ where: { ...where, status: 'bounced' } }),
        prisma.emailLog.count({ where: { ...where, status: 'delivered' } }),
        prisma.emailLog.count({ where }),
      ])

      return NextResponse.json({
        data: { sent, failed, bounced, delivered, total },
      })
    }

    // Fetch logs with pagination
    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          tenant: {
            select: {
              name: true,
              slug: true,
            },
          },
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.emailLog.count({ where }),
    ])

    return NextResponse.json({
      data: {
        logs: logs.map(log => ({
          id: log.id,
          toEmail: log.toEmail,
          fromEmail: log.fromEmail,
          subject: log.subject,
          emailType: log.emailType,
          status: log.status,
          errorMessage: log.errorMessage,
          createdAt: log.createdAt.toISOString(),
          tenantName: log.tenant?.name || null,
          userName: log.user ? `${log.user.firstName} ${log.user.lastName}` : null,
        })),
        total,
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error('[API] Email logs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
