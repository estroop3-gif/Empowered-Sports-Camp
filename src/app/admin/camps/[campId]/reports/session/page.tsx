'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { PortalCard } from '@/components/portal'
import { AdminLayout } from '@/components/admin/admin-layout'
import {
  ArrowLeft,
  Loader2,
  Trophy,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  MessageSquare,
  Mic,
  Star,
  Download,
} from 'lucide-react'
import { generateReportPDF } from '@/lib/utils/pdf-export'

interface SessionReport {
  campName: string
  startDate: string
  endDate: string
  status: string
  totalDays: number
  completedDays: number
  stats: {
    totalRegistrations: number
    averageAttendance: number
    averageAttendanceRate: number
    totalAbsences: number
  }
  sports: string[]
  wordsOfTheDay: string[]
  guestSpeakers: string[]
  daysSummary: Array<{
    dayNumber: number
    date: string
    wordOfTheDay?: string
    primarySport?: string
    attended: number
    absent: number
  }>
}

export default function SessionReportPage() {
  const params = useParams()
  const campId = params.campId as string

  const [report, setReport] = useState<SessionReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleDownloadPDF = () => {
    if (!report) return

    const dateRange = `${new Date(report.startDate).toLocaleDateString()} - ${new Date(report.endDate).toLocaleDateString()}`

    const stats = [
      { label: 'Total Campers', value: report.stats.totalRegistrations },
      { label: 'Avg Attendance Rate', value: `${report.stats.averageAttendanceRate.toFixed(0)}%` },
      { label: 'Days Completed', value: report.completedDays },
      { label: 'Sports Played', value: report.sports.length },
    ]

    const tables: { title: string; data: { headers: string[]; rows: (string | number)[][] } }[] = []

    // Add sports table
    if (report.sports.length > 0) {
      tables.push({
        title: 'Sports Played',
        data: {
          headers: ['Sport'],
          rows: report.sports.map((sport) => [sport]),
        },
      })
    }

    // Add words of the day table
    if (report.wordsOfTheDay.length > 0) {
      tables.push({
        title: 'Words of the Day',
        data: {
          headers: ['Word'],
          rows: report.wordsOfTheDay.map((word) => [word]),
        },
      })
    }

    // Add guest speakers table
    if (report.guestSpeakers.length > 0) {
      tables.push({
        title: 'Guest Speakers',
        data: {
          headers: ['Speaker'],
          rows: report.guestSpeakers.map((speaker) => [speaker]),
        },
      })
    }

    // Add daily summary table
    if (report.daysSummary.length > 0) {
      tables.push({
        title: 'Daily Summary',
        data: {
          headers: ['Day', 'Date', 'Word', 'Sport', 'Attended', 'Absent'],
          rows: report.daysSummary.map((day) => [
            `Day ${day.dayNumber}`,
            new Date(day.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            }),
            day.wordOfTheDay || '-',
            day.primarySport || '-',
            day.attended,
            day.absent,
          ]),
        },
      })
    }

    generateReportPDF(
      {
        title: 'Camp Session Report',
        subtitle: `${report.campName} - ${dateRange}`,
        filename: `session-report-${new Date().toISOString().split('T')[0]}`,
      },
      stats,
      tables
    )
  }

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch(`/api/camps/${campId}/reports/session`)
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
  }, [campId])

  if (loading) {
    return (
      <AdminLayout userRole="hq_admin" userName="Admin">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 text-neon animate-spin" />
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
            <Star className="h-8 w-8 text-neon" />
            Camp Session Report
          </h1>
          <p className="text-white/50 mt-1">
            {report.campName} •{' '}
            {new Date(report.startDate).toLocaleDateString()} - {new Date(report.endDate).toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/80 transition-colors"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </button>
      </div>

      {/* Key Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <PortalCard accent="neon">
          <div className="text-center">
            <Users className="h-8 w-8 text-neon mx-auto mb-2" />
            <div className="text-3xl font-bold text-neon">{report.stats.totalRegistrations}</div>
            <div className="text-sm text-white/50">Total Campers</div>
          </div>
        </PortalCard>
        <PortalCard accent="purple">
          <div className="text-center">
            <CheckCircle className="h-8 w-8 text-purple mx-auto mb-2" />
            <div className="text-3xl font-bold text-purple">
              {report.stats.averageAttendanceRate.toFixed(0)}%
            </div>
            <div className="text-sm text-white/50">Avg Attendance Rate</div>
          </div>
        </PortalCard>
        <PortalCard>
          <div className="text-center">
            <Calendar className="h-8 w-8 text-white/50 mx-auto mb-2" />
            <div className="text-3xl font-bold text-white">{report.completedDays}</div>
            <div className="text-sm text-white/50">Days Completed</div>
          </div>
        </PortalCard>
        <PortalCard>
          <div className="text-center">
            <Trophy className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
            <div className="text-3xl font-bold text-white">{report.sports.length}</div>
            <div className="text-sm text-white/50">Sports Played</div>
          </div>
        </PortalCard>
      </div>

      {/* Highlights Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Sports */}
        <PortalCard title="Sports Played" accent="neon">
          {report.sports.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {report.sports.map((sport, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-neon/20 text-neon text-sm font-medium"
                >
                  {sport}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-white/50 text-sm">No sports recorded</p>
          )}
        </PortalCard>

        {/* Words of the Day */}
        <PortalCard title="Words of the Day" accent="purple">
          {report.wordsOfTheDay.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {report.wordsOfTheDay.map((word, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-purple/20 text-purple text-sm font-medium"
                >
                  {word}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-white/50 text-sm">No words recorded</p>
          )}
        </PortalCard>

        {/* Guest Speakers */}
        <PortalCard title="Guest Speakers">
          {report.guestSpeakers.length > 0 ? (
            <div className="space-y-2">
              {report.guestSpeakers.map((speaker, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-white/50" />
                  <span className="text-white">{speaker}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/50 text-sm">No guest speakers recorded</p>
          )}
        </PortalCard>
      </div>

      {/* Daily Summary Table */}
      <PortalCard title="Daily Summary">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-xs font-semibold text-white/50 uppercase">Day</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-white/50 uppercase">Date</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-white/50 uppercase">Word</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-white/50 uppercase">Sport</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-white/50 uppercase">Attended</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-white/50 uppercase">Absent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {report.daysSummary.map((day) => (
                <tr key={day.dayNumber} className="hover:bg-white/5">
                  <td className="py-3 px-4 font-medium text-white">Day {day.dayNumber}</td>
                  <td className="py-3 px-4 text-white/70">
                    {new Date(day.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="py-3 px-4 text-purple">{day.wordOfTheDay || '-'}</td>
                  <td className="py-3 px-4 text-neon">{day.primarySport || '-'}</td>
                  <td className="py-3 px-4 text-center text-neon font-medium">{day.attended}</td>
                  <td className="py-3 px-4 text-center text-magenta font-medium">{day.absent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </PortalCard>
      </div>
    </AdminLayout>
  )
}
