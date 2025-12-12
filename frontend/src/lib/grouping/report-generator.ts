/**
 * EMPOWERED SPORTS CAMP - GROUP REPORT GENERATOR
 *
 * Generates branded, printable reports for finalized group assignments.
 * Reports include:
 * - Camp and tenant branding
 * - Group listings with all camper details
 * - Summary statistics
 * - Accepted exceptions with director notes
 *
 * The report is designed to be:
 * - Viewable on-screen in a modal
 * - Printable as a PDF via browser print
 * - Downloadable as a styled HTML document
 */

import {
  GroupReport,
  GroupReportSection,
  GroupReportCamper,
  GroupReportSummary,
  AcceptedViolation,
  CampGroup,
  StandardizedCamper,
  FriendGroup,
  ConstraintViolation,
} from './types'
import { formatGradeRange } from './standardization'

// ============================================================================
// REPORT DATA GENERATION
// ============================================================================

interface GenerateReportOptions {
  campId: string
  campName: string
  campStartDate: Date
  campEndDate: Date
  campLocation: string
  tenantId: string
  tenantName: string
  tenantLogo: string | null
  primaryColor: string
  secondaryColor: string
  groups: CampGroup[]
  campers: StandardizedCamper[]
  friendGroups: FriendGroup[]
  violations: ConstraintViolation[]
  directorNotes?: string
}

/**
 * Generate a complete group report from current state
 */
export function generateGroupReport(options: GenerateReportOptions): GroupReport {
  const {
    campId,
    campName,
    campStartDate,
    campEndDate,
    campLocation,
    tenantId,
    tenantName,
    tenantLogo,
    primaryColor,
    secondaryColor,
    groups,
    campers,
    friendGroups,
    violations,
    directorNotes,
  } = options

  // Build camper lookup
  const camperMap = new Map<string, StandardizedCamper>()
  for (const camper of campers) {
    camperMap.set(camper.athleteId, camper)
  }

  // Build friend lookup
  const friendLookup = new Map<string, string[]>()
  for (const fg of friendGroups) {
    for (const memberId of fg.memberIds) {
      const friendNames = fg.memberIds
        .filter(id => id !== memberId)
        .map(id => camperMap.get(id)?.fullName)
        .filter(Boolean) as string[]
      friendLookup.set(memberId, friendNames)
    }
  }

  // Generate group sections
  const groupSections: GroupReportSection[] = groups
    .sort((a, b) => a.groupNumber - b.groupNumber)
    .map(group => {
      const groupCampers = group.camperIds
        .map(id => camperMap.get(id))
        .filter(Boolean) as StandardizedCamper[]

      // Sort campers by name
      groupCampers.sort((a, b) => a.fullName.localeCompare(b.fullName))

      const reportCampers: GroupReportCamper[] = groupCampers.map(camper => {
        // Get friends in same group
        const allFriends = friendLookup.get(camper.athleteId) || []
        const friendsInGroup = allFriends.filter(name =>
          groupCampers.some(gc => gc.fullName === name)
        )

        // Combine special notes
        const specialNotes = [
          camper.specialConsiderations,
        ].filter(Boolean).join('; ') || null

        return {
          fullName: camper.fullName,
          age: camper.ageAtCampStart,
          grade: camper.gradeDisplay,
          medicalNotes: camper.medicalNotes,
          allergies: camper.allergies,
          specialNotes,
          leadershipNotes: camper.leadershipPotential ? camper.leadershipNotes : null,
          friendsWith: friendsInGroup,
        }
      })

      return {
        groupNumber: group.groupNumber,
        groupName: group.groupName || `Group ${group.groupNumber}`,
        groupColor: group.groupColor,
        camperCount: group.camperCount,
        gradeRange: group.minGrade !== null && group.maxGrade !== null
          ? formatGradeRange(group.minGrade, group.maxGrade)
          : 'N/A',
        campers: reportCampers,
      }
    })

  // Calculate summary
  const groupCounts = groups.map(g => g.camperCount)
  const acceptedViolations = violations
    .filter(v => v.resolved && v.resolutionNote)
    .map(v => ({
      type: v.violationType,
      description: v.description,
      directorNote: v.resolutionNote!,
      acceptedAt: v.resolvedAt!,
    }))

  const summary: GroupReportSummary = {
    totalCampers: campers.length,
    groupCounts,
    allConstraintsSatisfied: acceptedViolations.length === 0,
    acceptedExceptionCount: acceptedViolations.length,
  }

  return {
    reportId: `report-${Date.now()}`,
    campId,
    tenantId,
    reportType: 'final',
    version: 1,
    generatedAt: new Date(),
    generatedBy: null, // Will be set by caller

    campName,
    campStartDate,
    campEndDate,
    campLocation,

    tenantName,
    tenantLogo,
    primaryColor,
    secondaryColor,

    groups: groupSections,
    summary,
    acceptedViolations,
    directorNotes: directorNotes || null,
  }
}

