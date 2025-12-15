/**
 * SHELL: Royalty Status Card Component
 *
 * Displays royalty status summary for licensees.
 */

'use client'

import { useState, useEffect } from 'react'

interface RoyaltyRecord {
  id: string
  campSessionId: string
  grossRevenue: number
  royaltyRate: number
  royaltyAmount: number
  status: 'PENDING' | 'CALCULATED' | 'INVOICED' | 'PAID'
  calculatedAt: string
  invoicedAt: string | null
  paidAt: string | null
}

interface RoyaltySummary {
  totalDue: number
  totalPaid: number
  pending: number
}

interface RoyaltyStatusCardProps {
  className?: string
}

export function RoyaltyStatusCard({ className = '' }: RoyaltyStatusCardProps) {
  const [royalties, setRoyalties] = useState<RoyaltyRecord[]>([])
  const [summary, setSummary] = useState<RoyaltySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRoyalties()
  }, [])

  const loadRoyalties = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/royalties/status')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load royalties')
      }

      setRoyalties(result.data?.royalties || [])
      setSummary(result.data?.summary || null)
    } catch (err) {
      console.error('[RoyaltyStatusCard] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load royalties')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getStatusColor = (status: RoyaltyRecord['status']) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800'
      case 'INVOICED':
        return 'bg-yellow-100 text-yellow-800'
      case 'CALCULATED':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-48 bg-gray-200 rounded-lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-red-600 ${className}`}>
        <p>Error loading royalties: {error}</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Royalty Status</h3>
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 border-b">
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Due</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(summary.totalDue)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Paid</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(summary.totalPaid)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Pending Review</p>
              <p className="text-lg font-bold text-gray-900">{summary.pending}</p>
            </div>
          </div>
        )}

        {/* Royalty List */}
        <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
          {royalties.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No royalty records found.</div>
          ) : (
            royalties.map((royalty) => (
              <div key={royalty.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Session: {royalty.campSessionId.slice(0, 8)}...
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(royalty.grossRevenue)} gross @{' '}
                    {(royalty.royaltyRate * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">
                    {formatCurrency(royalty.royaltyAmount)}
                  </p>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(royalty.status)}`}
                  >
                    {royalty.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
