'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { PortalCard } from '@/components/portal'
import { AdminLayout } from '@/components/admin/admin-layout'
import {
  ArrowLeft,
  Loader2,
  Users,
  CheckCircle,
  XCircle,
  Calendar,
  Download,
} from 'lucide-react'
import { parseDateSafe } from '@/lib/utils'
import { generateReportPDF } from '@/lib/utils/pdf-export'

interface AttendanceDay {
  dayNumber: number
  date: string
  status: string
  stats: {
    total: number
    attended: number
    absent: number
    attendanceRate: number
  }
}

interface AttendanceReport {
  campName: string
  totalDays: number
  completedDays: number
  overallStats: {
    totalRegistrations: number
    averageAttendance: number
    averageAttendanceRate: number
  }
  days: AttendanceDay[]
}

export default function AttendanceReportPage() {
  const params = useParams()
  const campId = params.campId as string

  const [report, setReport] = useState<AttendanceReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleDownloadPDF = () => {
    if (!report) return

    const stats = [
      { label: 'Total Registrations', value: report.overallStats.totalRegistrations },
      { label: 'Average Attendance Rate', value: `${report.overallStats.averageAttendanceRate.toFixed(0)}%` },
      { label: 'Completed Days', value: report.completedDays },
      { label: 'Total Days', value: report.totalDays },
    ]

    const tableRows = report.days.map((day) => [
      `Day ${day.dayNumber}`,
      parseDateSafe(day.date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      day.stats.attended,
      day.stats.absent,
      `${day.stats.attendanceRate.toFixed(0)}%`,
    ])

    generateReportPDF(
      {
        title: 'Attendance Report',
        subtitle: report.campName,
        filename: `attendance-report-${new Date().toISOString().split('T')[0]}`,
      },
      stats,
      [
        {
          title: 'Daily Attendance',
          data: {
            headers: ['Day', 'Date', 'Attended', 'Absent', 'Rate'],
            rows: tableRows,
          },
        },
      ]
    )
  }

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch(`/api/camps/${campId}/reports/attendance`)
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
            <Users className="h-8 w-8 text-neon" />
            Attendance Report
          </h1>
          <p className="text-white/50 mt-1">{report.campName}</p>
        </div>
        <button
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/80 transition-colors"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <PortalCard>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{report.overallStats.totalRegistrations}</div>
            <div className="text-sm text-white/50">Total Registrations</div>
          </div>
        </PortalCard>
        <PortalCard accent="neon">
          <div className="text-center">
            <div className="text-3xl font-bold text-neon">
              {report.overallStats.averageAttendanceRate.toFixed(0)}%
            </div>
            <div className="text-sm text-white/50">Average Attendance Rate</div>
          </div>
        </PortalCard>
        <PortalCard accent="purple">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple">{report.completedDays}</div>
            <div className="text-sm text-white/50">Completed Days</div>
          </div>
        </PortalCard>
        <PortalCard>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{report.totalDays}</div>
            <div className="text-sm text-white/50">Total Days</div>
          </div>
        </PortalCard>
      </div>

      {/* Daily Breakdown */}
      <PortalCard title="Daily Attendance">
        {report.days.length === 0 ? (
          <div className="text-center py-8 text-white/50">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No completed days yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-white/50 uppercase">Day</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-white/50 uppercase">Date</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-white/50 uppercase">Attended</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-white/50 uppercase">Absent</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-white/50 uppercase">Rate</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-white/50 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {report.days.map((day) => (
                  <tr key={day.dayNumber} className="hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-purple text-white flex items-center justify-center font-bold text-sm">
                          {day.dayNumber}
                        </div>
                        <span className="font-medium text-white">Day {day.dayNumber}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-white/70">
                      {parseDateSafe(day.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-neon font-medium">{day.stats.attended}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-magenta font-medium">{day.stats.absent}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`font-medium ${
                          day.stats.attendanceRate >= 90
                            ? 'text-neon'
                            : day.stats.attendanceRate >= 75
                            ? 'text-yellow-400'
                            : 'text-magenta'
                        }`}
                      >
                        {day.stats.attendanceRate.toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {day.status === 'finished' && (
                        <Link
                          href={`/admin/camps/${campId}/reports/day/${day.dayNumber}`}
                          className="text-sm text-purple hover:text-purple/80"
                        >
                          View Details
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </PortalCard>
      </div>
    </AdminLayout>
  )
}
