/**
 * Certification API
 *
 * GET /api/empoweru/certification - Get certification status and eligibility
 * POST /api/empoweru/certification - Generate certification
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  getCertificationStatus,
  checkCertificationEligibility,
  generateCertification,
} from '@/lib/services/empoweru'
import { UserRole } from '@/generated/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get the role from query params or use user's role
    const { searchParams } = new URL(request.url)
    const roleParam = searchParams.get('role')
    const role = (roleParam || user.role) as UserRole

    // Get both status and eligibility
    const [statusResult, eligibilityResult] = await Promise.all([
      getCertificationStatus(user.id, role, user.tenantId),
      checkCertificationEligibility(user.id, role, user.tenantId),
    ])

    if (statusResult.error) {
      console.error('[API] GET /api/empoweru/certification status error:', statusResult.error)
      return NextResponse.json({ error: statusResult.error.message }, { status: 500 })
    }

    if (eligibilityResult.error) {
      console.error('[API] GET /api/empoweru/certification eligibility error:', eligibilityResult.error)
      return NextResponse.json({ error: eligibilityResult.error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        status: statusResult.data,
        eligibility: eligibilityResult.data,
      },
    })
  } catch (error) {
    console.error('[API] GET /api/empoweru/certification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get the role from body or use user's role
    const body = await request.json().catch(() => ({}))
    const role = (body.role || user.role) as UserRole

    const { data, error } = await generateCertification(user.id, role, user.tenantId)

    if (error) {
      console.error('[API] POST /api/empoweru/certification error:', error)
      // Check if it's an eligibility error
      if (error.message.includes('not eligible')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] POST /api/empoweru/certification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
