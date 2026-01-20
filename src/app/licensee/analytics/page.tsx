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
  TrendingUp,
  RefreshCw,
  ClipboardCheck,
  Wallet,
  Mic,
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
  // New incentive-related fields
  parentSurveyRate: number | null // Percentage of surveys 4.5+
  totalSurveys: number
  registeredCampersPerCamp: number
  totalVenueCost: number
  venueBudget: number // $1200 default
  uniqueGuestSpeakers: number
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

        {/* Incentive Metrics */}
        <div className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">
            Incentive Bonuses
          </h3>
          <KpiGrid
            columns={4}
            items={[
              {
                label: 'Parent Surveys',
                value: overview?.parentSurveyRate ?? 'N/A',
                format: overview?.parentSurveyRate !== null ? 'percentage' : undefined,
                icon: Star,
                variant: (overview?.parentSurveyRate ?? 0) >= 70 ? 'neon' : 'default',
                subLabel: `${overview?.totalSurveys ?? 0} surveys (4.5+ rating)`,
                bonus: {
                  amount: (overview?.parentSurveyRate ?? 0) >= 70
                    ? (overview?.sessionsHeld ?? 0) * 200
                    : 0,
                  label: '$200/camp bonus (70%+ at 4.5+)',
                  eligible: (overview?.parentSurveyRate ?? 0) >= 70,
                },
              },
              {
                label: 'Registered Campers',
                value: overview?.totalCampers ?? 0,
                format: 'number',
                icon: ClipboardCheck,
                variant: (overview?.registeredCampersPerCamp ?? 0) >= 25 ? 'neon' : 'default',
                subLabel: `${overview?.registeredCampersPerCamp?.toFixed(1) ?? 0} avg per camp`,
                bonus: {
                  amount: (overview?.registeredCampersPerCamp ?? 0) >= 25
                    ? (overview?.totalCampers ?? 0) * 20
                    : 0,
                  label: '$20/camper bonus (min 25/camp)',
                  eligible: (overview?.registeredCampersPerCamp ?? 0) >= 25,
                },
              },
              {
                label: 'Guest Speakers',
                value: overview?.uniqueGuestSpeakers ?? 0,
                format: 'number',
                icon: Mic,
                variant: (overview?.uniqueGuestSpeakers ?? 0) >= 3 ? 'neon' : 'default',
                subLabel: 'Unique high-profile speakers',
                bonus: {
                  amount: (overview?.uniqueGuestSpeakers ?? 0) >= 3
                    ? (overview?.sessionsHeld ?? 0) * 100
                    : 0,
                  label: '$100/session bonus (min 3 speakers)',
                  eligible: (overview?.uniqueGuestSpeakers ?? 0) >= 3,
                },
              },
              {
                label: 'Budget Efficiency',
                value: overview?.totalVenueCost !== undefined && overview?.venueBudget !== undefined
                  ? Math.max(0, ((overview.venueBudget - overview.totalVenueCost) / overview.venueBudget) * 100)
                  : 'N/A',
                format: overview?.totalVenueCost !== undefined ? 'percentage' : undefined,
                icon: Wallet,
                variant: (overview?.totalVenueCost ?? 1200) < (overview?.venueBudget ?? 1200) ? 'neon' : 'default',
                subLabel: `${formatCurrency(overview?.totalVenueCost ?? 0)} of ${formatCurrency(overview?.venueBudget ?? 1200)} budget`,
                bonus: {
                  amount: (overview?.totalVenueCost ?? 1200) < (overview?.venueBudget ?? 1200)
                    ? Math.round(((overview?.venueBudget ?? 1200) - (overview?.totalVenueCost ?? 0)) * 0.25 * (overview?.sessionsHeld ?? 0))
                    : 0,
                  label: '25% of venue savings/camp',
                  eligible: (overview?.totalVenueCost ?? 1200) < (overview?.venueBudget ?? 1200),
                },
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
