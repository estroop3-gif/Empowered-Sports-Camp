/**
 * Cron: Weekly Business Report Email
 *
 * POST /api/cron/email/weekly-report
 * Sends a comprehensive weekly business report to the owner.
 *
 * Scheduled every Monday at 9 AM UTC via Vercel Cron.
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendWeeklyReportEmail } from '@/lib/services/email'

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
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('[Cron] Sending weekly business report...')

    const { data, error } = await sendWeeklyReportEmail()

    if (error) {
      console.error('[Cron] Weekly report failed:', error)
      return NextResponse.json(
        { success: false, error: error.message, timestamp: new Date().toISOString() },
        { status: 500 }
      )
    }

    console.log('[Cron] Weekly report sent successfully:', data)

    return NextResponse.json({
      success: true,
      results: data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron] Weekly report job failed:', error)
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
