/**
 * Waitlist Offer Details API
 *
 * GET /api/waitlist/offer/[token] — Get offer details for the public offer page
 */

import { NextRequest, NextResponse } from 'next/server'
import { getOfferDetails } from '@/lib/services/waitlist'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const details = await getOfferDetails(token)

    if (!details) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    return NextResponse.json({ data: details })
  } catch (error) {
    console.error('[GET /api/waitlist/offer/[token]] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
