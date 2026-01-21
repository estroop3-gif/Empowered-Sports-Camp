/**
 * Camp HQ Staff Search API
 *
 * GET /api/camps/[campId]/hq/staff/search - Search tenant staff for assignment
 *   Query params:
 *   - q: Search query (name, email, or territory name)
 *   - territoryId: Filter by specific territory
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchTenantStaff } from '@/lib/services/campHq'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import prisma from '@/lib/db/client'

interface RouteParams {
  params: Promise<{ campId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { campId } = await params
    const user = await getAuthenticatedUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get camp to find tenant
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: { tenantId: true },
    })

    if (!camp?.tenantId) {
      return NextResponse.json({ error: 'Camp not found or has no tenant' }, { status: 404 })
    }

    const search = request.nextUrl.searchParams.get('q') || undefined
    const territoryId = request.nextUrl.searchParams.get('territoryId') || undefined
    const { data, error } = await searchTenantStaff(camp.tenantId, campId, search, territoryId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/camps/[campId]/hq/staff/search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
