'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { PortalCard } from '@/components/portal'
import { AdminLayout } from '@/components/admin/admin-layout'
import {
  ArrowLeft,
  Loader2,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  MessageSquare,
  Trophy,
  Mic,
  Download,
} from 'lucide-react'
import { parseDateSafe } from '@/lib/utils'
import { generateReportPDF } from '@/lib/utils/pdf-export'

interface DayReport {
  dayNumber: number
  date: string
  status: string
  notes?: string
  recap?: {
    wordOfTheDay?: string
    primarySport?: string
    secondarySport?: string
    guestSpeakerName?: string
  }
  stats: {
    total: number
    checkedIn: number
    checkedOut: number
    absent: number
    notArrived: number
  }
  campName: string
}

export default function DayReportPage() {
  const params = useParams()
  const campId = params.campId as string
  const dayId = params.dayId as string

  const [report, setReport] = useState<DayReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleDownloadPDF = () => {
    if (!report) return

    const dateFormatted = parseDateSafe(report.date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

    const stats = [
      { label: 'Total Registered', value: report.stats.total },
      { label: 'Attended', value: report.stats.checkedIn + report.stats.checkedOut },
      { label: 'Checked Out', value: report.stats.checkedOut },
      { label: 'Absent', value: report.stats.absent },
    ]

    const tables: { title: string; data: { headers: string[]; rows: (string | number)[][] } }[] = []

    // Add recap table if exists
    if (report.recap) {
      const recapRows: (string | number)[][] = []
      if (report.recap.wordOfTheDay) recapRows.push(['Word of the Day', report.recap.wordOfTheDay])
      if (report.recap.primarySport) recapRows.push(['Primary Sport', report.recap.primarySport])
      if (report.recap.secondarySport) recapRows.push(['Secondary Sport', report.recap.secondarySport])
      if (report.recap.guestSpeakerName) recapRows.push(['Guest Speaker', report.recap.guestSpeakerName])

      if (recapRows.length > 0) {
        tables.push({
          title: 'Day Recap',
          data: { headers: ['Category', 'Value'], rows: recapRows },
        })
      }
    }

    // Add notes if exists
    if (report.notes) {
      tables.push({
        title: 'Notes',
        data: { headers: ['Notes'], rows: [[report.notes]] },
      })
    }

    generateReportPDF(
      {
        title: `Day ${report.dayNumber} Report`,
        subtitle: `${report.campName} - ${dateFormatted}`,
        filename: `day-${report.dayNumber}-report-${new Date(report.date).toISOString().split('T')[0]}`,
      },
      stats,
      tables
    )
  }

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch(`/api/camps/${campId}/reports/day/${dayId}`)
        if (!res.ok) {
          throw new Error('Failed to load report')
        }
        const data = await res.json()
        setReport(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report')
      } finally {
        setLoading(false)
      }
    }
    loadReport()
  }, [campId, dayId])

  if (loading) {
    return (
      <AdminLayout userRole="hq_admin" userName="Admin">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 text-purple animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  if (error || !report) {
    return (
      <AdminLayout userRole="hq_admin" userName="Admin">
        <PortalCard>
          <div className="text-center py-12">
            <XCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Error</h3>
            <p className="text-white/50 mb-4">{error || 'Report not found'}</p>
            <Link
              href={`/admin/camps/${campId}/hq`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Camp HQ
            </Link>
          </div>
        </PortalCard>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout userRole="hq_admin" userName="Admin">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/admin/camps/${campId}/hq`}
            className="text-sm text-white/50 hover:text-white flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Camp HQ
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Calendar className="h-8 w-8 text-purple" />
            Day {report.dayNumber} Report
          </h1>
          <p className="text-white/50 mt-1">
            {report.campName} •{' '}
            {parseDateSafe(report.date).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
        <button
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 px-4 py-2 bg-purple text-white font-bold uppercase tracking-wider hover:bg-purple/80 transition-colors"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <PortalCard>
          <div className="text-center">
            <Users className="h-8 w-8 text-white/50 mx-auto mb-2" />
            <div className="text-3xl font-bold text-white">{report.stats.total}</div>
            <div className="text-sm text-white/50">Total Registered</div>
          </div>
        </PortalCard>
        <PortalCard accent="neon">
          <div className="text-center">
            <CheckCircle className="h-8 w-8 text-neon mx-auto mb-2" />
            <div className="text-3xl font-bold text-neon">
              {report.stats.checkedIn + report.stats.checkedOut}
            </div>
            <div className="text-sm text-white/50">Attended</div>
          </div>
        </PortalCard>
        <PortalCard accent="purple">
          <div className="text-center">
            <CheckCircle className="h-8 w-8 text-purple mx-auto mb-2" />
            <div className="text-3xl font-bold text-purple">{report.stats.checkedOut}</div>
            <div className="text-sm text-white/50">Checked Out</div>
          </div>
        </PortalCard>
        <PortalCard>
          <div className="text-center">
            <XCircle className="h-8 w-8 text-magenta mx-auto mb-2" />
            <div className="text-3xl font-bold text-magenta">{report.stats.absent}</div>
            <div className="text-sm text-white/50">Absent</div>
          </div>
        </PortalCard>
      </div>

      {/* Day Recap */}
      {report.recap && (
        <PortalCard title="Day Recap" accent="purple">
          <div className="grid gap-6 md:grid-cols-2">
            {report.recap.wordOfTheDay && (
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-purple mt-1" />
                <div>
                  <div className="text-xs text-white/50 uppercase tracking-wider mb-1">
                    Word of the Day
                  </div>
                  <div className="text-lg font-bold text-white">{report.recap.wordOfTheDay}</div>
                </div>
              </div>
            )}
            {report.recap.primarySport && (
              <div className="flex items-start gap-3">
                <Trophy className="h-5 w-5 text-neon mt-1" />
                <div>
                  <div className="text-xs text-white/50 uppercase tracking-wider mb-1">
                    Primary Sport
                  </div>
                  <div className="text-lg font-bold text-white">{report.recap.primarySport}</div>
                </div>
              </div>
            )}
            {report.recap.secondarySport && (
              <div className="flex items-start gap-3">
                <Trophy className="h-5 w-5 text-white/50 mt-1" />
                <div>
                  <div className="text-xs text-white/50 uppercase tracking-wider mb-1">
                    Secondary Sport
                  </div>
                  <div className="text-lg font-bold text-white">{report.recap.secondarySport}</div>
                </div>
              </div>
            )}
            {report.recap.guestSpeakerName && (
              <div className="flex items-start gap-3">
                <Mic className="h-5 w-5 text-purple mt-1" />
                <div>
                  <div className="text-xs text-white/50 uppercase tracking-wider mb-1">
                    Guest Speaker
                  </div>
                  <div className="text-lg font-bold text-white">{report.recap.guestSpeakerName}</div>
                </div>
              </div>
            )}
          </div>
        </PortalCard>
      )}

      {/* Notes */}
        {report.notes && (
          <PortalCard title="Notes">
            <p className="text-white/70 whitespace-pre-wrap">{report.notes}</p>
          </PortalCard>
        )}
      </div>
    </AdminLayout>
  )
}
