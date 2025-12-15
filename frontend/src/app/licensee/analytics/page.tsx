'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/auth/context'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import {
  KpiGrid,
  RevenueTrendsChart,
  ProgramBreakdownChart,
  SessionAnalyticsTable,
} from '@/components/analytics'
import {
  DollarSign,
  Users,
  Calendar,
  Star,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface LicenseeOverview {
  tsgr: number
  totalRoyaltyDue: number
  totalRoyaltyPaid: number
  royaltyComplianceRate: number
  arpc: number
  sessionsHeld: number
  activeSessions: number
  totalCampers: number
  averageEnrollmentPerSession: number
  averageCsat: number | null
  complaintRatio: number
  averageCurriculumAdherenceScore: number | null
}

interface TrendDataPoint {
  periodStart: Date
  periodLabel: string
  tsgr: number
  royaltyIncome: number
  sessionsHeld: number
  campers: number
  arpc: number
}

interface SessionAnalyticsItem {
  campId: string
  name: string
  programType: string
  startDate: Date
  endDate: Date
  status: string
  enrollment: number
  capacity: number | null
  tsgr: number
  royaltyDue: number
  csat: number | null
  complaintCount: number
  curriculumAdherenceScore: number | null
}

interface ProgramKpiItem {
  programType: string
  programName: string
  tsgr: number
  sessionsHeld: number
  totalCampers: number
  averageEnrollment: number
  csat: number | null
}

type TimeRange = '7d' | '30d' | '90d' | 'ytd'
type Granularity = 'day' | 'week' | 'month'

function getDateRange(timeRange: TimeRange): { from: Date; to: Date } {
  const to = new Date()
  let from: Date

  switch (timeRange) {
    case '7d':
      from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
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

export default function LicenseeAnalyticsPage() {
  const { user, tenant } = useAuth()
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<LicenseeOverview | null>(null)
  const [revenueTrends, setRevenueTrends] = useState<TrendDataPoint[]>([])
  const [sessions, setSessions] = useState<SessionAnalyticsItem[]>([])
  const [programKpis, setProgramKpis] = useState<ProgramKpiItem[]>([])

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Owner'
  const tenantId = tenant?.id

  const { from, to } = useMemo(() => getDateRange(timeRange), [timeRange])

  const granularity: Granularity = useMemo(() => {
    switch (timeRange) {
      case '7d':
        return 'day'
      case '30d':
        return 'week'
      case '90d':
        return 'week'
      case 'ytd':
        return 'month'
      default:
        return 'week'
    }
  }, [timeRange])

  const fetchData = async () => {
    if (!tenantId) return

    setLoading(true)
    const params = new URLSearchParams({
      tenantId,
      from: from.toISOString(),
      to: to.toISOString(),
    })

    try {
      const [overviewRes, trendsRes, sessionsRes, programRes] = await Promise.all([
        fetch(`/api/analytics/licensee?type=overview&${params}`),
        fetch(`/api/analytics/licensee?type=revenue-trends&granularity=${granularity}&${params}`),
        fetch(`/api/analytics/licensee?type=sessions&${params}`),
        fetch(`/api/analytics/licensee?type=program-breakdown&${params}`),
      ])

      if (overviewRes.ok) {
        const data = await overviewRes.json()
        setOverview(data)
      }

      if (trendsRes.ok) {
        const data = await trendsRes.json()
        setRevenueTrends(data)
      }

      if (sessionsRes.ok) {
        const data = await sessionsRes.json()
        setSessions(data)
      }

      if (programRes.ok) {
        const data = await programRes.json()
        setProgramKpis(data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tenantId) {
      fetchData()
    }
  }, [timeRange, tenantId])

  const sessionTableData = sessions.map(s => ({
    campId: s.campId,
    campName: s.name,
    programType: s.programType,
    startDate: new Date(s.startDate),
    endDate: new Date(s.endDate),
    location: 'N/A',
    registrations: s.enrollment,
    revenue: s.tsgr,
    csatScore: s.csat,
    curriculumAdherence: s.curriculumAdherenceScore,
    complaintsCount: s.complaintCount,
  }))

  const programChartData = programKpis.map(item => ({
    programType: item.programName,
    sessionsHeld: item.sessionsHeld,
    totalCampers: item.totalCampers,
    totalRevenue: item.tsgr,
    avgCsatScore: item.csat,
    avgCurriculumAdherence: null,
  }))

  return (
    <div>
      <PortalPageHeader
        title="Analytics"
        description="Performance metrics for your territory"
        actions={
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-neon/10 border border-neon text-neon font-bold uppercase tracking-wider text-sm hover:bg-neon/20 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </button>
        }
      />

      <LmsGate variant="card" featureName="analytics dashboard">
        {/* Time Range Selector */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1 bg-black/50 border border-white/10 p-1">
            {(['7d', '30d', '90d', 'ytd'] as const).map((range) => (
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
                {range === 'ytd' ? 'YTD' : range}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <KpiGrid
          columns={4}
          items={[
            {
              label: 'Total Revenue',
              value: overview?.tsgr ?? 0,
              format: 'currency',
              icon: DollarSign,
              variant: 'neon',
              subLabel: `${overview?.sessionsHeld ?? 0} sessions`,
            },
            {
              label: 'Royalty Due',
              value: overview?.totalRoyaltyDue ?? 0,
              format: 'currency',
              icon: TrendingUp,
              variant: 'magenta',
              subLabel: `${formatCurrency(overview?.totalRoyaltyPaid ?? 0)} paid`,
            },
            {
              label: 'Total Campers',
              value: overview?.totalCampers ?? 0,
              format: 'number',
              icon: Users,
              variant: 'purple',
              subLabel: `${formatCurrency(overview?.arpc ?? 0)} per camper`,
            },
            {
              label: 'Active Sessions',
              value: overview?.activeSessions ?? 0,
              format: 'number',
              icon: Calendar,
              variant: 'default',
              subLabel: `${overview?.averageEnrollmentPerSession?.toFixed(1) ?? 0} avg enrollment`,
            },
          ]}
        />

        {/* Quality Metrics */}
        <div className="mt-6">
          <KpiGrid
            columns={3}
            items={[
              {
                label: 'Average CSAT',
                value: overview?.averageCsat ?? 'N/A',
                format: overview?.averageCsat ? 'decimal' : undefined,
                icon: Star,
                variant: (overview?.averageCsat ?? 0) >= 4.5 ? 'neon' : 'default',
                subLabel: 'Out of 5.0',
              },
              {
                label: 'Complaint Rate',
                value: overview?.complaintRatio ?? 0,
                format: 'percentage',
                icon: AlertCircle,
                variant: (overview?.complaintRatio ?? 0) > 2 ? 'magenta' : 'default',
                subLabel: 'Per 100 campers',
              },
              {
                label: 'Curriculum Adherence',
                value: overview?.averageCurriculumAdherenceScore ?? 'N/A',
                format: overview?.averageCurriculumAdherenceScore ? 'percentage' : undefined,
                icon: BarChart3,
                variant: (overview?.averageCurriculumAdherenceScore ?? 0) >= 90 ? 'neon' : 'default',
                subLabel: 'Average score',
              },
            ]}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-8 lg:grid-cols-2 mt-8">
          <PortalCard title="Revenue Over Time" accent="neon">
            <RevenueTrendsChart
              data={revenueTrends}
              showRoyalty={false}
              height={280}
            />
          </PortalCard>

          <PortalCard title="Program Breakdown" accent="magenta">
            <ProgramBreakdownChart
              data={programChartData}
              metric="revenue"
            />
          </PortalCard>
        </div>

        {/* Sessions Table */}
        <div className="mt-8">
          <PortalCard title="Session Performance" accent="purple">
            <SessionAnalyticsTable data={sessionTableData} />
          </PortalCard>
        </div>
      </LmsGate>
    </div>
  )
}
