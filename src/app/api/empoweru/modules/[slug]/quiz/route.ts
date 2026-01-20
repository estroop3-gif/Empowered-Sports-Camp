/**
 * EmpowerU Quiz Submit API
 *
 * POST /api/empoweru/modules/[slug]/quiz - Submit quiz answers
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  submitQuiz,
  evaluateUnlocks,
  checkCertificationEligibility,
  generateCertification,
  PortalType,
} from '@/lib/services/empoweru'
import { UserRole } from '@/generated/prisma'

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
    let certificationAwarded = false

    if (quizResult?.passed) {
      // Check unlocks
      if (portalType) {
        const { data: unlocks } = await evaluateUnlocks({
          userId: user.id,
          role: user.role || '',
          tenantId: user.tenantId,
          portalType: portalType as PortalType,
        })
        newUnlocks = unlocks?.map((u) => u.feature_code) || []
      }

      // Check if user is now eligible for certification and auto-generate it
      if (user.role && user.role !== 'hq_admin' && user.role !== 'parent') {
        const { data: eligibility } = await checkCertificationEligibility(
          user.id,
          user.role as UserRole,
          user.tenantId || undefined
        )

        if (eligibility?.isEligible) {
          // Auto-generate certification - they've completed all required modules!
          const { data: cert, error: certError } = await generateCertification(
            user.id,
            user.role as UserRole,
            user.tenantId || undefined
          )

          if (cert && !certError) {
            certificationAwarded = true
            console.log(`[EmpowerU] Certification awarded to user ${user.id} for role ${user.role}`)
          }
        }
      }
    }

    return NextResponse.json({
      data: {
        ...quizResult,
        new_unlocks: newUnlocks,
        certification_awarded: certificationAwarded,
      },
    })
  } catch (error) {
    console.error('[API] POST /api/empoweru/modules/[slug]/quiz error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
