/**
 * SHELL: Reports List Component
 *
 * Displays a list of generated reports with download links.
 */

'use client'

import { useState, useEffect } from 'react'

interface Report {
  id: string
  type: string
  entityName: string
  generatedAt: string
  downloadUrl: string | null
  status: 'pending' | 'completed' | 'failed'
}

interface ReportsListProps {
  entityType?: 'session' | 'camp-day' | 'curriculum'
  entityId?: string
  className?: string
}

export function ReportsList({ entityType, entityId, className = '' }: ReportsListProps) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadReports()
  }, [entityType, entityId])

  const loadReports = async () => {
    setLoading(true)
    setError(null)

    // SHELL: Would fetch from /api/reports/list
    // For now, return mock data
    console.log('[ReportsList] SHELL: Would load reports for:', { entityType, entityId })

    // SHELL: Mock data
    setTimeout(() => {
      setReports([
        {
          id: 'report_1',
          type: 'session_report',
          entityName: 'Summer Camp Session 2024',
          generatedAt: new Date(Date.now() - 86400000).toISOString(),
          downloadUrl: null,
          status: 'completed',
        },
        {
          id: 'report_2',
          type: 'camp_day_report',
          entityName: 'Day 3 - Soccer Focus',
          generatedAt: new Date(Date.now() - 172800000).toISOString(),
          downloadUrl: null,
          status: 'completed',
        },
      ])
      setLoading(false)
    }, 500)
  }

  const getStatusBadge = (status: Report['status']) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    }
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
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
              <p className="text-sm font-medium text-gray-900">{report.entityName}</p>
              <p className="text-sm text-gray-500">
                {report.type.replace(/_/g, ' ')} - {formatDate(report.generatedAt)}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {getStatusBadge(report.status)}
              {report.status === 'completed' && (
                <button
                  onClick={() => {
                    // SHELL: Would trigger download
                    console.log('[ReportsList] SHELL: Would download report:', report.id)
                    alert('Download functionality coming soon')
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Download
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
