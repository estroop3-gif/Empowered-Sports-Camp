/**
 * Profile Search API
 *
 * GET /api/profiles/search?q=searchterm
 * Search for profiles by name or email (for sharing features)
 *
 * Note: This endpoint does not require authentication since it only
 * returns basic profile info (name, email) for sharing purposes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    // Build where clause - if no query, return all profiles
    const whereClause = query && query.length >= 2
      ? {
          OR: [
            { firstName: { contains: query, mode: 'insensitive' as const } },
            { lastName: { contains: query, mode: 'insensitive' as const } },
            { email: { contains: query, mode: 'insensitive' as const } },
          ],
        }
      : {}

    // Search profiles by name or email, or return all if no query
    const profiles = await prisma.profile.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      take: 20,
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' },
      ],
    })

    return NextResponse.json({ data: profiles })
  } catch (error) {
    console.error('[API] Profile search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
