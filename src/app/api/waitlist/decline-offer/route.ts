/**
 * Waitlist Decline Offer API
 *
 * POST /api/waitlist/decline-offer — Decline a waitlist offer
 */

import { NextRequest, NextResponse } from 'next/server'
import { declineOffer } from '@/lib/services/waitlist'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    await declineOffer(token)

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('[POST /api/waitlist/decline-offer] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
