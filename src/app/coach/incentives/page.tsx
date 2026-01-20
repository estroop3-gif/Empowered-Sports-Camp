'use client'

/**
 * Coach Incentives Page
 *
 * Shows the coach's compensation and incentive earnings.
 */

import { useState, useEffect } from 'react'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import { cn } from '@/lib/utils'
import {
  DollarSign,
  Trophy,
  Calendar,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
} from 'lucide-react'
import type { CoachIncentiveSnapshot } from '@/lib/services/coach-dashboard'

export default function CoachIncentivesPage() {
  const [loading, setLoading] = useState(true)
  const [snapshot, setSnapshot] = useState<CoachIncentiveSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadIncentives()
  }, [])

  async function loadIncentives() {
    try {
      const res = await fetch('/api/coach/incentives')
      const json = await res.json()

      if (!res.ok) throw new Error(json.error || 'Failed to load incentives')

      setSnapshot(json.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load incentives')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: number) => `$${val.toFixed(2)}`

  return (
    <div>
      <PortalPageHeader
        title="Incentives & Compensation"
        description="Track your earnings across camp sessions"
      />

      <LmsGate variant="card" featureName="incentives">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-magenta animate-spin" />
          </div>
        ) : error ? (
          <PortalCard>
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
              <p className="text-white/50">{error}</p>
              <button
                onClick={loadIncentives}
                className="mt-4 px-4 py-2 bg-magenta text-white font-bold uppercase text-sm"
              >
                Retry
              </button>
            </div>
          </PortalCard>
        ) : snapshot ? (
          <div className="space-y-8">
            {/* Overview Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <PortalCard accent="neon">
                <div className="text-center">
                  <div className="h-12 w-12 bg-neon/20 flex items-center justify-center mx-auto mb-3">
                    <DollarSign className="h-6 w-6 text-neon" />
                  </div>
                  <div className="text-3xl font-bold text-neon">
                    {formatCurrency(snapshot.total_compensation)}
                  </div>
                  <div className="text-xs text-white/50 uppercase mt-1">Total Earned</div>
                </div>
              </PortalCard>

              <PortalCard>
                <div className="text-center">
                  <div className="h-12 w-12 bg-white/10 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="h-6 w-6 text-white/60" />
                  </div>
                  <div className="text-3xl font-bold text-white">
                    {snapshot.total_sessions}
                  </div>
                  <div className="text-xs text-white/50 uppercase mt-1">Sessions</div>
                </div>
              </PortalCard>

              <PortalCard>
                <div className="text-center">
                  <div className="h-12 w-12 bg-blue-400/20 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="text-3xl font-bold text-blue-400">
                    {formatCurrency(snapshot.finalized_compensation)}
                  </div>
                  <div className="text-xs text-white/50 uppercase mt-1">Finalized</div>
                </div>
              </PortalCard>

              <PortalCard>
                <div className="text-center">
                  <div className="h-12 w-12 bg-yellow-500/20 flex items-center justify-center mx-auto mb-3">
                    <Clock className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div className="text-3xl font-bold text-yellow-400">
                    {formatCurrency(snapshot.pending_compensation)}
                  </div>
                  <div className="text-xs text-white/50 uppercase mt-1">Pending</div>
                </div>
              </PortalCard>
            </div>

            {/* Current Camp */}
            {snapshot.current_camp && (
              <PortalCard title="Current Camp" accent="neon">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {snapshot.current_camp.camp_name}
                    </h3>
                    <p className="text-sm text-white/50">
                      {snapshot.current_camp.plan_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-400">
                      {formatCurrency(snapshot.current_camp.total)}
                    </div>
                    <div className="text-xs text-white/40 uppercase">Projected</div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="p-3 bg-white/5">
                    <div className="text-xs text-white/40 uppercase mb-1">Fixed Stipend</div>
                    <div className="font-bold text-white">
                      {formatCurrency(snapshot.current_camp.fixed_stipend)}
                    </div>
                  </div>
                  <div className="p-3 bg-white/5">
                    <div className="text-xs text-white/40 uppercase mb-1">Variable Bonus</div>
                    <div className="font-bold text-neon">
                      {formatCurrency(snapshot.current_camp.variable_bonus)}
                    </div>
                  </div>
                </div>

                {!snapshot.current_camp.is_finalized && (
                  <div className="mt-4 p-2 bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-400">
                    Final compensation will be calculated after camp completion
                  </div>
                )}
              </PortalCard>
            )}

            {/* Recent Camps */}
            <PortalCard title="Camp History">
              {snapshot.recent_camps.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/50">No camp history yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {snapshot.recent_camps.map((camp) => (
                    <div
                      key={camp.camp_id}
                      className="flex items-center justify-between p-4 bg-white/5 border border-white/10"
                    >
                      <div>
                        <div className="font-bold text-white">{camp.camp_name}</div>
                        <div className="flex items-center gap-3 text-sm text-white/50 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {camp.camp_dates}
                          </span>
                          <span>{camp.plan_name}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          'text-lg font-bold',
                          camp.is_finalized ? 'text-neon' : 'text-yellow-400'
                        )}>
                          {formatCurrency(camp.total)}
                        </div>
                        <div className="flex items-center justify-end gap-1 text-xs">
                          {camp.is_finalized ? (
                            <>
                              <CheckCircle className="h-3 w-3 text-neon" />
                              <span className="text-neon">Finalized</span>
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 text-yellow-400" />
                              <span className="text-yellow-400">Pending</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PortalCard>
          </div>
        ) : null}
      </LmsGate>
    </div>
  )
}
