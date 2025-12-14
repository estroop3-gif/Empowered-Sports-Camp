'use client'

/**
 * Director Incentive Scorecards Page
 *
 * Director view of their own compensation history across camps.
 */

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { PortalCard } from '@/components/portal'
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
} from 'lucide-react'

interface CampCompensation {
  camp_id: string
  camp_name: string
  camp_dates: string
  plan_name: string
  fixed_stipend: number
  variable_bonus: number
  total: number
  is_finalized: boolean
  calculated_at: string | null
}

interface DirectorOverview {
  total_earned: number
  pending_amount: number
  finalized_amount: number
  camps: CampCompensation[]
}

export default function DirectorScorecardsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<DirectorOverview | null>(null)

  useEffect(() => {
    async function loadOverview() {
      try {
        const res = await fetch('/api/incentives/overview')
        const json = await res.json()

        if (res.ok && json.data) {
          setOverview(json.data)
        } else {
          setError(json.error || 'Failed to load data')
        }
      } catch (err) {
        setError('Failed to load compensation data')
      } finally {
        setLoading(false)
      }
    }
    loadOverview()
  }, [])

  const formatCurrency = (val: number) => `$${val.toFixed(2)}`

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-black text-white uppercase tracking-wider mb-8">
            My Compensation
          </h1>
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-12 w-12 text-neon animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-black text-white uppercase tracking-wider mb-8">
            My Compensation
          </h1>
          <PortalCard>
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Error</h3>
              <p className="text-white/50">{error}</p>
            </div>
          </PortalCard>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black text-white uppercase tracking-wider mb-2">
          My Compensation
        </h1>
        <p className="text-white/50 mb-8">
          Track your earnings across all camp sessions
        </p>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <PortalCard>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-neon/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-neon" />
              </div>
              <div>
                <div className="text-3xl font-bold text-white">
                  {formatCurrency(overview?.total_earned || 0)}
                </div>
                <div className="text-sm text-white/50 uppercase">Total Earned</div>
              </div>
            </div>
          </PortalCard>

          <PortalCard>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-yellow-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-white">
                  {formatCurrency(overview?.pending_amount || 0)}
                </div>
                <div className="text-sm text-white/50 uppercase">Pending</div>
              </div>
            </div>
          </PortalCard>

          <PortalCard>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-neon/20 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-neon" />
              </div>
              <div>
                <div className="text-3xl font-bold text-white">
                  {formatCurrency(overview?.finalized_amount || 0)}
                </div>
                <div className="text-sm text-white/50 uppercase">Finalized</div>
              </div>
            </div>
          </PortalCard>
        </div>

        {/* Camp History */}
        <PortalCard title="Camp Compensation History">
          {!overview?.camps || overview.camps.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              No compensation records yet
            </div>
          ) : (
            <div className="space-y-3">
              {overview.camps.map((camp) => (
                <div
                  key={camp.camp_id}
                  className="p-4 bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
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
                      <div className="flex items-center gap-4 text-sm text-white/50">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {camp.camp_dates}
                        </span>
                        <span>{camp.plan_name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-neon">
                        {formatCurrency(camp.total)}
                      </div>
                      <div className="text-xs text-white/50">
                        {formatCurrency(camp.fixed_stipend)} stipend +{' '}
                        {formatCurrency(camp.variable_bonus)} bonus
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PortalCard>
      </div>
    </div>
  )
}
