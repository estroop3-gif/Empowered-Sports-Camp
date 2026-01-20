/**
 * Camp HQ End Day API
 *
 * POST /api/camps/[campId]/hq/day/[campDayId]/end - End a camp day
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { endCampDayWithOptions } from '@/lib/services/camp-days'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string; campDayId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { campDayId } = await params
    const body = await request.json().catch(() => ({}))

    const { data, error } = await endCampDayWithOptions(campDayId, user.id, {
      recap: body.recap,
      auto_checkout_all: body.auto_checkout_all ?? true,
      generate_report: body.generate_report ?? false,
      send_emails: body.send_emails ?? false,
      force: body.force ?? false,
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[POST /api/camps/[campId]/hq/day/[campDayId]/end] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
