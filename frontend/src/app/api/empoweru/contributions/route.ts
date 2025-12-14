/**
 * EmpowerU Contributions API
 *
 * GET /api/empoweru/contributions - List contributions for review or user's own
 * POST /api/empoweru/contributions - Submit a new contribution
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  submitContribution,
  listContributionsForReview,
  getUserContributions,
  PortalType,
} from '@/lib/services/empoweru'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const view = searchParams.get('view') // 'review' or 'my'

    if (view === 'review') {
      // Admin/licensee review view
      if (!['hq_admin', 'licensee_owner'].includes(user.role || '')) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }

      const { data, error } = await listContributionsForReview({
        tenantId: user.tenantId,
        role: user.role || '',
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data })
    } else {
      // User's own contributions
      const { data, error } = await getUserContributions({
        userId: user.id,
        tenantId: user.tenantId,
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data })
    }
  } catch (error) {
    console.error('[API] GET /api/empoweru/contributions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Only certain roles can submit contributions
    const allowedRoles = ['licensee_owner', 'director', 'cit_volunteer', 'coach']
    if (!allowedRoles.includes(user.role || '')) {
      return NextResponse.json(
        { error: 'Your role is not allowed to submit contributions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, description, portalType, videoUrl, attachmentUrl } = body

    if (!title || !portalType) {
      return NextResponse.json(
        { error: 'Missing required fields: title, portalType' },
        { status: 400 }
      )
    }

    if (!['OPERATIONAL', 'BUSINESS', 'SKILL_STATION'].includes(portalType)) {
      return NextResponse.json({ error: 'Invalid portalType' }, { status: 400 })
    }

    const { data, error } = await submitContribution({
      title,
      description,
      portalType: portalType as PortalType,
      videoUrl,
      attachmentUrl,
      userId: user.id,
      role: user.role || '',
      tenantId: user.tenantId,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/empoweru/contributions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
