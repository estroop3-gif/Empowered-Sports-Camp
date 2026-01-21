/**
 * Certificate Generator Service
 *
 * Generates PDF certificates for EmpowerU training completion.
 */

import jsPDF from 'jspdf'

export interface CertificateData {
  userName: string
  role: string
  certificateNumber: string
  certifiedAt: Date
  tenantName?: string
  completedModules: string[]
}

/**
 * Format role for display
 */
function formatRole(role: string): string {
  const roleLabels: Record<string, string> = {
    coach: 'Coach',
    director: 'Camp Director',
    licensee_owner: 'Licensee Owner',
    cit_volunteer: 'CIT Volunteer',
    parent: 'Parent',
    hq_admin: 'HQ Administrator',
  }
  return roleLabels[role] || role
}

/**
 * Format date for certificate
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Generate a PDF certificate
 */
export function generateCertificatePDF(data: CertificateData): Blob {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Background gradient effect (using rectangles)
  doc.setFillColor(10, 10, 25) // Dark background
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  // Border decoration
  doc.setDrawColor(204, 255, 0) // Neon green
  doc.setLineWidth(2)
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20)

  // Inner border
  doc.setDrawColor(255, 45, 206) // Magenta
  doc.setLineWidth(0.5)
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30)

  // Corner accents
  const cornerSize = 20
  doc.setDrawColor(204, 255, 0)
  doc.setLineWidth(1.5)
  // Top left
  doc.line(10, 30, 10 + cornerSize, 30)
  doc.line(30, 10, 30, 10 + cornerSize)
  // Top right
  doc.line(pageWidth - 10, 30, pageWidth - 10 - cornerSize, 30)
  doc.line(pageWidth - 30, 10, pageWidth - 30, 10 + cornerSize)
  // Bottom left
  doc.line(10, pageHeight - 30, 10 + cornerSize, pageHeight - 30)
  doc.line(30, pageHeight - 10, 30, pageHeight - 10 - cornerSize)
  // Bottom right
  doc.line(pageWidth - 10, pageHeight - 30, pageWidth - 10 - cornerSize, pageHeight - 30)
  doc.line(pageWidth - 30, pageHeight - 10, pageWidth - 30, pageHeight - 10 - cornerSize)

  // Header - "EMPOWERED SPORTS CAMP"
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(204, 255, 0) // Neon green
  doc.text('EMPOWERED SPORTS CAMP', pageWidth / 2, 35, { align: 'center' })

  // Title - "CERTIFICATE OF COMPLETION"
  doc.setFontSize(32)
  doc.setTextColor(255, 255, 255)
  doc.text('CERTIFICATE OF COMPLETION', pageWidth / 2, 55, { align: 'center' })

  // Subtitle
  doc.setFontSize(12)
  doc.setTextColor(180, 180, 180)
  doc.text('This certifies that', pageWidth / 2, 75, { align: 'center' })

  // Recipient name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(255, 45, 206) // Magenta
  doc.text(data.userName.toUpperCase(), pageWidth / 2, 92, { align: 'center' })

  // Decorative line under name
  const nameWidth = doc.getTextWidth(data.userName.toUpperCase())
  doc.setDrawColor(204, 255, 0)
  doc.setLineWidth(0.5)
  doc.line(
    (pageWidth - nameWidth) / 2 - 10,
    96,
    (pageWidth + nameWidth) / 2 + 10,
    96
  )

  // Description
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(180, 180, 180)
  doc.text('has successfully completed all required training modules for', pageWidth / 2, 110, {
    align: 'center',
  })

  // Role
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.text(formatRole(data.role), pageWidth / 2, 122, { align: 'center' })

  // Tenant name if applicable
  if (data.tenantName) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(150, 150, 150)
    doc.text(`at ${data.tenantName}`, pageWidth / 2, 132, { align: 'center' })
  }

  // Modules completed (if not too many)
  if (data.completedModules.length > 0 && data.completedModules.length <= 5) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(130, 130, 130)
    const modulesText = `Completed: ${data.completedModules.join(' • ')}`
    doc.text(modulesText, pageWidth / 2, 145, { align: 'center', maxWidth: pageWidth - 60 })
  }

  // Certificate details at bottom
  const bottomY = pageHeight - 35

  // Date
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(150, 150, 150)
  doc.text('Date Issued:', 50, bottomY)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(formatDate(data.certifiedAt), 50, bottomY + 6)

  // Certificate number
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(150, 150, 150)
  doc.text('Certificate No:', pageWidth - 50, bottomY, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(204, 255, 0)
  doc.text(data.certificateNumber, pageWidth - 50, bottomY + 6, { align: 'right' })

  // Footer
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text(
    'This certificate is issued by Empowered Sports Camp and validates completion of all required training.',
    pageWidth / 2,
    pageHeight - 18,
    { align: 'center' }
  )

  // Return as blob
  return doc.output('blob')
}

