'use client'

import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { StatCard, StatCardGrid } from '@/components/ui/stat-card'
import { DataTable, TableBadge } from '@/components/ui/data-table'
import {
  Building2,
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  Crown,
  MapPin,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

/**
 * Licensor Admin Dashboard
 *
 * DESIGN NOTES:
 * - Full aggregated view across all licensees
 * - Key metrics at top with brand accent colors
 * - Licensee performance table with drill-down
 * - Recent activity feed
 * - All styled to match fierce esports brand
 *
 * This is the "HQ command center" - should feel powerful
 * but still on-brand with the Empowered Athletes aesthetic
 */

// Mock data - would come from API in production
const globalStats = {
  activeLicensees: 12,
  totalRegistrations: 2847,
  totalRevenue: 847500, // cents
  activeAthletes: 1923,
  revenueChange: 23.5,
  registrationChange: 18.2,
}

const licenseeData = [
  {
    id: '1',
    name: 'Chicago North',
    territory: 'Chicagoland North',
    status: 'active',
    registrations: 456,
    revenue: 136800,
    athletes: 312,
    upcomingCamps: 8,
  },
  {
    id: '2',
    name: 'Chicago West',
    territory: 'Chicagoland West',
    status: 'active',
    registrations: 389,
    revenue: 116700,
    athletes: 267,
    upcomingCamps: 6,
  },
  {
    id: '3',
    name: 'Austin Metro',
    territory: 'Austin Metro',
    status: 'pending',
    registrations: 0,
    revenue: 0,
    athletes: 0,
    upcomingCamps: 0,
  },
  {
    id: '4',
    name: 'Denver',
    territory: 'Denver Metro',
    status: 'active',
    registrations: 234,
    revenue: 70200,
    athletes: 156,
    upcomingCamps: 4,
  },
  {
    id: '5',
    name: 'Seattle',
    territory: 'Seattle-Tacoma',
    status: 'active',
    registrations: 567,
    revenue: 170100,
    athletes: 389,
    upcomingCamps: 10,
  },
]

const recentActivity = [
  { type: 'registration', message: 'New registration at Chicago North', time: '5 min ago' },
  { type: 'payment', message: '$299 payment received - Seattle', time: '12 min ago' },
  { type: 'licensee', message: 'Austin Metro completed onboarding', time: '1 hour ago' },
  { type: 'registration', message: '3 registrations at Denver', time: '2 hours ago' },
  { type: 'alert', message: 'Chicago West approaching capacity', time: '3 hours ago' },
]

export default function LicensorDashboard() {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  return (
    <AdminLayout
      userRole="licensor_admin"
      userName="Sarah Admin"
    >
      <PageHeader
        title="HQ Dashboard"
        description="Empowered Athletes network overview"
      />

      {/* Global Stats */}
      <StatCardGrid columns={4} className="mb-8">
        <StatCard
          label="Active Licensees"
          value={globalStats.activeLicensees}
          icon={Building2}
          accent="neon"
        />
        <StatCard
          label="Total Registrations"
          value={globalStats.totalRegistrations.toLocaleString()}
          icon={Users}
          accent="magenta"
          change={{ value: globalStats.registrationChange, type: 'increase' }}
        />
        <StatCard
          label="Platform Revenue"
          value={formatCurrency(globalStats.totalRevenue)}
          icon={DollarSign}
          accent="purple"
          change={{ value: globalStats.revenueChange, type: 'increase' }}
        />
        <StatCard
          label="Active Athletes"
          value={globalStats.activeAthletes.toLocaleString()}
          icon={Crown}
          accent="neon"
        />
      </StatCardGrid>

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
            <DataTable
              columns={[
                {
                  key: 'name',
                  label: 'Licensee',
                  sortable: true,
                  render: (_, row) => (
                    <div>
                      <div className="font-bold text-white">{row.name}</div>
                      <div className="text-xs text-white/40">{row.territory}</div>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (value) => (
                    <TableBadge
                      variant={value === 'active' ? 'success' : value === 'pending' ? 'warning' : 'default'}
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
              data={licenseeData}
              keyField="id"
              onRowClick={(row) => console.log('Navigate to licensee:', row.id)}
              accent="neon"
            />
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
            <div className="space-y-4">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`h-2 w-2 mt-2 ${
                    activity.type === 'registration' ? 'bg-neon' :
                    activity.type === 'payment' ? 'bg-purple' :
                    activity.type === 'alert' ? 'bg-magenta' :
                    'bg-white/50'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/70">{activity.message}</p>
                    <p className="text-xs text-white/30 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/admin/activity"
              className="block mt-4 text-center text-xs font-bold uppercase tracking-wider text-neon hover:text-neon/80 transition-colors"
            >
              View All Activity
            </Link>
          </ContentCard>

          {/* Revenue Share Summary */}
          <ContentCard title="Revenue Share" description="This month" accent="neon">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">Gross Revenue</span>
                <span className="font-bold text-white">$84,750</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">Licensee Share (90%)</span>
                <span className="font-bold text-white/70">$76,275</span>
              </div>
              <div className="h-[1px] bg-white/10" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-neon">HQ Revenue (10%)</span>
                <span className="font-black text-neon text-lg">$8,475</span>
              </div>
            </div>
          </ContentCard>
        </div>
      </div>
    </AdminLayout>
  )
}
