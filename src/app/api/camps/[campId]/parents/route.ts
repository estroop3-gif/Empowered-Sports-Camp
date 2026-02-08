/**
 * Camp Parents API
 *
 * GET /api/camps/[campId]/parents
 * Returns list of parents with registered campers for the SendEmailModal
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getAuthUser } from '@/lib/auth/server'

interface RouteParams {
  params: Promise<{ campId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { campId } = await params

    // Get all confirmed registrations for this camp with parent and athlete info
    const registrations = await prisma.registration.findMany({
      where: {
        campId,
        status: { in: ['confirmed', 'checked_in'] },
      },
      include: {
        parent: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        athlete: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Group by parent to deduplicate
    const parentMap = new Map<string, {
      id: string
      email: string
      firstName: string
      lastName: string
      camperNames: string[]
    }>()

    for (const reg of registrations) {
      if (!reg.parent?.email) continue

      const existing = parentMap.get(reg.parent.id)
      const camperName = reg.athlete
        ? `${reg.athlete.firstName} ${reg.athlete.lastName}`
        : 'Unknown'

      if (existing) {
        existing.camperNames.push(camperName)
      } else {
        parentMap.set(reg.parent.id, {
          id: reg.parent.id,
          email: reg.parent.email,
          firstName: reg.parent.firstName || '',
          lastName: reg.parent.lastName || '',
          camperNames: [camperName],
        })
      }
    }

    const parents = Array.from(parentMap.values()).map(p => ({
      id: p.id,
      email: p.email,
      firstName: p.firstName,
      lastName: p.lastName,
      camperName: p.camperNames.join(', '),
    }))

    return NextResponse.json({ data: parents })
  } catch (error) {
    console.error('[API] Camp parents error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
