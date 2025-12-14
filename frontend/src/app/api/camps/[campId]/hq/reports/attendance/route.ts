/**
 * Camp HQ Attendance Report API
 *
 * GET /api/camps/[campId]/hq/reports/attendance - Get attendance report
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCampHqAttendanceReport } from '@/lib/services/campHq'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const { campId } = await params

    const { data, error } = await getCampHqAttendanceReport(campId)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('[GET /api/camps/[campId]/hq/reports/attendance] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
