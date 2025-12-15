/**
 * Licensee Quality & Compliance Service
 *
 * Provides quality metrics and compliance tracking for licensees.
 * Measures:
 * - Customer Satisfaction (CSAT) scores
 * - Complaint tracking and ratios
 * - Curriculum adherence (use of Grouping Tool, curriculum templates)
 * - Overall quality health indicators
 */

import { prisma } from '@/lib/db/client'

// =============================================================================
// Types
// =============================================================================

export interface CampQualityMetrics {
  camp_id: string
  camp_name: string
  camp_dates: string
  csat_score: number | null
  csat_response_count: number
  complaint_count: number
  camper_count: number
  complaint_ratio: number
  curriculum_adherence: number
  grouping_tool_used: boolean
  daily_recaps_completed: number
  total_days: number
  status: 'excellent' | 'good' | 'needs_attention' | 'critical'
}

export interface QualityTrendData {
  period: string
  csat_avg: number | null
  complaint_ratio: number
  curriculum_adherence: number
  camps_count: number
}

export interface LicenseeQualityReport {
  overall: {
    avg_csat: number | null
    total_responses: number
    complaint_ratio: number
    curriculum_adherence: number
    camps_excellent: number
    camps_good: number
    camps_attention: number
    camps_critical: number
  }
  camps: CampQualityMetrics[]
  trends: QualityTrendData[]
  warnings: QualityWarning[]
  period_start: string
  period_end: string
}

export interface QualityWarning {
  type: 'csat_low' | 'complaints_high' | 'curriculum_low' | 'recaps_missing'
  severity: 'warning' | 'critical'
  message: string
  affected_camps: string[]
}

// =============================================================================
// Helper Functions
// =============================================================================

function getSeasonDateRange(): { start: Date; end: Date } {
  const now = new Date()
  const year = now.getFullYear()
  return {
    start: new Date(year, 2, 1),
    end: new Date(year, 8, 30),
  }
}

