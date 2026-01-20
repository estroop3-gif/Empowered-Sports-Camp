/**
 * Compensation Report API
 *
 * POST /api/camps/[campId]/hq/compensation/report - Send compensation report email
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  calculateSessionCompensation,
  getSessionCompensationSummary,
} from '@/lib/services/incentives'
import { sendCompensationReportEmail } from '@/lib/email/incentives'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'

interface RouteParams {
  params: Promise<{ campId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { campId } = await params
    const user = await getAuthenticatedUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = user.role || ''

    // Only admins, licensee owners, and directors can send reports
    if (!['hq_admin', 'licensee_owner', 'director'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!user.tenantId && role !== 'hq_admin') {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
    }

    const body = await request.json()
    const { staffProfileId, budgetPreapprovedTotal, budgetActualTotal, csatAvgScore, guestSpeakerCount } = body

    if (!staffProfileId) {
      return NextResponse.json({ error: 'staffProfileId required' }, { status: 400 })
    }

    // Get summary (will calculate if not already finalized)
    let summary = await getSessionCompensationSummary({
      campId,
      staffProfileId,
      tenantId: user.tenantId || '',
      role,
    })

    // If not finalized, calculate first
    if (summary.data && !summary.data.session.is_finalized) {
      const calcResult = await calculateSessionCompensation({
        campId,
        staffProfileId,
        tenantId: user.tenantId || '',
        budgetPreapprovedTotal,
        budgetActualTotal,
        csatAvgScore,
        guestSpeakerCount,
      })

      if (calcResult.error) {
        return NextResponse.json({ error: calcResult.error.message }, { status: 500 })
      }

      // Re-fetch summary after calculation
      summary = await getSessionCompensationSummary({
        campId,
        staffProfileId,
        tenantId: user.tenantId || '',
        role,
      })
    }

    if (!summary.data) {
      return NextResponse.json({ error: 'No compensation data found' }, { status: 404 })
    }

    // Send the email
    const emailResult = await sendCompensationReportEmail({
      summary: summary.data,
      tenantId: user.tenantId || '',
    })

    if (emailResult.error) {
      return NextResponse.json({ error: emailResult.error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        success: true,
        message: 'Compensation report sent successfully',
        sent_to: emailResult.data?.sent_to,
      },
    })
  } catch (error) {
    console.error('[API] POST compensation/report error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
