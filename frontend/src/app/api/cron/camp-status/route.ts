/**
 * Camp Status Auto-Update Cron
 *
 * Automatically updates camp statuses based on dates:
 * - registration_open → registration_closed: when startDate arrives
 * - registration_closed → in_progress: when camp is running (startDate <= today <= endDate)
 * - in_progress → completed: when endDate passes
 */

import { NextResponse } from 'next/server'
import prisma from '@/lib/db/client'

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 1. Close registration for camps that have started
    // (published or registration_open) AND startDate <= today → registration_closed
    const closedRegistration = await prisma.camp.updateMany({
      where: {
        status: { in: ['published', 'registration_open'] },
        startDate: { lte: today },
        concludedAt: null,
      },
      data: {
        status: 'registration_closed',
      },
    })

    // 2. Mark camps as in_progress if they're currently running
    // registration_closed AND startDate <= today AND endDate >= today → in_progress
    const inProgress = await prisma.camp.updateMany({
      where: {
        status: 'registration_closed',
        startDate: { lte: today },
        endDate: { gte: today },
        concludedAt: null,
      },
      data: {
        status: 'in_progress',
      },
    })

    // 3. Mark camps as completed if they've ended (but not manually concluded)
    // (registration_closed OR in_progress) AND endDate < today → completed
    const completed = await prisma.camp.updateMany({
      where: {
        status: { in: ['registration_closed', 'in_progress'] },
        endDate: { lt: today },
        concludedAt: null,
      },
      data: {
        status: 'completed',
      },
    })

    return NextResponse.json({
      success: true,
      updated: {
        registrationClosed: closedRegistration.count,
        inProgress: inProgress.count,
        completed: completed.count,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron] Camp status update failed:', error)
    return NextResponse.json(
      { error: 'Failed to update camp statuses' },
      { status: 500 }
    )
  }
}
