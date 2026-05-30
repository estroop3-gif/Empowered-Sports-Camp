/**
 * Concession Credits API
 *
 * GET /api/concession-credits?athleteId={athleteId}&campId={campId}
 *
 * Returns concession credit records for an athlete.
 * If campId is provided, returns the specific credit with full transaction log.
 * If only athleteId, returns all credits across camps.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { prisma } from '@/lib/db/client'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const athleteId = request.nextUrl.searchParams.get('athleteId')
    const campId = request.nextUrl.searchParams.get('campId')

    if (!athleteId) {
      return NextResponse.json({ error: 'athleteId is required' }, { status: 400 })
    }

    // Check authorization: parent owns athlete OR user is staff
    const isStaff = ['hq_admin', 'licensee_owner', 'director', 'coach'].includes(
      user.role?.toLowerCase() || ''
    )

    if (!isStaff) {
      const athlete = await prisma.athlete.findUnique({
        where: { id: athleteId },
        select: { parentId: true },
      })

      if (!athlete || athlete.parentId !== user.id) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }
    }

    if (campId) {
      // Return specific credit with full transaction log
      const credit = await prisma.concessionCredit.findUnique({
        where: {
          athleteId_campId: { athleteId, campId },
        },
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            include: {
              performer: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
      })

      if (!credit) {
        return NextResponse.json({ error: 'Credit record not found' }, { status: 404 })
      }

      return NextResponse.json({ data: credit })
    }

    // Return all credits for athlete across camps
    const credits = await prisma.concessionCredit.findMany({
      where: { athleteId },
      include: {
        camp: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: credits })
  } catch (error) {
    console.error('[GET /api/concession-credits] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
