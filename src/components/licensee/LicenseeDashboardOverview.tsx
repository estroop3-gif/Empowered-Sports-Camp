'use client'

/**
 * Licensee Dashboard Overview Component
 *
 * Main dashboard container for licensee_owner role.
 * Displays all KPIs, camps, staff, and action items for the territory.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { PortalCard } from '@/components/portal'
import { cn, parseDateSafe } from '@/lib/utils'
import {
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Star,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
  MapPin,
  GraduationCap,
  Trophy,
  Bell,
  FileText,
  Briefcase,
  UserPlus,
  Settings,
  LayoutDashboard,
  Loader2,
  AlertCircle,
  BarChart3,
  Percent,
  Target,
  ShieldCheck,
  Play,
  ArrowRight,
} from 'lucide-react'
import type { LicenseeDashboardData } from '@/lib/services/licensee-dashboard'

export function LicenseeDashboardOverview() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<LicenseeDashboardData | null>(null)
  const [period, setPeriod] = useState('season')

  useEffect(() => {
    loadDashboard()
  }, [period])

  async function loadDashboard() {
    try {
      setLoading(true)
      const res = await fetch(`/api/licensee/dashboard?period=${period}`)
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load dashboard')
      }

      setData(json.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

  const formatPercent = (val: number) => `${val.toFixed(1)}%`

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-neon animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <PortalCard>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Error Loading Dashboard</h3>
          <p className="text-white/50 mb-4">{error}</p>
          <button
            onClick={loadDashboard}
            className="px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </PortalCard>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-8">
      {/* Territory Overview Card */}
      <TerritoryOverviewCard territory={data.territory} salesKpis={data.sales_kpis} />

      {/* Period Selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-white/50 uppercase tracking-wider">Period:</span>
        <div className="flex gap-2">
          {['last_30_days', 'season', 'ytd'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors',
                period === p
                  ? 'bg-neon text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              )}
            >
              {p === 'last_30_days' ? 'Last 30 Days' : p === 'ytd' ? 'Year to Date' : 'Season'}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <SalesKpisCard kpis={data.sales_kpis} />
        <FinancialHealthCard kpis={data.financial_kpis} />
        <QualityComplianceCard kpis={data.quality_kpis} />
      </div>

      {/* Tasks & Alerts Banner */}
      {data.tasks_alerts.total_alerts > 0 && (
        <TasksAlertsCard alerts={data.tasks_alerts} />
      )}

      {/* Two-Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          <ActiveCampsCard
            activeCamps={data.active_camps}
            upcomingCamps={data.upcoming_camps}
          />
          <StaffSummaryCard staff={data.staff_summary} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <EmpowerUBusinessCard progress={data.empoweru_progress} />
          <IncentiveOverviewCard incentives={data.incentive_overview} />
          <QuickLinksCard />
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Sub-Components
// =============================================================================

function TerritoryOverviewCard({
  territory,
  salesKpis,
}: {
  territory: LicenseeDashboardData['territory']
  salesKpis: LicenseeDashboardData['sales_kpis']
}) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

  return (
    <PortalCard accent="purple">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 bg-purple/20 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-7 w-7 text-purple" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {territory?.territory_name || 'Your Territory'}
            </h2>
            <p className="text-white/50 text-sm mt-1">
              {territory?.name || 'Empowered Sports Camp'}
            </p>
            <p className="text-white/40 text-xs mt-2 max-w-md">
              You are operating the Empowered Sports Camp business in this territory.
              You cover local costs, retain net profit, and pay a 10% royalty on gross revenue.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 lg:gap-8">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{salesKpis.sessions_held}</p>
            <p className="text-xs text-white/40 uppercase">Sessions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-neon">
              {formatCurrency(salesKpis.total_gross_revenue)}
            </p>
            <p className="text-xs text-white/40 uppercase">Gross Revenue</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple">
              {formatCurrency(salesKpis.total_gross_revenue * 0.1)}
            </p>
            <p className="text-xs text-white/40 uppercase">Royalties</p>
          </div>
        </div>
      </div>
    </PortalCard>
  )
}

function SalesKpisCard({ kpis }: { kpis: LicenseeDashboardData['sales_kpis'] }) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

  return (
    <PortalCard title="Sales & Growth" accent="neon">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-white/5">
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-neon" />
            <span className="text-white/70">Gross Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">
              {formatCurrency(kpis.total_gross_revenue)}
            </span>
            {kpis.revenue_delta_percent !== null && (
              <DeltaBadge value={kpis.revenue_delta_percent} />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-white/5">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-purple" />
            <span className="text-white/70">Sessions Held</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">{kpis.sessions_held}</span>
            {kpis.sessions_delta !== null && (
              <span className="text-xs text-white/40">
                {kpis.sessions_delta > 0 ? '+' : ''}{kpis.sessions_delta} vs prev
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-white/5">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-magenta" />
            <span className="text-white/70">Avg Enrollment</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">
              {kpis.avg_enrollment_per_session.toFixed(1)}
            </span>
            {kpis.enrollment_delta_percent !== null && (
              <DeltaBadge value={kpis.enrollment_delta_percent} />
            )}
          </div>
        </div>

        <Link
          href="/licensee/reports/sales"
          className="flex items-center justify-center gap-2 w-full py-2 bg-white/10 text-white text-sm font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
        >
          View Full Report
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </PortalCard>
  )
}

function FinancialHealthCard({ kpis }: { kpis: LicenseeDashboardData['financial_kpis'] }) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

  return (
    <PortalCard title="Financial Health">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-white/5">
          <div className="flex items-center gap-3">
            <Percent className="h-5 w-5 text-purple" />
            <span className="text-white/70">Royalty Due</span>
          </div>
          <span className="text-xl font-bold text-white">
            {formatCurrency(kpis.total_royalty_due)}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-white/5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-neon" />
            <span className="text-white/70">Compliance Rate</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">
              {kpis.royalty_compliance_rate.toFixed(0)}%
            </span>
            {kpis.royalty_compliance_rate >= 90 ? (
              <CheckCircle className="h-4 w-4 text-neon" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-white/5">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-magenta" />
            <span className="text-white/70">ARPC</span>
          </div>
          <span className="text-xl font-bold text-white">
            {formatCurrency(kpis.average_revenue_per_camper)}
          </span>
        </div>

        {kpis.sessions_needing_closeout > 0 && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30">
            <p className="text-sm text-yellow-400">
              {kpis.sessions_needing_closeout} session{kpis.sessions_needing_closeout !== 1 ? 's' : ''} need closeout
            </p>
          </div>
        )}

        <Link
          href="/licensee/reports/royalties"
          className="flex items-center justify-center gap-2 w-full py-2 bg-white/10 text-white text-sm font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
        >
          View Royalty Closeouts
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </PortalCard>
  )
}

function QualityComplianceCard({ kpis }: { kpis: LicenseeDashboardData['quality_kpis'] }) {
  return (
    <PortalCard title="Quality & Compliance">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-white/5">
          <div className="flex items-center gap-3">
            <Star className="h-5 w-5 text-yellow-400" />
            <span className="text-white/70">CSAT Score</span>
          </div>
          <div className="flex items-center gap-2">
            {kpis.avg_csat_score !== null ? (
              <>
                <span className="text-xl font-bold text-white">
                  {kpis.avg_csat_score.toFixed(1)}
                </span>
                <span className="text-sm text-white/40">/ 5.0</span>
              </>
            ) : (
              <span className="text-white/40">No data</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-white/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-magenta" />
            <span className="text-white/70">Complaint Ratio</span>
          </div>
          <span className="text-xl font-bold text-white">
            {kpis.complaint_ratio.toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-white/5">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-purple" />
            <span className="text-white/70">Curriculum Adherence</span>
          </div>
          <span className="text-xl font-bold text-white">
            {kpis.curriculum_adherence_score.toFixed(0)}%
          </span>
        </div>

        {kpis.warnings.length > 0 && (
          <div className="p-3 bg-magenta/10 border border-magenta/30">
            {kpis.warnings.map((warning, i) => (
              <p key={i} className="text-sm text-magenta flex items-center gap-2">
                <AlertTriangle className="h-3 w-3" />
                {warning}
              </p>
            ))}
          </div>
        )}

        <Link
          href="/licensee/reports/quality"
          className="flex items-center justify-center gap-2 w-full py-2 bg-white/10 text-white text-sm font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
        >
          View Quality Report
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </PortalCard>
  )
}

function TasksAlertsCard({ alerts }: { alerts: LicenseeDashboardData['tasks_alerts'] }) {
  const items = [
    {
      count: alerts.sessions_needing_closeout,
      label: 'sessions need royalty closeout',
      href: '/licensee/reports/royalties',
      color: 'text-yellow-400',
    },
    {
      count: alerts.incentives_to_finalize,
      label: 'director incentives ready to finalize',
      href: '/licensee/incentives',
      color: 'text-purple',
    },
    {
      count: alerts.cit_applications_pending,
      label: 'CIT applications awaiting review',
      href: '/licensee/cit-applications',
      color: 'text-neon',
    },
    {
      count: alerts.contributions_pending_review,
      label: 'LMS contributions pending approval',
      href: '/licensee/empoweru',
      color: 'text-magenta',
    },
  ].filter((item) => item.count > 0)

  if (items.length === 0) return null

  return (
    <div className="p-4 bg-gradient-to-r from-yellow-500/10 to-magenta/10 border border-yellow-500/30">
      <div className="flex items-center gap-3 mb-4">
        <Bell className="h-5 w-5 text-yellow-400" />
        <h3 className="font-bold text-white uppercase tracking-wider">
          Action Items ({alerts.total_alerts})
        </h3>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {items.map((item, i) => (
          <Link
            key={i}
            href={item.href}
            className="flex items-center gap-3 p-3 bg-black/30 hover:bg-black/50 transition-colors"
          >
            <span className={cn('text-xl font-bold', item.color)}>{item.count}</span>
            <span className="text-white/70 text-sm">{item.label}</span>
            <ChevronRight className="h-4 w-4 text-white/30 ml-auto" />
          </Link>
        ))}
      </div>
    </div>
  )
}

function ActiveCampsCard({
  activeCamps,
  upcomingCamps,
}: {
  activeCamps: LicenseeDashboardData['active_camps']
  upcomingCamps: LicenseeDashboardData['upcoming_camps']
}) {
  const allCamps = [...activeCamps, ...upcomingCamps].slice(0, 5)

  return (
    <PortalCard title="Camps">
      {allCamps.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="h-10 w-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/50">No camps scheduled</p>
          <Link
            href="/portal/camps/new"
            className="inline-flex items-center gap-2 mt-4 text-neon text-sm font-bold"
          >
            Create your first camp
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {allCamps.map((camp) => (
            <div
              key={camp.id}
              className="p-3 bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-white truncate">{camp.name}</h4>
                    <StatusBadge status={camp.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {parseDateSafe(camp.start_date).toLocaleDateString()}
                    </span>
                    {camp.location_city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {camp.location_city}, {camp.location_state}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {camp.enrolled_count}/{camp.capacity}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/licensee/camps/${camp.id}/hq`}
                  className="px-3 py-1 bg-neon text-black text-xs font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
                >
                  Camp HQ
                </Link>
              </div>
            </div>
          ))}

          <Link
            href="/licensee/camps"
            className="flex items-center justify-center gap-2 w-full py-2 bg-white/10 text-white text-sm font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
          >
            View All Camps
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </PortalCard>
  )
}

function StaffSummaryCard({ staff }: { staff: LicenseeDashboardData['staff_summary'] }) {
  return (
    <PortalCard title="Staff & ICs">
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-white/5">
          <p className="text-2xl font-bold text-magenta">{staff.directors.count}</p>
          <p className="text-xs text-white/40 uppercase">Directors</p>
          <p className="text-xs text-white/30">{staff.directors.active_this_season} active</p>
        </div>
        <div className="text-center p-3 bg-white/5">
          <p className="text-2xl font-bold text-purple">{staff.coaches.count}</p>
          <p className="text-xs text-white/40 uppercase">Coaches</p>
          <p className="text-xs text-white/30">{staff.coaches.active_this_season} active</p>
        </div>
        <div className="text-center p-3 bg-white/5">
          <p className="text-2xl font-bold text-neon">{staff.cits.count}</p>
          <p className="text-xs text-white/40 uppercase">CITs</p>
          <p className="text-xs text-white/30">{staff.cits.active_this_season} active</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          href="/licensee/staff"
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/10 text-white text-sm font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
        >
          Manage Staff
        </Link>
        <Link
          href="/licensee/incentives"
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/10 text-white text-sm font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
        >
          View Incentives
        </Link>
      </div>
    </PortalCard>
  )
}

function EmpowerUBusinessCard({
  progress,
}: {
  progress: LicenseeDashboardData['empoweru_progress']
}) {
  const biz = progress.business_portal

  return (
    <PortalCard title="EmpowerU Business Portal" accent="magenta">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-white/70">Progress</span>
          <span className="text-white font-bold">
            {biz.completed_modules} / {biz.total_modules} modules
          </span>
        </div>

        <div className="w-full h-2 bg-white/10 overflow-hidden">
          <div
            className="h-full bg-magenta transition-all"
            style={{ width: `${biz.percentage}%` }}
          />
        </div>

        {biz.next_module && (
          <div className="p-3 bg-white/5">
            <p className="text-xs text-white/40 uppercase mb-1">Next Module</p>
            <p className="text-white font-bold">{biz.next_module}</p>
          </div>
        )}

        {biz.gated_features.length > 0 && (
          <div className="p-3 bg-magenta/10 border border-magenta/30">
            <p className="text-xs text-magenta">
              Complete training to unlock: {biz.gated_features.join(', ')}
            </p>
          </div>
        )}

        <Link
          href="/licensee/empoweru"
          className="flex items-center justify-center gap-2 w-full py-2 bg-magenta text-white text-sm font-bold uppercase tracking-wider hover:bg-magenta/90 transition-colors"
        >
          <GraduationCap className="h-4 w-4" />
          Open EmpowerU
        </Link>
      </div>
    </PortalCard>
  )
}

function IncentiveOverviewCard({
  incentives,
}: {
  incentives: LicenseeDashboardData['incentive_overview']
}) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

  return (
    <PortalCard title="Staff Incentives">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-white/5 text-center">
            <p className="text-xl font-bold text-neon">
              {formatCurrency(incentives.total_paid_this_season)}
            </p>
            <p className="text-xs text-white/40 uppercase">Paid This Season</p>
          </div>
          <div className="p-3 bg-white/5 text-center">
            <p className="text-xl font-bold text-yellow-400">
              {formatCurrency(incentives.total_pending)}
            </p>
            <p className="text-xs text-white/40 uppercase">Pending</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-white/5">
          <span className="text-white/70">Staff with Compensation</span>
          <span className="font-bold text-white">{incentives.staff_with_compensation}</span>
        </div>

        <div className="flex items-center justify-between p-3 bg-white/5">
          <span className="text-white/70">Avg per Session</span>
          <span className="font-bold text-white">
            {formatCurrency(incentives.avg_compensation_per_session)}
          </span>
        </div>

        <Link
          href="/licensee/incentives"
          className="flex items-center justify-center gap-2 w-full py-2 bg-white/10 text-white text-sm font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
        >
          <Trophy className="h-4 w-4" />
          View Scorecards
        </Link>
      </div>
    </PortalCard>
  )
}

function QuickLinksCard() {
  const links = [
    { label: 'CIT Applications', href: '/licensee/cit-applications', icon: UserPlus },
    { label: 'Job Board', href: '/licensee/jobs', icon: Briefcase },
    { label: 'Shop', href: '/licensee/shop', icon: DollarSign },
    { label: 'Settings', href: '/licensee/settings', icon: Settings },
  ]

  return (
    <PortalCard title="Quick Links">
      <div className="grid grid-cols-2 gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 transition-colors"
          >
            <link.icon className="h-4 w-4 text-white/50" />
            <span className="text-sm text-white">{link.label}</span>
          </Link>
        ))}
      </div>
    </PortalCard>
  )
}

// =============================================================================
// Utility Components
// =============================================================================

function DeltaBadge({ value }: { value: number }) {
  const isPositive = value >= 0
  return (
    <span
      className={cn(
        'flex items-center gap-0.5 text-xs font-bold',
        isPositive ? 'text-neon' : 'text-magenta'
      )}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {Math.abs(value).toFixed(1)}%
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    planning: { label: 'Planning', color: 'bg-white/20 text-white/70' },
    registration: { label: 'Registration', color: 'bg-purple/20 text-purple' },
    running: { label: 'Running', color: 'bg-neon/20 text-neon' },
    completed: { label: 'Completed', color: 'bg-white/10 text-white/50' },
  }

  const { label, color } = config[status] || config.planning

  return (
    <span className={cn('px-2 py-0.5 text-[10px] font-bold uppercase', color)}>
      {label}
    </span>
  )
}
