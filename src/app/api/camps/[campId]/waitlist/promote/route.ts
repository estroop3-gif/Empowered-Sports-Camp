/**
 * Waitlist Promote API
 *
 * POST /api/camps/[campId]/waitlist/promote — Manually promote a waitlisted person
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendWaitlistOffer } from '@/lib/services/waitlist'

export async function POST(request: NextRequest) {
  try {
    const { registrationId } = await request.json()

    if (!registrationId) {
      return NextResponse.json({ error: 'registrationId is required' }, { status: 400 })
    }

    await sendWaitlistOffer(registrationId)

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('[POST /api/camps/[campId]/waitlist/promote] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
