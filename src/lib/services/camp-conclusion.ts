/**
 * Camp Conclusion Service
 *
 * Handles camp conclusion workflow including:
 * - Camp conclusion overview (stats, attendance, incidents, incentives)
 * - Pre-conclusion validation
 * - Camp conclusion with locking, emails, and report generation
 * - Camp lock/unlock functionality
 */

import prisma from '@/lib/db/client'
import { CampStatus } from '@/generated/prisma'

// ============================================================================
// TYPES
// ============================================================================

export interface CampConclusionOverview {
  camp: {
    id: string
    name: string
    start_date: string
    end_date: string
    status: string
    is_locked: boolean
    concluded_at: string | null
    location_name: string | null
    tenant_id: string | null
    tenant_name: string | null
  }
  attendance: {
    total_expected: number
    total_attended: number
    average_daily_attendance: number
    attendance_rate: number
    daily_breakdown: Array<{
      date: string
      day_number: number
      expected: number
      attended: number
      absent: number
      attendance_rate: number
    }>
  }
  incidents: {
    total: number
    by_severity: {
      low: number
      medium: number
      high: number
      critical: number
    }
    resolved: number
    unresolved: number
  }
  capacity: {
    registered: number
    capacity: number
    utilization_rate: number
  }
  revenue: {
    gross_revenue: number
    registration_revenue: number
    addon_revenue: number
    refunds: number
    net_revenue: number
  } | null
  staff: {
    total_assigned: number
    directors: number
    coaches: number
    assistants: number
    cits: number
    volunteers: number
  }
  incentives: {
    total_compensation: number
    total_fixed_stipend: number
    total_variable_bonuses: number
    bonuses_breakdown: {
      enrollment_bonus: number
      csat_bonus: number
      budget_efficiency_bonus: number
      guest_speaker_bonus: number
    }
    staff_summaries: Array<{
      staff_id: string
      staff_name: string
      plan_name: string
      fixed_stipend: number
      variable_bonus: number
      total_compensation: number
      is_finalized: boolean
    }>
  }
  recaps: Array<{
    day_number: number
    date: string
    word_of_the_day: string | null
    primary_sport: string | null
    guest_speaker: string | null
  }>
  days_summary: {
    total: number
    completed: number
    not_started: number
    in_progress: number
  }
}

export interface CampConclusionValidation {
  can_conclude: boolean
  warnings: string[]
  blockers: string[]
}

export interface CampConclusionResult {
  success: boolean
  camp: {
    id: string
    name: string
    status: string
    is_locked: boolean
    concluded_at: string | null
  }
  final_report_url?: string
  emails_sent?: number
  warnings: string[]
}

// ============================================================================
// OVERVIEW QUERY
// ============================================================================

/**
 * Get comprehensive camp conclusion overview
 * Aggregates all data needed for camp conclusion reports
 */