function determineQualityStatus(
  csat: number | null,
  complaintRatio: number,
  curriculumAdherence: number
): 'excellent' | 'good' | 'needs_attention' | 'critical' {
  const csatGood = csat === null || csat >= 4.5
  const csatAcceptable = csat === null || csat >= 4.0
  const complaintsLow = complaintRatio < 1
  const complaintsAcceptable = complaintRatio < 3
  const curriculumHigh = curriculumAdherence >= 90
  const curriculumAcceptable = curriculumAdherence >= 70

  if (csatGood && complaintsLow && curriculumHigh) return 'excellent'
  if (csatAcceptable && complaintsAcceptable && curriculumAcceptable) return 'good'
  if (!csatAcceptable || !complaintsAcceptable) return 'critical'
  return 'needs_attention'
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Get comprehensive quality report for a licensee
 */
export async function getLicenseeQualityReport(params: {
  tenantId: string
  startDate?: string
  endDate?: string
}): Promise<{ data: LicenseeQualityReport | null; error: Error | null }> {
  try {
    let start: Date
    let end: Date

    if (params.startDate && params.endDate) {
      start = new Date(params.startDate)
      end = new Date(params.endDate)
    } else {
      const range = getSeasonDateRange()
      start = range.start
      end = range.end
    }

    // Get all camps with quality-related data
    const camps = await prisma.camp.findMany({
      where: {
        tenantId: params.tenantId,
        startDate: { gte: start, lte: end },
        status: { in: ['completed', 'in_progress'] },
      },
      include: {
        registrations: {
          where: { status: 'confirmed' },
        },
        sessionCompensations: true,
        campDays: {
          include: {
            scheduleBlockProgress: true,
          },
        },
        campGroups: true,
      },
      orderBy: { startDate: 'desc' },
    })

    let totalCsat = 0
    let csatCount = 0
    let totalComplaints = 0
    let totalCampers = 0
    let totalCurriculumScore = 0
    let curriculumCampsCount = 0

    let campsExcellent = 0
    let campsGood = 0
    let campsAttention = 0
    let campsCritical = 0

    const warnings: QualityWarning[] = []
    const lowCsatCamps: string[] = []
    const highComplaintCamps: string[] = []
    const lowCurriculumCamps: string[] = []
    const missingRecapsCamps: string[] = []

    const campMetrics: CampQualityMetrics[] = camps.map(camp => {
      const camperCount = camp.registrations.length
      totalCampers += camperCount

      // CSAT from session compensation
      let campCsat: number | null = null
      for (const sc of camp.sessionCompensations) {
        if (sc.csatAvgScore) {
          campCsat = Number(sc.csatAvgScore)
          totalCsat += campCsat
          csatCount += 1
        }
      }

      // Complaints (would come from a complaints table - simplified)
      const campComplaints = 0

      // Complaint ratio per 100 campers
      const complaintRatio = camperCount > 0 ? (campComplaints / camperCount) * 100 : 0
      totalComplaints += campComplaints

      // Curriculum adherence
      const totalDays = camp.campDays.length
      let daysWithProgress = 0
      let daysWithRecaps = 0

      for (const day of camp.campDays) {
        if (day.scheduleBlockProgress.length > 0) {
          daysWithProgress += 1
        }
        if (day.completedAt) {
          daysWithRecaps += 1
        }
      }

      const groupingUsed = camp.campGroups.length > 0
      const curriculumAdherence = totalDays > 0
        ? ((daysWithProgress / totalDays) * 50) + (groupingUsed ? 50 : 0)
        : 100

      totalCurriculumScore += curriculumAdherence
      curriculumCampsCount += 1

      // Determine status
      const status = determineQualityStatus(campCsat, complaintRatio, curriculumAdherence)

      // Count by status
      if (status === 'excellent') campsExcellent += 1
      else if (status === 'good') campsGood += 1
      else if (status === 'needs_attention') campsAttention += 1
      else campsCritical += 1

      // Track warnings
      if (campCsat !== null && campCsat < 4.0) lowCsatCamps.push(camp.name)
      if (complaintRatio > 3) highComplaintCamps.push(camp.name)
      if (curriculumAdherence < 70) lowCurriculumCamps.push(camp.name)
      if (totalDays > 0 && daysWithRecaps < totalDays) missingRecapsCamps.push(camp.name)

      return {
        camp_id: camp.id,
        camp_name: camp.name,
        camp_dates: `${camp.startDate.toLocaleDateString()} - ${camp.endDate.toLocaleDateString()}`,
        csat_score: campCsat,
        csat_response_count: 0, // Simplified - no csatResponseCount field available
        complaint_count: campComplaints,
        camper_count: camperCount,
        complaint_ratio: complaintRatio,
        curriculum_adherence: curriculumAdherence,
        grouping_tool_used: groupingUsed,
        daily_recaps_completed: daysWithRecaps,
        total_days: totalDays,
        status,
      }
    })

    // Build warnings
    if (lowCsatCamps.length > 0) {
      warnings.push({
        type: 'csat_low',
        severity: lowCsatCamps.length > 2 ? 'critical' : 'warning',
        message: `${lowCsatCamps.length} camp(s) have CSAT below 4.0`,
        affected_camps: lowCsatCamps,
      })
    }

    if (highComplaintCamps.length > 0) {
      warnings.push({
        type: 'complaints_high',
        severity: 'critical',
        message: `${highComplaintCamps.length} camp(s) have high complaint ratios`,
        affected_camps: highComplaintCamps,
      })
    }

    if (lowCurriculumCamps.length > 0) {
      warnings.push({
        type: 'curriculum_low',
        severity: 'warning',
        message: `${lowCurriculumCamps.length} camp(s) have low curriculum adherence`,
        affected_camps: lowCurriculumCamps,
      })
    }

    if (missingRecapsCamps.length > 0) {
      warnings.push({
        type: 'recaps_missing',
        severity: 'warning',
        message: `${missingRecapsCamps.length} camp(s) have incomplete daily recaps`,
        affected_camps: missingRecapsCamps,
      })
    }

    // Calculate overall metrics
    const avgCsat = csatCount > 0 ? totalCsat / csatCount : null
    const overallComplaintRatio = totalCampers > 0 ? (totalComplaints / totalCampers) * 100 : 0
    const avgCurriculumAdherence = curriculumCampsCount > 0
      ? totalCurriculumScore / curriculumCampsCount
      : 100

    // Trends (simplified - would aggregate by month)
    const trends: QualityTrendData[] = []

    return {
      data: {
        overall: {
          avg_csat: avgCsat,
          total_responses: csatCount,
          complaint_ratio: overallComplaintRatio,
          curriculum_adherence: avgCurriculumAdherence,
          camps_excellent: campsExcellent,
          camps_good: campsGood,
          camps_attention: campsAttention,
          camps_critical: campsCritical,
        },
        camps: campMetrics,
        trends,
        warnings,
        period_start: start.toISOString(),
        period_end: end.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[LicenseeQuality] Failed to get quality report:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get CSAT breakdown by camp
 */
export async function getLicenseeCsatBreakdown(params: {
  tenantId: string
}): Promise<{
  data: {
    camps: Array<{
      camp_id: string
      camp_name: string
      csat_score: number | null
      response_count: number
      trend: 'up' | 'down' | 'stable' | null
    }>
    average: number | null
  } | null
  error: Error | null
}> {
  try {
    const { start, end } = getSeasonDateRange()

    const camps = await prisma.camp.findMany({
      where: {
        tenantId: params.tenantId,
        startDate: { gte: start, lte: end },
        status: { in: ['completed', 'in_progress'] },
      },
      include: {
        sessionCompensations: true,
      },
      orderBy: { startDate: 'desc' },
    })

    let totalCsat = 0
    let csatCount = 0

    const csatData = camps.map(camp => {
      let score: number | null = null

      for (const sc of camp.sessionCompensations) {
        if (sc.csatAvgScore) {
          score = Number(sc.csatAvgScore)
          totalCsat += score
          csatCount += 1
        }
      }

      return {
        camp_id: camp.id,
        camp_name: camp.name,
        csat_score: score,
        response_count: 0, // Simplified - no csatResponseCount field
        trend: null as 'up' | 'down' | 'stable' | null,
      }
    })

    return {
      data: {
        camps: csatData,
        average: csatCount > 0 ? totalCsat / csatCount : null,
      },
      error: null,
    }
  } catch (error) {
    console.error('[LicenseeQuality] Failed to get CSAT breakdown:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get curriculum adherence details
 */
export async function getLicenseeCurriculumAdherence(params: {
  tenantId: string
}): Promise<{
  data: {
    overall_score: number
    camps_using_grouping: number
    camps_with_full_curriculum: number
    total_camps: number
    breakdown: Array<{
      camp_id: string
      camp_name: string
      score: number
      grouping_used: boolean
      curriculum_days_completed: number
      total_days: number
    }>
  } | null
  error: Error | null
}> {
  try {
    const { start, end } = getSeasonDateRange()

    const camps = await prisma.camp.findMany({
      where: {
        tenantId: params.tenantId,
        startDate: { gte: start, lte: end },
        status: { in: ['completed', 'in_progress'] },
      },
      include: {
        campGroups: true,
        campDays: {
          include: {
            scheduleBlockProgress: true,
          },
        },
      },
    })

    let totalScore = 0
    let campsUsingGrouping = 0
    let campsWithFullCurriculum = 0

    const breakdown = camps.map(camp => {
      const groupingUsed = camp.campGroups.length > 0
      if (groupingUsed) campsUsingGrouping += 1

      const totalDays = camp.campDays.length
      let daysWithProgress = 0

      for (const day of camp.campDays) {
        if (day.scheduleBlockProgress.length > 0) {
          daysWithProgress += 1
        }
      }

      const score = totalDays > 0
        ? ((daysWithProgress / totalDays) * 50) + (groupingUsed ? 50 : 0)
        : 100

      if (score >= 90) campsWithFullCurriculum += 1
      totalScore += score

      return {
        camp_id: camp.id,
        camp_name: camp.name,
        score,
        grouping_used: groupingUsed,
        curriculum_days_completed: daysWithProgress,
        total_days: totalDays,
      }
    })

    return {
      data: {
        overall_score: camps.length > 0 ? totalScore / camps.length : 100,
        camps_using_grouping: campsUsingGrouping,
        camps_with_full_curriculum: campsWithFullCurriculum,
        total_camps: camps.length,
        breakdown,
      },
      error: null,
    }
  } catch (error) {
    console.error('[LicenseeQuality] Failed to get curriculum adherence:', error)
    return { data: null, error: error as Error }
  }
}
