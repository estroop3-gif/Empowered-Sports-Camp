/**
 * Enhanced Quiz Submit API
 *
 * POST /api/empoweru/quiz/[moduleId] - Submit quiz answers (supports retry mode)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  submitQuizEnhanced,
  evaluateUnlocks,
  checkCertificationEligibility,
  generateCertification,
  PortalType,
} from '@/lib/services/empoweru'
import { UserRole } from '@/generated/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { moduleId } = await params
    const body = await request.json()
    const { answers, portalType, isRetry = false } = body

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Missing answers array' }, { status: 400 })
    }

    // Submit quiz with enhanced tracking
    const { data: quizResult, error } = await submitQuizEnhanced({
      moduleId,
      userId: user.id,
      answers,
      role: user.role || '',
      tenantId: user.tenantId,
      isRetry,
    })

    if (error) {
      console.error(`[API] POST /api/empoweru/quiz/${moduleId} error:`, error)
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

    // Check if user just became eligible for certification
    let certificationGenerated = null
    if (quizResult?.passed) {
      const role = user.role as UserRole
      const { data: eligibility } = await checkCertificationEligibility(
        user.id,
        role,
        user.tenantId
      )

      if (eligibility?.isEligible) {
        // Auto-generate certification
        const { data: cert } = await generateCertification(user.id, role, user.tenantId)
        if (cert) {
          certificationGenerated = {
            certificateNumber: cert.certificateNumber,
            certifiedAt: cert.certifiedAt,
          }
        }
      }
    }

    return NextResponse.json({
      data: {
        score: quizResult?.score,
        passed: quizResult?.passed,
        totalQuestions: quizResult?.totalQuestions,
        correctAnswers: quizResult?.correctAnswers,
        attemptNumber: quizResult?.attemptNumber,
        missedQuestionIds: quizResult?.missedQuestionIds,
        missedQuestions: quizResult?.missedQuestions,
        newUnlocks,
        certificationGenerated,
      },
    })
  } catch (error) {
    console.error('[API] POST /api/empoweru/quiz/[moduleId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
