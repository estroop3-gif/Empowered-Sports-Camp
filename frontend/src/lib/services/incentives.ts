/**
 * Incentives Service
 *
 * Service functions for staff compensation and incentive tracking.
 * All functions return { data, error } pattern and enforce tenant scoping.
 */

import prisma from '@/lib/db/client'
import {
  CompensationPlanCode,
  type CompensationPlan,
  type CampSessionCompensation,
  type CampDayCompensationSnapshot,
} from '@/generated/prisma'
import { Decimal } from '@prisma/client/runtime/library'

// =============================================================================
// Types
// =============================================================================

export type { CompensationPlanCode } from '@/generated/prisma'

export interface CompensationPlanDetail {
  id: string
  name: string
  plan_code: CompensationPlanCode
  pre_camp_stipend_amount: number
  on_site_stipend_amount: number
  enrollment_threshold: number | null
  enrollment_bonus_per_camper: number | null
  csat_required_score: number | null
  csat_bonus_amount: number | null
  budget_efficiency_rate: number | null
  guest_speaker_required_count: number | null
  guest_speaker_bonus_amount: number | null
  is_active: boolean
}

export interface SessionCompensationDetail {
  id: string
  camp_id: string
  tenant_id: string
  staff_profile_id: string
  compensation_plan_id: string
  plan_name: string
  plan_code: CompensationPlanCode

  // Snapshotted plan parameters
  pre_camp_stipend_amount: number
  on_site_stipend_amount: number
  enrollment_threshold: number | null
  enrollment_bonus_per_camper: number | null
  csat_required_score: number | null
  csat_bonus_amount: number | null
  budget_efficiency_rate: number | null
  guest_speaker_required_count: number | null
  guest_speaker_bonus_amount: number | null

  // Performance metrics
  total_enrolled_campers: number | null
  csat_avg_score: number | null
  budget_preapproved_total: number | null
  budget_actual_total: number | null
  budget_savings_amount: number | null
  guest_speaker_count: number | null

  // Calculated amounts
  enrollment_bonus_earned: number | null
  csat_bonus_earned: number | null
  budget_efficiency_bonus_earned: number | null
  guest_speaker_bonus_earned: number | null
  fixed_stipend_total: number | null
  total_variable_bonus: number | null
  total_compensation: number | null

  // Status
  calculated_at: string | null
  is_finalized: boolean
  created_at: string
  updated_at: string

  // Related data
  camp_name?: string
  camp_start_date?: string
  camp_end_date?: string
  staff_name?: string
  tenant_name?: string
}

export interface DailySnapshotDetail {
  id: string
  camp_day_id: string
  camp_id: string
  staff_profile_id: string
  session_compensation_id: string
  day_number?: number
  date?: string
  day_enrolled_campers: number | null
  day_checked_in_count: number | null
  day_checked_out_count: number | null
  day_no_show_count: number | null
  day_csat_avg_score: number | null
  day_guest_speaker_count: number | null
  notes: string | null
  created_at: string
}

export interface CompensationSummary {
  plan: CompensationPlanDetail
  session: SessionCompensationDetail
  daily_snapshots: DailySnapshotDetail[]
  staff: {
    id: string
    name: string
    email: string
  }
  camp: {
    id: string
    name: string
    start_date: string
    end_date: string
  }
}

export interface CompensationBreakdown {
  fixed_stipend: {
    pre_camp: number
    on_site: number
    total: number
  }
  bonuses: {
    enrollment: {
      threshold: number | null
      actual_enrolled: number | null
      eligible_campers: number
      per_camper_rate: number | null
      earned: number
    }
    csat: {
      required_score: number | null
      actual_score: number | null
      bonus_amount: number | null
      earned: number
    }
    budget_efficiency: {
      preapproved: number | null
      actual: number | null
      savings: number
      rate: number | null
      earned: number
    }
    guest_speaker: {
      required_count: number | null
      actual_count: number | null
      bonus_amount: number | null
      earned: number
    }
  }
  total_variable_bonus: number
  total_compensation: number
}

export interface IncentiveOverviewItem {
  staff_profile_id: string
  staff_name: string
  staff_email: string
  tenant_id?: string
  tenant_name?: string
  total_sessions: number
  total_compensation: number
  avg_csat_score: number | null
  avg_enrollment: number | null
}

export interface TenantIncentiveOverview {
  tenant_id: string
  tenant_name: string
  total_payouts: number
  total_sessions: number
  avg_csat: number | null
  avg_enrollment: number | null
  staff_summaries: IncentiveOverviewItem[]
}

// =============================================================================
// Helper Functions
// =============================================================================

function decimalToNumber(val: Decimal | null | undefined): number | null {
  if (val === null || val === undefined) return null
  return Number(val)
}

function toCompensationPlanDetail(plan: CompensationPlan): CompensationPlanDetail {
  return {
    id: plan.id,
    name: plan.name,
    plan_code: plan.planCode,
    pre_camp_stipend_amount: decimalToNumber(plan.preCampStipendAmount) || 0,
    on_site_stipend_amount: decimalToNumber(plan.onSiteStipendAmount) || 0,
    enrollment_threshold: plan.enrollmentThreshold,
    enrollment_bonus_per_camper: decimalToNumber(plan.enrollmentBonusPerCamper),
    csat_required_score: decimalToNumber(plan.csatRequiredScore),
    csat_bonus_amount: decimalToNumber(plan.csatBonusAmount),
    budget_efficiency_rate: decimalToNumber(plan.budgetEfficiencyRate),
    guest_speaker_required_count: plan.guestSpeakerRequiredCount,
    guest_speaker_bonus_amount: decimalToNumber(plan.guestSpeakerBonusAmount),
    is_active: plan.isActive,
  }
}

// =============================================================================
// Plan Management
// =============================================================================

/**
 * Get all compensation plans
 */
