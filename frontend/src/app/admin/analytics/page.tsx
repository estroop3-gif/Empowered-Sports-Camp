'use client'

import { useState } from 'react'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Global Analytics Page
 *
 * HQ Admin view of system-wide metrics and trends
 */

// Placeholder stat card component
function StatCard({
  label,
  value,
  change,
  changeType,
  icon: Icon,
  accent = 'neon',
}: {
  label: string
  value: string
  change?: string
  changeType?: 'up' | 'down' | 'neutral'
  icon: React.ElementType
  accent?: 'neon' | 'magenta' | 'purple'
}) {
  const accentColors = {
    neon: 'text-neon bg-neon/10 border-neon/30',
    magenta: 'text-magenta bg-magenta/10 border-magenta/30',
    purple: 'text-purple bg-purple/10 border-purple/30',
  }

  return (
    <div className="bg-dark-100 border border-white/10 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">{label}</p>
          <p className="mt-2 text-3xl font-black text-white">{value}</p>
          {change && (
            <div className="mt-2 flex items-center gap-1">
              {changeType === 'up' && <ArrowUpRight className="h-4 w-4 text-neon" />}
              {changeType === 'down' && <ArrowDownRight className="h-4 w-4 text-red-400" />}
              <span className={cn(
                'text-xs font-bold',
                changeType === 'up' && 'text-neon',
                changeType === 'down' && 'text-red-400',
                changeType === 'neutral' && 'text-white/40'
              )}>
                {change}
              </span>
            </div>
          )}
        </div>
        <div className={cn('h-12 w-12 flex items-center justify-center border', accentColors[accent])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}

export default function GlobalAnalyticsPage() {
  const { user } = useAuth()
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'ytd'>('30d')

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  return (
    <AdminLayout
      userRole="hq_admin"
      userName={userName}
    >
      <PageHeader
        title="Global Analytics"
        description="System-wide metrics and performance insights"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Analytics' },
        ]}
      >
        {/* Time range selector */}
        <div className="flex items-center gap-1 bg-black/50 border border-white/10 p-1">
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
      </PageHeader>

      {/* Key Metrics */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          label="Total Revenue"
          value="$0"
          change="No data yet"
          changeType="neutral"
          icon={DollarSign}
          accent="neon"
        />
        <StatCard
          label="Total Registrations"
          value="0"
          change="No data yet"
          changeType="neutral"
          icon={Users}
          accent="magenta"
        />
        <StatCard
          label="Active Camps"
          value="0"
          change="No data yet"
          changeType="neutral"
          icon={Calendar}
          accent="purple"
        />
        <StatCard
          label="Active Licensees"
          value="0"
          change="No data yet"
          changeType="neutral"
          icon={MapPin}
          accent="neon"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Revenue Chart Placeholder */}
        <ContentCard title="Revenue Over Time" accent="neon">
          <div className="h-64 flex items-center justify-center border border-dashed border-white/10">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/40">Revenue chart will appear here</p>
              <p className="text-xs text-white/20 mt-1">Once registration data is available</p>
            </div>
          </div>
        </ContentCard>

        {/* Registrations Chart Placeholder */}
        <ContentCard title="Registrations Trend" accent="magenta">
          <div className="h-64 flex items-center justify-center border border-dashed border-white/10">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/40">Registration trends will appear here</p>
              <p className="text-xs text-white/20 mt-1">Once registration data is available</p>
            </div>
          </div>
        </ContentCard>

        {/* Top Licensees */}
        <ContentCard title="Top Performing Licensees" accent="purple">
          <div className="space-y-3">
            <div className="text-center py-8">
              <MapPin className="h-8 w-8 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/40">No licensee data yet</p>
              <p className="text-xs text-white/20 mt-1">Top performers will be listed here</p>
            </div>
          </div>
        </ContentCard>

        {/* Recent Activity */}
        <ContentCard title="Recent Activity" accent="neon">
          <div className="space-y-3">
            <div className="text-center py-8">
              <Calendar className="h-8 w-8 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/40">No recent activity</p>
              <p className="text-xs text-white/20 mt-1">Recent events will appear here</p>
            </div>
          </div>
        </ContentCard>
      </div>

      {/* Geographic Distribution */}
      <div className="mt-8">
        <ContentCard title="Geographic Distribution" accent="magenta">
          <div className="h-64 flex items-center justify-center border border-dashed border-white/10">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/40">Geographic map will appear here</p>
              <p className="text-xs text-white/20 mt-1">Showing camp and registration distribution</p>
            </div>
          </div>
        </ContentCard>
      </div>
    </AdminLayout>
  )
}
