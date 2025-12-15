'use client'

import { useState, useEffect, useMemo } from 'react'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  KpiCard,
  KpiGrid,
  RevenueTrendsChart,
  EnrollmentTrendsChart,
  ProgramBreakdownChart,
  LicenseePerformanceTable,
} from '@/components/analytics'
import {
  DollarSign,
  Users,
  Calendar,
  Building2,
  Star,
  AlertCircle,
  TrendingUp,
  Download,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface GlobalAnalyticsOverview {
  totalSystemGrossRevenue: number
  totalRoyaltyIncome: number
  expectedRoyaltyIncome: number
  royaltyComplianceRate: number
  averageRevenuePerCamper: number
  sessionsHeld: number
  totalCampers: number
  averageEnrollmentPerSession: number
  activeLicensees: number
  newLicensesSigned: number
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

interface LicenseeBreakdownItem {
  licenseeId: string
  licenseeName: string
  territoryName: string | null
  tsgr: number
  sessionsHeld: number
  totalCampers: number
  averageEnrollmentPerSession: number
  totalRoyaltyPaid: number
  royaltyComplianceRate: number
  arpc: number
  csat: number | null
  complaintRatio: number
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

export default function GlobalAnalyticsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<GlobalAnalyticsOverview | null>(null)
  const [revenueTrends, setRevenueTrends] = useState<TrendDataPoint[]>([])
  const [licenseeBreakdown, setLicenseeBreakdown] = useState<LicenseeBreakdownItem[]>([])
  const [programKpis, setProgramKpis] = useState<ProgramKpiItem[]>([])

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

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
    setLoading(true)
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    })

    try {
      const [overviewRes, trendsRes, licenseeRes, programRes] = await Promise.all([
        fetch(`/api/analytics/global?type=overview&${params}`),
        fetch(`/api/analytics/global?type=revenue-trends&granularity=${granularity}&${params}`),
        fetch(`/api/analytics/global?type=licensee-breakdown&${params}`),
        fetch(`/api/analytics/global?type=program-kpis&${params}`),
      ])

      if (overviewRes.ok) {
        const data = await overviewRes.json()
        setOverview(data)
      }

      if (trendsRes.ok) {
        const data = await trendsRes.json()
        setRevenueTrends(data)
      }

      if (licenseeRes.ok) {
        const data = await licenseeRes.json()
        setLicenseeBreakdown(data)
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
    fetchData()
  }, [timeRange])

  const handleLicenseeClick = (tenantId: string) => {
    router.push(`/admin/analytics/licensees/${tenantId}`)
  }

  const licenseeTableData = licenseeBreakdown.map(item => ({
    tenantId: item.licenseeId,
    tenantName: item.licenseeName,
    sessionsHeld: item.sessionsHeld,
    totalCampers: item.totalCampers,
    tsgr: item.tsgr,
    royaltyIncome: item.totalRoyaltyPaid,
    arpc: item.arpc,
    avgCsat: item.csat,
    complaintsCount: Math.round(item.complaintRatio * item.totalCampers / 100),
    avgCurriculumAdherence: item.curriculumAdherenceScore,
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
    <AdminLayout userRole="hq_admin" userName={userName}>
      <PageHeader
        title="Global Analytics"
        description="System-wide metrics and performance insights"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Analytics' },
        ]}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="outline-neon"
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Link href="/admin/analytics/licensees">
            <Button variant="outline-neon" size="sm">
              <Building2 className="h-4 w-4 mr-2" />
              Compare Licensees
            </Button>
          </Link>
        </div>
      </PageHeader>

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
            value: overview?.totalSystemGrossRevenue ?? 0,
            format: 'currency',
            icon: DollarSign,
            variant: 'neon',
            subLabel: `${overview?.sessionsHeld ?? 0} sessions`,
          },
          {
            label: 'Royalties Collected',
            value: overview?.totalRoyaltyIncome ?? 0,
            format: 'currency',
            icon: TrendingUp,
            variant: 'magenta',
            subLabel: `${overview?.royaltyComplianceRate?.toFixed(0) ?? 100}% compliance`,
          },
          {
            label: 'Total Campers',
            value: overview?.totalCampers ?? 0,
            format: 'number',
            icon: Users,
            variant: 'purple',
            subLabel: `${formatCurrency(overview?.averageRevenuePerCamper ?? 0)} per camper`,
          },
          {
            label: 'Active Licensees',
            value: overview?.activeLicensees ?? 0,
            format: 'number',
            icon: Building2,
            variant: 'default',
            subLabel: `${overview?.newLicensesSigned ?? 0} new this period`,
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
              icon: Calendar,
              variant: (overview?.averageCurriculumAdherenceScore ?? 0) >= 90 ? 'neon' : 'default',
              subLabel: 'Average score',
            },
          ]}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-8 lg:grid-cols-2 mt-8">
        <ContentCard title="Revenue & Royalties Over Time" accent="neon">
          <RevenueTrendsChart
            data={revenueTrends}
            showRoyalty={true}
            height={280}
          />
        </ContentCard>

        <ContentCard title="Program Performance" accent="magenta">
          <ProgramBreakdownChart
            data={programChartData}
            metric="revenue"
          />
        </ContentCard>
      </div>

      {/* Licensee Performance Table */}
      <div className="mt-8">
        <ContentCard
          title="Licensee Performance"
          accent="purple"
          action={
            <Link href="/admin/analytics/licensees">
              <Button variant="ghost" size="sm" className="text-purple hover:text-purple/80">
                View All
              </Button>
            </Link>
          }
        >
          <LicenseePerformanceTable
            data={licenseeTableData.slice(0, 10)}
            onLicenseeClick={handleLicenseeClick}
          />
        </ContentCard>
      </div>
    </AdminLayout>
  )
}
