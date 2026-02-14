'use client'

import { useState, useEffect } from 'react'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { StatCard, StatCardGrid } from '@/components/ui/stat-card'
import { DataTable, TableBadge } from '@/components/ui/data-table'
import { useAuth } from '@/lib/auth/context'
import {
  Building2,
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  Crown,
  ArrowRight,
  RefreshCw,
  Loader2,
  AlertCircle,
  ShoppingBag,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Licensor Admin Dashboard
 *
 * Real-time data from the database across all licensees.
 * Shows global metrics, licensee performance, and recent activity.
 */

interface DashboardOverview {
  activeLicensees: number
  totalRegistrations: number
  totalRevenue: number
  addonRevenue: number
  activeAthletes: number
  activeCamps: number
  todayCampers: number
}

interface LicenseeItem {
  id: string
  name: string
  territory: string | null
  status: 'active' | 'suspended' | 'terminated'
  registrations: number
  revenue: number
  athletes: number
  upcomingCamps: number
  [key: string]: unknown
}

interface ActivityItem {
  type: 'registration' | 'payment' | 'licensee' | 'camp' | 'alert'
  message: string
  time: string
}

interface RevenueShare {
  grossRevenue: number
  licenseeShare: number
  hqRevenue: number
  royaltyRate: number
}

interface RegistrationDetailItem {
  id: string
  athleteName: string
  parentName: string
  parentEmail: string
  campName: string
  registrationChargeCents: number
  addonChargeCents: number
  totalChargeCents: number
  paymentStatus: string
  createdAt: string
  [key: string]: unknown
}

interface TotalRevenuePeriodData {
  grossVolume: number
  refunded: number
  transactions: number
  stripeFees: number
  netVolume: number
}

interface TotalRevenueByPeriod {
  allTime: TotalRevenuePeriodData
  thirtyDays: TotalRevenuePeriodData
  ninetyDays: TotalRevenuePeriodData
  yearToDate: TotalRevenuePeriodData
}

interface DashboardData {
  overview: DashboardOverview
  licensees: LicenseeItem[]
  recentActivity: ActivityItem[]
  revenueShare: RevenueShare
  registrationDetails: RegistrationDetailItem[]
  totalRevenueByPeriod: TotalRevenueByPeriod
  comparison: {
    revenueChange: number
    registrationChange: number
  }
}

type TimeRange = '30d' | '90d' | 'ytd'
type TotalRevenuePeriod = 'allTime' | 'thirtyDays' | 'ninetyDays' | 'yearToDate'

export default function LicensorDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [totalRevenuePeriod, setTotalRevenuePeriod] = useState<TotalRevenuePeriod>('allTime')

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  const getDateRange = (range: TimeRange): { from: Date; to: Date } => {
    const to = new Date()
    let from: Date

    switch (range) {
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

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    const { from, to } = getDateRange(timeRange)
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    })

    try {
      const response = await fetch(`/api/admin/dashboard?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setError('Unable to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [timeRange])

  const handleLicenseeClick = (row: LicenseeItem) => {
    router.push(`/admin/analytics/licensees/${row.id}`)
  }

  // Loading state
  if (loading && !data) {
    return (
      <AdminLayout userRole="hq_admin" userName={userName}>
        <PageHeader
          title="HQ Dashboard"
          description="Empowered Athletes network overview"
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-neon" />
        </div>
      </AdminLayout>
    )
  }

  // Error state
  if (error && !data) {
    return (
      <AdminLayout userRole="hq_admin" userName={userName}>
        <PageHeader
          title="HQ Dashboard"
          description="Empowered Athletes network overview"
        />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="h-12 w-12 text-magenta mb-4" />
          <p className="text-white/70 mb-4">{error}</p>
          <Button variant="outline-neon" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </AdminLayout>
    )
  }

  // Use data or empty defaults
  const overview = data?.overview || {
    activeLicensees: 0,
    totalRegistrations: 0,
    totalRevenue: 0,
    addonRevenue: 0,
    activeAthletes: 0,
    activeCamps: 0,
    todayCampers: 0,
  }

  const licensees = data?.licensees || []
  const registrationDetails = data?.registrationDetails || []
  const recentActivity = data?.recentActivity || []
  const revenueShare = data?.revenueShare || {
    grossRevenue: 0,
    licenseeShare: 0,
    hqRevenue: 0,
    royaltyRate: 0.1,
  }
  const emptyPeriod: TotalRevenuePeriodData = { grossVolume: 0, refunded: 0, transactions: 0, stripeFees: 0, netVolume: 0 }
  const totalRevenueByPeriod = data?.totalRevenueByPeriod || {
    allTime: emptyPeriod,
    thirtyDays: emptyPeriod,
    ninetyDays: emptyPeriod,
    yearToDate: emptyPeriod,
  }
  const comparison = data?.comparison || {
    revenueChange: 0,
    registrationChange: 0,
  }

  const totalRevenuePeriodLabels: Record<TotalRevenuePeriod, string> = {
    allTime: 'All Time',
    thirtyDays: '30 Days',
    ninetyDays: '90 Days',
    yearToDate: 'YTD',
  }

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <PageHeader
        title="HQ Dashboard"
        description="Empowered Athletes network overview"
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
        </div>
      </PageHeader>

      {/* Time Range Selector */}
      <div className="mb-6">
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
              {range === 'ytd' ? 'YTD' : range}
            </button>
          ))}
        </div>
      </div>

      {/* Global Stats */}
      <StatCardGrid columns={5} className="mb-8">
        <StatCard
          label="Active Licensees"
          value={overview.activeLicensees}
          icon={Building2}
          accent="neon"
        />
        <StatCard
          label="Total Registrations"
          value={overview.totalRegistrations.toLocaleString()}
          icon={Users}
          accent="magenta"
          change={
            comparison.registrationChange !== 0
              ? {
                  value: Math.abs(comparison.registrationChange),
                  type: comparison.registrationChange >= 0 ? 'increase' : 'decrease',
                }
              : undefined
          }
        />
        <StatCard
          label="Registration Revenue"
          value={formatCurrency(overview.totalRevenue)}
          icon={DollarSign}
          accent="purple"
          change={
            comparison.revenueChange !== 0
              ? {
                  value: Math.abs(comparison.revenueChange),
                  type: comparison.revenueChange >= 0 ? 'increase' : 'decrease',
                }
              : undefined
          }
        />
        <StatCard
          label="Add-On Revenue"
          value={formatCurrency(overview.addonRevenue)}
          icon={ShoppingBag}
          accent="magenta"
        />
        <StatCard
          label="Active Athletes"
          value={overview.activeAthletes.toLocaleString()}
          icon={Crown}
          accent="neon"
        />
      </StatCardGrid>

      {/* Total Revenue Card */}
      <div className="mb-8">
        <ContentCard
          title="Total Revenue"
          description={totalRevenuePeriodLabels[totalRevenuePeriod]}
          action={
            <div className="inline-flex items-center gap-1 bg-black/50 border border-white/10 p-0.5">
              {(
                [
                  ['allTime', 'All Time'],
                  ['thirtyDays', '30d'],
                  ['ninetyDays', '90d'],
                  ['yearToDate', 'YTD'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTotalRevenuePeriod(key)}
                  className={cn(
                    'px-2.5 py-1 text-xs font-bold uppercase tracking-wider transition-colors',
                    totalRevenuePeriod === key
                      ? 'bg-neon text-black'
                      : 'text-white/50 hover:text-white'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        >
          {(() => {
            const period = totalRevenueByPeriod[totalRevenuePeriod]
            return (
              <div className="py-2 space-y-4">
                <div className="grid grid-cols-4 gap-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1">Gross Volume</p>
                    <span className="text-2xl font-black text-white">
                      {formatCurrency(period.grossVolume)}
                    </span>
                    <p className="text-xs text-white/30 mt-0.5">
                      {period.transactions.toLocaleString()} transaction{period.transactions !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1">Refunds</p>
                    <span className="text-2xl font-black text-magenta">
                      {period.refunded > 0 ? `-${formatCurrency(period.refunded)}` : '$0'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1">Est. Stripe Fees</p>
                    <span className="text-2xl font-black text-magenta">
                      -{formatCurrency(period.stripeFees)}
                    </span>
                    <p className="text-xs text-white/30 mt-0.5">2.9% + $0.30/txn</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1">Est. Net Volume</p>
                    <span className="text-2xl font-black text-neon">
                      {formatCurrency(period.netVolume)}
                    </span>
                    <p className="text-xs text-white/30 mt-0.5">After fees &amp; refunds</p>
                  </div>
                </div>
                <p className="text-xs text-white/30">
                  Estimates based on standard Stripe rate (2.9% + $0.30). Check your Stripe dashboard for exact amounts. Payouts may differ due to Stripe&apos;s payout schedule.
                </p>
              </div>
            )
          })()}
        </ContentCard>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Licensee Performance Table */}
        <div className="lg:col-span-2">
          <ContentCard
            title="Licensee Performance"
            description="All active territories"
            action={
              <Link
                href="/admin/licensees"
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neon hover:text-neon/80 transition-colors"
              >
                View All
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          >
            {licensees.length === 0 ? (
              <div className="py-8 text-center text-white/50">
                No licensee data available yet
              </div>
            ) : (
              <DataTable<LicenseeItem>
                columns={[
                  {
                    key: 'name',
                    label: 'Licensee',
                    sortable: true,
                    render: (_, row: LicenseeItem) => (
                      <div>
                        <div className="font-bold text-white">{row.name}</div>
                        <div className="text-xs text-white/40">{row.territory || 'No territory'}</div>
                      </div>
                    ),
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (value) => (
                      <TableBadge
                        variant={value === 'active' ? 'success' : value === 'suspended' ? 'warning' : 'default'}
                      >
                        {String(value)}
                      </TableBadge>
                    ),
                  },
                  {
                    key: 'registrations',
                    label: 'Registrations',
                    sortable: true,
                    align: 'right',
                    render: (value) => (
                      <span className="font-bold text-white">{Number(value).toLocaleString()}</span>
                    ),
                  },
                  {
                    key: 'revenue',
                    label: 'Revenue',
                    sortable: true,
                    align: 'right',
                    render: (value) => (
                      <span className="font-bold text-neon">{formatCurrency(Number(value))}</span>
                    ),
                  },
                  {
                    key: 'upcomingCamps',
                    label: 'Upcoming',
                    align: 'center',
                    render: (value) => (
                      <span className="text-white/70">{String(value)} camps</span>
                    ),
                  },
                ]}
                data={licensees}
                keyField="id"
                onRowClick={handleLicenseeClick}
                accent="neon"
              />
            )}
          </ContentCard>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-8">
          {/* Quick Actions */}
          <ContentCard title="Quick Actions" accent="magenta">
            <div className="space-y-3">
              <Link
                href="/admin/licensees/new"
                className="flex items-center gap-3 p-3 bg-black/50 border border-white/10 hover:border-neon/30 hover:bg-neon/5 transition-all group"
              >
                <div className="h-10 w-10 bg-neon/10 border border-neon/30 flex items-center justify-center group-hover:bg-neon/20 transition-colors">
                  <Building2 className="h-5 w-5 text-neon" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Add Licensee</div>
                  <div className="text-xs text-white/40">Onboard new territory</div>
                </div>
              </Link>
              <Link
                href="/admin/curriculum"
                className="flex items-center gap-3 p-3 bg-black/50 border border-white/10 hover:border-magenta/30 hover:bg-magenta/5 transition-all group"
              >
                <div className="h-10 w-10 bg-magenta/10 border border-magenta/30 flex items-center justify-center group-hover:bg-magenta/20 transition-colors">
                  <Calendar className="h-5 w-5 text-magenta" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Manage Curriculum</div>
                  <div className="text-xs text-white/40">Update programs</div>
                </div>
              </Link>
              <Link
                href="/admin/analytics"
                className="flex items-center gap-3 p-3 bg-black/50 border border-white/10 hover:border-purple/30 hover:bg-purple/5 transition-all group"
              >
                <div className="h-10 w-10 bg-purple/10 border border-purple/30 flex items-center justify-center group-hover:bg-purple/20 transition-colors">
                  <TrendingUp className="h-5 w-5 text-purple" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">View Analytics</div>
                  <div className="text-xs text-white/40">Network insights</div>
                </div>
              </Link>
            </div>
          </ContentCard>

          {/* Recent Activity */}
          <ContentCard title="Recent Activity" accent="purple">
            {recentActivity.length === 0 ? (
              <div className="py-4 text-center text-white/50 text-sm">
                No recent activity
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className={`h-2 w-2 mt-2 ${
                        activity.type === 'registration'
                          ? 'bg-neon'
                          : activity.type === 'payment'
                          ? 'bg-purple'
                          : activity.type === 'alert'
                          ? 'bg-magenta'
                          : activity.type === 'camp'
                          ? 'bg-cyan-400'
                          : 'bg-white/50'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/70">{activity.message}</p>
                      <p className="text-xs text-white/30 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ContentCard>

          {/* Revenue Share Summary */}
          <ContentCard title="Revenue Share" description="This month" accent="neon">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">Gross Revenue</span>
                <span className="font-bold text-white">
                  {formatCurrency(revenueShare.grossRevenue)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">
                  Licensee Share ({Math.round((1 - revenueShare.royaltyRate) * 100)}%)
                </span>
                <span className="font-bold text-white/70">
                  {formatCurrency(revenueShare.licenseeShare)}
                </span>
              </div>
              <div className="h-[1px] bg-white/10" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-neon">
                  HQ Revenue ({Math.round(revenueShare.royaltyRate * 100)}%)
                </span>
                <span className="font-black text-neon text-lg">
                  {formatCurrency(revenueShare.hqRevenue)}
                </span>
              </div>
            </div>
          </ContentCard>
        </div>
      </div>

      {/* Recent Registrations */}
      <div className="mt-8">
        <ContentCard
          title="Recent Registrations"
          description="Latest 20 registrations across all licensees"
        >
          {registrationDetails.length === 0 ? (
            <div className="py-8 text-center text-white/50">
              No registrations in this period
            </div>
          ) : (
            <DataTable<RegistrationDetailItem>
              columns={[
                {
                  key: 'athleteName',
                  label: 'Athlete',
                  sortable: true,
                  render: (value) => (
                    <span className="font-bold text-white">{String(value)}</span>
                  ),
                },
                {
                  key: 'parentName',
                  label: 'Parent',
                  render: (_, row: RegistrationDetailItem) => (
                    <div>
                      <div className="text-white">{row.parentName}</div>
                      <div className="text-xs text-white/40">{row.parentEmail}</div>
                    </div>
                  ),
                },
                {
                  key: 'campName',
                  label: 'Camp',
                  sortable: true,
                  render: (value) => (
                    <span className="text-white/70">{String(value)}</span>
                  ),
                },
                {
                  key: 'registrationChargeCents',
                  label: 'Registration',
                  align: 'right',
                  sortable: true,
                  render: (value) => (
                    <span className="text-white">{formatCurrency(Number(value))}</span>
                  ),
                },
                {
                  key: 'addonChargeCents',
                  label: 'Add-Ons',
                  align: 'right',
                  render: (value) => (
                    <span className="text-white/70">
                      {Number(value) > 0 ? formatCurrency(Number(value)) : '\u2014'}
                    </span>
                  ),
                },
                {
                  key: 'totalChargeCents',
                  label: 'Total',
                  align: 'right',
                  sortable: true,
                  render: (value) => (
                    <span className="font-bold text-neon">{formatCurrency(Number(value))}</span>
                  ),
                },
                {
                  key: 'paymentStatus',
                  label: 'Payment',
                  render: (value) => (
                    <TableBadge
                      variant={
                        value === 'paid'
                          ? 'success'
                          : value === 'pending'
                          ? 'warning'
                          : value === 'refunded'
                          ? 'danger'
                          : value === 'failed'
                          ? 'danger'
                          : 'default'
                      }
                    >
                      {String(value)}
                    </TableBadge>
                  ),
                },
              ]}
              data={registrationDetails}
              keyField="id"
              accent="neon"
            />
          )}
        </ContentCard>
      </div>
    </AdminLayout>
  )
}
