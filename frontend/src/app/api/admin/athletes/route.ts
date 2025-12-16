/**
 * Admin Athletes API
 *
 * GET /api/admin/athletes - Get all athletes for admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import prisma from '@/lib/db/client'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only HQ admins can view all athletes
    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || undefined
    const gender = searchParams.get('gender') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')

    // Build where clause - using Record for flexible Prisma where types
    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (gender) {
      where.gender = gender
    }

    // Get athletes with parent info
    const [athletes, total] = await Promise.all([
      prisma.athlete.findMany({
        where,
        include: {
          parent: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          registrations: {
            select: {
              id: true,
              status: true,
              camp: {
                select: {
                  id: true,
                  name: true,
                  startDate: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.athlete.count({ where }),
    ])

    // Transform for response
    const athletesData = athletes.map((a) => ({
      id: a.id,
      firstName: a.firstName,
      lastName: a.lastName,
      dateOfBirth: a.dateOfBirth?.toISOString().split('T')[0] || null,
      gender: a.gender,
      grade: a.grade,
      school: a.school,
      allergies: a.allergies,
      medicalNotes: a.medicalNotes,
      createdAt: a.createdAt.toISOString(),
      parent: a.parent
        ? {
            id: a.parent.id,
            email: a.parent.email,
            name: [a.parent.firstName, a.parent.lastName].filter(Boolean).join(' ') || 'Unknown',
            phone: a.parent.phone,
          }
        : null,
      recentRegistrations: a.registrations.map((r) => ({
        id: r.id,
        status: r.status,
        campName: r.camp?.name || 'Unknown',
        campDate: r.camp?.startDate?.toISOString().split('T')[0] || null,
      })),
      registrationCount: a.registrations.length,
    }))

    return NextResponse.json({
      athletes: athletesData,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('[API] GET /api/admin/athletes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
