/**
 * EmpowerU Quiz Submit API
 *
 * POST /api/empoweru/modules/[slug]/quiz - Submit quiz answers
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { submitQuiz, evaluateUnlocks, PortalType } from '@/lib/services/empoweru'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { slug } = await params
    const body = await request.json()
    const { answers, portalType } = body

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Missing answers array' }, { status: 400 })
    }

    const { data: quizResult, error } = await submitQuiz({
      moduleId: slug,
      userId: user.id,
      answers,
      role: user.role || '',
      tenantId: user.tenantId,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If quiz passed and portalType provided, evaluate unlocks
    let newUnlocks: string[] = []
    if (quizResult?.passed && portalType) {
      const { data: unlocks } = await evaluateUnlocks({
        userId: user.id,
        role: user.role || '',
        tenantId: user.tenantId,
        portalType: portalType as PortalType,
      })
      newUnlocks = unlocks?.map((u) => u.feature_code) || []
    }

    return NextResponse.json({
      data: {
        ...quizResult,
        new_unlocks: newUnlocks,
      },
    })
  } catch (error) {
    console.error('[API] POST /api/empoweru/modules/[slug]/quiz error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
