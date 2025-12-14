/**
 * EmpowerU Contribution Review API
 *
 * POST /api/empoweru/contributions/[id]/review - Approve/reject/request revision
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { reviewContribution } from '@/lib/services/empoweru'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Only admin and licensee owner can review
    if (!['hq_admin', 'licensee_owner'].includes(user.role || '')) {
      return NextResponse.json({ error: 'Not authorized to review contributions' }, { status: 403 })
    }

    const { id: contributionId } = await params
    const body = await request.json()
    const { action, adminNotes } = body

    if (!action || !['APPROVE', 'REJECT', 'REQUEST_REVISION'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be APPROVE, REJECT, or REQUEST_REVISION' },
        { status: 400 }
      )
    }

    const { data, error } = await reviewContribution({
      contributionId,
      action,
      adminNotes,
      adminUserId: user.id,
      tenantId: user.tenantId,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] POST /api/empoweru/contributions/[id]/review error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
