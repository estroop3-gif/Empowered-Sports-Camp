/**
 * CIT Certifications API
 *
 * GET /api/cit/certifications - Get CIT's certifications
 * POST /api/cit/certifications - Submit/update a certification
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { getCitCertifications, upsertCitCertification } from '@/lib/services/cit-dashboard'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['cit_volunteer', 'hq_admin']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await getCitCertifications({
      userId: user.id,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/cit/certifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['cit_volunteer', 'hq_admin']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { documentType, displayName, documentUrl, notes } = body

    if (!documentType || !displayName || !documentUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: documentType, displayName, documentUrl' },
        { status: 400 }
      )
    }

    const { data, error } = await upsertCitCertification({
      userId: user.id,
      tenantId: user.tenantId,
      documentType,
      displayName,
      documentUrl,
      notes,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] POST /api/cit/certifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