export async function getCompensationPlans(): Promise<{
  data: CompensationPlanDetail[] | null
  error: Error | null
}> {
  try {
    const plans = await prisma.compensationPlan.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })

    return {
      data: plans.map(toCompensationPlanDetail),
      error: null,
    }
  } catch (error) {
    console.error('[Incentives] Failed to get compensation plans:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get a compensation plan by its code
 */
export async function getCompensationPlanByCode(planCode: CompensationPlanCode): Promise<{
  data: CompensationPlanDetail | null
  error: Error | null
}> {
  try {
    const plan = await prisma.compensationPlan.findUnique({
      where: { planCode },
    })

    if (!plan) {
      return { data: null, error: new Error(`Plan not found: ${planCode}`) }
    }

    return {
      data: toCompensationPlanDetail(plan),
      error: null,
    }
  } catch (error) {
    console.error('[Incentives] Failed to get compensation plan:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Session Compensation Management
// =============================================================================

/**
 * Attach a compensation plan to a camp session for a staff member
 */
export async function attachCompensationPlanToSession(params: {
  campId: string
  staffProfileId: string
  planCode: CompensationPlanCode
  tenantId: string
}): Promise<{ data: SessionCompensationDetail | null; error: Error | null }> {
  try {
    const { campId, staffProfileId, planCode, tenantId } = params

    // Load the plan template
    const plan = await prisma.compensationPlan.findUnique({
      where: { planCode },
    })

    if (!plan) {
      return { data: null, error: new Error(`Plan not found: ${planCode}`) }
    }

    // Create or update the session compensation record
    const sessionComp = await prisma.campSessionCompensation.upsert({
      where: {
        campId_staffProfileId: {
          campId,
          staffProfileId,
        },
      },
      create: {
        campId,
        staffProfileId,
        tenantId,
        compensationPlanId: plan.id,
        // Snapshot plan parameters
        preCampStipendAmount: plan.preCampStipendAmount,
        onSiteStipendAmount: plan.onSiteStipendAmount,
        enrollmentThreshold: plan.enrollmentThreshold,
        enrollmentBonusPerCamper: plan.enrollmentBonusPerCamper,
        csatRequiredScore: plan.csatRequiredScore,
        csatBonusAmount: plan.csatBonusAmount,
        budgetEfficiencyRate: plan.budgetEfficiencyRate,
        guestSpeakerRequiredCount: plan.guestSpeakerRequiredCount,
        guestSpeakerBonusAmount: plan.guestSpeakerBonusAmount,
      },
      update: {
        compensationPlanId: plan.id,
        // Update snapshotted parameters
        preCampStipendAmount: plan.preCampStipendAmount,
        onSiteStipendAmount: plan.onSiteStipendAmount,
        enrollmentThreshold: plan.enrollmentThreshold,
        enrollmentBonusPerCamper: plan.enrollmentBonusPerCamper,
        csatRequiredScore: plan.csatRequiredScore,
        csatBonusAmount: plan.csatBonusAmount,
        budgetEfficiencyRate: plan.budgetEfficiencyRate,
        guestSpeakerRequiredCount: plan.guestSpeakerRequiredCount,
        guestSpeakerBonusAmount: plan.guestSpeakerBonusAmount,
      },
      include: {
        compensationPlan: true,
        camp: true,
        staffProfile: true,
      },
    })

    return {
      data: {
        id: sessionComp.id,
        camp_id: sessionComp.campId,
        tenant_id: sessionComp.tenantId,
        staff_profile_id: sessionComp.staffProfileId,
        compensation_plan_id: sessionComp.compensationPlanId,
        plan_name: sessionComp.compensationPlan.name,
        plan_code: sessionComp.compensationPlan.planCode,
        pre_camp_stipend_amount: decimalToNumber(sessionComp.preCampStipendAmount) || 0,
        on_site_stipend_amount: decimalToNumber(sessionComp.onSiteStipendAmount) || 0,
        enrollment_threshold: sessionComp.enrollmentThreshold,
        enrollment_bonus_per_camper: decimalToNumber(sessionComp.enrollmentBonusPerCamper),
        csat_required_score: decimalToNumber(sessionComp.csatRequiredScore),
        csat_bonus_amount: decimalToNumber(sessionComp.csatBonusAmount),
        budget_efficiency_rate: decimalToNumber(sessionComp.budgetEfficiencyRate),
        guest_speaker_required_count: sessionComp.guestSpeakerRequiredCount,
        guest_speaker_bonus_amount: decimalToNumber(sessionComp.guestSpeakerBonusAmount),
        total_enrolled_campers: sessionComp.totalEnrolledCampers,
        csat_avg_score: decimalToNumber(sessionComp.csatAvgScore),
        budget_preapproved_total: decimalToNumber(sessionComp.budgetPreapprovedTotal),
        budget_actual_total: decimalToNumber(sessionComp.budgetActualTotal),
        budget_savings_amount: decimalToNumber(sessionComp.budgetSavingsAmount),
        guest_speaker_count: sessionComp.guestSpeakerCount,
        enrollment_bonus_earned: decimalToNumber(sessionComp.enrollmentBonusEarned),
        csat_bonus_earned: decimalToNumber(sessionComp.csatBonusEarned),
        budget_efficiency_bonus_earned: decimalToNumber(sessionComp.budgetEfficiencyBonusEarned),
        guest_speaker_bonus_earned: decimalToNumber(sessionComp.guestSpeakerBonusEarned),
        fixed_stipend_total: decimalToNumber(sessionComp.fixedStipendTotal),
        total_variable_bonus: decimalToNumber(sessionComp.totalVariableBonus),
        total_compensation: decimalToNumber(sessionComp.totalCompensation),
        calculated_at: sessionComp.calculatedAt?.toISOString() || null,
        is_finalized: sessionComp.isFinalized,
        created_at: sessionComp.createdAt.toISOString(),
        updated_at: sessionComp.updatedAt.toISOString(),
        camp_name: sessionComp.camp.name,
        staff_name: `${sessionComp.staffProfile.firstName || ''} ${sessionComp.staffProfile.lastName || ''}`.trim(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[Incentives] Failed to attach compensation plan:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get session compensation for a camp
 */
export async function getSessionCompensation(params: {
  campId: string
  staffProfileId?: string
  tenantId: string
}): Promise<{ data: SessionCompensationDetail | null; error: Error | null }> {
  try {
    const { campId, staffProfileId, tenantId } = params

    const where: any = {
      campId,
      tenantId,
    }

    if (staffProfileId) {
      where.staffProfileId = staffProfileId
    }

    const sessionComp = await prisma.campSessionCompensation.findFirst({
      where,
      include: {
        compensationPlan: true,
        camp: true,
        staffProfile: true,
        tenant: true,
      },
    })

    if (!sessionComp) {
      return { data: null, error: null }
    }

    return {
      data: {
        id: sessionComp.id,
        camp_id: sessionComp.campId,
        tenant_id: sessionComp.tenantId,
        staff_profile_id: sessionComp.staffProfileId,
        compensation_plan_id: sessionComp.compensationPlanId,
        plan_name: sessionComp.compensationPlan.name,
        plan_code: sessionComp.compensationPlan.planCode,
        pre_camp_stipend_amount: decimalToNumber(sessionComp.preCampStipendAmount) || 0,
        on_site_stipend_amount: decimalToNumber(sessionComp.onSiteStipendAmount) || 0,
        enrollment_threshold: sessionComp.enrollmentThreshold,
        enrollment_bonus_per_camper: decimalToNumber(sessionComp.enrollmentBonusPerCamper),
        csat_required_score: decimalToNumber(sessionComp.csatRequiredScore),
        csat_bonus_amount: decimalToNumber(sessionComp.csatBonusAmount),
        budget_efficiency_rate: decimalToNumber(sessionComp.budgetEfficiencyRate),
        guest_speaker_required_count: sessionComp.guestSpeakerRequiredCount,
        guest_speaker_bonus_amount: decimalToNumber(sessionComp.guestSpeakerBonusAmount),
        total_enrolled_campers: sessionComp.totalEnrolledCampers,
        csat_avg_score: decimalToNumber(sessionComp.csatAvgScore),
        budget_preapproved_total: decimalToNumber(sessionComp.budgetPreapprovedTotal),
        budget_actual_total: decimalToNumber(sessionComp.budgetActualTotal),
        budget_savings_amount: decimalToNumber(sessionComp.budgetSavingsAmount),
        guest_speaker_count: sessionComp.guestSpeakerCount,
        enrollment_bonus_earned: decimalToNumber(sessionComp.enrollmentBonusEarned),
        csat_bonus_earned: decimalToNumber(sessionComp.csatBonusEarned),
        budget_efficiency_bonus_earned: decimalToNumber(sessionComp.budgetEfficiencyBonusEarned),
        guest_speaker_bonus_earned: decimalToNumber(sessionComp.guestSpeakerBonusEarned),
        fixed_stipend_total: decimalToNumber(sessionComp.fixedStipendTotal),
        total_variable_bonus: decimalToNumber(sessionComp.totalVariableBonus),
        total_compensation: decimalToNumber(sessionComp.totalCompensation),
        calculated_at: sessionComp.calculatedAt?.toISOString() || null,
        is_finalized: sessionComp.isFinalized,
        created_at: sessionComp.createdAt.toISOString(),
        updated_at: sessionComp.updatedAt.toISOString(),
        camp_name: sessionComp.camp.name,
        camp_start_date: sessionComp.camp.startDate.toISOString(),
        camp_end_date: sessionComp.camp.endDate.toISOString(),
        staff_name: `${sessionComp.staffProfile.firstName || ''} ${sessionComp.staffProfile.lastName || ''}`.trim(),
        tenant_name: sessionComp.tenant.name,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Incentives] Failed to get session compensation:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Daily Snapshots
// =============================================================================

/**
 * Capture a daily compensation snapshot
 */
export async function captureDaySnapshot(params: {
  campDayId: string
  staffProfileId: string
  tenantId: string
  dayCsatAvgScore?: number
  dayGuestSpeakerCount?: number
  notes?: string
}): Promise<{ data: DailySnapshotDetail | null; error: Error | null }> {
  try {
    const { campDayId, staffProfileId, tenantId, dayCsatAvgScore, dayGuestSpeakerCount, notes } =
      params

    // Get the camp day with attendance
    const campDay = await prisma.campDay.findUnique({
      where: { id: campDayId },
      include: {
        camp: true,
        attendance: true,
      },
    })

    if (!campDay) {
      return { data: null, error: new Error('Camp day not found') }
    }

    // Find the session compensation record
    const sessionComp = await prisma.campSessionCompensation.findFirst({
      where: {
        campId: campDay.campId,
        staffProfileId,
        tenantId,
      },
    })

    if (!sessionComp) {
      return {
        data: null,
        error: new Error('No compensation record found for this staff member'),
      }
    }

    // Calculate daily metrics from attendance
    const dayEnrolledCampers = campDay.attendance.length
    const dayCheckedInCount = campDay.attendance.filter((a) => a.checkInTime).length
    const dayCheckedOutCount = campDay.attendance.filter((a) => a.checkOutTime).length
    const dayNoShowCount = campDay.attendance.filter(
      (a) => !a.checkInTime && a.status === 'absent'
    ).length

    // Create or update snapshot
    const snapshot = await prisma.campDayCompensationSnapshot.upsert({
      where: {
        campDayId_staffProfileId: {
          campDayId,
          staffProfileId,
        },
      },
      create: {
        campDayId,
        campId: campDay.campId,
        staffProfileId,
        sessionCompensationId: sessionComp.id,
        dayEnrolledCampers,
        dayCheckedInCount,
        dayCheckedOutCount,
        dayNoShowCount,
        dayCsatAvgScore,
        dayGuestSpeakerCount: dayGuestSpeakerCount ?? 0,
        notes,
      },
      update: {
        dayEnrolledCampers,
        dayCheckedInCount,
        dayCheckedOutCount,
        dayNoShowCount,
        dayCsatAvgScore,
        dayGuestSpeakerCount: dayGuestSpeakerCount ?? undefined,
        notes,
      },
      include: {
        campDay: true,
      },
    })

    return {
      data: {
        id: snapshot.id,
        camp_day_id: snapshot.campDayId,
        camp_id: snapshot.campId,
        staff_profile_id: snapshot.staffProfileId,
        session_compensation_id: snapshot.sessionCompensationId,
        day_number: snapshot.campDay.dayNumber,
        date: snapshot.campDay.date.toISOString(),
        day_enrolled_campers: snapshot.dayEnrolledCampers,
        day_checked_in_count: snapshot.dayCheckedInCount,
        day_checked_out_count: snapshot.dayCheckedOutCount,
        day_no_show_count: snapshot.dayNoShowCount,
        day_csat_avg_score: decimalToNumber(snapshot.dayCsatAvgScore),
        day_guest_speaker_count: snapshot.dayGuestSpeakerCount,
        notes: snapshot.notes,
        created_at: snapshot.createdAt.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[Incentives] Failed to capture day snapshot:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get daily snapshots for a camp session
 */
export async function getDailySnapshots(params: {
  campId: string
  staffProfileId: string
  tenantId: string
}): Promise<{ data: DailySnapshotDetail[] | null; error: Error | null }> {
  try {
    const { campId, staffProfileId, tenantId } = params

    // Verify tenant access
    const camp = await prisma.camp.findFirst({
      where: { id: campId, tenantId },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp not found or access denied') }
    }

    const snapshots = await prisma.campDayCompensationSnapshot.findMany({
      where: {
        campId,
        staffProfileId,
      },
      include: {
        campDay: true,
      },
      orderBy: {
        campDay: { dayNumber: 'asc' },
      },
    })

    return {
      data: snapshots.map((s) => ({
        id: s.id,
        camp_day_id: s.campDayId,
        camp_id: s.campId,
        staff_profile_id: s.staffProfileId,
        session_compensation_id: s.sessionCompensationId,
        day_number: s.campDay.dayNumber,
        date: s.campDay.date.toISOString(),
        day_enrolled_campers: s.dayEnrolledCampers,
        day_checked_in_count: s.dayCheckedInCount,
        day_checked_out_count: s.dayCheckedOutCount,
        day_no_show_count: s.dayNoShowCount,
        day_csat_avg_score: decimalToNumber(s.dayCsatAvgScore),
        day_guest_speaker_count: s.dayGuestSpeakerCount,
        notes: s.notes,
        created_at: s.createdAt.toISOString(),
      })),
      error: null,
    }
  } catch (error) {
    console.error('[Incentives] Failed to get daily snapshots:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Compensation Calculation
// =============================================================================

/**
 * Calculate session compensation - the heart of the incentive logic
 */
export async function calculateSessionCompensation(params: {
  campId: string
  staffProfileId: string
  tenantId: string
  budgetPreapprovedTotal?: number
  budgetActualTotal?: number
  csatAvgScore?: number
  guestSpeakerCount?: number
}): Promise<{
  data: { total_compensation: number; breakdown: CompensationBreakdown } | null
  error: Error | null
}> {
  try {
    const {
      campId,
      staffProfileId,
      tenantId,
      budgetPreapprovedTotal,
      budgetActualTotal,
      csatAvgScore,
      guestSpeakerCount,
    } = params

    // Get the session compensation record
    const sessionComp = await prisma.campSessionCompensation.findFirst({
      where: {
        campId,
        staffProfileId,
        tenantId,
      },
    })

    if (!sessionComp) {
      return { data: null, error: new Error('No compensation record found') }
    }

    if (sessionComp.isFinalized) {
      return { data: null, error: new Error('Compensation already finalized') }
    }

    // Get enrollment count from registrations
    const enrollmentCount = await prisma.registration.count({
      where: {
        campId,
        status: { in: ['confirmed', 'pending'] },
      },
    })

    // Get guest speaker count from daily snapshots if not provided
    let finalGuestSpeakerCount = guestSpeakerCount
    if (finalGuestSpeakerCount === undefined) {
      const snapshots = await prisma.campDayCompensationSnapshot.findMany({
        where: { campId, staffProfileId },
      })
      finalGuestSpeakerCount = snapshots.reduce(
        (sum, s) => sum + (s.dayGuestSpeakerCount || 0),
        0
      )
    }

    // Calculate each component
    const preCampStipend = decimalToNumber(sessionComp.preCampStipendAmount) || 0
    const onSiteStipend = decimalToNumber(sessionComp.onSiteStipendAmount) || 0
    const fixedStipendTotal = preCampStipend + onSiteStipend

    // Enrollment bonus
    let enrollmentBonusEarned = 0
    let eligibleCampers = 0
    const enrollmentThreshold = sessionComp.enrollmentThreshold || 0
    const enrollmentBonusPerCamper = decimalToNumber(sessionComp.enrollmentBonusPerCamper) || 0

    if (enrollmentCount > enrollmentThreshold && enrollmentBonusPerCamper > 0) {
      eligibleCampers = enrollmentCount - enrollmentThreshold
      enrollmentBonusEarned = eligibleCampers * enrollmentBonusPerCamper
    }

    // CSAT bonus
    let csatBonusEarned = 0
    const csatRequiredScore = decimalToNumber(sessionComp.csatRequiredScore)
    const csatBonusAmount = decimalToNumber(sessionComp.csatBonusAmount) || 0
    const finalCsatScore = csatAvgScore ?? decimalToNumber(sessionComp.csatAvgScore)

    if (
      csatRequiredScore !== null &&
      finalCsatScore !== null &&
      finalCsatScore >= csatRequiredScore
    ) {
      csatBonusEarned = csatBonusAmount
    }

    // Budget efficiency bonus
    let budgetEfficiencyBonusEarned = 0
    let budgetSavings = 0
    const budgetEfficiencyRate = decimalToNumber(sessionComp.budgetEfficiencyRate) || 0
    const finalBudgetPreapproved =
      budgetPreapprovedTotal ?? decimalToNumber(sessionComp.budgetPreapprovedTotal) ?? 0
    const finalBudgetActual =
      budgetActualTotal ?? decimalToNumber(sessionComp.budgetActualTotal) ?? 0

    if (finalBudgetPreapproved > 0) {
      budgetSavings = Math.max(finalBudgetPreapproved - finalBudgetActual, 0)
      budgetEfficiencyBonusEarned = budgetSavings * budgetEfficiencyRate
    }

    // Guest speaker bonus
    let guestSpeakerBonusEarned = 0
    const guestSpeakerRequiredCount = sessionComp.guestSpeakerRequiredCount || 0
    const guestSpeakerBonusAmount = decimalToNumber(sessionComp.guestSpeakerBonusAmount) || 0

    if (
      finalGuestSpeakerCount >= guestSpeakerRequiredCount &&
      guestSpeakerRequiredCount > 0
    ) {
      guestSpeakerBonusEarned = guestSpeakerBonusAmount
    }

    // Totals
    const totalVariableBonus =
      enrollmentBonusEarned +
      csatBonusEarned +
      budgetEfficiencyBonusEarned +
      guestSpeakerBonusEarned
    const totalCompensation = fixedStipendTotal + totalVariableBonus

    // Update the record
    await prisma.campSessionCompensation.update({
      where: { id: sessionComp.id },
      data: {
        totalEnrolledCampers: enrollmentCount,
        csatAvgScore: finalCsatScore,
        budgetPreapprovedTotal: finalBudgetPreapproved,
        budgetActualTotal: finalBudgetActual,
        budgetSavingsAmount: budgetSavings,
        guestSpeakerCount: finalGuestSpeakerCount,
        enrollmentBonusEarned,
        csatBonusEarned,
        budgetEfficiencyBonusEarned,
        guestSpeakerBonusEarned,
        fixedStipendTotal,
        totalVariableBonus,
        totalCompensation,
        calculatedAt: new Date(),
        isFinalized: true,
      },
    })

    const breakdown: CompensationBreakdown = {
      fixed_stipend: {
        pre_camp: preCampStipend,
        on_site: onSiteStipend,
        total: fixedStipendTotal,
      },
      bonuses: {
        enrollment: {
          threshold: sessionComp.enrollmentThreshold,
          actual_enrolled: enrollmentCount,
          eligible_campers: eligibleCampers,
          per_camper_rate: enrollmentBonusPerCamper,
          earned: enrollmentBonusEarned,
        },
        csat: {
          required_score: csatRequiredScore,
          actual_score: finalCsatScore,
          bonus_amount: csatBonusAmount,
          earned: csatBonusEarned,
        },
        budget_efficiency: {
          preapproved: finalBudgetPreapproved,
          actual: finalBudgetActual,
          savings: budgetSavings,
          rate: budgetEfficiencyRate,
          earned: budgetEfficiencyBonusEarned,
        },
        guest_speaker: {
          required_count: guestSpeakerRequiredCount,
          actual_count: finalGuestSpeakerCount,
          bonus_amount: guestSpeakerBonusAmount,
          earned: guestSpeakerBonusEarned,
        },
      },
      total_variable_bonus: totalVariableBonus,
      total_compensation: totalCompensation,
    }

    return {
      data: { total_compensation: totalCompensation, breakdown },
      error: null,
    }
  } catch (error) {
    console.error('[Incentives] Failed to calculate session compensation:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update session metrics (before final calculation)
 */
export async function updateSessionMetrics(params: {
  campId: string
  staffProfileId: string
  tenantId: string
  budgetPreapprovedTotal?: number
  budgetActualTotal?: number
  csatAvgScore?: number
  guestSpeakerCount?: number
}): Promise<{ data: SessionCompensationDetail | null; error: Error | null }> {
  try {
    const {
      campId,
      staffProfileId,
      tenantId,
      budgetPreapprovedTotal,
      budgetActualTotal,
      csatAvgScore,
      guestSpeakerCount,
    } = params

    const sessionComp = await prisma.campSessionCompensation.findFirst({
      where: { campId, staffProfileId, tenantId },
    })

    if (!sessionComp) {
      return { data: null, error: new Error('No compensation record found') }
    }

    if (sessionComp.isFinalized) {
      return { data: null, error: new Error('Cannot update finalized compensation') }
    }

    // Calculate budget savings if both values provided
    let budgetSavingsAmount: number | undefined
    if (budgetPreapprovedTotal !== undefined && budgetActualTotal !== undefined) {
      budgetSavingsAmount = Math.max(budgetPreapprovedTotal - budgetActualTotal, 0)
    }

    const updated = await prisma.campSessionCompensation.update({
      where: { id: sessionComp.id },
      data: {
        budgetPreapprovedTotal,
        budgetActualTotal,
        budgetSavingsAmount,
        csatAvgScore,
        guestSpeakerCount,
      },
      include: {
        compensationPlan: true,
        camp: true,
        staffProfile: true,
      },
    })

    return {
      data: {
        id: updated.id,
        camp_id: updated.campId,
        tenant_id: updated.tenantId,
        staff_profile_id: updated.staffProfileId,
        compensation_plan_id: updated.compensationPlanId,
        plan_name: updated.compensationPlan.name,
        plan_code: updated.compensationPlan.planCode,
        pre_camp_stipend_amount: decimalToNumber(updated.preCampStipendAmount) || 0,
        on_site_stipend_amount: decimalToNumber(updated.onSiteStipendAmount) || 0,
        enrollment_threshold: updated.enrollmentThreshold,
        enrollment_bonus_per_camper: decimalToNumber(updated.enrollmentBonusPerCamper),
        csat_required_score: decimalToNumber(updated.csatRequiredScore),
        csat_bonus_amount: decimalToNumber(updated.csatBonusAmount),
        budget_efficiency_rate: decimalToNumber(updated.budgetEfficiencyRate),
        guest_speaker_required_count: updated.guestSpeakerRequiredCount,
        guest_speaker_bonus_amount: decimalToNumber(updated.guestSpeakerBonusAmount),
        total_enrolled_campers: updated.totalEnrolledCampers,
        csat_avg_score: decimalToNumber(updated.csatAvgScore),
        budget_preapproved_total: decimalToNumber(updated.budgetPreapprovedTotal),
        budget_actual_total: decimalToNumber(updated.budgetActualTotal),
        budget_savings_amount: decimalToNumber(updated.budgetSavingsAmount),
        guest_speaker_count: updated.guestSpeakerCount,
        enrollment_bonus_earned: decimalToNumber(updated.enrollmentBonusEarned),
        csat_bonus_earned: decimalToNumber(updated.csatBonusEarned),
        budget_efficiency_bonus_earned: decimalToNumber(updated.budgetEfficiencyBonusEarned),
        guest_speaker_bonus_earned: decimalToNumber(updated.guestSpeakerBonusEarned),
        fixed_stipend_total: decimalToNumber(updated.fixedStipendTotal),
        total_variable_bonus: decimalToNumber(updated.totalVariableBonus),
        total_compensation: decimalToNumber(updated.totalCompensation),
        calculated_at: updated.calculatedAt?.toISOString() || null,
        is_finalized: updated.isFinalized,
        created_at: updated.createdAt.toISOString(),
        updated_at: updated.updatedAt.toISOString(),
        camp_name: updated.camp.name,
        staff_name: `${updated.staffProfile.firstName || ''} ${updated.staffProfile.lastName || ''}`.trim(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[Incentives] Failed to update session metrics:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Summary & History
// =============================================================================

/**
 * Get full compensation summary for a camp session
 */
export async function getSessionCompensationSummary(params: {
  campId: string
  staffProfileId?: string
  tenantId: string
  role: string
}): Promise<{ data: CompensationSummary | null; error: Error | null }> {
  try {
    const { campId, staffProfileId, tenantId, role } = params

    // Build where clause based on role
    const where: any = { campId }

    // Non-admins can only see their own compensation
    if (role !== 'hq_admin' && role !== 'licensee_owner') {
      if (!staffProfileId) {
        return { data: null, error: new Error('Staff profile ID required') }
      }
      where.staffProfileId = staffProfileId
    } else if (staffProfileId) {
      where.staffProfileId = staffProfileId
    }

    // Admins see tenant-scoped data
    if (role !== 'hq_admin') {
      where.tenantId = tenantId
    }

    const sessionComp = await prisma.campSessionCompensation.findFirst({
      where,
      include: {
        compensationPlan: true,
        camp: true,
        staffProfile: true,
        dailySnapshots: {
          include: { campDay: true },
          orderBy: { campDay: { dayNumber: 'asc' } },
        },
      },
    })

    if (!sessionComp) {
      return { data: null, error: null }
    }

    return {
      data: {
        plan: toCompensationPlanDetail(sessionComp.compensationPlan),
        session: {
          id: sessionComp.id,
          camp_id: sessionComp.campId,
          tenant_id: sessionComp.tenantId,
          staff_profile_id: sessionComp.staffProfileId,
          compensation_plan_id: sessionComp.compensationPlanId,
          plan_name: sessionComp.compensationPlan.name,
          plan_code: sessionComp.compensationPlan.planCode,
          pre_camp_stipend_amount: decimalToNumber(sessionComp.preCampStipendAmount) || 0,
          on_site_stipend_amount: decimalToNumber(sessionComp.onSiteStipendAmount) || 0,
          enrollment_threshold: sessionComp.enrollmentThreshold,
          enrollment_bonus_per_camper: decimalToNumber(sessionComp.enrollmentBonusPerCamper),
          csat_required_score: decimalToNumber(sessionComp.csatRequiredScore),
          csat_bonus_amount: decimalToNumber(sessionComp.csatBonusAmount),
          budget_efficiency_rate: decimalToNumber(sessionComp.budgetEfficiencyRate),
          guest_speaker_required_count: sessionComp.guestSpeakerRequiredCount,
          guest_speaker_bonus_amount: decimalToNumber(sessionComp.guestSpeakerBonusAmount),
          total_enrolled_campers: sessionComp.totalEnrolledCampers,
          csat_avg_score: decimalToNumber(sessionComp.csatAvgScore),
          budget_preapproved_total: decimalToNumber(sessionComp.budgetPreapprovedTotal),
          budget_actual_total: decimalToNumber(sessionComp.budgetActualTotal),
          budget_savings_amount: decimalToNumber(sessionComp.budgetSavingsAmount),
          guest_speaker_count: sessionComp.guestSpeakerCount,
          enrollment_bonus_earned: decimalToNumber(sessionComp.enrollmentBonusEarned),
          csat_bonus_earned: decimalToNumber(sessionComp.csatBonusEarned),
          budget_efficiency_bonus_earned: decimalToNumber(
            sessionComp.budgetEfficiencyBonusEarned
          ),
          guest_speaker_bonus_earned: decimalToNumber(sessionComp.guestSpeakerBonusEarned),
          fixed_stipend_total: decimalToNumber(sessionComp.fixedStipendTotal),
          total_variable_bonus: decimalToNumber(sessionComp.totalVariableBonus),
          total_compensation: decimalToNumber(sessionComp.totalCompensation),
          calculated_at: sessionComp.calculatedAt?.toISOString() || null,
          is_finalized: sessionComp.isFinalized,
          created_at: sessionComp.createdAt.toISOString(),
          updated_at: sessionComp.updatedAt.toISOString(),
        },
        daily_snapshots: sessionComp.dailySnapshots.map((s) => ({
          id: s.id,
          camp_day_id: s.campDayId,
          camp_id: s.campId,
          staff_profile_id: s.staffProfileId,
          session_compensation_id: s.sessionCompensationId,
          day_number: s.campDay.dayNumber,
          date: s.campDay.date.toISOString(),
          day_enrolled_campers: s.dayEnrolledCampers,
          day_checked_in_count: s.dayCheckedInCount,
          day_checked_out_count: s.dayCheckedOutCount,
          day_no_show_count: s.dayNoShowCount,
          day_csat_avg_score: decimalToNumber(s.dayCsatAvgScore),
          day_guest_speaker_count: s.dayGuestSpeakerCount,
          notes: s.notes,
          created_at: s.createdAt.toISOString(),
        })),
        staff: {
          id: sessionComp.staffProfile.id,
          name: `${sessionComp.staffProfile.firstName || ''} ${sessionComp.staffProfile.lastName || ''}`.trim(),
          email: sessionComp.staffProfile.email,
        },
        camp: {
          id: sessionComp.camp.id,
          name: sessionComp.camp.name,
          start_date: sessionComp.camp.startDate.toISOString(),
          end_date: sessionComp.camp.endDate.toISOString(),
        },
      },
      error: null,
    }
  } catch (error) {
    console.error('[Incentives] Failed to get session compensation summary:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get compensation history for a staff member
 */
export async function getPersonCompensationHistory(params: {
  staffProfileId: string
  tenantId?: string
  role: string
}): Promise<{ data: SessionCompensationDetail[] | null; error: Error | null }> {
  try {
    const { staffProfileId, tenantId, role } = params

    const where: any = { staffProfileId }

    // Non-HQ admins see only their tenant's data
    if (role !== 'hq_admin' && tenantId) {
      where.tenantId = tenantId
    }

    const sessions = await prisma.campSessionCompensation.findMany({
      where,
      include: {
        compensationPlan: true,
        camp: true,
        staffProfile: true,
        tenant: true,
      },
      orderBy: { camp: { startDate: 'desc' } },
    })

    return {
      data: sessions.map((s) => ({
        id: s.id,
        camp_id: s.campId,
        tenant_id: s.tenantId,
        staff_profile_id: s.staffProfileId,
        compensation_plan_id: s.compensationPlanId,
        plan_name: s.compensationPlan.name,
        plan_code: s.compensationPlan.planCode,
        pre_camp_stipend_amount: decimalToNumber(s.preCampStipendAmount) || 0,
        on_site_stipend_amount: decimalToNumber(s.onSiteStipendAmount) || 0,
        enrollment_threshold: s.enrollmentThreshold,
        enrollment_bonus_per_camper: decimalToNumber(s.enrollmentBonusPerCamper),
        csat_required_score: decimalToNumber(s.csatRequiredScore),
        csat_bonus_amount: decimalToNumber(s.csatBonusAmount),
        budget_efficiency_rate: decimalToNumber(s.budgetEfficiencyRate),
        guest_speaker_required_count: s.guestSpeakerRequiredCount,
        guest_speaker_bonus_amount: decimalToNumber(s.guestSpeakerBonusAmount),
        total_enrolled_campers: s.totalEnrolledCampers,
        csat_avg_score: decimalToNumber(s.csatAvgScore),
        budget_preapproved_total: decimalToNumber(s.budgetPreapprovedTotal),
        budget_actual_total: decimalToNumber(s.budgetActualTotal),
        budget_savings_amount: decimalToNumber(s.budgetSavingsAmount),
        guest_speaker_count: s.guestSpeakerCount,
        enrollment_bonus_earned: decimalToNumber(s.enrollmentBonusEarned),
        csat_bonus_earned: decimalToNumber(s.csatBonusEarned),
        budget_efficiency_bonus_earned: decimalToNumber(s.budgetEfficiencyBonusEarned),
        guest_speaker_bonus_earned: decimalToNumber(s.guestSpeakerBonusEarned),
        fixed_stipend_total: decimalToNumber(s.fixedStipendTotal),
        total_variable_bonus: decimalToNumber(s.totalVariableBonus),
        total_compensation: decimalToNumber(s.totalCompensation),
        calculated_at: s.calculatedAt?.toISOString() || null,
        is_finalized: s.isFinalized,
        created_at: s.createdAt.toISOString(),
        updated_at: s.updatedAt.toISOString(),
        camp_name: s.camp.name,
        camp_start_date: s.camp.startDate.toISOString(),
        camp_end_date: s.camp.endDate.toISOString(),
        staff_name: `${s.staffProfile.firstName || ''} ${s.staffProfile.lastName || ''}`.trim(),
        tenant_name: s.tenant.name,
      })),
      error: null,
    }
  } catch (error) {
    console.error('[Incentives] Failed to get person compensation history:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Overview / Scorecards
// =============================================================================

/**
 * Get incentive overview for a tenant (licensee view)
 */
export async function getTenantIncentiveOverview(
  tenantId: string
): Promise<{ data: TenantIncentiveOverview | null; error: Error | null }> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    })

    if (!tenant) {
      return { data: null, error: new Error('Tenant not found') }
    }

    // Get all finalized session compensations for this tenant
    const sessions = await prisma.campSessionCompensation.findMany({
      where: {
        tenantId,
        isFinalized: true,
      },
      include: {
        staffProfile: true,
      },
    })

    // Aggregate by staff
    const staffMap = new Map<string, {
      sessions: typeof sessions
      staffProfile: typeof sessions[0]['staffProfile']
    }>()

    for (const session of sessions) {
      const existing = staffMap.get(session.staffProfileId)
      if (existing) {
        existing.sessions.push(session)
      } else {
        staffMap.set(session.staffProfileId, {
          sessions: [session],
          staffProfile: session.staffProfile,
        })
      }
    }

    // Build staff summaries
    const staffSummaries: IncentiveOverviewItem[] = []
    let totalPayouts = 0
    let totalCsat = 0
    let csatCount = 0
    let totalEnrollment = 0
    let enrollmentCount = 0

    for (const [staffId, data] of staffMap) {
      const staffTotal = data.sessions.reduce(
        (sum, s) => sum + (decimalToNumber(s.totalCompensation) || 0),
        0
      )
      totalPayouts += staffTotal

      const staffCsatScores = data.sessions
        .map((s) => decimalToNumber(s.csatAvgScore))
        .filter((s): s is number => s !== null)
      const avgCsat = staffCsatScores.length
        ? staffCsatScores.reduce((a, b) => a + b, 0) / staffCsatScores.length
        : null

      if (avgCsat !== null) {
        totalCsat += avgCsat * staffCsatScores.length
        csatCount += staffCsatScores.length
      }

      const staffEnrollments = data.sessions
        .map((s) => s.totalEnrolledCampers)
        .filter((e): e is number => e !== null)
      const avgEnrollment = staffEnrollments.length
        ? staffEnrollments.reduce((a, b) => a + b, 0) / staffEnrollments.length
        : null

      if (avgEnrollment !== null) {
        totalEnrollment += avgEnrollment * staffEnrollments.length
        enrollmentCount += staffEnrollments.length
      }

      staffSummaries.push({
        staff_profile_id: staffId,
        staff_name: `${data.staffProfile.firstName || ''} ${data.staffProfile.lastName || ''}`.trim(),
        staff_email: data.staffProfile.email,
        total_sessions: data.sessions.length,
        total_compensation: staffTotal,
        avg_csat_score: avgCsat,
        avg_enrollment: avgEnrollment,
      })
    }

    return {
      data: {
        tenant_id: tenantId,
        tenant_name: tenant.name,
        total_payouts: totalPayouts,
        total_sessions: sessions.length,
        avg_csat: csatCount > 0 ? totalCsat / csatCount : null,
        avg_enrollment: enrollmentCount > 0 ? totalEnrollment / enrollmentCount : null,
        staff_summaries: staffSummaries,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Incentives] Failed to get tenant incentive overview:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get global incentive overview (HQ admin view)
 */
export async function getGlobalIncentiveOverview(): Promise<{
  data: TenantIncentiveOverview[] | null
  error: Error | null
}> {
  try {
    // Get all tenants with finalized compensations
    const tenants = await prisma.tenant.findMany({
      where: {
        sessionCompensations: {
          some: { isFinalized: true },
        },
      },
    })

    const overviews: TenantIncentiveOverview[] = []

    for (const tenant of tenants) {
      const result = await getTenantIncentiveOverview(tenant.id)
      if (result.data) {
        overviews.push(result.data)
      }
    }

    return { data: overviews, error: null }
  } catch (error) {
    console.error('[Incentives] Failed to get global incentive overview:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get director's own incentive overview
 */
export async function getDirectorIncentiveOverview(params: {
  staffProfileId: string
  tenantId: string
}): Promise<{ data: IncentiveOverviewItem | null; error: Error | null }> {
  try {
    const { staffProfileId, tenantId } = params

    const sessions = await prisma.campSessionCompensation.findMany({
      where: {
        staffProfileId,
        tenantId,
        isFinalized: true,
      },
      include: {
        staffProfile: true,
      },
    })

    if (sessions.length === 0) {
      return { data: null, error: null }
    }

    const totalComp = sessions.reduce(
      (sum, s) => sum + (decimalToNumber(s.totalCompensation) || 0),
      0
    )

    const csatScores = sessions
      .map((s) => decimalToNumber(s.csatAvgScore))
      .filter((s): s is number => s !== null)
    const avgCsat = csatScores.length
      ? csatScores.reduce((a, b) => a + b, 0) / csatScores.length
      : null

    const enrollments = sessions
      .map((s) => s.totalEnrolledCampers)
      .filter((e): e is number => e !== null)
    const avgEnrollment = enrollments.length
      ? enrollments.reduce((a, b) => a + b, 0) / enrollments.length
      : null

    const staff = sessions[0].staffProfile

    return {
      data: {
        staff_profile_id: staffProfileId,
        staff_name: `${staff.firstName || ''} ${staff.lastName || ''}`.trim(),
        staff_email: staff.email,
        tenant_id: tenantId,
        total_sessions: sessions.length,
        total_compensation: totalComp,
        avg_csat_score: avgCsat,
        avg_enrollment: avgEnrollment,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Incentives] Failed to get director incentive overview:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Licensee Incentive Summary (for licensee dashboard)
// =============================================================================

export interface LicenseeStaffIncentive {
  staff_id: string
  staff_name: string
  role: string
  sessions_this_season: number
  total_compensation: number
  pending_compensation: number
  finalized_compensation: number
  avg_csat: number | null
  avg_enrollment: number
  is_finalized: boolean
}

export interface LicenseeIncentiveSummary {
  total_paid: number
  total_pending: number
  staff_count: number
  avg_per_session: number
  staff: LicenseeStaffIncentive[]
}

/**
 * Get licensee incentive summary with staff compensation breakdown
 * Includes both pending and finalized compensation records
 */
export async function getLicenseeIncentiveSummary(
  tenantId: string
): Promise<{ data: LicenseeIncentiveSummary | null; error: Error | null }> {
  try {
    // Get current season dates (April to August of current year)
    const now = new Date()
    const currentYear = now.getFullYear()
    const seasonStart = new Date(currentYear, 3, 1) // April 1
    const seasonEnd = new Date(currentYear, 7, 31) // August 31

    // Get all session compensations for this tenant (both pending and finalized)
    const sessions = await prisma.campSessionCompensation.findMany({
      where: {
        tenantId,
        camp: {
          startDate: {
            gte: seasonStart,
            lte: seasonEnd,
          },
        },
      },
      include: {
        staffProfile: true,
        camp: {
          include: {
            staffAssignments: {
              select: {
                role: true,
                userId: true,
              },
            },
          },
        },
      },
    })

    // Build staff aggregations
    const staffMap = new Map<
      string,
      {
        staffProfile: (typeof sessions)[0]['staffProfile']
        role: string
        sessions: (typeof sessions)[0][]
      }
    >()

    for (const session of sessions) {
      const existing = staffMap.get(session.staffProfileId)

      // Get role from camp staff assignment
      const assignment = session.camp.staffAssignments.find(
        (a) => a.userId === session.staffProfileId
      )
      const role = assignment?.role || 'staff'

      if (existing) {
        existing.sessions.push(session)
      } else {
        staffMap.set(session.staffProfileId, {
          staffProfile: session.staffProfile,
          role,
          sessions: [session],
        })
      }
    }

    // Calculate totals and build staff list
    let totalPaid = 0
    let totalPending = 0
    let totalSessions = 0
    const staffList: LicenseeStaffIncentive[] = []

    for (const [staffId, data] of staffMap) {
      const finalized = data.sessions.filter((s) => s.isFinalized)
      const pending = data.sessions.filter((s) => !s.isFinalized)

      const finalizedComp = finalized.reduce(
        (sum, s) => sum + (decimalToNumber(s.totalCompensation) || 0),
        0
      )
      const pendingComp = pending.reduce(
        (sum, s) => {
          // For pending, estimate based on fixed stipend if total not yet calculated
          const total = decimalToNumber(s.totalCompensation)
          if (total !== null) return sum + total
          return sum + (decimalToNumber(s.preCampStipendAmount) || 0) + (decimalToNumber(s.onSiteStipendAmount) || 0)
        },
        0
      )

      totalPaid += finalizedComp
      totalPending += pendingComp
      totalSessions += data.sessions.length

      // Calculate averages
      const csatScores = data.sessions
        .map((s) => decimalToNumber(s.csatAvgScore))
        .filter((s): s is number => s !== null)
      const avgCsat = csatScores.length
        ? csatScores.reduce((a, b) => a + b, 0) / csatScores.length
        : null

      const enrollments = data.sessions
        .map((s) => s.totalEnrolledCampers)
        .filter((e): e is number => e !== null)
      const avgEnrollment = enrollments.length
        ? enrollments.reduce((a, b) => a + b, 0) / enrollments.length
        : 0

      staffList.push({
        staff_id: staffId,
        staff_name: `${data.staffProfile.firstName || ''} ${data.staffProfile.lastName || ''}`.trim(),
        role: data.role,
        sessions_this_season: data.sessions.length,
        total_compensation: finalizedComp + pendingComp,
        pending_compensation: pendingComp,
        finalized_compensation: finalizedComp,
        avg_csat: avgCsat,
        avg_enrollment: avgEnrollment,
        is_finalized: pending.length === 0 && finalized.length > 0,
      })
    }

    // Sort by total compensation descending
    staffList.sort((a, b) => b.total_compensation - a.total_compensation)

    return {
      data: {
        total_paid: totalPaid,
        total_pending: totalPending,
        staff_count: staffMap.size,
        avg_per_session: totalSessions > 0 ? (totalPaid + totalPending) / totalSessions : 0,
        staff: staffList,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Incentives] Failed to get licensee incentive summary:', error)
    return { data: null, error: error as Error }
  }
}
