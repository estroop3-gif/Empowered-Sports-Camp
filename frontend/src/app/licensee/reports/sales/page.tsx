'use client'

/**
 * Licensee Sales Report Page
 *
 * Detailed sales analytics for the territory.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  BarChart3,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from 'lucide-react'

interface SalesReportTrend {
  periodStart: string
  periodLabel: string
  revenue: number
  campers: number
}

interface SalesReportCamp {
  campId: string
  campName: string
  revenue: number
  campers: number
  dates: string
  status: string
}

interface SalesReport {
  grossRevenue: number
  sessionsHeld: number
  totalCampers: number
  arpc: number
  comparison: {
    revenueChange: number | null
    campersChange: number | null
  }
  trends: SalesReportTrend[]
  campBreakdown: SalesReportCamp[]
  periodStart: string
  periodEnd: string
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function ChangeIndicator({ value }: { value: number | null }) {
  if (value === null) return null

  const isPositive = value >= 0
  const Icon = isPositive ? TrendingUp : TrendingDown
  const color = isPositive ? 'text-neon' : 'text-magenta'

  return (
    <span className={`flex items-center gap-1 text-xs ${color}`}>
      <Icon className="h-3 w-3" />
      {isPositive ? '+' : ''}{value}%
    </span>
  )
}

export default function LicenseeSalesReportPage() {
  const [period, setPeriod] = useState('season')
  const [data, setData] = useState<SalesReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/licensee/reports/sales?period=${period}`, {
          credentials: 'include',
        })
        const json = await res.json()

        if (!res.ok) {
          throw new Error(json.error || 'Failed to load sales report')
        }

        setData(json.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [period])

  return (
    <LmsGate featureName="sales reports">
      <div>
        <PortalPageHeader
          title="Sales Report"
          description="Detailed sales and revenue analytics"
          actions={
            <Link
              href="/licensee/dashboard"
              className="px-4 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/20 transition-colors"
            >
              Back to Dashboard
            </Link>
          }
        />

        {/* Period Selector */}
        <div className="flex items-center gap-4 mb-8">
          <span className="text-sm text-white/50 uppercase tracking-wider">Period:</span>
          <div className="flex gap-2">
            {['last_30_days', 'season', 'ytd'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${
                  period === p
                    ? 'bg-neon text-black'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {p === 'last_30_days'
                  ? '30 Days'
                  : p === 'ytd'
                  ? 'YTD'
                  : 'Season'}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-neon animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <PortalCard accent="magenta">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-magenta" />
              <div>
                <h3 className="font-bold text-white">Error Loading Report</h3>
                <p className="text-white/50 text-sm">{error}</p>
              </div>
            </div>
          </PortalCard>
        )}

        {/* Report Content */}
        {!loading && !error && data && (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4 mb-8">
              <PortalCard accent="neon">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-neon/20 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-neon" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {formatCurrency(data.grossRevenue)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white/50 uppercase">Gross Revenue</span>
                      <ChangeIndicator value={data.comparison.revenueChange} />
                    </div>
                  </div>
                </div>
              </PortalCard>

              <PortalCard>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-purple/20 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-purple" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{data.sessionsHeld}</div>
                    <div className="text-sm text-white/50 uppercase">Sessions</div>
                  </div>
                </div>
              </PortalCard>

              <PortalCard>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-magenta/20 flex items-center justify-center">
                    <Users className="h-6 w-6 text-magenta" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{data.totalCampers}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white/50 uppercase">Total Campers</span>
                      <ChangeIndicator value={data.comparison.campersChange} />
                    </div>
                  </div>
                </div>
              </PortalCard>

              <PortalCard>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-yellow-500/20 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {formatCurrency(data.arpc)}
                    </div>
                    <div className="text-sm text-white/50 uppercase">Avg Revenue/Camper</div>
                  </div>
                </div>
              </PortalCard>
            </div>

            {/* Revenue Trend Chart */}
            <PortalCard title="Revenue Trend" className="mb-8">
              {data.trends.length > 0 ? (
                <div className="space-y-4">
                  {/* Simple bar chart visualization */}
                  <div className="flex items-end gap-2 h-48">
                    {data.trends.map((trend, idx) => {
                      const maxRevenue = Math.max(...data.trends.map(t => t.revenue))
                      const heightPercent = maxRevenue > 0 ? (trend.revenue / maxRevenue) * 100 : 0
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                          <div
                            className="w-full bg-neon/80 hover:bg-neon transition-colors rounded-t"
                            style={{ height: `${heightPercent}%`, minHeight: trend.revenue > 0 ? '4px' : '0' }}
                            title={`${formatCurrency(trend.revenue)} - ${trend.campers} campers`}
                          />
                          <div className="text-xs text-white/50 text-center truncate w-full">
                            {trend.periodLabel}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="text-xs text-white/30 text-center">
                    Hover over bars to see details
                  </div>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center bg-white/5">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-white/20 mx-auto mb-2" />
                    <p className="text-white/50">No trend data available for this period</p>
                  </div>
                </div>
              )}
            </PortalCard>

            {/* Camp Breakdown Table */}
            <PortalCard title="Camp Breakdown">
              {data.campBreakdown.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-xs font-bold text-white/50 uppercase tracking-wider">
                          Camp
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-white/50 uppercase tracking-wider">
                          Dates
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-bold text-white/50 uppercase tracking-wider">
                          Campers
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-bold text-white/50 uppercase tracking-wider">
                          Revenue
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-bold text-white/50 uppercase tracking-wider">
                          ARPC
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-bold text-white/50 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.campBreakdown.map((camp) => (
                        <tr key={camp.campId} className="hover:bg-white/5">
                          <td className="py-3 px-4">
                            <Link
                              href={`/licensee/camps/${camp.campId}/hq`}
                              className="font-medium text-white hover:text-neon transition-colors"
                            >
                              {camp.campName}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-sm text-white/50">
                            {camp.dates}
                          </td>
                          <td className="py-3 px-4 text-right text-white">
                            {camp.campers}
                          </td>
                          <td className="py-3 px-4 text-right text-white font-medium">
                            {formatCurrency(camp.revenue)}
                          </td>
                          <td className="py-3 px-4 text-right text-white/70">
                            {camp.campers > 0 ? formatCurrency(camp.revenue / camp.campers) : '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-1 text-xs font-bold uppercase tracking-wider ${
                                camp.status === 'completed'
                                  ? 'bg-neon/20 text-neon'
                                  : camp.status === 'in_progress'
                                  ? 'bg-purple/20 text-purple'
                                  : 'bg-white/10 text-white/50'
                              }`}
                            >
                              {camp.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-white/20">
                      <tr className="font-bold">
                        <td className="py-3 px-4 text-white">Total</td>
                        <td className="py-3 px-4"></td>
                        <td className="py-3 px-4 text-right text-white">{data.totalCampers}</td>
                        <td className="py-3 px-4 text-right text-neon">{formatCurrency(data.grossRevenue)}</td>
                        <td className="py-3 px-4 text-right text-white/70">{formatCurrency(data.arpc)}</td>
                        <td className="py-3 px-4"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-white/20 mx-auto mb-2" />
                  <p className="text-white/50">No camps found for this period</p>
                </div>
              )}
            </PortalCard>

            {/* Quick Links */}
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <Link
                href="/licensee/reports/royalties"
                className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
              >
                <DollarSign className="h-6 w-6 text-purple" />
                <div>
                  <div className="font-bold text-white">Royalty Reports</div>
                  <div className="text-sm text-white/50">View royalty calculations and closeouts</div>
                </div>
                <ChevronRight className="h-5 w-5 text-white/30 ml-auto" />
              </Link>

              <Link
                href="/licensee/reports/quality"
                className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
              >
                <TrendingUp className="h-6 w-6 text-neon" />
                <div>
                  <div className="font-bold text-white">Quality Reports</div>
                  <div className="text-sm text-white/50">CSAT, complaints, and compliance</div>
                </div>
                <ChevronRight className="h-5 w-5 text-white/30 ml-auto" />
              </Link>
            </div>
          </>
        )}
      </div>
    </LmsGate>
  )
}
