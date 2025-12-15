/**
 * Cron: Camp Reminder Emails
 *
 * POST /api/cron/email/camp-reminders
 * Sends reminder emails for upcoming camps:
 * - Two weeks before camp starts
 * - Two days before camp starts
 *
 * Should be called daily by an external scheduler (e.g., Vercel Cron, AWS EventBridge)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { sendTwoWeeksOutEmail, sendTwoDaysBeforeEmail } from '@/lib/services/email'

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
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Calculate target dates
    const twoWeeksFromNow = new Date(today)
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14)

    const twoDaysFromNow = new Date(today)
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)

    const results = {
      twoWeeksOut: { sent: 0, failed: 0, skipped: 0 },
      twoDaysBefore: { sent: 0, failed: 0, skipped: 0 },
    }

    // Find camps starting in exactly 2 weeks
    const campsStartingIn2Weeks = await prisma.camp.findMany({
      where: {
        startDate: twoWeeksFromNow,
        status: { in: ['registration_open', 'registration_closed'] },
      },
      include: {
        registrations: {
          where: { status: 'confirmed' },
          select: { id: true, tenantId: true },
        },
      },
    })

    console.log(`[Cron] Found ${campsStartingIn2Weeks.length} camps starting in 2 weeks`)

    // Send two-weeks-out emails
    for (const camp of campsStartingIn2Weeks) {
      for (const registration of camp.registrations) {
        const { error } = await sendTwoWeeksOutEmail({
          registrationId: registration.id,
          tenantId: registration.tenantId,
        })

        if (error) {
          console.error(`[Cron] Failed to send 2-week email for registration ${registration.id}:`, error)
          results.twoWeeksOut.failed++
        } else {
          results.twoWeeksOut.sent++
        }
      }
    }

    // Find camps starting in exactly 2 days
    const campsStartingIn2Days = await prisma.camp.findMany({
      where: {
        startDate: twoDaysFromNow,
        status: { in: ['registration_open', 'registration_closed'] },
      },
      include: {
        registrations: {
          where: { status: 'confirmed' },
          select: { id: true, tenantId: true },
        },
      },
    })

    console.log(`[Cron] Found ${campsStartingIn2Days.length} camps starting in 2 days`)

    // Send two-days-before emails
    for (const camp of campsStartingIn2Days) {
      for (const registration of camp.registrations) {
        const { error } = await sendTwoDaysBeforeEmail({
          registrationId: registration.id,
          tenantId: registration.tenantId,
        })

        if (error) {
          console.error(`[Cron] Failed to send 2-day email for registration ${registration.id}:`, error)
          results.twoDaysBefore.failed++
        } else {
          results.twoDaysBefore.sent++
        }
      }
    }

    console.log('[Cron] Camp reminder emails completed:', results)

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron] Camp reminder email job failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also support GET for manual triggering in development
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'GET only allowed in development' }, { status: 405 })
  }
  return POST(request)
}
