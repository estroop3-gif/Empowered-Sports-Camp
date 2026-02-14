/**
 * Admin: Backfill Registration Confirmation Emails
 *
 * POST /api/admin/email/backfill-confirmations
 * Finds confirmed registrations that never received a confirmation email
 * and sends them. Supports dry-run mode.
 *
 * Body: { dryRun?: boolean }
 *   - dryRun=true (default): returns list of registrations that would receive emails
 *   - dryRun=false: actually sends the emails
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getAuthUser } from '@/lib/auth/server'
import { sendRegistrationConfirmationEmail } from '@/lib/services/email'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const dryRun = body.dryRun !== false // default to dry run

    // Find all confirmed registrations
    const confirmedRegistrations = await prisma.registration.findMany({
      where: { status: 'confirmed' },
      select: {
        id: true,
        tenantId: true,
        confirmationNumber: true,
        paidAt: true,
        createdAt: true,
        athlete: { select: { firstName: true, lastName: true } },
        parent: { select: { email: true, firstName: true, lastName: true } },
        camp: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    if (confirmedRegistrations.length === 0) {
      return NextResponse.json({
        data: { message: 'No confirmed registrations found', missing: [], sent: 0, failed: 0 },
      })
    }

    // Find which of these already have a successful confirmation email
    const registrationIds = confirmedRegistrations.map(r => r.id)

    const existingEmails = await prisma.emailLog.findMany({
      where: {
        emailType: 'registration_confirmation',
        status: 'sent',
      },
      select: {
        payload: true,
      },
    })

    // Extract registration IDs from email log payloads
    const emailedRegistrationIds = new Set<string>()
    for (const log of existingEmails) {
      const payload = log.payload as Record<string, unknown> | null
      if (payload?.registrationId && typeof payload.registrationId === 'string') {
        emailedRegistrationIds.add(payload.registrationId)
      }
    }

    // Filter to registrations that never got a confirmation email
    const missing = confirmedRegistrations.filter(r => !emailedRegistrationIds.has(r.id))

    const summary = missing.map(r => ({
      registrationId: r.id,
      confirmationNumber: r.confirmationNumber,
      parentEmail: r.parent?.email,
      parentName: `${r.parent?.firstName || ''} ${r.parent?.lastName || ''}`.trim(),
      athleteName: `${r.athlete?.firstName || ''} ${r.athlete?.lastName || ''}`.trim(),
      campName: r.camp?.name,
      paidAt: r.paidAt?.toISOString() || null,
      createdAt: r.createdAt.toISOString(),
    }))

    if (dryRun) {
      return NextResponse.json({
        data: {
          dryRun: true,
          message: `Found ${missing.length} confirmed registration(s) without confirmation emails (out of ${confirmedRegistrations.length} total confirmed). Set dryRun=false to send.`,
          totalConfirmed: confirmedRegistrations.length,
          alreadyEmailed: confirmedRegistrations.length - missing.length,
          missing: summary,
        },
      })
    }

    // Actually send the emails
    let sent = 0
    let failed = 0
    const results: { registrationId: string; parentEmail: string | undefined; status: string; error?: string }[] = []

    for (const reg of missing) {
      const { data, error } = await sendRegistrationConfirmationEmail({
        registrationId: reg.id,
        tenantId: reg.tenantId,
      })

      if (error) {
        failed++
        results.push({
          registrationId: reg.id,
          parentEmail: reg.parent?.email,
          status: 'failed',
          error: error.message,
        })
        console.error(`[Backfill] Failed to send confirmation for ${reg.id}:`, error.message)
      } else {
        sent++
        results.push({
          registrationId: reg.id,
          parentEmail: reg.parent?.email,
          status: 'sent',
        })
        console.log(`[Backfill] Confirmation email sent for ${reg.id} to ${reg.parent?.email}`)
      }
    }

    return NextResponse.json({
      data: {
        dryRun: false,
        message: `Sent ${sent} confirmation email(s), ${failed} failed.`,
        totalConfirmed: confirmedRegistrations.length,
        alreadyEmailed: confirmedRegistrations.length - missing.length,
        sent,
        failed,
        results,
      },
    })
  } catch (error) {
    console.error('[API] Backfill confirmations error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
