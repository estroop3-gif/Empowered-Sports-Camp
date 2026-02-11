/**
 * Guest-accessible endpoint to list other registered campers for a camp.
 * Used during registration (before account creation) so users can build squads.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getOtherRegisteredCampers } from '@/lib/services/campSquads'

export async function GET(request: NextRequest) {
  try {
    const campId = request.nextUrl.searchParams.get('campId')

    if (!campId) {
      return NextResponse.json({ error: 'campId required' }, { status: 400 })
    }

    const { data, error } = await getOtherRegisteredCampers({ campId })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[Other Campers API] GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