/**
 * Generate certificate and return as base64 data URL
 */
export function generateCertificateDataUrl(data: CertificateData): string {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  // Build the same PDF as above (duplicated for standalone function)
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Background
  doc.setFillColor(10, 10, 25)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  // Borders
  doc.setDrawColor(204, 255, 0)
  doc.setLineWidth(2)
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20)

  doc.setDrawColor(255, 45, 206)
  doc.setLineWidth(0.5)
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30)

  // Corner accents
  const cornerSize = 20
  doc.setDrawColor(204, 255, 0)
  doc.setLineWidth(1.5)
  doc.line(10, 30, 10 + cornerSize, 30)
  doc.line(30, 10, 30, 10 + cornerSize)
  doc.line(pageWidth - 10, 30, pageWidth - 10 - cornerSize, 30)
  doc.line(pageWidth - 30, 10, pageWidth - 30, 10 + cornerSize)
  doc.line(10, pageHeight - 30, 10 + cornerSize, pageHeight - 30)
  doc.line(30, pageHeight - 10, 30, pageHeight - 10 - cornerSize)
  doc.line(pageWidth - 10, pageHeight - 30, pageWidth - 10 - cornerSize, pageHeight - 30)
  doc.line(pageWidth - 30, pageHeight - 10, pageWidth - 30, pageHeight - 10 - cornerSize)

  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(204, 255, 0)
  doc.text('EMPOWERED SPORTS CAMP', pageWidth / 2, 35, { align: 'center' })

  // Title
  doc.setFontSize(32)
  doc.setTextColor(255, 255, 255)
  doc.text('CERTIFICATE OF COMPLETION', pageWidth / 2, 55, { align: 'center' })

  // Subtitle
  doc.setFontSize(12)
  doc.setTextColor(180, 180, 180)
  doc.text('This certifies that', pageWidth / 2, 75, { align: 'center' })

  // Name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(255, 45, 206)
  doc.text(data.userName.toUpperCase(), pageWidth / 2, 92, { align: 'center' })

  // Name underline
  const nameWidth = doc.getTextWidth(data.userName.toUpperCase())
  doc.setDrawColor(204, 255, 0)
  doc.setLineWidth(0.5)
  doc.line((pageWidth - nameWidth) / 2 - 10, 96, (pageWidth + nameWidth) / 2 + 10, 96)

  // Description
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(180, 180, 180)
  doc.text('has successfully completed all required training modules for', pageWidth / 2, 110, {
    align: 'center',
  })

  // Role
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.text(formatRole(data.role), pageWidth / 2, 122, { align: 'center' })

  // Tenant
  if (data.tenantName) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(150, 150, 150)
    doc.text(`at ${data.tenantName}`, pageWidth / 2, 132, { align: 'center' })
  }

  // Modules
  if (data.completedModules.length > 0 && data.completedModules.length <= 5) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(130, 130, 130)
    doc.text(`Completed: ${data.completedModules.join(' • ')}`, pageWidth / 2, 145, {
      align: 'center',
      maxWidth: pageWidth - 60,
    })
  }

  // Bottom details
  const bottomY = pageHeight - 35

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(150, 150, 150)
  doc.text('Date Issued:', 50, bottomY)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(formatDate(data.certifiedAt), 50, bottomY + 6)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(150, 150, 150)
  doc.text('Certificate No:', pageWidth - 50, bottomY, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(204, 255, 0)
  doc.text(data.certificateNumber, pageWidth - 50, bottomY + 6, { align: 'right' })

  // Footer
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text(
    'This certificate is issued by Empowered Sports Camp and validates completion of all required training.',
    pageWidth / 2,
    pageHeight - 18,
    { align: 'center' }
  )

  return doc.output('dataurlstring')
}

/**
 * Download certificate as PDF (browser only)
 */
export function downloadCertificate(data: CertificateData, filename?: string): void {
  const blob = generateCertificatePDF(data)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `certificate-${data.certificateNumber}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
