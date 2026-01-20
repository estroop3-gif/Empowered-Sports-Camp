/**
 * Registration Report API
 *
 * GET /api/camps/[campId]/reports/registration - Get registration report for a camp
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campId: string }> }
) {
  try {
    const { campId } = await params

    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      include: {
        registrations: {
          include: {
            athlete: true,
            registrationAddons: {
              include: {
                addon: true,
              },
            },
          },
        },
      },
    })

    if (!camp) {
      return NextResponse.json({ error: 'Camp not found' }, { status: 404 })
    }

    // Count by status
    const confirmedRegistrations = camp.registrations.filter(
      (r) => r.status === 'confirmed'
    ).length
    const pendingRegistrations = camp.registrations.filter(
      (r) => r.status === 'pending'
    ).length
    const cancelledRegistrations = camp.registrations.filter(
      (r) => r.status === 'cancelled'
    ).length

    // Grade distribution (only confirmed)
    const gradeMap = new Map<string, number>()
    camp.registrations
      .filter((r) => r.status === 'confirmed')
      .forEach((r) => {
        const grade = r.athlete.grade || 'Unknown'
        gradeMap.set(grade, (gradeMap.get(grade) || 0) + 1)
      })
    const gradeDistribution = Array.from(gradeMap.entries())
      .map(([grade, count]) => ({ grade, count }))
      .sort((a, b) => {
        // Sort grades numerically if possible
        const aNum = parseInt(a.grade)
        const bNum = parseInt(b.grade)
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum
        return a.grade.localeCompare(b.grade)
      })

    // Gender distribution (only confirmed)
    const genderMap = new Map<string, number>()
    camp.registrations
      .filter((r) => r.status === 'confirmed')
      .forEach((r) => {
        const gender = r.athlete.gender || 'Unknown'
        genderMap.set(gender, (genderMap.get(gender) || 0) + 1)
      })
    const genderDistribution = Array.from(genderMap.entries())
      .map(([gender, count]) => ({ gender, count }))
      .sort((a, b) => b.count - a.count)

    // Calculate add-ons revenue (sum of all purchased add-ons)
    let addonsRevenue = 0
    camp.registrations.forEach((r) => {
      r.registrationAddons.forEach((ra) => {
        addonsRevenue += ra.priceCents || 0
      })
    })

    // Registrations by date
    const dateMap = new Map<string, number>()
    camp.registrations.forEach((r) => {
      const date = r.createdAt.toISOString().split('T')[0]
      dateMap.set(date, (dateMap.get(date) || 0) + 1)
    })
    const registrationsByDate = Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      campName: camp.name,
      totalRegistrations: camp.registrations.length,
      confirmedRegistrations,
      pendingRegistrations,
      cancelledRegistrations,
      gradeDistribution,
      genderDistribution,
      addonsRevenue,
      registrationsByDate,
    })
  } catch (error) {
    console.error('[GET /api/camps/[campId]/reports/registration] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
