/**
 * Dev Mode Registration Confirmation
 *
 * Marks registrations as paid in development mode (simulated payment)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { ensureParentRole } from '@/lib/services/users'

export async function POST(request: NextRequest) {
  // Only allow in development mode
  const isDev = process.env.NODE_ENV === 'development' ||
    !process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_SECRET_KEY?.startsWith('sk_test')

  if (!isDev) {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { registrationIds } = body

    if (!registrationIds || !Array.isArray(registrationIds) || registrationIds.length === 0) {
      return NextResponse.json(
        { error: 'registrationIds array required' },
        { status: 400 }
      )
    }

    // Update registrations to confirmed/paid status
    await prisma.registration.updateMany({
      where: {
        id: { in: registrationIds },
      },
      data: {
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentMethod: 'dev_mode',
        paidAt: new Date(),
      },
    })

    // Ensure parent has the parent role for dashboard access
    const regs = await prisma.registration.findMany({
      where: { id: { in: registrationIds } },
      select: { parentId: true },
    })
    const parentIds = [...new Set(regs.map(r => r.parentId))]
    for (const pid of parentIds) {
      await ensureParentRole(pid)
    }

    console.log(`[DevConfirm] Marked ${registrationIds.length} registrations as paid`)

    return NextResponse.json({
      success: true,
      message: `${registrationIds.length} registration(s) confirmed`,
    })
  } catch (error) {
    console.error('[DevConfirm] Error:', error)
    return NextResponse.json(
      { error: 'Failed to confirm registrations' },
      { status: 500 }
    )
  }
}
