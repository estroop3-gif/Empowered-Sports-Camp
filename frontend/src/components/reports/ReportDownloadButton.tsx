/**
 * Report Download Button Component
 *
 * Reusable button for downloading various PDF reports.
 */

'use client'

import { useState } from 'react'

type ReportType = 'session' | 'camp-day' | 'curriculum'

interface ReportDownloadButtonProps {
  reportType: ReportType
  entityId: string
  label?: string
  className?: string
}

export function ReportDownloadButton({
  reportType,
  entityId,
  label,
  className = '',
}: ReportDownloadButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getEndpoint = () => {
    switch (reportType) {
      case 'session':
        return '/api/reports/session-pdf'
      case 'camp-day':
        return '/api/reports/camp-day-pdf'
      case 'curriculum':
        return '/api/reports/curriculum-pdf'
      default:
        return '/api/reports/session-pdf'
    }
  }

  const getBodyKey = () => {
    switch (reportType) {
      case 'session':
        return 'campSessionId'
      case 'camp-day':
        return 'campDayId'
      case 'curriculum':
        return 'curriculumId'
      default:
        return 'campSessionId'
    }
  }

  const defaultLabels: Record<ReportType, string> = {
    session: 'Download Session Report',
    'camp-day': 'Download Day Report',
    curriculum: 'Export Curriculum PDF',
  }

  const handleDownload = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(getEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [getBodyKey()]: entityId }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate report')
      }

      // Trigger download using base64 data
      if (result.data?.base64) {
        const link = document.createElement('a')
        link.href = result.data.base64
        link.download = result.data.filename || `report-${Date.now()}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        throw new Error('No report data returned')
      }
    } catch (err) {
      console.error('[ReportDownloadButton] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={className}>
      <button
        onClick={handleDownload}
        disabled={loading}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Generating...
          </>
        ) : (
          <>
            <svg
              className="-ml-1 mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {label || defaultLabels[reportType]}
          </>
        )}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
