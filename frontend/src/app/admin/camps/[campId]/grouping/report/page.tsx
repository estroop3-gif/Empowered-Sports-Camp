'use client'

/**
 * Admin Grouping Report Page
 *
 * Generates and downloads a PDF of the group assignments, then redirects back.
 */

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface GroupingCamper {
  id: string
  name: string
  first_name: string
  last_name: string
  grade_level: number | null
  friend_group_number: number | null
  has_medical_notes: boolean
  has_allergies: boolean
  special_considerations: string | null
}

interface GroupingGroup {
  id: string
  group_number: number
  group_name: string
  campers: GroupingCamper[]
  stats: {
    count: number
    min_grade: number | null
    max_grade: number | null
  }
}

interface GroupingState {
  camp_id: string
  camp_name: string
  groups: GroupingGroup[]
  total_campers: number
  max_group_size: number
  max_grade_spread: number
}

function generateGroupReportPDF(state: GroupingState) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let yPosition = 20

  // Title
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(state.camp_name, pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 8

  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text('Group Assignment Report', pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 8

  // Generated date and stats
  doc.setFontSize(10)
  doc.setTextColor(100)
  const printDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  doc.text(`Generated: ${printDate}`, pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 5
  doc.text(
    `Total Campers: ${state.total_campers} | Max Group Size: ${state.max_group_size} | Max Grade Spread: ${state.max_grade_spread}`,
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  )
  yPosition += 15

  doc.setTextColor(0)

  // Generate tables for each group
  state.groups.forEach((group, groupIndex) => {
    // Check if we need a new page (leave room for header + at least a few rows)
    if (yPosition > 240) {
      doc.addPage()
      yPosition = 20
    }

    // Group header
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    const gradeRange =
      group.stats.min_grade !== null && group.stats.max_grade !== null
        ? group.stats.min_grade === group.stats.max_grade
          ? `Grade ${group.stats.min_grade}`
          : `Grades ${group.stats.min_grade}-${group.stats.max_grade}`
        : 'N/A'
    doc.text(`${group.group_name} (${group.stats.count} campers, ${gradeRange})`, 14, yPosition)
    yPosition += 6

    // Generate table for this group
    const tableData = group.campers.map((camper, idx) => [
      (idx + 1).toString(),
      `${camper.last_name}, ${camper.first_name}`,
      camper.grade_level?.toString() ?? '?',
      camper.friend_group_number?.toString() ?? '-',
      camper.has_medical_notes ? '!' : '-',
      camper.has_allergies ? '!' : '-',
      camper.special_considerations || '-',
    ])

    if (tableData.length === 0) {
      tableData.push(['', 'No campers assigned', '', '', '', '', ''])
    }

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Name', 'Grade', 'Friend', 'Med', 'Allergy', 'Notes']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [60, 60, 60],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 45 },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 12, halign: 'center' },
        5: { cellWidth: 15, halign: 'center' },
        6: { cellWidth: 'auto' },
      },
      styles: {
        cellPadding: 2,
        overflow: 'ellipsize',
      },
      margin: { left: 14, right: 14 },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 12
  })

  // Footer on all pages
  const pageCount = doc.internal.pages.length - 1
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(
      `Empowered Sports Camp - Group Report - Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }

  // Download the PDF
  const filename = `${state.camp_name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-group-report-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}

export default function AdminGroupingReportPage({
  params,
}: {
  params: Promise<{ campId: string }>
}) {
  const { campId } = use(params)
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'generating' | 'done' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAndGenerate = async () => {
      try {
        setStatus('loading')
        const res = await fetch(`/api/grouping/${campId}`)
        const json = await res.json()

        if (!res.ok) {
          throw new Error(json.error || 'Failed to load grouping data')
        }

        if (!json.data || !json.data.groups) {
          throw new Error('No grouping data available')
        }

        setStatus('generating')

        // Small delay to show status
        await new Promise(resolve => setTimeout(resolve, 100))

        generateGroupReportPDF(json.data)

        setStatus('done')

        // Redirect back after download starts
        setTimeout(() => {
          router.back()
        }, 1000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error generating report')
        setStatus('error')
      }
    }

    fetchAndGenerate()
  }, [campId, router])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center p-8">
        {status === 'loading' && (
          <>
            <div className="h-12 w-12 border-4 border-neon border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">Loading group data...</p>
          </>
        )}
        {status === 'generating' && (
          <>
            <div className="h-12 w-12 border-4 border-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">Generating PDF...</p>
          </>
        )}
        {status === 'done' && (
          <>
            <div className="h-12 w-12 bg-neon rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-neon text-lg font-bold">PDF Downloaded!</p>
            <p className="text-white/50 text-sm mt-2">Redirecting back...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="h-12 w-12 bg-magenta rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-magenta text-lg font-bold">Error</p>
            <p className="text-white/50 text-sm mt-2">{error}</p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              Go Back
            </button>
          </>
        )}
      </div>
    </div>
  )
}
