/**
 * Admin Email — List Camps with Recipient Counts
 *
 * GET /api/admin/email/camps
 * Returns camps with the count of distinct confirmed parents.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getAuthUser } from '@/lib/auth/server'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user || user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const camps = await prisma.camp.findMany({
      where: {
        status: { in: ['registration_open', 'in_progress', 'completed', 'draft', 'published'] },
      },
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        status: true,
        registrations: {
          where: { status: 'confirmed' },
          select: { parentId: true },
        },
      },
    })

    const data = camps.map(camp => {
      const uniqueParents = new Set(camp.registrations.map(r => r.parentId))
      return {
        id: camp.id,
        name: camp.name,
        startDate: camp.startDate,
        endDate: camp.endDate,
        status: camp.status,
        recipientCount: uniqueParents.size,
      }
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] Admin email camps error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
