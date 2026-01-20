/**
 * PDF Export Utility
 *
 * Generates PDF reports using jsPDF
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface PDFOptions {
  title: string
  subtitle?: string
  filename: string
}

interface TableData {
  headers: string[]
  rows: (string | number)[][]
}

interface StatItem {
  label: string
  value: string | number
}

export function generateReportPDF(
  options: PDFOptions,
  stats: StatItem[],
  tables: { title: string; data: TableData }[]
): void {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let yPosition = 20

  // Title
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(options.title, pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 10

  // Subtitle
  if (options.subtitle) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(options.subtitle, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 10
  }

  // Generated date
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(
    `Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  )
  yPosition += 15

  // Stats section
  if (stats.length > 0) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0)
    doc.text('Summary', 14, yPosition)
    yPosition += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    // Create a 2-column layout for stats
    const statsPerRow = 2
    const columnWidth = (pageWidth - 28) / statsPerRow

    for (let i = 0; i < stats.length; i += statsPerRow) {
      const rowStats = stats.slice(i, i + statsPerRow)
      rowStats.forEach((stat, index) => {
        const xPos = 14 + index * columnWidth
        doc.setFont('helvetica', 'bold')
        doc.text(`${stat.label}:`, xPos, yPosition)
        doc.setFont('helvetica', 'normal')
        doc.text(` ${stat.value}`, xPos + doc.getTextWidth(`${stat.label}: `), yPosition)
      })
      yPosition += 6
    }
    yPosition += 10
  }

  // Tables
  tables.forEach((table, tableIndex) => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage()
      yPosition = 20
    }

    // Table title
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0)
    doc.text(table.title, 14, yPosition)
    yPosition += 8

    // Generate table
    autoTable(doc, {
      startY: yPosition,
      head: [table.data.headers],
      body: table.data.rows.map((row) => row.map((cell) => String(cell))),
      theme: 'striped',
      headStyles: {
        fillColor: [100, 50, 150], // Purple color
        textColor: 255,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      margin: { left: 14, right: 14 },
    })

    // Update yPosition after table
    yPosition = (doc as any).lastAutoTable.finalY + 15
  })

  // Footer
  const pageCount = doc.internal.pages.length - 1
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(
      `Empowered Sports Camp - Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }

  // Save the PDF
  doc.save(`${options.filename}.pdf`)
}

// Convenience function for simple reports with just a table
export function generateSimpleReportPDF(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  filename: string
): void {
  generateReportPDF(
    { title, filename },
    [],
    [{ title: '', data: { headers, rows } }]
  )
}
