/**
 * Camp HQ Territories API
 *
 * GET /api/camps/[campId]/hq/territories - Get territories for staff filtering
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTenantTerritories } from '@/lib/services/campHq'
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

    const { data, error } = await getTenantTerritories(camp.tenantId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/camps/[campId]/hq/territories error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
