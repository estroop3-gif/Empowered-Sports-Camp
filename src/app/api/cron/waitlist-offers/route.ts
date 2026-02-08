/**
 * Waitlist Offers Cron
 *
 * GET /api/cron/waitlist-offers — Expire stale offers and promote next in line
 * Runs every 15 minutes via Vercel Cron
 */

import { NextResponse } from 'next/server'
import { expireStaleOffers } from '@/lib/services/waitlist'

export async function GET() {
  try {
    const result = await expireStaleOffers()

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron] Waitlist offers processing failed:', error)
    return NextResponse.json(
      { error: 'Failed to process waitlist offers' },
      { status: 500 }
    )
  }
}
