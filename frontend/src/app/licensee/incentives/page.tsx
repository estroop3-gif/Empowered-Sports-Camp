'use client'

/**
 * Licensee Incentives Page
 *
 * Shows incentive scorecards for all staff (directors, coaches) in the territory.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import { cn } from '@/lib/utils'
import {
  Trophy,
  DollarSign,
  Loader2,
  AlertCircle,
  Users,
  Calendar,
  Star,
  TrendingUp,
  CheckCircle,
  Clock,
  ChevronRight,
} from 'lucide-react'

interface StaffIncentive {
  staff_id: string
  staff_name: string
  role: string
  sessions_this_season: number
  total_compensation: number
  pending_compensation: number
  finalized_compensation: number
  avg_csat: number | null
  avg_enrollment: number
  is_finalized: boolean
}

interface IncentiveSummary {
  total_paid: number
  total_pending: number
  staff_count: number
  avg_per_session: number
  staff: StaffIncentive[]
}

export default function LicenseeIncentivesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<IncentiveSummary | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadIncentives()
  }, [])

  async function loadIncentives() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/licensee/incentives', {
        credentials: 'include',
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load incentives')
      }

      setData(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load incentives')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

  if (loading) {
    return (
      <LmsGate featureName="incentive scorecards">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 text-neon animate-spin" />
        </div>
      </LmsGate>
    )
  }

  if (error) {
    return (
      <LmsGate featureName="incentive scorecards">
        <div>
          <PortalPageHeader
            title="Incentive Scorecards"
            description="Track staff compensation and performance metrics"
            actions={
              <Link
                href="/licensee/dashboard"
                className="px-4 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/20 transition-colors"
              >
                Back to Dashboard
              </Link>
            }
          />
          <PortalCard accent="magenta">
            <div className="flex items-center gap-4">
              <AlertCircle className="h-8 w-8 text-magenta" />
              <div>
                <h3 className="font-bold text-white">Error Loading Incentives</h3>
                <p className="text-white/50 text-sm">{error}</p>
              </div>
            </div>
          </PortalCard>
        </div>
      </LmsGate>
    )
  }

  return (
    <LmsGate featureName="incentive scorecards">
      <div>
        <PortalPageHeader
          title="Incentive Scorecards"
          description="Track staff compensation and performance metrics"
          actions={
            <Link
              href="/licensee/dashboard"
              className="px-4 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/20 transition-colors"
            >
              Back to Dashboard
            </Link>
          }
        />

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <PortalCard accent="neon">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-neon/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-neon" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(data?.total_paid || 0)}
                </div>
                <div className="text-sm text-white/50 uppercase">Total Paid</div>
              </div>
            </div>
          </PortalCard>

          <PortalCard>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-yellow-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(data?.total_pending || 0)}
                </div>
                <div className="text-sm text-white/50 uppercase">Pending</div>
              </div>
            </div>
          </PortalCard>

          <PortalCard>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-purple/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-purple" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {data?.staff_count || 0}
                </div>
                <div className="text-sm text-white/50 uppercase">Staff w/ Comp</div>
              </div>
            </div>
          </PortalCard>

          <PortalCard>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-magenta/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-magenta" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(data?.avg_per_session || 0)}
                </div>
                <div className="text-sm text-white/50 uppercase">Avg/Session</div>
              </div>
            </div>
          </PortalCard>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { value: 'all', label: 'All Staff' },
            { value: 'director', label: 'Directors' },
            { value: 'coach', label: 'Coaches' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={cn(
                'px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors',
                filter === opt.value
                  ? 'bg-neon text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Staff List */}
        <PortalCard title="Staff Compensation">
          {!data?.staff || data.staff.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No Compensation Data</h3>
              <p className="text-white/50">
                Compensation records will appear here as staff complete camp sessions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.staff
                .filter((s) => filter === 'all' || s.role.toLowerCase() === filter)
                .map((staff) => (
                  <StaffIncentiveRow key={staff.staff_id} staff={staff} />
                ))}
            </div>
          )}
        </PortalCard>

        {/* How It Works */}
        <PortalCard title="How Staff Compensation Works" className="mt-8">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-white/5">
              <h4 className="font-bold text-neon mb-2">Fixed Stipend</h4>
              <p className="text-sm text-white/50">
                Directors and coaches receive a fixed stipend for camp preparation and daily on-site work.
                This is based on their assigned compensation plan.
              </p>
            </div>
            <div className="p-4 bg-white/5">
              <h4 className="font-bold text-purple mb-2">Variable Bonuses</h4>
              <p className="text-sm text-white/50">
                Additional bonuses for enrollment targets, CSAT scores, budget efficiency,
                and guest speaker coordination. Performance drives earnings.
              </p>
            </div>
          </div>
        </PortalCard>

        {/* Info Footer */}
        <div className="mt-8 p-4 bg-white/5 border border-white/10">
          <p className="text-sm text-white/50">
            <span className="font-bold text-white">Note:</span> Pending compensation is based on current
            metrics and will be finalized after camp closeout. Contact HQ for questions about
            compensation plans or calculations.
          </p>
        </div>
      </div>
    </LmsGate>
  )
}

function StaffIncentiveRow({ staff }: { staff: StaffIncentive }) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

  return (
    <div className="p-4 bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-bold text-white">{staff.staff_name}</span>
            <span
              className={cn(
                'px-2 py-0.5 text-xs font-bold uppercase',
                staff.role === 'director'
                  ? 'bg-magenta/20 text-magenta'
                  : 'bg-purple/20 text-purple'
              )}
            >
              {staff.role}
            </span>
            {staff.is_finalized && (
              <span className="px-2 py-0.5 text-xs font-bold uppercase bg-neon/20 text-neon">
                <CheckCircle className="h-3 w-3 inline mr-1" />
                Finalized
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {staff.sessions_this_season} sessions
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {staff.avg_enrollment.toFixed(0)} avg enrollment
            </span>
            {staff.avg_csat !== null && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-400" />
                {staff.avg_csat.toFixed(1)} CSAT
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Pending */}
          {staff.pending_compensation > 0 && (
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-400">
                {formatCurrency(staff.pending_compensation)}
              </div>
              <div className="text-xs text-white/40">Pending</div>
            </div>
          )}

          {/* Finalized */}
          <div className="text-center">
            <div className="text-lg font-bold text-neon">
              {formatCurrency(staff.finalized_compensation)}
            </div>
            <div className="text-xs text-white/40">Finalized</div>
          </div>

          {/* Total */}
          <div className="text-center">
            <div className="text-xl font-bold text-white">
              {formatCurrency(staff.total_compensation)}
            </div>
            <div className="text-xs text-white/40">Total</div>
          </div>

          <ChevronRight className="h-5 w-5 text-white/30" />
        </div>
      </div>
    </div>
  )
}
