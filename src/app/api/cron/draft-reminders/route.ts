/**
 * Draft Reminders Cron Job
 *
 * Processes timed reminder emails for abandoned registration drafts.
 * - 24h gentle reminder
 * - 72h urgency reminder
 *
 * Schedule: Every 6 hours (configured in vercel.json)
 */

import { NextRequest, NextResponse } from 'next/server'
import { processDraftReminders } from '@/lib/services/registrationDrafts'

function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.warn('[Cron] CRON_SECRET not configured')
    return process.env.NODE_ENV === 'development'
  }
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('[Cron] Processing draft reminders...')
    const results = await processDraftReminders()
    console.log('[Cron] Draft reminders complete:', results)

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron] Draft reminders failed:', error)
    return NextResponse.json(
      { error: 'Failed to process draft reminders' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'GET only allowed in development' }, { status: 405 })
  }
  return POST(request)
}
