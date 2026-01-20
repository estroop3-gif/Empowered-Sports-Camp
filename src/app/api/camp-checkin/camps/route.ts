/**
 * Camp Check-In Camps List API
 *
 * GET /api/camp-checkin/camps
 *
 * Returns a list of camps available for check-in (active or today).
 * Used by the kiosk mode to show camp selection.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import type { Camp, Venue } from '@/generated/prisma'

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get camps that are active (today falls within start/end date range)
    // and have published status
    const camps = await prisma.camp.findMany({
      where: {
        status: 'published',
        startDate: {
          lte: today,
        },
        endDate: {
          gte: today,
        },
      },
      include: {
        venue: {
          select: {
            name: true,
            city: true,
            state: true,
          },
        },
        _count: {
          select: {
            registrations: {
              where: {
                status: 'confirmed',
              },
            },
          },
        },
        campDays: {
          where: {
            date: today,
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    })

    // Define type for camp with included relations
    type CampWithRelations = Camp & {
      venue: Pick<Venue, 'name' | 'city' | 'state'> | null
      _count: { registrations: number }
      campDays: { id: string }[]
    }

    // Get check-in counts for each camp
    const campsWithCounts = await Promise.all(
      (camps as CampWithRelations[]).map(async (camp) => {
        // Count checked-in attendance for today's camp day
        let checkedInCount = 0
        if (camp.campDays.length > 0) {
          checkedInCount = await prisma.campAttendance.count({
            where: {
              campDayId: camp.campDays[0].id,
              status: 'checked_in',
            },
          })
        }

        return {
          id: camp.id,
          name: camp.name,
          start_date: camp.startDate.toISOString(),
          end_date: camp.endDate.toISOString(),
          location_name: camp.venue?.name || null,
          city: camp.venue?.city || null,
          state: camp.venue?.state || null,
          registered_count: camp._count.registrations,
          checked_in_count: checkedInCount,
        }
      })
    )

    return NextResponse.json({ data: campsWithCounts })
  } catch (error) {
    console.error('[GET /api/camp-checkin/camps] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
