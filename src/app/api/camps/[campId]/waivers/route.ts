/**
 * Camp Waivers API
 *
 * GET /api/camps/[campId]/waivers - Get waiver requirements for a camp
 * POST /api/camps/[campId]/waivers - Set waiver requirements for a camp
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  getCampWaiverRequirements,
  setCampWaiverRequirements,
  getCampWaiverSignings,
} from '@/lib/services/waivers'
import { prisma } from '@/lib/db/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const { campId } = await params

    // Check if user wants full signing status (for admin/manager view)
    const includeSignings = request.nextUrl.searchParams.get('includeSignings') === 'true'

    if (includeSignings) {
      // Requires auth for signing status
      const user = await getAuthenticatedUserFromRequest(request)
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const allowedRoles = ['hq_admin', 'licensee_owner', 'director', 'coach']
      const userRole = user.role?.toLowerCase() || ''

      if (!allowedRoles.includes(userRole)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { data, error } = await getCampWaiverSignings(campId)
      if (error) {
        return NextResponse.json({ error }, { status: 500 })
      }
      return NextResponse.json({ data })
    }

    // Public access to get requirements (for registration flow)
    const { data, error } = await getCampWaiverRequirements(campId)

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] GET /api/camps/[campId]/waivers error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { campId } = await params

    // Get camp to verify tenant access
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: { tenantId: true },
    })

    if (!camp) {
      return NextResponse.json({ error: 'Camp not found' }, { status: 404 })
    }

    // Non-HQ admins can only modify their own tenant's camps
    if (userRole !== 'hq_admin' && camp.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const requirements = body.requirements || []

    const { error } = await setCampWaiverRequirements(
      campId,
      requirements,
      camp.tenantId
    )

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    // Return updated requirements
    const { data } = await getCampWaiverRequirements(campId)

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] POST /api/camps/[campId]/waivers error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
