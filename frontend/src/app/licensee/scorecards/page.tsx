'use client'

/**
 * Licensee Incentive Scorecards Page
 *
 * Licensee owner view of all staff compensation within their territory.
 */

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { PortalCard } from '@/components/portal'
import { cn } from '@/lib/utils'
import {
  DollarSign,
  Users,
  TrendingUp,
  Calendar,
  Search,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react'

interface StaffCompensation {
  staff_id: string
  name: string
  email: string
  role: string
  camps: {
    camp_id: string
    camp_name: string
    camp_dates: string
    plan_name: string
    total: number
    is_finalized: boolean
  }[]
  total_earned: number
  pending_amount: number
}

interface LicenseeOverview {
  total_compensation: number
  pending_compensation: number
  finalized_compensation: number
  total_staff: number
  total_camps: number
  staff: StaffCompensation[]
}

export default function LicenseeScorecardsPage() {
  const { user, tenant } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<LicenseeOverview | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

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

  const filteredStaff =
    overview?.staff.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
    ) || []

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-black text-white uppercase tracking-wider mb-8">
            Incentive Scorecards
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
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-black text-white uppercase tracking-wider mb-8">
            Incentive Scorecards
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
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-black text-white uppercase tracking-wider mb-2">
          Incentive Scorecards
        </h1>
        <p className="text-white/50 mb-8">
          {tenant?.name || 'Your territory'} staff compensation overview
        </p>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <PortalCard>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-neon/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-neon" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(overview?.total_compensation || 0)}
                </div>
                <div className="text-xs text-white/50 uppercase">Total</div>
              </div>
            </div>
          </PortalCard>

          <PortalCard>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-yellow-500/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(overview?.pending_compensation || 0)}
                </div>
                <div className="text-xs text-white/50 uppercase">Pending</div>
              </div>
            </div>
          </PortalCard>

          <PortalCard>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-neon/20 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-neon" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(overview?.finalized_compensation || 0)}
                </div>
                <div className="text-xs text-white/50 uppercase">Finalized</div>
              </div>
            </div>
          </PortalCard>

          <PortalCard>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-purple/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {overview?.total_staff || 0}
                </div>
                <div className="text-xs text-white/50 uppercase">Staff</div>
              </div>
            </div>
          </PortalCard>
        </div>

        {/* Staff List */}
        <PortalCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              Staff Compensation
            </h2>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-black border border-white/20 text-white text-sm focus:border-neon focus:outline-none"
              />
            </div>
          </div>

          {filteredStaff.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              No staff compensation records found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStaff.map((staff) => (
                <div key={staff.staff_id}>
                  <button
                    onClick={() =>
                      setSelectedStaff(
                        selectedStaff === staff.staff_id ? null : staff.staff_id
                      )
                    }
                    className={cn(
                      'w-full p-4 text-left transition-colors border',
                      selectedStaff === staff.staff_id
                        ? 'bg-neon/10 border-neon'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white">{staff.name}</div>
                        <div className="text-sm text-white/50">
                          {staff.email} &bull;{' '}
                          {staff.role.replace('_', ' ')}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-lg font-bold text-neon">
                            {formatCurrency(staff.total_earned)}
                          </div>
                          {staff.pending_amount > 0 && (
                            <div className="text-xs text-yellow-400">
                              {formatCurrency(staff.pending_amount)} pending
                            </div>
                          )}
                        </div>
                        <ChevronRight
                          className={cn(
                            'h-5 w-5 text-white/40 transition-transform',
                            selectedStaff === staff.staff_id && 'rotate-90'
                          )}
                        />
                      </div>
                    </div>
                  </button>

                  {/* Expanded Camp History */}
                  {selectedStaff === staff.staff_id && staff.camps.length > 0 && (
                    <div className="mt-1 p-4 bg-black/50 border border-white/10 border-t-0">
                      <div className="space-y-2">
                        {staff.camps.map((camp) => (
                          <div
                            key={camp.camp_id}
                            className="flex items-center justify-between p-3 bg-white/5"
                          >
                            <div>
                              <div className="font-medium text-white">
                                {camp.camp_name}
                              </div>
                              <div className="text-xs text-white/50">
                                {camp.camp_dates} &bull; {camp.plan_name}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-white">
                                {formatCurrency(camp.total)}
                              </span>
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
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </PortalCard>
      </div>
    </div>
  )
}
