'use client'

/**
 * Licensee Sales Report Page (Shell)
 *
 * Detailed sales analytics for the territory.
 */

import { useState } from 'react'
import Link from 'next/link'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Users,
  BarChart3,
  ChevronRight,
} from 'lucide-react'

export default function LicenseeSalesReportPage() {
  const [period, setPeriod] = useState('season')

  return (
    <LmsGate featureName="sales reports">
      <div>
        <PortalPageHeader
          title="Sales Report"
          description="Detailed sales and revenue analytics"
          actions={
            <Link
              href="/licensee/dashboard"
              className="px-4 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/20 transition-colors"
            >
              Back to Dashboard
            </Link>
          }
        />

        {/* Period Selector */}
        <div className="flex items-center gap-4 mb-8">
          <span className="text-sm text-white/50 uppercase tracking-wider">Period:</span>
          <div className="flex gap-2">
            {['last_30_days', 'season', 'ytd', 'all_time'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${
                  period === p
                    ? 'bg-neon text-black'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {p === 'last_30_days'
                  ? '30 Days'
                  : p === 'ytd'
                  ? 'YTD'
                  : p === 'all_time'
                  ? 'All Time'
                  : 'Season'}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <PortalCard accent="neon">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-neon/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-neon" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">$0</div>
                <div className="text-sm text-white/50 uppercase">Gross Revenue</div>
              </div>
            </div>
          </PortalCard>

          <PortalCard>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-purple/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">0</div>
                <div className="text-sm text-white/50 uppercase">Sessions</div>
              </div>
            </div>
          </PortalCard>

          <PortalCard>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-magenta/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-magenta" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">0</div>
                <div className="text-sm text-white/50 uppercase">Total Campers</div>
              </div>
            </div>
          </PortalCard>

          <PortalCard>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-yellow-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">$0</div>
                <div className="text-sm text-white/50 uppercase">Avg Revenue/Camper</div>
              </div>
            </div>
          </PortalCard>
        </div>

        {/* Chart Placeholder */}
        <PortalCard title="Revenue Trend">
          <div className="h-64 flex items-center justify-center bg-white/5">
            <div className="text-center">
              <BarChart3 className="h-16 w-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/50">Revenue chart coming soon</p>
              <p className="text-xs text-white/30 mt-2">
                Historical revenue data will be displayed here
              </p>
            </div>
          </div>
        </PortalCard>

        {/* Quick Links */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link
            href="/licensee/reports/royalties"
            className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
          >
            <DollarSign className="h-6 w-6 text-purple" />
            <div>
              <div className="font-bold text-white">Royalty Reports</div>
              <div className="text-sm text-white/50">View royalty calculations and closeouts</div>
            </div>
            <ChevronRight className="h-5 w-5 text-white/30 ml-auto" />
          </Link>

          <Link
            href="/licensee/reports/quality"
            className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
          >
            <TrendingUp className="h-6 w-6 text-neon" />
            <div>
              <div className="font-bold text-white">Quality Reports</div>
              <div className="text-sm text-white/50">CSAT, complaints, and compliance</div>
            </div>
            <ChevronRight className="h-5 w-5 text-white/30 ml-auto" />
          </Link>
        </div>
      </div>
    </LmsGate>
  )
}
