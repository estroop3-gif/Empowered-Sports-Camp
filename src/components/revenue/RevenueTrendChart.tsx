/**
 * SHELL: Revenue Trend Chart Component
 *
 * Displays revenue trends over time using a simple bar chart.
 * SHELL: In production, would use recharts or similar library.
 */

'use client'

import { useState, useEffect } from 'react'

interface TrendData {
  period: string
  grossRevenue: number
  netRevenue: number
  registrations: number
  arpc: number
}

interface RevenueTrendChartProps {
  range?: 'season' | 'ytd' | 'custom'
  startDate?: string
  endDate?: string
  className?: string
}

export function RevenueTrendChart({
  range = 'season',
  startDate,
  endDate,
  className = '',
}: RevenueTrendChartProps) {
  const [trends, setTrends] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTrends()
  }, [range, startDate, endDate])

  const loadTrends = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ range })
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(`/api/revenue/trends?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load trends')
      }

      setTrends(result.data?.trends || [])
    } catch (err) {
      console.error('[RevenueTrendChart] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load trends')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount)
  }

  const maxRevenue = Math.max(...trends.map((t) => t.grossRevenue), 1)

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-64 bg-gray-200 rounded-lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-red-600 ${className}`}>
        <p>Error loading trends: {error}</p>
      </div>
    )
  }

  if (trends.length === 0) {
    return (
      <div className={`text-gray-500 text-center py-8 ${className}`}>
        <p>No trend data available for this period.</p>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* SHELL: Simple bar chart - in production use recharts */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-4">Revenue Trends</h4>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            <span className="text-xs text-gray-600">Gross</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span className="text-xs text-gray-600">Net</span>
          </div>
        </div>

        {/* Chart */}
        <div className="flex items-end gap-2 h-48">
          {trends.map((trend) => (
            <div key={trend.period} className="flex-1 flex flex-col items-center">
              <div className="w-full flex gap-1 items-end h-40">
                {/* Gross bar */}
                <div
                  className="flex-1 bg-blue-500 rounded-t transition-all duration-300"
                  style={{
                    height: `${(trend.grossRevenue / maxRevenue) * 100}%`,
                    minHeight: trend.grossRevenue > 0 ? '4px' : '0',
                  }}
                  title={`Gross: ${formatCurrency(trend.grossRevenue)}`}
                />
                {/* Net bar */}
                <div
                  className="flex-1 bg-green-500 rounded-t transition-all duration-300"
                  style={{
                    height: `${(trend.netRevenue / maxRevenue) * 100}%`,
                    minHeight: trend.netRevenue > 0 ? '4px' : '0',
                  }}
                  title={`Net: ${formatCurrency(trend.netRevenue)}`}
                />
              </div>
              <span className="text-xs text-gray-500 mt-2">{trend.period}</span>
            </div>
          ))}
        </div>

        {/* Summary Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-gray-500 font-medium">Period</th>
                <th className="text-right py-2 text-gray-500 font-medium">Gross</th>
                <th className="text-right py-2 text-gray-500 font-medium">Net</th>
                <th className="text-right py-2 text-gray-500 font-medium">Regs</th>
                <th className="text-right py-2 text-gray-500 font-medium">ARPC</th>
              </tr>
            </thead>
            <tbody>
              {trends.map((trend) => (
                <tr key={trend.period} className="border-b">
                  <td className="py-2 text-gray-700">{trend.period}</td>
                  <td className="py-2 text-right text-gray-700">
                    {formatCurrency(trend.grossRevenue)}
                  </td>
                  <td className="py-2 text-right text-green-600">
                    {formatCurrency(trend.netRevenue)}
                  </td>
                  <td className="py-2 text-right text-gray-700">{trend.registrations}</td>
                  <td className="py-2 text-right text-gray-700">{formatCurrency(trend.arpc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
