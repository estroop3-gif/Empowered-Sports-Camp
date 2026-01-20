/**
 * SHELL: Session Revenue Dashboard Component
 *
 * Displays real-time revenue metrics for a camp session.
 */

'use client'

import { useState, useEffect } from 'react'

interface RevenueData {
  sessionId: string
  sessionName: string
  tenantName: string
  period: {
    startDate: string
    endDate: string
  }
  revenue: {
    grossRevenue: number
    registrationRevenue: number
    upsellRevenue: number
    refunds: number
    netRevenue: number
  }
  metrics: {
    totalRegistrations: number
    confirmedRegistrations: number
    arpc: number
    conversionRate: number
  }
  royalty: {
    rate: number
    estimatedAmount: number
    status: string
  }
}

interface SessionRevenueDashboardProps {
  campSessionId: string
  className?: string
}

export function SessionRevenueDashboard({
  campSessionId,
  className = '',
}: SessionRevenueDashboardProps) {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRevenue()
  }, [campSessionId])

  const loadRevenue = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/revenue/session?campSessionId=${campSessionId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load revenue data')
      }

      setData(result.data)
    } catch (err) {
      console.error('[SessionRevenueDashboard] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load revenue data')
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

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-red-600 ${className}`}>
        <p>Error loading revenue: {error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className={`text-gray-500 ${className}`}>
        <p>No revenue data available.</p>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{data.sessionName}</h3>
        <p className="text-sm text-gray-500">{data.tenantName}</p>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500">Gross Revenue</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(data.revenue.grossRevenue)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500">Net Revenue</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(data.revenue.netRevenue)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500">Registrations</p>
          <p className="text-2xl font-bold text-gray-900">
            {data.metrics.confirmedRegistrations}
            <span className="text-sm text-gray-500 font-normal">
              {' '}
              / {data.metrics.totalRegistrations}
            </span>
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500">ARPC</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.metrics.arpc)}</p>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Revenue Breakdown</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Registration Revenue</span>
            <span className="text-sm font-medium">
              {formatCurrency(data.revenue.registrationRevenue)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Upsell Revenue</span>
            <span className="text-sm font-medium">
              {formatCurrency(data.revenue.upsellRevenue)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Refunds</span>
            <span className="text-sm font-medium text-red-600">
              -{formatCurrency(data.revenue.refunds)}
            </span>
          </div>
          <div className="border-t pt-2 flex justify-between">
            <span className="text-sm font-medium text-gray-700">Net Revenue</span>
            <span className="text-sm font-bold text-green-600">
              {formatCurrency(data.revenue.netRevenue)}
            </span>
          </div>
        </div>
      </div>

      {/* Royalty Info */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="text-sm font-medium text-blue-700 mb-2">Royalty Estimate</h4>
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-bold text-blue-900">
              {formatCurrency(data.royalty.estimatedAmount)}
            </span>
            <span className="text-sm text-blue-600 ml-2">
              ({formatPercent(data.royalty.rate * 100)} of gross)
            </span>
          </div>
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              data.royalty.status === 'PAID'
                ? 'bg-green-100 text-green-800'
                : data.royalty.status === 'INVOICED'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
            }`}
          >
            {data.royalty.status}
          </span>
        </div>
      </div>
    </div>
  )
}
