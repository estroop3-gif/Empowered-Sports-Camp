/**
 * Quiz Retry API
 *
 * GET /api/empoweru/quiz/[moduleId]/retry - Get missed questions for retry
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { getMissedQuestionsForRetry } from '@/lib/services/empoweru'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { moduleId } = await params

    const { data, error } = await getMissedQuestionsForRetry(
      moduleId,
      user.id,
      user.tenantId
    )

    if (error) {
      // "No missed questions" is not really an error, just means they passed
      if (error.message.includes('No missed questions')) {
        return NextResponse.json({ data: null, message: 'No missed questions to retry' })
      }
      console.error(`[API] GET /api/empoweru/quiz/${moduleId}/retry error:`, error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/empoweru/quiz/[moduleId]/retry error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
