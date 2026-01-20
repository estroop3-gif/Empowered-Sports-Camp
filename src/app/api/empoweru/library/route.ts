/**
 * EmpowerU Shared Library API
 *
 * GET /api/empoweru/library - List all published modules for the shared library
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { listLibraryContent, PortalType } from '@/lib/services/empoweru'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const portalType = searchParams.get('portalType') as PortalType | null
    const search = searchParams.get('search') || undefined

    const { data, error } = await listLibraryContent({
      portalType: portalType || undefined,
      search,
      tenantId: user.tenantId,
      role: user.role || '',
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/empoweru/library error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
