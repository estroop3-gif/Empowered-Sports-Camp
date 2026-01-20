/**
 * Cron: Royalty Automation
 *
 * POST /api/cron/royalties
 *
 * Automated royalty management:
 * 1. Generate invoices for completed camps without invoices
 * 2. Mark overdue invoices
 * 3. Send reminders for upcoming due dates
 *
 * Should be called daily by an external scheduler (e.g., Vercel Cron, AWS EventBridge)
 *
 * Setup in vercel.json:
 * {
 *   "crons": [
 *     { "path": "/api/cron/royalties", "schedule": "0 6 * * *" }
 *   ]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import {
  getCampsWithoutRoyaltyInvoices,
  bulkGenerateRoyaltyInvoices,
  markOverdueInvoices,
} from '@/lib/services/admin-royalties'
import { createNotification } from '@/lib/services/notifications'

// Verify cron secret for security
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.warn('[Cron] CRON_SECRET not configured - skipping auth check in development')
    return process.env.NODE_ENV === 'development'
  }

  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
}

export async function POST(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const results = {
      invoicesGenerated: 0,
      invoicesFailed: 0,
      invoicesMarkedOverdue: 0,
      dueSoonReminders: 0,
      errors: [] as string[],
    }

    console.log('[Cron] Starting royalty automation job')

    // 1. Find completed camps without invoices
    const { data: campsNeedingInvoices, error: fetchError } = await getCampsWithoutRoyaltyInvoices({
      limit: 100,
    })

    if (fetchError) {
      console.error('[Cron] Failed to fetch camps needing invoices:', fetchError)
      results.errors.push(`Fetch error: ${fetchError.message}`)
    } else if (campsNeedingInvoices && campsNeedingInvoices.length > 0) {
      console.log(`[Cron] Found ${campsNeedingInvoices.length} camps needing royalty invoices`)

      // Filter to only completed camps (not in progress)
      const completedCamps = campsNeedingInvoices.filter(c => c.status === 'completed')

      if (completedCamps.length > 0) {
        const campIds = completedCamps.map(c => c.id)

        const { data: generateResult, error: genError } = await bulkGenerateRoyaltyInvoices({
          campIds,
          generatedBy: 'system-auto',
          dueInDays: 30,
        })

        if (genError) {
          console.error('[Cron] Failed to generate invoices:', genError)
          results.errors.push(`Generate error: ${genError.message}`)
        } else if (generateResult) {
          results.invoicesGenerated = generateResult.generated
          results.invoicesFailed = generateResult.failed
          results.errors.push(...generateResult.errors)

          console.log(`[Cron] Generated ${generateResult.generated} invoices, ${generateResult.failed} failed`)
        }
      }
    }

    // 2. Mark overdue invoices
    const { data: overdueResult, error: overdueError } = await markOverdueInvoices()

    if (overdueError) {
      console.error('[Cron] Failed to mark overdue invoices:', overdueError)
      results.errors.push(`Overdue error: ${overdueError.message}`)
    } else if (overdueResult) {
      results.invoicesMarkedOverdue = overdueResult.updated
      console.log(`[Cron] Marked ${overdueResult.updated} invoices as overdue`)
    }

    // 3. Send reminders for invoices due soon (within 7 days)
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

    const invoicesDueSoon = await prisma.royaltyInvoice.findMany({
      where: {
        status: 'invoiced',
        dueDate: {
          gte: new Date(),
          lte: sevenDaysFromNow,
        },
      },
      include: {
        tenant: true,
        camp: true,
      },
    })

    console.log(`[Cron] Found ${invoicesDueSoon.length} invoices due soon`)

    for (const invoice of invoicesDueSoon) {
      // Find licensee owner to notify
      const licenseeOwner = await prisma.userRoleAssignment.findFirst({
        where: {
          tenantId: invoice.tenantId,
          role: 'licensee_owner',
          isActive: true,
        },
        select: { userId: true },
      })

      if (licenseeOwner) {
        const daysUntilDue = Math.ceil(
          (invoice.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )

        await createNotification({
          userId: licenseeOwner.userId,
          tenantId: invoice.tenantId,
          type: 'royalty_invoice_overdue',
          category: 'royalty',
          title: 'Royalty Payment Reminder',
          body: `Invoice ${invoice.invoiceNumber} for ${invoice.camp?.name || 'royalties'} is due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}. Amount: $${(invoice.totalDueCents / 100).toFixed(2)}`,
          severity: 'warning',
          actionUrl: `/portal/royalties/${invoice.id}`,
        }).catch((err) => console.error('[Cron] Failed to send due soon reminder:', err))

        results.dueSoonReminders++
      }
    }

    // 4. Notify HQ admins of overdue invoices (weekly summary on Mondays)
    const today = new Date()
    if (today.getDay() === 1) {
      // Monday
      const overdueInvoices = await prisma.royaltyInvoice.findMany({
        where: { status: 'overdue' },
        include: {
          tenant: true,
          camp: true,
        },
      })

      if (overdueInvoices.length > 0) {
        const totalOverdue = overdueInvoices.reduce(
          (sum, inv) => sum + inv.totalDueCents,
          0
        )

        // Find HQ admins to notify
        const hqAdmins = await prisma.userRoleAssignment.findMany({
          where: {
            role: 'hq_admin',
            isActive: true,
          },
          select: { userId: true },
        })

        for (const admin of hqAdmins) {
          await createNotification({
            userId: admin.userId,
            type: 'system_alert',
            category: 'royalty',
            title: 'Weekly Overdue Royalties Summary',
            body: `${overdueInvoices.length} royalty invoice${overdueInvoices.length === 1 ? '' : 's'} are overdue, totaling $${(totalOverdue / 100).toFixed(2)}.`,
            severity: 'error',
            actionUrl: '/admin/royalties?status=overdue',
          }).catch((err) => console.error('[Cron] Failed to send HQ overdue summary:', err))
        }
      }
    }

    console.log('[Cron] Royalty automation job completed:', results)

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron] Royalty automation job failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Support GET for manual triggering in development
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'GET only allowed in development' }, { status: 405 })
  }
  return POST(request)
}
