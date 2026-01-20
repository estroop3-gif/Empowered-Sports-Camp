/**
 * Reports List Component
 *
 * Displays a list of generated reports with download links.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'

interface Report {
  id: string
  type: string
  resourceId: string
  filename: string
  url: string | null
  status: 'pending' | 'generating' | 'completed' | 'failed'
  createdAt: string
}

interface ReportsListProps {
  reportType?: 'SESSION' | 'DAY' | 'CURRICULUM' | 'GROUP'
  className?: string
}

export function ReportsList({ reportType, className = '' }: ReportsListProps) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  const loadReports = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (reportType) {
        params.set('type', reportType)
      }
      params.set('limit', '50')

      const response = await fetch(`/api/reports/list?${params.toString()}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load reports')
      }

      setReports(result.data?.reports || [])
    } catch (err) {
      console.error('[ReportsList] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [reportType])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const getStatusBadge = (status: Report['status']) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      generating: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    }
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      session_report: 'Session Report',
      camp_day_report: 'Daily Report',
      curriculum_export: 'Curriculum',
      roster_export: 'Group Roster',
      financial_summary: 'Financial Summary',
    }
    return labels[type] || type.replace(/_/g, ' ')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleDownload = async (report: Report) => {
    if (report.url) {
      // If we have a stored URL (S3), open it directly
      window.open(report.url, '_blank')
      return
    }

    // Otherwise, regenerate the PDF based on report type
    setDownloading(report.id)
    try {
      const endpointMap: Record<string, string> = {
        session_report: '/api/reports/session-pdf',
        camp_day_report: '/api/reports/camp-day-pdf',
        curriculum_export: '/api/reports/curriculum-pdf',
        roster_export: '/api/reports/group-pdf',
      }

      const bodyKeyMap: Record<string, string> = {
        session_report: 'campSessionId',
        camp_day_report: 'campDayId',
        curriculum_export: 'curriculumId',
        roster_export: 'campId',
      }

      const endpoint = endpointMap[report.type]
      const bodyKey = bodyKeyMap[report.type]

      if (!endpoint || !bodyKey) {
        throw new Error('Unknown report type')
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [bodyKey]: report.resourceId }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate report')
      }

      if (result.data?.base64) {
        const link = document.createElement('a')
        link.href = result.data.base64
        link.download = result.data.filename || report.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        throw new Error('No report data returned')
      }
    } catch (err) {
      console.error('[ReportsList] Download error:', err)
      alert(err instanceof Error ? err.message : 'Failed to download report')
    } finally {
      setDownloading(null)
    }
  }

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-red-600 ${className}`}>
        <p>Error loading reports: {error}</p>
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className={`text-gray-500 text-center py-8 ${className}`}>
        <p>No reports generated yet.</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <ul className="divide-y divide-gray-200">
        {reports.map((report) => (
          <li key={report.id} className="py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{report.filename}</p>
              <p className="text-sm text-gray-500">
                {getTypeLabel(report.type)} - {formatDate(report.createdAt)}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {getStatusBadge(report.status)}
              {report.status === 'completed' && (
                <button
                  onClick={() => handleDownload(report)}
                  disabled={downloading === report.id}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {downloading === report.id ? 'Downloading...' : 'Download'}
                </button>
              )}
              {report.status === 'generating' && (
                <span className="text-sm text-gray-500">Generating...</span>
              )}
              {report.status === 'failed' && (
                <button
                  onClick={() => handleDownload(report)}
                  disabled={downloading === report.id}
                  className="text-orange-600 hover:text-orange-800 text-sm font-medium disabled:opacity-50"
                >
                  Retry
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
