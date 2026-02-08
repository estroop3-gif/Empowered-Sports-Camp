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
  XCircle,
  DollarSign,
  Calendar,
  Download,
} from 'lucide-react'
import { parseDateSafe } from '@/lib/utils'
import { generateReportPDF } from '@/lib/utils/pdf-export'

interface RegistrationReport {
  campName: string
  totalRegistrations: number
  confirmedRegistrations: number
  pendingRegistrations: number
  cancelledRegistrations: number
  gradeDistribution: Array<{ grade: string; count: number }>
  genderDistribution: Array<{ gender: string; count: number }>
  addonsRevenue: number
  registrationsByDate: Array<{ date: string; count: number }>
}

export default function RegistrationReportPage() {
  const params = useParams()
  const campId = params.campId as string

  const [report, setReport] = useState<RegistrationReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleDownloadPDF = () => {
    if (!report) return

    const stats = [
      { label: 'Total Registrations', value: report.totalRegistrations },
      { label: 'Confirmed', value: report.confirmedRegistrations },
      { label: 'Pending', value: report.pendingRegistrations },
      { label: 'Cancelled', value: report.cancelledRegistrations },
      { label: 'Add-ons Revenue', value: `$${(report.addonsRevenue / 100).toFixed(2)}` },
    ]

    const tables: { title: string; data: { headers: string[]; rows: (string | number)[][] } }[] = []

    // Add grade distribution table
    if (report.gradeDistribution.length > 0) {
      tables.push({
        title: 'Grade Distribution',
        data: {
          headers: ['Grade', 'Count'],
          rows: report.gradeDistribution.map((item) => [item.grade, item.count]),
        },
      })
    }

    // Add gender distribution table
    if (report.genderDistribution.length > 0) {
      tables.push({
        title: 'Gender Distribution',
        data: {
          headers: ['Gender', 'Count'],
          rows: report.genderDistribution.map((item) => [item.gender, item.count]),
        },
      })
    }

    // Add registrations by date table
    if (report.registrationsByDate.length > 0) {
      tables.push({
        title: 'Registrations by Date',
        data: {
          headers: ['Date', 'Count'],
          rows: report.registrationsByDate.map((item) => [
            parseDateSafe(item.date).toLocaleDateString(),
            item.count,
          ]),
        },
      })
    }

    generateReportPDF(
      {
        title: 'Registration Report',
        subtitle: report.campName,
        filename: `registration-report-${new Date().toISOString().split('T')[0]}`,
      },
      stats,
      tables
    )
  }

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch(`/api/camps/${campId}/reports/registration`)
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
            <Users className="h-8 w-8 text-purple" />
            Registration Report
          </h1>
          <p className="text-white/50 mt-1">{report.campName}</p>
        </div>
        <button
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 px-4 py-2 bg-purple text-white font-bold uppercase tracking-wider hover:bg-purple/80 transition-colors"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <PortalCard accent="neon">
          <div className="text-center">
            <div className="text-3xl font-bold text-neon">{report.confirmedRegistrations}</div>
            <div className="text-sm text-white/50">Confirmed</div>
          </div>
        </PortalCard>
        <PortalCard>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-400">{report.pendingRegistrations}</div>
            <div className="text-sm text-white/50">Pending</div>
          </div>
        </PortalCard>
        <PortalCard>
          <div className="text-center">
            <div className="text-3xl font-bold text-magenta">{report.cancelledRegistrations}</div>
            <div className="text-sm text-white/50">Cancelled</div>
          </div>
        </PortalCard>
        <PortalCard accent="purple">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple">{report.totalRegistrations}</div>
            <div className="text-sm text-white/50">Total</div>
          </div>
        </PortalCard>
      </div>

      {/* Demographics */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Grade Distribution */}
        <PortalCard title="Grade Distribution">
          {report.gradeDistribution.length > 0 ? (
            <div className="space-y-3">
              {report.gradeDistribution.map((item) => (
                <div key={item.grade} className="flex items-center gap-3">
                  <div className="w-20 text-sm text-white/70">{item.grade}</div>
                  <div className="flex-1 h-4 bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-purple"
                      style={{
                        width: `${(item.count / report.confirmedRegistrations) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="w-8 text-right text-sm text-white font-medium">{item.count}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/50 text-sm">No grade data available</p>
          )}
        </PortalCard>

        {/* Gender Distribution */}
        <PortalCard title="Gender Distribution">
          {report.genderDistribution.length > 0 ? (
            <div className="space-y-3">
              {report.genderDistribution.map((item) => (
                <div key={item.gender} className="flex items-center gap-3">
                  <div className="w-20 text-sm text-white/70 capitalize">{item.gender}</div>
                  <div className="flex-1 h-4 bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-neon"
                      style={{
                        width: `${(item.count / report.confirmedRegistrations) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="w-8 text-right text-sm text-white font-medium">{item.count}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/50 text-sm">No gender data available</p>
          )}
        </PortalCard>
      </div>

      {/* Add-ons Revenue */}
      {report.addonsRevenue > 0 && (
        <PortalCard title="Add-ons Revenue" accent="neon">
          <div className="flex items-center gap-4">
            <DollarSign className="h-10 w-10 text-neon" />
            <div>
              <div className="text-3xl font-bold text-neon">
                ${(report.addonsRevenue / 100).toFixed(2)}
              </div>
              <div className="text-sm text-white/50">Total from add-on purchases</div>
            </div>
          </div>
        </PortalCard>
        )}
      </div>
    </AdminLayout>
  )
}