export async function getCampConclusionOverview(
  campId: string
): Promise<{ data: CampConclusionOverview | null; error: Error | null }> {
  try {
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      include: {
        tenant: { select: { id: true, name: true } },
        location: { select: { name: true } },
        registrations: {
          where: { status: 'confirmed' },
          include: {
            registrationAddons: true,
          },
        },
        staffAssignments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        campDays: {
          orderBy: { date: 'asc' },
          include: {
            attendance: { select: { status: true } },
            recap: true,
            incidents: true,
          },
        },
        campGroups: true,
        sessionCompensations: {
          include: {
            staffProfile: { select: { id: true, firstName: true, lastName: true } },
            compensationPlan: true,
          },
        },
      },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp not found') }
    }

    // Collect all incidents from camp days
    const incidents = camp.campDays.flatMap(day => day.incidents)

    // Calculate date-based stats
    const startDate = new Date(camp.startDate)
    const endDate = new Date(camp.endDate)
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(0, 0, 0, 0)
    const totalDays = Math.floor(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1

    // Calculate attendance stats
    const registeredCount = camp.registrations.length
    let totalAttended = 0
    let totalExpected = 0
    const dailyBreakdown: CampConclusionOverview['attendance']['daily_breakdown'] = []

    for (const day of camp.campDays) {
      const attended = day.attendance.filter(
        a => a.status === 'checked_in' || a.status === 'checked_out'
      ).length
      const absent = day.attendance.filter(a => a.status === 'absent').length
      const expected = day.attendance.length || registeredCount

      totalAttended += attended
      totalExpected += expected

      dailyBreakdown.push({
        date: day.date.toISOString().split('T')[0],
        day_number: day.dayNumber,
        expected,
        attended,
        absent,
        attendance_rate: expected > 0 ? Math.round((attended / expected) * 100) : 0,
      })
    }

    const averageDailyAttendance = camp.campDays.length > 0
      ? Math.round(totalAttended / camp.campDays.length)
      : 0
    const overallAttendanceRate = totalExpected > 0
      ? Math.round((totalAttended / totalExpected) * 100)
      : 0

    // Calculate incidents by severity
    const incidentsBySeverity = {
      low: incidents.filter((i: { severity: string }) => i.severity === 'low').length,
      medium: incidents.filter((i: { severity: string }) => i.severity === 'medium').length,
      high: incidents.filter((i: { severity: string }) => i.severity === 'high').length,
      critical: incidents.filter((i: { severity: string }) => i.severity === 'critical').length,
    }

    // Calculate revenue
    const registrationRevenue = camp.registrations.reduce(
      (sum, r) => sum + (r.totalPriceCents || 0),
      0
    ) / 100

    const addonRevenue = camp.registrations.reduce((sum, r) => {
      const addonTotal = r.registrationAddons.reduce(
        (aSum, a) => aSum + (a.priceCents || 0),
        0
      )
      return sum + addonTotal
    }, 0) / 100

    const refunds = camp.registrations
      .filter(r => r.status === 'refunded')
      .reduce((sum, r) => sum + (r.totalPriceCents || 0), 0) / 100

    // Calculate staff counts by role
    const staffByRole = {
      directors: camp.staffAssignments.filter(s => s.role === 'director').length,
      coaches: camp.staffAssignments.filter(s => s.role === 'coach').length,
      assistants: camp.staffAssignments.filter(s => s.role === 'assistant').length,
      cits: camp.staffAssignments.filter(s => s.role === 'cit').length,
      volunteers: camp.staffAssignments.filter(s => s.role === 'volunteer').length,
    }

    // Calculate incentives/compensation
    let totalCompensation = 0
    let totalFixedStipend = 0
    let totalVariableBonuses = 0
    let totalEnrollmentBonus = 0
    let totalCsatBonus = 0
    let totalBudgetBonus = 0
    let totalGuestSpeakerBonus = 0

    const staffSummaries: CampConclusionOverview['incentives']['staff_summaries'] = []

    for (const comp of camp.sessionCompensations) {
      const fixedStipend = Number(comp.fixedStipendTotal || 0)
      const variableBonus = Number(comp.totalVariableBonus || 0)
      const total = Number(comp.totalCompensation || 0)

      totalFixedStipend += fixedStipend
      totalVariableBonuses += variableBonus
      totalCompensation += total

      totalEnrollmentBonus += Number(comp.enrollmentBonusEarned || 0)
      totalCsatBonus += Number(comp.csatBonusEarned || 0)
      totalBudgetBonus += Number(comp.budgetEfficiencyBonusEarned || 0)
      totalGuestSpeakerBonus += Number(comp.guestSpeakerBonusEarned || 0)

      const staffName = comp.staffProfile
        ? `${comp.staffProfile.firstName || ''} ${comp.staffProfile.lastName || ''}`.trim()
        : 'Unknown Staff'

      staffSummaries.push({
        staff_id: comp.staffProfileId,
        staff_name: staffName,
        plan_name: comp.compensationPlan?.name || 'Unknown Plan',
        fixed_stipend: fixedStipend,
        variable_bonus: variableBonus,
        total_compensation: total,
        is_finalized: comp.isFinalized,
      })
    }

    // Build recaps summary
    const recaps = camp.campDays
      .filter(d => d.recap)
      .map(d => ({
        day_number: d.dayNumber,
        date: d.date.toISOString().split('T')[0],
        word_of_the_day: d.recap?.wordOfTheDay || null,
        primary_sport: d.recap?.primarySport || null,
        guest_speaker: d.recap?.guestSpeakerName || null,
      }))

    // Days summary
    const daysSummary = {
      total: totalDays,
      completed: camp.campDays.filter(d => d.status === 'finished').length,
      not_started: camp.campDays.filter(d => d.status === 'not_started').length,
      in_progress: camp.campDays.filter(d => d.status === 'in_progress').length,
    }

    const overview: CampConclusionOverview = {
      camp: {
        id: camp.id,
        name: camp.name,
        start_date: camp.startDate.toISOString().split('T')[0],
        end_date: camp.endDate.toISOString().split('T')[0],
        status: camp.status,
        is_locked: camp.isLocked,
        concluded_at: camp.concludedAt?.toISOString() || null,
        location_name: camp.location?.name || null,
        tenant_id: camp.tenantId,
        tenant_name: camp.tenant?.name || null,
      },
      attendance: {
        total_expected: totalExpected,
        total_attended: totalAttended,
        average_daily_attendance: averageDailyAttendance,
        attendance_rate: overallAttendanceRate,
        daily_breakdown: dailyBreakdown,
      },
      incidents: {
        total: incidents.length,
        by_severity: incidentsBySeverity,
        resolved: incidents.filter((i: { resolvedAt: Date | null }) => i.resolvedAt !== null).length,
        unresolved: incidents.filter((i: { resolvedAt: Date | null }) => i.resolvedAt === null).length,
      },
      capacity: {
        registered: registeredCount,
        capacity: camp.capacity || 60,
        utilization_rate: (camp.capacity || 60) > 0
          ? Math.round((registeredCount / (camp.capacity || 60)) * 100)
          : 0,
      },
      revenue: {
        gross_revenue: registrationRevenue + addonRevenue,
        registration_revenue: registrationRevenue,
        addon_revenue: addonRevenue,
        refunds,
        net_revenue: registrationRevenue + addonRevenue - refunds,
      },
      staff: {
        total_assigned: camp.staffAssignments.length,
        ...staffByRole,
      },
      incentives: {
        total_compensation: totalCompensation,
        total_fixed_stipend: totalFixedStipend,
        total_variable_bonuses: totalVariableBonuses,
        bonuses_breakdown: {
          enrollment_bonus: totalEnrollmentBonus,
          csat_bonus: totalCsatBonus,
          budget_efficiency_bonus: totalBudgetBonus,
          guest_speaker_bonus: totalGuestSpeakerBonus,
        },
        staff_summaries: staffSummaries,
      },
      recaps,
      days_summary: daysSummary,
    }

    return { data: overview, error: null }
  } catch (error) {
    console.error('[getCampConclusionOverview] Error:', error)
    return { data: null, error: error as Error }
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate if a camp can be concluded
 * Returns warnings (soft blockers) and blockers (hard blockers)
 */
export async function validateCampForConclusion(
  campId: string
): Promise<{ data: CampConclusionValidation | null; error: Error | null }> {
  try {
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      include: {
        campDays: {
          include: {
            attendance: { select: { status: true } },
          },
        },
        registrations: {
          where: { status: 'confirmed' },
          select: { id: true },
        },
      },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp not found') }
    }

    const warnings: string[] = []
    const blockers: string[] = []

    // Check if camp is already completed
    if (camp.status === 'completed') {
      blockers.push('Camp is already completed')
    }

    // Check if camp is cancelled
    if (camp.status === 'cancelled') {
      blockers.push('Camp has been cancelled')
    }

    // Check if camp is locked
    if (camp.isLocked) {
      blockers.push('Camp is locked')
    }

    // Check if camp end date has passed
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endDate = new Date(camp.endDate)
    endDate.setHours(0, 0, 0, 0)

    if (today < endDate) {
      warnings.push(`Camp end date (${endDate.toLocaleDateString()}) has not passed yet`)
    }

    // Check if all days are completed
    const totalDays = Math.floor(
      (endDate.getTime() - new Date(camp.startDate).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1

    const completedDays = camp.campDays.filter(d => d.status === 'finished').length
    const notStartedDays = totalDays - camp.campDays.length
    const inProgressDays = camp.campDays.filter(d => d.status === 'in_progress').length

    if (notStartedDays > 0) {
      warnings.push(`${notStartedDays} day(s) were never started`)
    }

    if (inProgressDays > 0) {
      warnings.push(`${inProgressDays} day(s) are still in progress`)
    }

    // Check for unchecked-out campers on any day
    let totalUncheckedOut = 0
    for (const day of camp.campDays) {
      const uncheckedOut = day.attendance.filter(a => a.status === 'checked_in').length
      totalUncheckedOut += uncheckedOut
    }

    if (totalUncheckedOut > 0) {
      warnings.push(`${totalUncheckedOut} camper(s) were never checked out across all days`)
    }

    // Check for unresolved incidents
    const campDayIds = camp.campDays.map(d => d.id)
    const unresolvedIncidents = campDayIds.length > 0
      ? await prisma.campIncident.count({
          where: {
            campDayId: { in: campDayIds },
            resolvedAt: null,
          },
        })
      : 0

    if (unresolvedIncidents > 0) {
      warnings.push(`${unresolvedIncidents} incident(s) are unresolved`)
    }

    const canConclude = blockers.length === 0

    return {
      data: { can_conclude: canConclude, warnings, blockers },
      error: null,
    }
  } catch (error) {
    console.error('[validateCampForConclusion] Error:', error)
    return { data: null, error: error as Error }
  }
}

// ============================================================================
// CONCLUSION
// ============================================================================

/**
 * Conclude a camp session
 * - Updates status to 'completed'
 * - Sets concludedAt and concludedBy
 * - Optionally locks the camp
 * - Optionally sends final summary emails
 */
export async function concludeCamp(
  campId: string,
  userId: string,
  options: {
    lock_camp?: boolean
    send_final_emails?: boolean
    generate_report?: boolean
    force?: boolean
  } = {}
): Promise<{ data: CampConclusionResult | null; error: Error | null }> {
  try {
    const { lock_camp = true, force = false } = options

    // Validate first (unless forcing)
    if (!force) {
      const validation = await validateCampForConclusion(campId)
      if (validation.error) {
        return { data: null, error: validation.error }
      }
      if (!validation.data?.can_conclude) {
        return {
          data: null,
          error: new Error(`Cannot conclude camp: ${validation.data?.blockers.join(', ')}`),
        }
      }
    }

    // Get camp for name
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: { name: true, tenantId: true },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp not found') }
    }

    // Update camp status
    const updatedCamp = await prisma.camp.update({
      where: { id: campId },
      data: {
        status: 'completed' as CampStatus,
        concludedAt: new Date(),
        concludedBy: userId,
        isLocked: lock_camp,
        lockReason: lock_camp ? 'Camp concluded' : null,
      },
    })

    // Mark any in-progress days as finished
    await prisma.campDay.updateMany({
      where: {
        campId,
        status: 'in_progress',
      },
      data: {
        status: 'finished',
        completedAt: new Date(),
        completedBy: userId,
      },
    })

    // Mark remaining not_arrived as absent for all days
    const campDays = await prisma.campDay.findMany({
      where: { campId },
      select: { id: true },
    })

    for (const day of campDays) {
      await prisma.campAttendance.updateMany({
        where: {
          campDayId: day.id,
          status: 'not_arrived',
        },
        data: {
          status: 'absent',
        },
      })
    }

    // Get validation warnings for result
    const validation = await validateCampForConclusion(campId)

    const result: CampConclusionResult = {
      success: true,
      camp: {
        id: updatedCamp.id,
        name: camp.name,
        status: updatedCamp.status,
        is_locked: updatedCamp.isLocked,
        concluded_at: updatedCamp.concludedAt?.toISOString() || null,
      },
      warnings: validation.data?.warnings || [],
    }

    // TODO: Send final emails if requested
    // TODO: Generate report if requested

    return { data: result, error: null }
  } catch (error) {
    console.error('[concludeCamp] Error:', error)
    return { data: null, error: error as Error }
  }
}

// ============================================================================
// LOCK/UNLOCK
// ============================================================================

/**
 * Lock a camp to prevent further edits
 */
export async function lockCamp(
  campId: string,
  userId: string,
  reason?: string
): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    await prisma.camp.update({
      where: { id: campId },
      data: {
        isLocked: true,
        lockReason: reason || 'Locked by administrator',
      },
    })

    return { data: { success: true }, error: null }
  } catch (error) {
    console.error('[lockCamp] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Unlock a camp to allow edits
 * Only admins should be able to call this
 */
export async function unlockCamp(
  campId: string,
  userId: string
): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    await prisma.camp.update({
      where: { id: campId },
      data: {
        isLocked: false,
        lockReason: null,
      },
    })

    return { data: { success: true }, error: null }
  } catch (error) {
    console.error('[unlockCamp] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Archive a camp (soft delete)
 */
export async function archiveCamp(
  campId: string,
  userId: string
): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    await prisma.camp.update({
      where: { id: campId },
      data: {
        archivedAt: new Date(),
        archivedBy: userId,
        isLocked: true,
        lockReason: 'Archived',
      },
    })

    return { data: { success: true }, error: null }
  } catch (error) {
    console.error('[archiveCamp] Error:', error)
    return { data: null, error: error as Error }
  }
}
