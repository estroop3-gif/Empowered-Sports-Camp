'use client'

/**
 * Incentive Summary Panel for Camp HQ
 *
 * Displays compensation tracking, daily progress, and closeout functionality.
 */

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  DollarSign,
  Target,
  Star,
  Users,
  Mic,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Send,
  Calculator,
  TrendingUp,
} from 'lucide-react'
import { PortalCard } from '@/components/portal'

// =============================================================================
// TYPES
// =============================================================================

interface CompensationPlan {
  id: string
  name: string
  plan_code: string
}

interface SessionCompensation {
  id: string
  plan_name: string
  plan_code: string
  pre_camp_stipend_amount: number
  on_site_stipend_amount: number
  enrollment_threshold: number | null
  enrollment_bonus_per_camper: number | null
  csat_required_score: number | null
  csat_bonus_amount: number | null
  budget_efficiency_rate: number | null
  guest_speaker_required_count: number | null
  guest_speaker_bonus_amount: number | null
  total_enrolled_campers: number | null
  csat_avg_score: number | null
  budget_preapproved_total: number | null
  budget_actual_total: number | null
  budget_savings_amount: number | null
  guest_speaker_count: number | null
  enrollment_bonus_earned: number | null
  csat_bonus_earned: number | null
  budget_efficiency_bonus_earned: number | null
  guest_speaker_bonus_earned: number | null
  fixed_stipend_total: number | null
  total_variable_bonus: number | null
  total_compensation: number | null
  is_finalized: boolean
  calculated_at: string | null
}

interface DailySnapshot {
  id: string
  day_number: number
  date: string
  day_enrolled_campers: number | null
  day_checked_in_count: number | null
  day_checked_out_count: number | null
  day_no_show_count: number | null
  day_csat_avg_score: number | null
  day_guest_speaker_count: number | null
  notes: string | null
}

interface StaffMember {
  id: string
  first_name: string
  last_name: string
  role: string
}

interface IncentiveSummaryPanelProps {
  campId: string
  leadStaffProfileId?: string
  tenantId?: string
  canEdit?: boolean
  isAdmin?: boolean
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function IncentiveSummaryPanel({
  campId,
  leadStaffProfileId: initialLeadStaffProfileId,
  tenantId,
  canEdit = false,
  isAdmin = false,
}: IncentiveSummaryPanelProps) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<SessionCompensation | null>(null)
  const [dailySnapshots, setDailySnapshots] = useState<DailySnapshot[]>([])
  const [plans, setPlans] = useState<CompensationPlan[]>([])
  const [error, setError] = useState<string | null>(null)

  // Staff selection state
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string>(initialLeadStaffProfileId || '')
  const leadStaffProfileId = selectedStaffId || initialLeadStaffProfileId

  // Form state for setup
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>('')
  const [setupMode, setSetupMode] = useState(false)
  const [setupLoading, setSetupLoading] = useState(false)

  // Metrics form state
  const [budgetPreapproved, setBudgetPreapproved] = useState<string>('')
  const [budgetActual, setBudgetActual] = useState<string>('')
  const [csatScore, setCsatScore] = useState<string>('')
  const [guestSpeakerCount, setGuestSpeakerCount] = useState<string>('')

