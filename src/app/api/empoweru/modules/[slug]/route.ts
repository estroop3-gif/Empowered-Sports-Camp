/**
 * EmpowerU Module Detail API
 *
 * GET /api/empoweru/modules/[slug] - Get module detail with quiz
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { getModuleDetail, PortalType } from '@/lib/services/empoweru'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { slug } = await params
    const searchParams = request.nextUrl.searchParams
    const portalType = searchParams.get('portalType') as PortalType | null

    if (!portalType || !['OPERATIONAL', 'BUSINESS', 'SKILL_STATION'].includes(portalType)) {
      return NextResponse.json(
        { error: 'Invalid or missing portalType parameter' },
        { status: 400 }
      )
    }

    const { data, error } = await getModuleDetail({
      slug,
      portalType,
      role: user.role || '',
      tenantId: user.tenantId,
      userId: user.id,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/empoweru/modules/[slug] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
