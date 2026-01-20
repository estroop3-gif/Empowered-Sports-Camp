'use client'

/**
 * Director Incentive Scorecards Page
 *
 * Comprehensive view of the director's compensation history across all camps.
 * Shows:
 * - Summary stats (total earned, pending, finalized)
 * - Camp-by-camp breakdown with plan details
 * - KPI metrics (CSAT, enrollment)
 *
 * Directors can only see their own compensation data.
 * No access to licensee-wide or system-wide financial metrics.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import { cn } from '@/lib/utils'
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronRight,
  Trophy,
  Users,
  Star,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import type { DirectorIncentiveSnapshot } from '@/lib/services/director-dashboard'

export default function DirectorIncentivesPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<DirectorIncentiveSnapshot | null>(null)

  useEffect(() => {
    loadIncentives()
  }, [])

  async function loadIncentives() {
    try {
      const res = await fetch('/api/director/dashboard')
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load data')
      }

      setSnapshot(json.data?.incentive_snapshot || null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load compensation data')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: number) => `$${val.toFixed(2)}`

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
        <PortalPageHeader
          title="My Compensation"
          description="Track your earnings across all camp sessions"
        />
        <PortalCard>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Error Loading Data</h3>
            <p className="text-white/50 mb-4">{error}</p>
            <button
              onClick={loadIncentives}
              className="px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </PortalCard>
      </LmsGate>
    )
  }

  return (
    <LmsGate featureName="incentive scorecards">
      <div>
        <PortalPageHeader
          title="My Compensation"
          description="Track your earnings and performance across all camp sessions"
          actions={
            <Link
              href="/director"
              className="px-4 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/20 transition-colors"
            >
              Back to Dashboard
            </Link>
          }
        />

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <PortalCard accent="neon">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-neon/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-neon" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(snapshot?.total_compensation || 0)}
                </div>
                <div className="text-sm text-white/50 uppercase">Total Earned</div>
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
                  {formatCurrency(snapshot?.pending_compensation || 0)}
                </div>
                <div className="text-sm text-white/50 uppercase">Pending</div>
              </div>
            </div>
          </PortalCard>

          <PortalCard>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-purple/20 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-purple" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(snapshot?.finalized_compensation || 0)}
                </div>
                <div className="text-sm text-white/50 uppercase">Finalized</div>
              </div>
            </div>
          </PortalCard>

          <PortalCard>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-magenta/20 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-magenta" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {snapshot?.total_sessions || 0}
                </div>
                <div className="text-sm text-white/50 uppercase">Sessions</div>
              </div>
            </div>
          </PortalCard>
        </div>

        {/* Performance Metrics */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <PortalCard title="Performance Metrics">
            <div className="space-y-4">
              {/* Average CSAT */}
              <div className="flex items-center justify-between p-3 bg-white/5">
                <div className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-yellow-400" />
                  <span className="text-white/70">Average CSAT Score</span>
                </div>
                <div className="text-right">
                  {snapshot?.avg_csat_score != null ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-white">
                        {snapshot.avg_csat_score.toFixed(1)}
                      </span>
                      <span className="text-sm text-white/40">/ 5.0</span>
                    </div>
                  ) : (
                    <span className="text-white/40">No data</span>
                  )}
                </div>
              </div>

              {/* Average Enrollment */}
              <div className="flex items-center justify-between p-3 bg-white/5">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-purple" />
                  <span className="text-white/70">Average Enrollment</span>
                </div>
                <div className="text-right">
                  {snapshot?.avg_enrollment != null ? (
                    <span className="text-xl font-bold text-white">
                      {Math.round(snapshot.avg_enrollment)} campers
                    </span>
                  ) : (
                    <span className="text-white/40">No data</span>
                  )}
                </div>
              </div>

              {/* Total Sessions */}
              <div className="flex items-center justify-between p-3 bg-white/5">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-neon" />
                  <span className="text-white/70">Total Sessions Directed</span>
                </div>
                <span className="text-xl font-bold text-white">
                  {snapshot?.total_sessions || 0}
                </span>
              </div>
            </div>
          </PortalCard>

          {/* Compensation Breakdown */}
          <PortalCard title="How It Works">
            <div className="space-y-4 text-sm">
              <div className="p-3 bg-white/5">
                <div className="flex items-center gap-2 text-neon font-bold mb-1">
                  <Target className="h-4 w-4" />
                  Fixed Stipend
                </div>
                <p className="text-white/50">
                  Pre-camp preparation + on-site daily rate based on your compensation plan.
                </p>
              </div>

              <div className="p-3 bg-white/5">
                <div className="flex items-center gap-2 text-purple font-bold mb-1">
                  <TrendingUp className="h-4 w-4" />
                  Variable Bonuses
                </div>
                <p className="text-white/50">
                  Enrollment bonus, CSAT bonus, budget efficiency, and guest speaker bonuses.
                </p>
              </div>

              <div className="p-3 bg-neon/10 border border-neon/30">
                <p className="text-neon text-xs uppercase font-bold">
                  Total = Fixed Stipend + Variable Bonuses
                </p>
              </div>
            </div>
          </PortalCard>
        </div>

        {/* Camp Compensation History */}
        <PortalCard title="Camp Compensation History">
          {!snapshot?.camps || snapshot.camps.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No Compensation Records</h3>
              <p className="text-white/50">
                Compensation records will appear here after you complete camp sessions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {snapshot.camps.map((camp) => (
                <div
                  key={camp.camp_id}
                  className="p-4 bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-white">{camp.camp_name}</span>
                        <span
                          className={cn(
                            'px-2 py-0.5 text-xs font-bold uppercase',
                            camp.is_finalized
                              ? 'bg-neon/20 text-neon'
                              : 'bg-yellow-500/20 text-yellow-400'
                          )}
                        >
                          {camp.is_finalized ? 'Finalized' : 'Pending'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {camp.camp_dates}
                        </span>
                        <span>{camp.plan_name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Breakdown */}
                      <div className="text-right hidden sm:block">
                        <div className="text-xs text-white/40">
                          {formatCurrency(camp.fixed_stipend)} stipend + {formatCurrency(camp.variable_bonus)} bonus
                        </div>
                      </div>

                      {/* Total */}
                      <div className="text-right">
                        <div className="text-xl font-bold text-neon">
                          {formatCurrency(camp.total)}
                        </div>
                        <div className="text-xs text-white/40">Total</div>
                      </div>

                      {/* Link to Camp HQ */}
                      <Link
                        href={`/director/camps/${camp.camp_id}/hq?tab=incentives`}
                        className="p-2 bg-white/10 text-white hover:bg-white/20 transition-colors"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PortalCard>

        {/* Info Footer */}
        <div className="mt-8 p-4 bg-white/5 border border-white/10">
          <p className="text-sm text-white/50">
            <span className="font-bold text-white">Note:</span> Compensation is calculated based on your assigned plan for each camp session.
            Pending amounts are estimates until the camp is finalized by the licensee.
            Contact your licensee owner if you have questions about your compensation.
          </p>
        </div>
      </div>
    </LmsGate>
  )
}
