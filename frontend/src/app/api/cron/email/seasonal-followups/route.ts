/**
 * Cron: Seasonal Follow-up Emails
 *
 * POST /api/cron/email/seasonal-followups
 * Sends seasonal re-engagement emails:
 * - January: "New year, new skills" - registration opening soon
 * - February: "Valentine's Day special" - sibling referral bonus
 * - March: "Spring training" - early bird deadline approaching
 * - April: "Earth day outdoor camp" - summer camp highlights
 * - May: "Final countdown" - last chance to register
 *
 * Should be called on the 1st of each month (Jan-May)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { sendSeasonalFollowupEmail } from '@/lib/services/email'

// Verify cron secret for security
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.warn('[Cron] CRON_SECRET not configured - skipping auth check in development')
    return process.env.NODE_ENV === 'development'
  }

  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
}

type SeasonalMonth = 'jan' | 'feb' | 'mar' | 'apr' | 'may'

const SEASONAL_MONTHS: Record<number, SeasonalMonth> = {
  1: 'jan',
  2: 'feb',
  3: 'mar',
  4: 'apr',
  5: 'may',
}

export async function POST(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const currentMonth = now.getMonth() + 1 // 1-indexed

    // Only run for Jan-May
    const seasonalMonth = SEASONAL_MONTHS[currentMonth]
    if (!seasonalMonth) {
      console.log(`[Cron] Seasonal followups: Month ${currentMonth} is not a seasonal email month`)
      return NextResponse.json({
        success: true,
        message: `Month ${currentMonth} is not a seasonal email month (Jan-May only)`,
        results: { sent: 0, failed: 0 },
      })
    }

    // Allow override via query param for testing
    const { searchParams } = new URL(request.url)
    const monthOverride = searchParams.get('month') as SeasonalMonth | null
    const targetMonth = monthOverride || seasonalMonth

    if (monthOverride && !['jan', 'feb', 'mar', 'apr', 'may'].includes(monthOverride)) {
      return NextResponse.json(
        { error: 'Invalid month. Must be jan, feb, mar, apr, or may' },
        { status: 400 }
      )
    }

    console.log(`[Cron] Running seasonal followup for month: ${targetMonth}`)

    const results = { sent: 0, failed: 0, skipped: 0 }

    // Get all active tenants
    const tenants = await prisma.tenant.findMany({
      where: { licenseStatus: 'active' },
      select: { id: true, name: true },
    })

    for (const tenant of tenants) {
      // Find parents who had registrations in the past year
      // This gives us the re-engagement audience
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      const pastRegistrations = await prisma.registration.findMany({
        where: {
          tenantId: tenant.id,
          status: 'confirmed',
          createdAt: { gte: oneYearAgo },
        },
        select: {
          parentId: true,
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
            },
          },
        },
        distinct: ['parentId'],
      })

      console.log(`[Cron] Found ${pastRegistrations.length} unique parents for tenant ${tenant.name}`)

      // Check if parents already have registrations for upcoming camps this year
      const currentYear = now.getFullYear()
      const upcomingCampStart = new Date(currentYear, 0, 1) // Start of current year
      const upcomingCampEnd = new Date(currentYear, 11, 31) // End of current year

      const parentsWithUpcomingRegistrations = await prisma.registration.findMany({
        where: {
          tenantId: tenant.id,
          status: 'confirmed',
          camp: {
            startDate: {
              gte: upcomingCampStart,
              lte: upcomingCampEnd,
            },
          },
        },
        select: { parentId: true },
        distinct: ['parentId'],
      })

      const registeredParentIds = new Set(parentsWithUpcomingRegistrations.map(r => r.parentId))

      // Send to parents who haven't registered yet for this year
      for (const reg of pastRegistrations) {
        if (registeredParentIds.has(reg.parentId)) {
          results.skipped++
          continue // Already registered, skip
        }

        const { error } = await sendSeasonalFollowupEmail({
          month: targetMonth,
          to: reg.parent.email,
          parentName: `${reg.parent.firstName} ${reg.parent.lastName}`,
          tenantId: tenant.id,
          userId: reg.parent.id,
        })

        if (error) {
          console.error(`[Cron] Failed to send seasonal email to ${reg.parent.email}:`, error)
          results.failed++
        } else {
          results.sent++
        }
      }
    }

    console.log(`[Cron] Seasonal followup completed for ${targetMonth}:`, results)

    return NextResponse.json({
      success: true,
      month: targetMonth,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron] Seasonal followup job failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also support GET for manual triggering in development
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'GET only allowed in development' }, { status: 405 })
  }
  return POST(request)
}
