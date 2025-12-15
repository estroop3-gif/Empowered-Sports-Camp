/**
 * Reports Service
 *
 * SHELL: PDF & KPI report generation service
 *
 * Handles generation of:
 * - Session-level PDF reports (attendance, KPIs, revenue, incentives)
 * - Camp day end-of-day reports
 * - Curriculum PDF exports for staff
 */

import { prisma } from '@/lib/db/client'

// =============================================================================
// Types
// =============================================================================

export type ReportType = 'SESSION' | 'DAY' | 'CURRICULUM'

export interface PdfReportResult {
  url: string | null
  reportId: string | null
  generatedAt: string | null
}

export interface SessionReportData {
  campSession: {
    id: string
    name: string
    startDate: string
    endDate: string
  }
  attendance: {
    totalEnrolled: number
    averageDaily: number
    checkInRate: number
  }
  revenue: {
    grossRevenue: number
    upsells: number
    arpc: number
  }
  incentives: {
    totalEarned: number
    bonuses: number
  }
  kpis: {
    csatScore: number | null
    incidentCount: number
    staffPerformance: number | null
  }
}

export interface CampDayReportData {
  campDay: {
    id: string
    date: string
    dayNumber: number
    campName: string
  }
  attendance: {
    enrolled: number
    checkedIn: number
    checkedOut: number
    noShows: number
  }
  incidents: {
    count: number
    details: string[]
  }
  scheduleCompletion: number
  notes: string | null
}