// ============================================================================
// HTML REPORT RENDERING
// ============================================================================

/**
 * Render a group report to a styled HTML string
 *
 * This HTML is designed for:
 * - On-screen viewing
 * - Printing via browser print dialog
 * - Saving as a standalone HTML file
 */
export function renderReportToHtml(report: GroupReport): string {
  const {
    campName,
    campStartDate,
    campEndDate,
    campLocation,
    tenantName,
    tenantLogo,
    primaryColor,
    secondaryColor,
    groups,
    summary,
    acceptedViolations,
    directorNotes,
    generatedAt,
  } = report

  const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const formatDateShort = (date: Date) => date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Group Report - ${campName}</title>
  <style>
    /* Reset and base */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      font-size: 12pt;
      line-height: 1.4;
      color: #1a1a1a;
      background: white;
    }

    /* Print styles */
    @media print {
      body {
        font-size: 10pt;
      }

      .page-break {
        page-break-before: always;
      }

      .no-print {
        display: none !important;
      }

      .group-section {
        page-break-inside: avoid;
      }
    }

    /* Layout */
    .container {
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.5in;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      border-bottom: 3px solid ${primaryColor};
      margin-bottom: 30px;
    }

    .header-left {
      flex: 1;
    }

    .header-logo {
      max-height: 60px;
      max-width: 200px;
      margin-bottom: 10px;
    }

    .header-title {
      font-size: 24pt;
      font-weight: 800;
      color: #1a1a1a;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      margin-bottom: 4px;
    }

    .header-subtitle {
      font-size: 12pt;
      color: #666;
    }

    .header-right {
      text-align: right;
      font-size: 10pt;
      color: #666;
    }

    .header-tenant {
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 4px;
    }

    /* Summary section */
    .summary {
      background: #f8f8f8;
      border-left: 4px solid ${primaryColor};
      padding: 15px 20px;
      margin-bottom: 30px;
    }

    .summary-title {
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #666;
      margin-bottom: 10px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
    }

    .summary-item {
      display: flex;
      flex-direction: column;
    }

    .summary-value {
      font-size: 20pt;
      font-weight: 700;
      color: #1a1a1a;
    }

    .summary-label {
      font-size: 9pt;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Group sections */
    .group-section {
      margin-bottom: 30px;
    }

    .group-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 15px;
      background: #1a1a1a;
      color: white;
      margin-bottom: 2px;
    }

    .group-color-bar {
      width: 8px;
      height: 40px;
    }

    .group-name {
      font-size: 14pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .group-meta {
      margin-left: auto;
      text-align: right;
      font-size: 10pt;
    }

    .group-meta-value {
      font-weight: 600;
    }

    /* Camper table */
    .camper-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
    }

    .camper-table th {
      background: #f0f0f0;
      padding: 8px 10px;
      text-align: left;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      font-size: 8pt;
      color: #666;
      border-bottom: 1px solid #ddd;
    }

    .camper-table td {
      padding: 10px;
      border-bottom: 1px solid #eee;
      vertical-align: top;
    }

    .camper-table tr:nth-child(even) {
      background: #fafafa;
    }

    .camper-name {
      font-weight: 600;
      color: #1a1a1a;
    }

    .camper-friends {
      font-size: 9pt;
      color: #666;
      margin-top: 2px;
    }

    .camper-notes {
      font-size: 9pt;
      color: #888;
    }

    .camper-alert {
      color: #dc2626;
      font-weight: 600;
    }

    .camper-leader {
      display: inline-block;
      background: ${primaryColor};
      color: #1a1a1a;
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 6px;
      margin-left: 8px;
    }

    /* Exceptions section */
    .exceptions {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px dashed #ddd;
    }

    .exceptions-title {
      font-size: 12pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: #666;
      margin-bottom: 15px;
    }

    .exception-item {
      background: #fff8f0;
      border-left: 4px solid #f59e0b;
      padding: 10px 15px;
      margin-bottom: 10px;
    }

    .exception-type {
      font-size: 9pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #b45309;
      margin-bottom: 4px;
    }

    .exception-desc {
      font-size: 10pt;
      color: #1a1a1a;
      margin-bottom: 4px;
    }

    .exception-note {
      font-size: 9pt;
      color: #666;
      font-style: italic;
    }

    /* Director notes */
    .director-notes {
      margin-top: 30px;
      padding: 15px 20px;
      background: #f0f8ff;
      border-left: 4px solid ${secondaryColor};
    }

    .director-notes-title {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: #666;
      margin-bottom: 8px;
    }

    /* Footer */
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 9pt;
      color: #999;
      display: flex;
      justify-content: space-between;
    }

    /* Status badge */
    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .status-success {
      background: #dcfce7;
      color: #166534;
    }

    .status-warning {
      background: #fef3c7;
      color: #92400e;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header class="header">
      <div class="header-left">
        ${tenantLogo ? `<img src="${tenantLogo}" alt="${tenantName}" class="header-logo">` : ''}
        <h1 class="header-title">${campName}</h1>
        <p class="header-subtitle">Group Assignment Report</p>
      </div>
      <div class="header-right">
        <p class="header-tenant">${tenantName}</p>
        <p>${formatDateShort(campStartDate)} - ${formatDateShort(campEndDate)}</p>
        <p>${campLocation}</p>
      </div>
    </header>

    <!-- Summary -->
    <section class="summary">
      <h2 class="summary-title">Summary</h2>
      <div class="summary-grid">
        <div class="summary-item">
          <span class="summary-value">${summary.totalCampers}</span>
          <span class="summary-label">Total Campers</span>
        </div>
        <div class="summary-item">
          <span class="summary-value">${groups.length}</span>
          <span class="summary-label">Groups</span>
        </div>
        ${groups.map((g, i) => `
        <div class="summary-item">
          <span class="summary-value">${g.camperCount}</span>
          <span class="summary-label">${g.groupName}</span>
        </div>
        `).join('')}
        <div class="summary-item">
          <span class="status-badge ${summary.allConstraintsSatisfied ? 'status-success' : 'status-warning'}">
            ${summary.allConstraintsSatisfied ? 'All Constraints Met' : `${summary.acceptedExceptionCount} Exception${summary.acceptedExceptionCount !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>
    </section>

    <!-- Groups -->
    ${groups.map((group, index) => `
    <section class="group-section ${index > 0 && index % 2 === 0 ? 'page-break' : ''}">
      <div class="group-header">
        <div class="group-color-bar" style="background-color: ${group.groupColor}"></div>
        <h2 class="group-name">${group.groupName}</h2>
        <div class="group-meta">
          <div><span class="group-meta-value">${group.camperCount}</span> Campers</div>
          <div>Grades: <span class="group-meta-value">${group.gradeRange}</span></div>
        </div>
      </div>
      <table class="camper-table">
        <thead>
          <tr>
            <th style="width: 25%">Name</th>
            <th style="width: 10%">Age</th>
            <th style="width: 10%">Grade</th>
            <th style="width: 25%">Medical/Allergies</th>
            <th style="width: 30%">Notes</th>
          </tr>
        </thead>
        <tbody>
          ${group.campers.map(camper => `
          <tr>
            <td>
              <span class="camper-name">${camper.fullName}</span>
              ${camper.leadershipNotes ? '<span class="camper-leader">Leader</span>' : ''}
              ${camper.friendsWith.length > 0 ? `<div class="camper-friends">Friends: ${camper.friendsWith.join(', ')}</div>` : ''}
            </td>
            <td>${camper.age}</td>
            <td>${camper.grade}</td>
            <td>
              ${camper.allergies ? `<div class="camper-alert">Allergies: ${camper.allergies}</div>` : ''}
              ${camper.medicalNotes ? `<div class="camper-notes">${camper.medicalNotes}</div>` : ''}
              ${!camper.allergies && !camper.medicalNotes ? '<span class="camper-notes">—</span>' : ''}
            </td>
            <td>
              ${camper.specialNotes || camper.leadershipNotes || '—'}
            </td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
    `).join('')}

    <!-- Accepted Exceptions -->
    ${acceptedViolations.length > 0 ? `
    <section class="exceptions">
      <h2 class="exceptions-title">Accepted Exceptions</h2>
      ${acceptedViolations.map(v => `
      <div class="exception-item">
        <div class="exception-type">${v.type.replace(/_/g, ' ')}</div>
        <div class="exception-desc">${v.description}</div>
        <div class="exception-note">"${v.directorNote}"</div>
      </div>
      `).join('')}
    </section>
    ` : ''}

    <!-- Director Notes -->
    ${directorNotes ? `
    <section class="director-notes">
      <h3 class="director-notes-title">Director Notes</h3>
      <p>${directorNotes}</p>
    </section>
    ` : ''}

    <!-- Footer -->
    <footer class="footer">
      <span>Generated: ${formatDate(generatedAt)}</span>
      <span>Empowered Sports Camp • Confidential</span>
    </footer>
  </div>
</body>
</html>`
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Open report in a new window for printing
 */
export function printReport(report: GroupReport): void {
  const html = renderReportToHtml(report)
  const printWindow = window.open('', '_blank')

  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()

    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print()
    }
  }
}

/**
 * Download report as HTML file
 */
export function downloadReportHtml(report: GroupReport): void {
  const html = renderReportToHtml(report)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `group-report-${report.campName.toLowerCase().replace(/\s+/g, '-')}-${
    report.generatedAt.toISOString().split('T')[0]
  }.html`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Copy report data to clipboard as JSON (for integrations)
 */
export function copyReportJson(report: GroupReport): Promise<void> {
  const json = JSON.stringify(report, null, 2)
  return navigator.clipboard.writeText(json)
}
