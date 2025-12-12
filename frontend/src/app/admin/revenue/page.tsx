'use client'

import { useState } from 'react'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Receipt,
  Download,
  Filter,
  Calendar,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Revenue Page
 *
 * HQ Admin view of system-wide revenue and financial metrics
 */

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

export default function RevenuePage() {
  const { user } = useAuth()
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'ytd'>('30d')

  const userName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Admin'

  return (
    <AdminLayout
      userRole="hq_admin"
      userName={userName}
    >
      <PageHeader
        title="Revenue"
        description="Financial overview and transaction history"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Revenue' },
        ]}
      >
        <div className="flex items-center gap-3">
          <Button variant="outline-neon" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline-neon" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
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
          label="Royalties Collected"
          value="$0"
          change="No data yet"
          changeType="neutral"
          icon={TrendingUp}
          accent="magenta"
        />
        <StatCard
          label="Pending Payments"
          value="$0"
          change="No data yet"
          changeType="neutral"
          icon={CreditCard}
          accent="purple"
        />
        <StatCard
          label="Refunds Issued"
          value="$0"
          change="No data yet"
          changeType="neutral"
          icon={Receipt}
          accent="neon"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Revenue Chart */}
        <ContentCard title="Revenue Over Time" accent="neon">
          <div className="h-64 flex items-center justify-center border border-dashed border-white/10">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/40">Revenue chart will appear here</p>
              <p className="text-xs text-white/20 mt-1">Once transaction data is available</p>
            </div>
          </div>
        </ContentCard>

        {/* Revenue by Licensee */}
        <ContentCard title="Revenue by Licensee" accent="magenta">
          <div className="h-64 flex items-center justify-center border border-dashed border-white/10">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/40">Licensee breakdown will appear here</p>
              <p className="text-xs text-white/20 mt-1">Once licensee data is available</p>
            </div>
          </div>
        </ContentCard>
      </div>

      {/* Recent Transactions */}
      <div className="mt-8">
        <ContentCard title="Recent Transactions" accent="purple">
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 text-white/20 mx-auto mb-3" />
            <p className="text-lg font-bold text-white/60">No Transactions Yet</p>
            <p className="text-sm text-white/40 mt-1">
              Transaction history will appear here once payments are processed
            </p>
          </div>
        </ContentCard>
      </div>
    </AdminLayout>
  )
}