export interface CurriculumExportData {
  curriculum: {
    id: string
    title: string
    description: string | null
  }
  blocks: {
    title: string
    duration: number
    description: string | null
    order: number
  }[]
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * SHELL: Generate a full PDF report for a camp session
 *
 * Includes attendance, KPIs, revenue, and incentives data.
 */
export async function generateSessionPdfReport(params: {
  campSessionId: string
  tenantId: string
  role: string
}): Promise<{ data: PdfReportResult | null; error: Error | null }> {
  try {
    const { campSessionId, tenantId, role } = params

    // SHELL: Verify access - check role has permission for this tenant/session
    // TODO: Add proper role-based access check

    // SHELL: Fetch session data
    const camp = await prisma.camp.findFirst({
      where: {
        id: campSessionId,
        tenantId,
      },
      include: {
        tenant: true,
        location: true,
      },
    })

    if (!camp) {
      return { data: null, error: new Error('Camp session not found') }
    }

    // SHELL: Gather report data from existing services
    // TODO: Pull attendance data from attendance service
    // TODO: Pull revenue data from revenue service
    // TODO: Pull incentive data from incentive service
    // TODO: Calculate KPIs

    const reportData: SessionReportData = {
      campSession: {
        id: camp.id,
        name: camp.name,
        startDate: camp.startDate.toISOString(),
        endDate: camp.endDate.toISOString(),
      },
      attendance: {
        totalEnrolled: 0, // SHELL: fetch from camper_session_data
        averageDaily: 0,
        checkInRate: 0,
      },
      revenue: {
        grossRevenue: 0, // SHELL: fetch from registrations + orders
        upsells: 0,
        arpc: 0,
      },
      incentives: {
        totalEarned: 0, // SHELL: fetch from compensation snapshots
        bonuses: 0,
      },
      kpis: {
        csatScore: null, // SHELL: fetch from feedback
        incidentCount: 0,
        staffPerformance: null,
      },
    }

    // SHELL: Generate PDF using a PDF library
    // TODO: Implement PDF generation with @react-pdf/renderer or puppeteer
    // TODO: Upload PDF to S3
    // TODO: Store reference in pdf_reports table

    console.log('[Reports] SHELL: Would generate session PDF with data:', reportData)

    // SHELL: Return placeholder - replace with actual URL after implementation
    return {
      data: {
        url: null, // SHELL: Replace with S3 URL after PDF generation
        reportId: null,
        generatedAt: new Date().toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[Reports] Failed to generate session PDF:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: Generate end-of-day PDF report for Camp Day flow
 */
export async function generateCampDayPdfReport(params: {
  campDayId: string
  tenantId: string
  role: string
}): Promise<{ data: PdfReportResult | null; error: Error | null }> {
  try {
    const { campDayId, tenantId, role } = params

    // SHELL: Fetch camp day data
    const campDay = await prisma.campDay.findFirst({
      where: {
        id: campDayId,
        camp: { tenantId },
      },
      include: {
        camp: true,
        attendance: true,
        incidents: true,
      },
    })

    if (!campDay) {
      return { data: null, error: new Error('Camp day not found') }
    }

    // SHELL: Gather report data
    const reportData: CampDayReportData = {
      campDay: {
        id: campDay.id,
        date: campDay.date.toISOString(),
        dayNumber: campDay.dayNumber,
        campName: campDay.camp.name,
      },
      attendance: {
        enrolled: 0, // SHELL: count from attendance records
        checkedIn: campDay.attendance.filter((a) => a.checkInTime).length,
        checkedOut: campDay.attendance.filter((a) => a.checkOutTime).length,
        noShows: 0,
      },
      incidents: {
        count: campDay.incidents.length,
        details: campDay.incidents.map((i) => i.description || ''),
      },
      scheduleCompletion: 0, // SHELL: calculate from schedule block progress
      notes: campDay.notes,
    }

    // SHELL: Generate PDF
    // TODO: Implement PDF generation
    // TODO: Upload to S3
    // TODO: Store reference

    console.log('[Reports] SHELL: Would generate camp day PDF with data:', reportData)

    return {
      data: {
        url: null,
        reportId: null,
        generatedAt: new Date().toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[Reports] Failed to generate camp day PDF:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: Export curriculum/schedule as a printable PDF for staff
 */
export async function exportCurriculumPdf(params: {
  curriculumId: string
  tenantId: string
  role: string
}): Promise<{ data: PdfReportResult | null; error: Error | null }> {
  try {
    const { curriculumId, tenantId, role } = params

    // SHELL: Fetch curriculum data
    // Could be a ScheduleTemplate, CurriculumBlock, or custom curriculum
    const template = await prisma.scheduleTemplate.findFirst({
      where: {
        id: curriculumId,
        OR: [{ licenseeId: tenantId }, { isGlobal: true }],
      },
      include: {
        blocks: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    })

    if (!template) {
      return { data: null, error: new Error('Curriculum not found') }
    }

    // SHELL: Gather export data
    const exportData: CurriculumExportData = {
      curriculum: {
        id: template.id,
        title: template.name,
        description: template.description,
      },
      blocks: template.blocks.map((b) => ({
        title: b.label,
        duration: Math.round((b.endTime.getTime() - b.startTime.getTime()) / 60000), // Calculate duration from start/end time
        description: b.description,
        order: b.orderIndex,
      })),
    }

    // SHELL: Generate PDF
    // TODO: Implement PDF generation with nice formatting for printing
    // TODO: Upload to S3
    // TODO: Store reference

    console.log('[Reports] SHELL: Would export curriculum PDF with data:', exportData)

    return {
      data: {
        url: null,
        reportId: null,
        generatedAt: new Date().toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[Reports] Failed to export curriculum PDF:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: List generated reports for a tenant
 */
export async function listReports(params: {
  tenantId: string
  type?: ReportType
  limit?: number
}): Promise<{ data: { id: string; type: string; url: string; createdAt: string }[] | null; error: Error | null }> {
  try {
    // SHELL: Query pdf_reports table
    // TODO: Implement after table is created

    console.log('[Reports] SHELL: Would list reports for tenant:', params.tenantId)

    return {
      data: [],
      error: null,
    }
  } catch (error) {
    console.error('[Reports] Failed to list reports:', error)
    return { data: null, error: error as Error }
  }
}