  // Action states
  const [calculating, setCalculating] = useState(false)
  const [sendingReport, setSendingReport] = useState(false)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Load staff list
  useEffect(() => {
    async function loadStaff() {
      try {
        const res = await fetch(`/api/camps/${campId}/hq/staff`)
        const json = await res.json()
        if (res.ok && json.data) {
          setStaffList(json.data)
          // Auto-select lead director if available and no initial staff ID
          if (!initialLeadStaffProfileId && json.data.length > 0) {
            const lead = json.data.find(
              (s: StaffMember) => s.role === 'lead_director' || s.role === 'director'
            )
            if (lead) {
              setSelectedStaffId(lead.id)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load staff:', err)
      }
    }
    loadStaff()
  }, [campId, initialLeadStaffProfileId])

  // Load data
  useEffect(() => {
    async function loadData() {
      if (!leadStaffProfileId) {
        setLoading(false)
        return
      }

      try {
        // Load compensation data
        const url = `/api/camps/${campId}/hq/compensation?staffProfileId=${leadStaffProfileId}`
        const res = await fetch(url)
        const json = await res.json()

        if (res.ok && json.data) {
          setSession(json.data)
          // Pre-fill form fields
          setBudgetPreapproved(json.data.budget_preapproved_total?.toString() || '')
          setBudgetActual(json.data.budget_actual_total?.toString() || '')
          setCsatScore(json.data.csat_avg_score?.toString() || '')
          setGuestSpeakerCount(json.data.guest_speaker_count?.toString() || '')
        } else {
          setSession(null)
        }

        // Load daily snapshots
        const snapshotsRes = await fetch(
          `/api/camps/${campId}/hq/compensation/snapshots?staffProfileId=${leadStaffProfileId}`
        )
        const snapshotsJson = await snapshotsRes.json()
        if (snapshotsRes.ok) {
          setDailySnapshots(snapshotsJson.data || [])
        }

        // Load available plans (for setup)
        const plansRes = await fetch('/api/incentives/plans')
        const plansJson = await plansRes.json()
        if (plansRes.ok) {
          setPlans(plansJson.data || [])
        }
      } catch (err) {
        console.error('Failed to load incentive data:', err)
        setError('Failed to load incentive data')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [campId, leadStaffProfileId])

  // Setup compensation plan
  async function handleSetupPlan() {
    if (!selectedPlanCode || !leadStaffProfileId || !tenantId) return
    setSetupLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/camps/${campId}/hq/compensation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffProfileId: leadStaffProfileId,
          planCode: selectedPlanCode,
          tenantId,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to setup compensation plan')
      }

      setSession(json.data)
      setSetupMode(false)
      setActionSuccess('Compensation plan attached successfully!')
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup plan')
    } finally {
      setSetupLoading(false)
    }
  }

  // Calculate compensation
  async function handleCalculate() {
    if (!leadStaffProfileId) return
    setCalculating(true)
    setError(null)

    try {
      const res = await fetch(`/api/camps/${campId}/hq/compensation/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffProfileId: leadStaffProfileId,
          budgetPreapprovedTotal: budgetPreapproved ? parseFloat(budgetPreapproved) : undefined,
          budgetActualTotal: budgetActual ? parseFloat(budgetActual) : undefined,
          csatAvgScore: csatScore ? parseFloat(csatScore) : undefined,
          guestSpeakerCount: guestSpeakerCount ? parseInt(guestSpeakerCount) : undefined,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to calculate compensation')
      }

      // Reload session data
      const sessionRes = await fetch(
        `/api/camps/${campId}/hq/compensation?staffProfileId=${leadStaffProfileId}`
      )
      const sessionJson = await sessionRes.json()
      if (sessionRes.ok && sessionJson.data) {
        setSession(sessionJson.data)
      }

      setActionSuccess('Compensation calculated and finalized!')
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate')
    } finally {
      setCalculating(false)
    }
  }

  // Send report
  async function handleSendReport() {
    if (!leadStaffProfileId) return
    setSendingReport(true)
    setError(null)

    try {
      const res = await fetch(`/api/camps/${campId}/hq/compensation/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffProfileId: leadStaffProfileId,
          budgetPreapprovedTotal: budgetPreapproved ? parseFloat(budgetPreapproved) : undefined,
          budgetActualTotal: budgetActual ? parseFloat(budgetActual) : undefined,
          csatAvgScore: csatScore ? parseFloat(csatScore) : undefined,
          guestSpeakerCount: guestSpeakerCount ? parseInt(guestSpeakerCount) : undefined,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to send report')
      }

      setActionSuccess('Compensation report sent to licensee and HQ!')
      setTimeout(() => setActionSuccess(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send report')
    } finally {
      setSendingReport(false)
    }
  }

  // Format currency
  const formatCurrency = (val: number | null) =>
    val !== null ? `$${val.toFixed(2)}` : '-'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-neon animate-spin" />
      </div>
    )
  }

  // No lead staff selected - show staff selector
  if (!leadStaffProfileId) {
    return (
      <PortalCard title="Select Staff Member" accent="neon">
        {staffList.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Staff Assigned</h3>
            <p className="text-white/50">
              Assign staff to this camp to enable incentive tracking.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-white/50 mb-4">
              Select a staff member to track compensation for this camp.
            </p>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                Staff Member
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
              >
                <option value="">Select staff member...</option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.first_name} {staff.last_name} ({staff.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </PortalCard>
    )
  }

  // No compensation plan set up yet
  if (!session) {
    return (
      <PortalCard title="Setup Compensation Plan" accent="neon">
        {error && (
          <div className="mb-4 p-3 bg-magenta/10 border border-magenta/30 text-magenta text-sm">
            {error}
          </div>
        )}

        <p className="text-white/50 mb-6">
          Select a compensation plan to attach to this camp session.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
              Compensation Plan
            </label>
            <select
              value={selectedPlanCode}
              onChange={(e) => setSelectedPlanCode(e.target.value)}
              className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
            >
              <option value="">Select a plan...</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.plan_code}>
                  {plan.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSetupPlan}
            disabled={!selectedPlanCode || setupLoading}
            className={cn(
              'w-full px-4 py-3 font-bold uppercase tracking-wider transition-colors',
              selectedPlanCode && !setupLoading
                ? 'bg-neon text-black hover:bg-neon/90'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            )}
          >
            {setupLoading ? (
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            ) : (
              'Attach Plan to Camp'
            )}
          </button>
        </div>
      </PortalCard>
    )
  }

  // Main incentive tracking UI
  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {actionSuccess && (
        <div className="p-4 bg-neon/10 border border-neon/30 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-neon flex-shrink-0" />
          <span className="text-neon">{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-magenta/10 border border-magenta/30 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-magenta flex-shrink-0" />
          <span className="text-magenta">{error}</span>
        </div>
      )}

      {/* Plan Overview */}
      <PortalCard
        title={session.is_finalized ? 'Compensation Finalized' : 'Compensation Tracking'}
        accent={session.is_finalized ? 'neon' : undefined}
      >
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="px-3 py-1 bg-white/10 text-white font-bold uppercase text-sm">
            {session.plan_name}
          </div>
          <div
            className={cn(
              'px-3 py-1 text-xs font-bold uppercase',
              session.is_finalized
                ? 'bg-neon/20 text-neon'
                : 'bg-yellow-500/20 text-yellow-400'
            )}
          >
            {session.is_finalized ? 'Finalized' : 'In Progress'}
          </div>
        </div>

        {/* Fixed Stipend */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <div className="p-4 bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-neon" />
              <span className="text-xs font-bold uppercase tracking-wider text-white/50">
                Pre-Camp Stipend
              </span>
            </div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(session.pre_camp_stipend_amount)}
            </div>
          </div>

          <div className="p-4 bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-neon" />
              <span className="text-xs font-bold uppercase tracking-wider text-white/50">
                On-Site Stipend
              </span>
            </div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(session.on_site_stipend_amount)}
            </div>
          </div>
        </div>

        {/* Variable Bonuses */}
        <div className="space-y-4 mb-6">
          <h4 className="text-sm font-bold uppercase tracking-wider text-white/50">
            Variable Bonuses
          </h4>

          {/* Enrollment Bonus */}
          {session.enrollment_threshold !== null && (
            <BonusRow
              icon={Users}
              label="Enrollment Bonus"
              threshold={`${session.enrollment_threshold} campers`}
              actual={
                session.total_enrolled_campers !== null
                  ? `${session.total_enrolled_campers} enrolled`
                  : 'Not calculated'
              }
              earned={session.enrollment_bonus_earned}
              potential={
                session.enrollment_bonus_per_camper
                  ? `$${session.enrollment_bonus_per_camper}/camper above threshold`
                  : null
              }
              isMet={
                session.total_enrolled_campers !== null &&
                session.total_enrolled_campers > session.enrollment_threshold
              }
            />
          )}

          {/* CSAT Bonus */}
          {session.csat_required_score !== null && (
            <BonusRow
              icon={Star}
              label="CSAT Bonus"
              threshold={`${session.csat_required_score} avg score`}
              actual={
                session.csat_avg_score !== null
                  ? `${session.csat_avg_score.toFixed(2)} score`
                  : 'Not calculated'
              }
              earned={session.csat_bonus_earned}
              potential={formatCurrency(session.csat_bonus_amount)}
              isMet={
                session.csat_avg_score !== null &&
                session.csat_avg_score >= session.csat_required_score
              }
            />
          )}

          {/* Budget Efficiency Bonus */}
          {session.budget_efficiency_rate !== null && (
            <BonusRow
              icon={TrendingUp}
              label="Budget Efficiency"
              threshold={`${(session.budget_efficiency_rate * 100).toFixed(0)}% of savings`}
              actual={
                session.budget_savings_amount !== null
                  ? `${formatCurrency(session.budget_savings_amount)} saved`
                  : 'Not calculated'
              }
              earned={session.budget_efficiency_bonus_earned}
              potential={null}
              isMet={session.budget_savings_amount !== null && session.budget_savings_amount > 0}
            />
          )}

          {/* Guest Speaker Bonus */}
          {session.guest_speaker_required_count !== null && (
            <BonusRow
              icon={Mic}
              label="Guest Speaker Bonus"
              threshold={`${session.guest_speaker_required_count} speakers`}
              actual={
                session.guest_speaker_count !== null
                  ? `${session.guest_speaker_count} speakers`
                  : 'Not calculated'
              }
              earned={session.guest_speaker_bonus_earned}
              potential={formatCurrency(session.guest_speaker_bonus_amount)}
              isMet={
                session.guest_speaker_count !== null &&
                session.guest_speaker_count >= session.guest_speaker_required_count
              }
            />
          )}
        </div>

        {/* Totals */}
        <div className="border-t border-white/10 pt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-white/5">
              <div className="text-xs font-bold uppercase tracking-wider text-white/50 mb-1">
                Fixed Stipend
              </div>
              <div className="text-xl font-bold text-white">
                {formatCurrency(session.fixed_stipend_total)}
              </div>
            </div>
            <div className="text-center p-4 bg-white/5">
              <div className="text-xs font-bold uppercase tracking-wider text-white/50 mb-1">
                Variable Bonus
              </div>
              <div className="text-xl font-bold text-purple">
                {formatCurrency(session.total_variable_bonus)}
              </div>
            </div>
            <div className="text-center p-4 bg-neon/10 border border-neon/30">
              <div className="text-xs font-bold uppercase tracking-wider text-neon mb-1">
                Total Compensation
              </div>
              <div className="text-2xl font-bold text-neon">
                {formatCurrency(session.total_compensation)}
              </div>
            </div>
          </div>
        </div>
      </PortalCard>

      {/* Metrics Input (if not finalized) */}
      {!session.is_finalized && canEdit && (
        <PortalCard title="Session Metrics">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                Budget Pre-approved ($)
              </label>
              <input
                type="number"
                value={budgetPreapproved}
                onChange={(e) => setBudgetPreapproved(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                Budget Actual ($)
              </label>
              <input
                type="number"
                value={budgetActual}
                onChange={(e) => setBudgetActual(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                CSAT Average Score
              </label>
              <input
                type="number"
                value={csatScore}
                onChange={(e) => setCsatScore(e.target.value)}
                placeholder="4.5"
                step="0.1"
                min="1"
                max="5"
                className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                Guest Speakers / Volunteers
              </label>
              <input
                type="number"
                value={guestSpeakerCount}
                onChange={(e) => setGuestSpeakerCount(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
              />
            </div>
          </div>
        </PortalCard>
      )}

      {/* Daily Progress */}
      {dailySnapshots.length > 0 && (
        <PortalCard title="Daily Progress">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-white/50 border-b border-white/10">
                  <th className="pb-3 pr-4">Day</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Enrolled</th>
                  <th className="pb-3 pr-4">Checked In</th>
                  <th className="pb-3 pr-4">Checked Out</th>
                  <th className="pb-3 pr-4">No Shows</th>
                  <th className="pb-3 pr-4">CSAT</th>
                  <th className="pb-3">Speakers</th>
                </tr>
              </thead>
              <tbody>
                {dailySnapshots.map((snapshot) => (
                  <tr
                    key={snapshot.id}
                    className="border-b border-white/5 text-white/80"
                  >
                    <td className="py-3 pr-4 font-bold">Day {snapshot.day_number}</td>
                    <td className="py-3 pr-4">
                      {new Date(snapshot.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3 pr-4">{snapshot.day_enrolled_campers ?? '-'}</td>
                    <td className="py-3 pr-4 text-neon">
                      {snapshot.day_checked_in_count ?? '-'}
                    </td>
                    <td className="py-3 pr-4 text-purple">
                      {snapshot.day_checked_out_count ?? '-'}
                    </td>
                    <td className="py-3 pr-4 text-magenta">
                      {snapshot.day_no_show_count ?? '-'}
                    </td>
                    <td className="py-3 pr-4">
                      {snapshot.day_csat_avg_score?.toFixed(2) ?? '-'}
                    </td>
                    <td className="py-3">{snapshot.day_guest_speaker_count ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PortalCard>
      )}

      {/* Actions */}
      {canEdit && (
        <div className="flex flex-wrap gap-4">
          {!session.is_finalized && (
            <button
              onClick={handleCalculate}
              disabled={calculating}
              className={cn(
                'flex items-center gap-2 px-6 py-3 font-bold uppercase tracking-wider transition-colors',
                calculating
                  ? 'bg-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-neon text-black hover:bg-neon/90'
              )}
            >
              {calculating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Calculator className="h-5 w-5" />
              )}
              Calculate & Finalize
            </button>
          )}

          <button
            onClick={handleSendReport}
            disabled={sendingReport || !session.is_finalized}
            className={cn(
              'flex items-center gap-2 px-6 py-3 font-bold uppercase tracking-wider transition-colors',
              sendingReport || !session.is_finalized
                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                : 'bg-purple text-white hover:bg-purple/90'
            )}
          >
            {sendingReport ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
            Send Compensation Report
          </button>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface BonusRowProps {
  icon: typeof Users
  label: string
  threshold: string
  actual: string
  earned: number | null
  potential: string | null
  isMet: boolean
}

function BonusRow({
  icon: Icon,
  label,
  threshold,
  actual,
  earned,
  potential,
  isMet,
}: BonusRowProps) {
  const formatCurrency = (val: number | null) =>
    val !== null ? `$${val.toFixed(2)}` : '$0.00'

  return (
    <div className="flex items-center gap-4 p-3 bg-white/5 border border-white/10">
      <div
        className={cn(
          'h-10 w-10 flex items-center justify-center flex-shrink-0',
          isMet ? 'bg-neon/20 text-neon' : 'bg-white/10 text-white/40'
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-white text-sm">{label}</div>
        <div className="text-xs text-white/50">
          Required: {threshold} • Actual: {actual}
        </div>
        {potential && (
          <div className="text-xs text-white/40">Potential: {potential}</div>
        )}
      </div>
      <div className="text-right">
        <div
          className={cn(
            'font-bold text-lg',
            isMet && earned !== null && earned > 0 ? 'text-neon' : 'text-white/40'
          )}
        >
          {formatCurrency(earned)}
        </div>
        <div
          className={cn(
            'text-xs font-bold uppercase',
            isMet ? 'text-neon' : 'text-white/40'
          )}
        >
          {isMet ? 'Earned' : 'Not Met'}
        </div>
      </div>
    </div>
  )
}

export default IncentiveSummaryPanel
