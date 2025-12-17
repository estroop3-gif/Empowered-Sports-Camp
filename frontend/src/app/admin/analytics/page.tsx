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
  TrendingUp,
  RefreshCw,
  ClipboardCheck,
  Wallet,
  Mic,
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
  // New incentive-related fields
  parentSurveyRate: number | null
  totalSurveys: number
  registeredCampersPerCamp: number
  totalVenueCost: number
  venueBudget: number
  totalIncentiveBonuses: number
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

interface LicenseeOption {
  id: string // This is the tenant_id for analytics, or profile id if no tenant
  name: string
  territoryName: string | null
  hasTenant: boolean
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
  const [selectedLicensee, setSelectedLicensee] = useState<string>('all')
  const [licenseeOptions, setLicenseeOptions] = useState<LicenseeOption[]>([])
  const [loadingLicensees, setLoadingLicensees] = useState(true)

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

  // Fetch licensee users on mount
  useEffect(() => {
    async function fetchLicenseeOptions() {
      setLoadingLicensees(true)
      const options: LicenseeOption[] = []

      try {
        // Get all licensee users (users with licensee_owner role)
        const licenseeRes = await fetch('/api/licensees?action=all')
        if (licenseeRes.ok) {
          const licenseeData = await licenseeRes.json()
          const licensees = licenseeData?.data
          if (licensees && Array.isArray(licensees)) {
            // Track which tenant_ids we've already added
            const addedTenantIds = new Set<string>()

            licensees.forEach((l: {
              id: string
              tenant_id: string | null
              tenant_name: string | null
              first_name: string | null
              last_name: string | null
              territory_name: string | null
              city: string | null
              state: string | null
            }) => {
              const displayName = [l.first_name, l.last_name].filter(Boolean).join(' ') ||
                l.tenant_name ||
                'Unknown Licensee'

              const location = l.city && l.state ? `${l.city}, ${l.state}` : (l.territory_name || null)

              // If licensee has a tenant_id, use that for analytics
              if (l.tenant_id) {
                if (!addedTenantIds.has(l.tenant_id)) {
                  options.push({
                    id: l.tenant_id,
                    name: l.tenant_name || displayName,
                    territoryName: location,
                    hasTenant: true,
                  })
                  addedTenantIds.add(l.tenant_id)
                }
              } else {
                // Licensee without tenant - show them but mark as no tenant
                options.push({
                  id: l.id, // Use profile id
                  name: displayName,
                  territoryName: location,
                  hasTenant: false,
                })
              }
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch licensees:', error)
      }

      console.log('Licensee options loaded:', options)
      setLicenseeOptions(options)
      setLoadingLicensees(false)
    }
    fetchLicenseeOptions()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    })

    try {
      if (selectedLicensee === 'all') {
        // Fetch global analytics
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
      } else {
        // Fetch licensee-specific analytics
        const licenseeParams = new URLSearchParams({
          tenantId: selectedLicensee,
          from: from.toISOString(),
          to: to.toISOString(),
        })

        const [overviewRes, trendsRes, programRes] = await Promise.all([
          fetch(`/api/analytics/licensee?type=overview&${licenseeParams}`),
          fetch(`/api/analytics/licensee?type=revenue-trends&granularity=${granularity}&${licenseeParams}`),
          fetch(`/api/analytics/licensee?type=program-breakdown&${licenseeParams}`),
        ])

        if (overviewRes.ok) {
          const data = await overviewRes.json()
          // Map licensee overview to global overview format
          setOverview({
            totalSystemGrossRevenue: data.tsgr,
            totalRoyaltyIncome: data.totalRoyaltyPaid,
            expectedRoyaltyIncome: data.totalRoyaltyDue,
            royaltyComplianceRate: data.royaltyComplianceRate,
            averageRevenuePerCamper: data.arpc,
            sessionsHeld: data.sessionsHeld,
            totalCampers: data.totalCampers,
            averageEnrollmentPerSession: data.averageEnrollmentPerSession,
            activeLicensees: 1,
            newLicensesSigned: 0,
            averageCsat: data.averageCsat,
            complaintRatio: data.complaintRatio,
            averageCurriculumAdherenceScore: data.averageCurriculumAdherenceScore,
            parentSurveyRate: data.parentSurveyRate,
            totalSurveys: data.totalSurveys,
            registeredCampersPerCamp: data.registeredCampersPerCamp,
            totalVenueCost: data.totalVenueCost,
            venueBudget: data.venueBudget,
            totalIncentiveBonuses: 0,
            uniqueGuestSpeakers: data.uniqueGuestSpeakers ?? 0,
          })
        }

        if (trendsRes.ok) {
          const data = await trendsRes.json()
          setRevenueTrends(data)
        }

        // Clear licensee breakdown when viewing single licensee
        setLicenseeBreakdown([])

        if (programRes.ok) {
          const data = await programRes.json()
          setProgramKpis(data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [timeRange, selectedLicensee])

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

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        {/* Licensee Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-white/40">
            View:
          </label>
          <select
            value={selectedLicensee}
            onChange={(e) => setSelectedLicensee(e.target.value)}
            className="px-4 py-2 bg-black border border-white/20 text-white focus:border-neon focus:outline-none min-w-[280px]"
            disabled={loadingLicensees}
          >
            <option value="all">
              {loadingLicensees ? 'Loading licensees...' : `All Licensees (Global) - ${licenseeOptions.length} total`}
            </option>
            {licenseeOptions.map((licensee) => (
              <option key={licensee.id} value={licensee.id} disabled={!licensee.hasTenant}>
                {licensee.name}
                {licensee.territoryName ? ` - ${licensee.territoryName}` : ''}
                {!licensee.hasTenant ? ' (No territory assigned)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Time Range Selector */}
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

      {/* Incentive Metrics */}
      <div className="mt-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">
          System-Wide Incentive Metrics
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
              subLabel: `${overview?.totalSurveys ?? 0} total surveys (4.5+ rating)`,
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
              subLabel: `${formatCurrency(overview?.totalVenueCost ?? 0)} total venue costs`,
              bonus: {
                amount: overview?.totalIncentiveBonuses ?? 0,
                label: '25% of venue savings/camp',
                eligible: (overview?.totalIncentiveBonuses ?? 0) > 0,
              },
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
