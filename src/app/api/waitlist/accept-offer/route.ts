/**
 * Waitlist Accept Offer API
 *
 * POST /api/waitlist/accept-offer — Accept a waitlist offer and go to payment
 */

import { NextRequest, NextResponse } from 'next/server'
import { acceptOffer } from '@/lib/services/waitlist'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''
    const result = await acceptOffer(token, baseUrl)

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('[POST /api/waitlist/accept-offer] Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message.includes('expired') || message.includes('no longer') ? 410 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
