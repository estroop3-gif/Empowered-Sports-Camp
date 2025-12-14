/**
 * Camp HQ Staff Group Assignment API
 *
 * PUT /api/camps/[campId]/hq/staff/[assignmentId]/group - Assign staff to a group
 */

import { NextRequest, NextResponse } from 'next/server'
import { assignStaffToGroup } from '@/lib/services/campHq'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string; assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params
    const body = await request.json()
    const { groupId } = body

    const { data, error } = await assignStaffToGroup(assignmentId, groupId || null)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[PUT /api/camps/[campId]/hq/staff/[assignmentId]/group] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
