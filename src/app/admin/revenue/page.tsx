'use client'

import { useState, useEffect, useMemo } from 'react'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import { KpiGrid } from '@/components/analytics'
import {
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'

/**
 * Admin Revenue Analytics Page
 *
 * Production-ready revenue dashboard for hq_admin showing:
 * - Revenue KPIs with base/upsell breakdown
 * - Revenue & royalty trends over time
 * - Per-licensee revenue breakdown
 * - Per-program revenue breakdown
 * - Per-session revenue table
 */

// Types
interface AdminRevenueOverview {
  totalSystemGrossRevenue: number
  totalUpsellRevenue: number
  totalBaseRegistrationRevenue: number
  sessionsHeld: number
  totalCampers: number
  averageEnrollmentPerSession: number
  averageRevenuePerCamper: number
  totalRoyaltyExpected: number
  totalRoyaltyPaid: number
  royaltyComplianceRate: number
}

interface AdminRevenueTrendPoint {
  periodStart: Date
  periodLabel: string
  grossRevenue: number
  upsellRevenue: number
  baseRevenue: number
  royaltyIncome: number
  sessionsHeld: number
  campers: number
  arpc: number
}

interface AdminRevenueByLicenseeItem {
  licenseeId: string
  licenseeName: string
  territoryName: string | null
  grossRevenue: number
  upsellRevenue: number
  baseRevenue: number
  sessionsHeld: number
  campers: number
  arpc: number
  royaltyExpected: number
  royaltyPaid: number
}

interface AdminRevenueByProgramItem {
  programType: string
  programName: string
  grossRevenue: number
  upsellRevenue: number
  baseRevenue: number
  sessionsHeld: number
  campers: number
  arpc: number
}

interface AdminRevenueSessionItem {
  campId: string
  campName: string
  programType: string
  programName: string
  licenseeId: string
  licenseeName: string
  startDate: string
  endDate: string
  status: string
  campers: number
  grossRevenue: number
  baseRevenue: number
  upsellRevenue: number
  royaltyExpected: number
  royaltyPaid: number
}

type TimeRange = '30d' | '90d' | 'ytd' | 'custom'
type Granularity = 'day' | 'week' | 'month'

function getDateRange(timeRange: TimeRange): { from: Date; to: Date } {
  const to = new Date()
  let from: Date

  switch (timeRange) {
    case '30d':
      from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case '90d':
      from = new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case 'ytd':
      from = new Date(to.getFullYear(), 0, 1)
      break
    default:
      from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)
  }

  return { from, to }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Revenue Trends Chart Component
function RevenueTrendsChart({
  data,
  height = 280,
}: {
  data: AdminRevenueTrendPoint[]
  height?: number
}) {
  const { maxValue, normalizedData } = useMemo(() => {
    if (data.length === 0) {
      return { maxValue: 0, normalizedData: [] }
    }

    const values = data.flatMap(d => [d.grossRevenue, d.royaltyIncome])
    const max = Math.max(...values, 1)

    const normalized = data.map(d => ({
      ...d,
      grossHeight: (d.grossRevenue / max) * 100,
      royaltyHeight: (d.royaltyIncome / max) * 100,
    }))

    return { maxValue: max, normalizedData: normalized }
  }, [data])

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center border border-dashed border-white/10"
        style={{ height }}
      >
        <div className="text-center">
          <TrendingUp className="h-12 w-12 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40">No revenue data yet</p>
          <p className="text-xs text-white/20 mt-1">
            Data will appear once registrations are recorded
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-neon" />
          <span className="text-xs text-white/60">Gross Revenue</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-magenta" />
          <span className="text-xs text-white/60">Royalty Income</span>
        </div>
      </div>

      <div style={{ height }} className="relative">
        <div className="absolute left-0 top-0 bottom-6 w-16 flex flex-col justify-between text-xs text-white/40">
          <span>{formatCurrency(maxValue)}</span>
          <span>{formatCurrency(maxValue / 2)}</span>
          <span>$0</span>
        </div>

        <div className="ml-16 h-full flex items-end gap-1 border-l border-b border-white/10 pb-6 pr-4">
          {normalizedData.map((point, index) => (
            <div
              key={index}
              className="flex-1 flex flex-col items-center gap-1 group relative"
            >
              <div className="w-full flex gap-0.5 items-end" style={{ height: height - 24 }}>
                <div
                  className="flex-1 bg-neon/80 hover:bg-neon transition-colors"
                  style={{ height: `${point.grossHeight}%`, minHeight: point.grossRevenue > 0 ? 4 : 0 }}
                />
                <div
                  className="flex-1 bg-magenta/80 hover:bg-magenta transition-colors"
                  style={{ height: `${point.royaltyHeight}%`, minHeight: point.royaltyIncome > 0 ? 4 : 0 }}
                />
              </div>

              <span className="text-[10px] text-white/40 truncate max-w-full">
                {point.periodLabel}
              </span>

              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/90 border border-white/20 p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                <p className="text-xs font-bold text-white">{point.periodLabel}</p>
                <p className="text-xs text-neon">Gross: {formatCurrency(point.grossRevenue)}</p>
                <p className="text-xs text-white/60">Base: {formatCurrency(point.baseRevenue)}</p>
                <p className="text-xs text-white/60">Upsell: {formatCurrency(point.upsellRevenue)}</p>
                <p className="text-xs text-magenta">Royalty: {formatCurrency(point.royaltyIncome)}</p>
                <p className="text-xs text-white/40">Campers: {point.campers}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Program Breakdown Chart
function ProgramBreakdownChart({ data }: { data: AdminRevenueByProgramItem[] }) {
  const totalRevenue = data.reduce((sum, d) => sum + d.grossRevenue, 0)

  const COLORS = ['bg-neon', 'bg-magenta', 'bg-purple', 'bg-blue-500', 'bg-orange-500']

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center border border-dashed border-white/10 h-64">
        <div className="text-center">
          <Package className="h-12 w-12 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40">No program data yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {data.map((item, index) => {
          const percentage = totalRevenue > 0 ? (item.grossRevenue / totalRevenue) * 100 : 0
          return (
            <div key={item.programType} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/80 font-medium">{item.programName}</span>
                <span className="text-white/60">
                  {formatCurrency(item.grossRevenue)} ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="h-6 bg-white/5 relative">
                <div
                  className={cn('h-full transition-all duration-500', COLORS[index % COLORS.length])}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="flex items-center gap-4 text-[10px] text-white/40">
                <span>{item.sessionsHeld} sessions</span>
                <span>{item.campers} campers</span>
                <span>ARPC: {formatCurrency(item.arpc)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Licensee Table Component
function LicenseeRevenueTable({
  data,
}: {
  data: AdminRevenueByLicenseeItem[]
}) {
  const [sortKey, setSortKey] = useState<keyof AdminRevenueByLicenseeItem>('grossRevenue')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      }
      return 0
    })
  }, [data, sortKey, sortDir])

  const handleSort = (key: keyof AdminRevenueByLicenseeItem) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const SortHeader = ({ label, field }: { label: string; field: keyof AdminRevenueByLicenseeItem }) => (
    <th
      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40 cursor-pointer hover:text-white/60"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === field && (sortDir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />)}
      </div>
    </th>
  )

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center border border-dashed border-white/10 h-64">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40">No licensee data yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-white/10">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">
              Licensee / Territory
            </th>
            <SortHeader label="Gross Revenue" field="grossRevenue" />
            <SortHeader label="Upsell" field="upsellRevenue" />
            <SortHeader label="Base" field="baseRevenue" />
            <SortHeader label="Sessions" field="sessionsHeld" />
            <SortHeader label="Campers" field="campers" />
            <SortHeader label="ARPC" field="arpc" />
            <SortHeader label="Royalty Expected" field="royaltyExpected" />
            <SortHeader label="Royalty Paid" field="royaltyPaid" />
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {sortedData.map(row => (
            <tr key={row.licenseeId} className="hover:bg-white/5 transition-colors">
              <td className="px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{row.licenseeName}</p>
                  {row.territoryName && (
                    <p className="text-xs text-white/40">{row.territoryName}</p>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-neon font-medium">{formatCurrency(row.grossRevenue)}</td>
              <td className="px-4 py-3 text-sm text-white/60">{formatCurrency(row.upsellRevenue)}</td>
              <td className="px-4 py-3 text-sm text-white/60">{formatCurrency(row.baseRevenue)}</td>
              <td className="px-4 py-3 text-sm text-white/80">{row.sessionsHeld}</td>
              <td className="px-4 py-3 text-sm text-white/80">{row.campers}</td>
              <td className="px-4 py-3 text-sm text-white/80">{formatCurrency(row.arpc)}</td>
              <td className="px-4 py-3 text-sm text-magenta">{formatCurrency(row.royaltyExpected)}</td>
              <td className="px-4 py-3 text-sm text-white/80">{formatCurrency(row.royaltyPaid)}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/analytics/licensees/${row.licenseeId}`}
                  className="text-neon/70 hover:text-neon"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Session Table Component
function SessionRevenueTable({ data }: { data: AdminRevenueSessionItem[] }) {
  const [sortKey, setSortKey] = useState<keyof AdminRevenueSessionItem>('startDate')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return 0
    })
  }, [data, sortKey, sortDir])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center border border-dashed border-white/10 h-64">
        <div className="text-center">
          <Calendar className="h-12 w-12 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40">No session data yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-white/10">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">Session</th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">Licensee</th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">Date</th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">Campers</th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">Gross</th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">Base</th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">Upsell</th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">Royalty</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {sortedData.slice(0, 20).map(row => (
            <tr key={row.campId} className="hover:bg-white/5 transition-colors">
              <td className="px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{row.campName}</p>
                  <p className="text-xs text-white/40">{row.programName}</p>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-white/60">{row.licenseeName}</td>
              <td className="px-4 py-3 text-sm text-white/60">{formatDate(row.startDate)}</td>
              <td className="px-4 py-3 text-sm text-white/80">{row.campers}</td>
              <td className="px-4 py-3 text-sm text-neon font-medium">{formatCurrency(row.grossRevenue)}</td>
              <td className="px-4 py-3 text-sm text-white/60">{formatCurrency(row.baseRevenue)}</td>
              <td className="px-4 py-3 text-sm text-white/60">{formatCurrency(row.upsellRevenue)}</td>
              <td className="px-4 py-3 text-sm text-magenta">{formatCurrency(row.royaltyExpected)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 20 && (
        <div className="py-3 text-center text-xs text-white/40">
          Showing 20 of {data.length} sessions
        </div>
      )}
    </div>
  )
}

// Main Page Component
export default function AdminRevenuePage() {
  const { user } = useAuth()
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [granularity, setGranularity] = useState<Granularity>('week')
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<AdminRevenueOverview | null>(null)
  const [trends, setTrends] = useState<AdminRevenueTrendPoint[]>([])
  const [licenseeData, setLicenseeData] = useState<AdminRevenueByLicenseeItem[]>([])
  const [programData, setProgramData] = useState<AdminRevenueByProgramItem[]>([])
  const [sessionData, setSessionData] = useState<AdminRevenueSessionItem[]>([])

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  const { from, to } = useMemo(() => getDateRange(timeRange), [timeRange])

  const fetchData = async () => {
    setLoading(true)
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    })

    try {
      const [overviewRes, trendsRes, licenseeRes, programRes, sessionRes] = await Promise.all([
        fetch(`/api/admin/analytics/revenue?type=overview&${params}`),
        fetch(`/api/admin/analytics/revenue?type=trends&granularity=${granularity}&${params}`),
        fetch(`/api/admin/analytics/revenue?type=by-licensee&${params}`),
        fetch(`/api/admin/analytics/revenue?type=by-program&${params}`),
        fetch(`/api/admin/analytics/revenue?type=sessions&${params}`),
      ])

      if (overviewRes.ok) {
        setOverview(await overviewRes.json())
      }
      if (trendsRes.ok) {
        setTrends(await trendsRes.json())
      }
      if (licenseeRes.ok) {
        setLicenseeData(await licenseeRes.json())
      }
      if (programRes.ok) {
        setProgramData(await programRes.json())
      }
      if (sessionRes.ok) {
        setSessionData(await sessionRes.json())
      }
    } catch (error) {
      console.error('Failed to fetch revenue analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [timeRange, granularity])

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <PageHeader
        title="Revenue Analytics"
        description="System-wide revenue metrics and financial insights"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Revenue Analytics' },
        ]}
      >
        <Button
          variant="outline-neon"
          size="sm"
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </PageHeader>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="inline-flex items-center gap-1 bg-black/50 border border-white/10 p-1">
          {(['30d', '90d', 'ytd'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                'px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors',
                timeRange === range
                  ? 'bg-neon text-black'
                  : 'text-white/50 hover:text-white'
              )}
            >
              {range === 'ytd' ? 'Year to Date' : range === '30d' ? 'Last 30 Days' : 'This Season'}
            </button>
          ))}
        </div>

        <div className="inline-flex items-center gap-1 bg-black/50 border border-white/10 p-1">
          {(['day', 'week', 'month'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={cn(
                'px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors',
                granularity === g
                  ? 'bg-magenta text-white'
                  : 'text-white/50 hover:text-white'
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Summary Grid */}
      <KpiGrid
        columns={4}
        items={[
          {
            label: 'Total Gross Revenue',
            value: overview?.totalSystemGrossRevenue ?? 0,
            format: 'currency',
            icon: DollarSign,
            variant: 'neon',
            subLabel: `${overview?.sessionsHeld ?? 0} sessions`,
          },
          {
            label: 'Upsell Revenue',
            value: overview?.totalUpsellRevenue ?? 0,
            format: 'currency',
            icon: Package,
            variant: 'magenta',
            subLabel: `${((overview?.totalUpsellRevenue || 0) / Math.max(overview?.totalSystemGrossRevenue || 1, 1) * 100).toFixed(1)}% of total`,
          },
          {
            label: 'Base Registration',
            value: overview?.totalBaseRegistrationRevenue ?? 0,
            format: 'currency',
            icon: Users,
            variant: 'purple',
            subLabel: `${overview?.totalCampers ?? 0} campers`,
          },
          {
            label: 'Avg Revenue Per Camper',
            value: overview?.averageRevenuePerCamper ?? 0,
            format: 'currency',
            icon: TrendingUp,
            variant: 'default',
            subLabel: `${overview?.averageEnrollmentPerSession?.toFixed(1) ?? 0} avg enrollment`,
          },
        ]}
      />

      {/* Royalty Metrics */}
      <div className="mt-6">
        <KpiGrid
          columns={3}
          items={[
            {
              label: 'Royalty Expected',
              value: overview?.totalRoyaltyExpected ?? 0,
              format: 'currency',
              icon: DollarSign,
              variant: 'magenta',
            },
            {
              label: 'Royalty Paid',
              value: overview?.totalRoyaltyPaid ?? 0,
              format: 'currency',
              icon: DollarSign,
              variant: 'neon',
            },
            {
              label: 'Compliance Rate',
              value: overview?.royaltyComplianceRate ?? 100,
              format: 'percentage',
              icon: TrendingUp,
              variant: (overview?.royaltyComplianceRate ?? 100) >= 90 ? 'neon' : 'magenta',
            },
          ]}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-8 lg:grid-cols-2 mt-8">
        <ContentCard title="Revenue & Royalty Over Time" accent="neon">
          <RevenueTrendsChart data={trends} height={280} />
        </ContentCard>

        <ContentCard title="Revenue by Program" accent="magenta">
          <ProgramBreakdownChart data={programData} />
        </ContentCard>
      </div>

      {/* Revenue by Licensee Table */}
      <div className="mt-8">
        <ContentCard
          title="Revenue by Licensee"
          accent="purple"
          action={
            <Link href="/admin/analytics/licensees">
              <Button variant="ghost" size="sm" className="text-purple hover:text-purple/80">
                View All Licensees
              </Button>
            </Link>
          }
        >
          <LicenseeRevenueTable data={licenseeData} />
        </ContentCard>
      </div>

      {/* Session Revenue Table */}
      <div className="mt-8">
        <ContentCard title="Per-Session Revenue" accent="neon">
          <SessionRevenueTable data={sessionData} />
        </ContentCard>
      </div>
    </AdminLayout>
  )
}
