'use client'

/**
 * Conclude Camp Modal Component
 *
 * Displays camp summary statistics, validation warnings, and options
 * for concluding the entire camp session.
 */

import { useState, useEffect } from 'react'
import {
  X,
  Loader2,
  Flag,
  AlertTriangle,
  Users,
  CheckCircle,
  Calendar,
  FileText,
  Mail,
  Lock,
  DollarSign,
  AlertOctagon,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConclusionOverview {
  camp: {
    id: string
    name: string
    start_date: string
    end_date: string
    status: string
    is_locked: boolean
  }
  attendance: {
    total_expected: number
    total_attended: number
    attendance_rate: number
    daily_breakdown: Array<{
      day_number: number
      date: string
      expected: number
      attended: number
      rate: number
    }>
  }
  incidents: {
    total: number
    by_severity: { minor: number; moderate: number; severe: number }
    resolved: number
    unresolved: number
  }
  capacity: {
    registered: number
    capacity: number
    utilization_rate: number
  }
  revenue: {
    gross_revenue: number
    net_revenue: number
  }
  incentives: {
    total_compensation: number
    total_fixed_stipend: number
    total_variable_bonuses: number
  }
  days_summary: {
    total: number
    completed: number
    not_started: number
    in_progress: number
  }
}

interface ConclusionValidation {
  can_conclude: boolean
  warnings: Array<{ type: 'warning' | 'error'; message: string }>
  blockers: Array<{ type: 'error'; message: string }>
}

interface ConcludeCampModalProps {
  campId: string
  onClose: () => void
  onSuccess: () => void
}

export function ConcludeCampModal({ campId, onClose, onSuccess }: ConcludeCampModalProps) {
  const [loading, setLoading] = useState(true)
  const [concluding, setConcluding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<ConclusionOverview | null>(null)
  const [validation, setValidation] = useState<ConclusionValidation | null>(null)

  // Options
  const [lockCamp, setLockCamp] = useState(true)
  const [sendFinalEmails, setSendFinalEmails] = useState(true)
  const [generateReport, setGenerateReport] = useState(true)
  const [forceConclusion, setForceConclusion] = useState(false)

  // Three-step confirmation
  const [confirmation1, setConfirmation1] = useState(false)
  const [confirmation2, setConfirmation2] = useState(false)
  const [confirmation3, setConfirmation3] = useState(false)

  const allConfirmed = confirmation1 && confirmation2 && confirmation3

  // Load conclusion data
  useEffect(() => {
    async function loadConclusionData() {
      try {
        const res = await fetch(`/api/camps/${campId}/hq/conclude`)
        const json = await res.json()

        if (!res.ok) {
          setError(json.error || 'Failed to load conclusion data')
          return
        }

        setOverview(json.data.overview)
        setValidation(json.data.validation)
      } catch (err) {
        setError('Failed to load conclusion data')
      } finally {
        setLoading(false)
      }
    }
    loadConclusionData()
  }, [campId])

  async function handleConclude() {
    if (concluding) return
    setConcluding(true)
    setError(null)

    try {
      const res = await fetch(`/api/camps/${campId}/hq/conclude`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lock_camp: lockCamp,
          send_final_emails: sendFinalEmails,
          generate_report: generateReport,
          force: forceConclusion,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Failed to conclude camp')
        setConcluding(false)
        return
      }

      onSuccess()
    } catch (err) {
      setError('Failed to conclude camp')
      setConcluding(false)
    }
  }

  const hasBlockers = !!(validation && validation.blockers.length > 0)
  const hasWarnings = !!(validation && validation.warnings.length > 0)
  const canConclude =
    !!(validation?.can_conclude || (forceConclusion && !hasBlockers))

  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-dark-100 border border-white/20 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-magenta/20 flex items-center justify-center">
              <Flag className="h-5 w-5 text-magenta" />
            </div>
            <h2 className="text-lg font-bold text-white">Conclude Camp</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-magenta animate-spin" />
            </div>
          ) : error && !overview ? (
            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          ) : overview ? (
            <>
              {/* Camp Info */}
              <div className="p-4 bg-magenta/5 border border-magenta/30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-white text-lg">{overview.camp.name}</h3>
                  <span
                    className={cn(
                      'px-2 py-1 text-xs font-bold uppercase',
                      overview.camp.status === 'completed'
                        ? 'bg-neon/20 text-neon'
                        : overview.camp.status === 'in_progress'
                          ? 'bg-purple/20 text-purple'
                          : 'bg-white/10 text-white/50'
                    )}
                  >
                    {overview.camp.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-sm text-white/50 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(overview.camp.start_date).toLocaleDateString()} -{' '}
                  {new Date(overview.camp.end_date).toLocaleDateString()}
                </div>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Days */}
                <div className="p-3 bg-white/5 border border-white/10 text-center">
                  <div className="text-2xl font-bold text-white">
                    {overview.days_summary.completed}/{overview.days_summary.total}
                  </div>
                  <div className="text-[10px] text-white/50 uppercase">Days Completed</div>
                </div>

                {/* Attendance */}
                <div className="p-3 bg-neon/10 border border-neon/30 text-center">
                  <div className="text-2xl font-bold text-neon">
                    {overview.attendance.attendance_rate.toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-white/50 uppercase">Attendance Rate</div>
                </div>

                {/* Incidents */}
                <div
                  className={cn(
                    'p-3 border text-center',
                    overview.incidents.unresolved > 0
                      ? 'bg-yellow-500/10 border-yellow-500/30'
                      : 'bg-white/5 border-white/10'
                  )}
                >
                  <div
                    className={cn(
                      'text-2xl font-bold',
                      overview.incidents.unresolved > 0 ? 'text-yellow-400' : 'text-white'
                    )}
                  >
                    {overview.incidents.total}
                  </div>
                  <div className="text-[10px] text-white/50 uppercase">
                    Incidents ({overview.incidents.unresolved} open)
                  </div>
                </div>

                {/* Revenue */}
                <div className="p-3 bg-purple/10 border border-purple/30 text-center">
                  <div className="text-2xl font-bold text-purple">
                    {formatCurrency(overview.revenue.net_revenue)}
                  </div>
                  <div className="text-[10px] text-white/50 uppercase">Net Revenue</div>
                </div>
              </div>

              {/* Incentives Summary */}
              {overview.incentives.total_compensation > 0 && (
                <div className="p-4 bg-purple/5 border border-purple/30">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-5 w-5 text-purple" />
                    <h4 className="font-bold text-white">Incentives Summary</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-white/50">Total Compensation</div>
                      <div className="font-bold text-white">
                        {formatCurrency(overview.incentives.total_compensation)}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/50">Fixed Stipend</div>
                      <div className="font-bold text-white">
                        {formatCurrency(overview.incentives.total_fixed_stipend)}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/50">Variable Bonuses</div>
                      <div className="font-bold text-neon">
                        {formatCurrency(overview.incentives.total_variable_bonuses)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Capacity */}
              <div className="p-4 bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-white/50" />
                  <h4 className="font-bold text-white">Capacity</h4>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neon transition-all"
                        style={{ width: `${overview.capacity.utilization_rate}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm text-white">
                    {overview.capacity.registered}/{overview.capacity.capacity} ({overview.capacity.utilization_rate.toFixed(0)}%)
                  </div>
                </div>
              </div>

              {/* Validation Messages */}
              {validation && (validation.blockers.length > 0 || validation.warnings.length > 0) && (
                <div className="space-y-2">
                  {validation.blockers.map((blocker, idx) => (
                    <div
                      key={`blocker-${idx}`}
                      className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2"
                    >
                      <AlertOctagon className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{blocker.message}</span>
                    </div>
                  ))}
                  {validation.warnings.map((warning, idx) => (
                    <div
                      key={`warning-${idx}`}
                      className={cn(
                        'p-3 border text-sm flex items-start gap-2',
                        warning.type === 'error'
                          ? 'bg-red-500/10 border-red-500/30 text-red-400'
                          : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                      )}
                    >
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{warning.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Days Not Completed Warning */}
              {overview.days_summary.not_started > 0 ||
              overview.days_summary.in_progress > 0 ? (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-yellow-400 mb-1">
                        Some days are not completed
                      </div>
                      <p className="text-sm text-white/70 mb-3">
                        {overview.days_summary.not_started > 0 &&
                          `${overview.days_summary.not_started} day${overview.days_summary.not_started !== 1 ? 's' : ''} not started. `}
                        {overview.days_summary.in_progress > 0 &&
                          `${overview.days_summary.in_progress} day${overview.days_summary.in_progress !== 1 ? 's' : ''} still in progress.`}
                      </p>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={forceConclusion}
                          onChange={(e) => setForceConclusion(e.target.checked)}
                          className="h-4 w-4 bg-black border border-white/20 checked:bg-magenta checked:border-magenta focus:outline-none"
                        />
                        <span className="text-sm text-white">
                          Force conclude anyway (not recommended)
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Options */}
              <div className="space-y-3 pt-2">
                <div className="text-xs text-white/40 uppercase tracking-wider">
                  Conclusion Options
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lockCamp}
                    onChange={(e) => setLockCamp(e.target.checked)}
                    className="h-4 w-4 bg-black border border-white/20 checked:bg-magenta checked:border-magenta focus:outline-none"
                  />
                  <Lock className="h-4 w-4 text-white/50" />
                  <span className="text-sm text-white">Lock camp (prevent further edits)</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendFinalEmails}
                    onChange={(e) => setSendFinalEmails(e.target.checked)}
                    className="h-4 w-4 bg-black border border-white/20 checked:bg-magenta checked:border-magenta focus:outline-none"
                  />
                  <Mail className="h-4 w-4 text-white/50" />
                  <span className="text-sm text-white">
                    Send final summary emails to parents
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateReport}
                    onChange={(e) => setGenerateReport(e.target.checked)}
                    className="h-4 w-4 bg-black border border-white/20 checked:bg-magenta checked:border-magenta focus:outline-none"
                  />
                  <FileText className="h-4 w-4 text-white/50" />
                  <span className="text-sm text-white">Generate camp overview report PDF</span>
                </label>
              </div>

              {/* Three-Step Confirmation */}
              <div className="p-4 bg-magenta/5 border border-magenta/30 space-y-4">
                <div className="text-xs text-magenta uppercase tracking-wider font-bold mb-3">
                  Required Confirmations (3 of 3)
                </div>

                {/* Confirmation 1 */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmation1}
                    onChange={(e) => setConfirmation1(e.target.checked)}
                    className="h-5 w-5 mt-0.5 bg-black border border-white/20 checked:bg-magenta checked:border-magenta focus:outline-none shrink-0"
                  />
                  <span className={cn(
                    'text-sm',
                    confirmation1 ? 'text-neon' : 'text-white'
                  )}>
                    <strong>1.</strong> I understand that concluding this camp will mark it as completed and
                    {lockCamp ? ' permanently lock it from further edits.' : ' finalize all attendance records.'}
                  </span>
                </label>

                {/* Confirmation 2 */}
                <label className={cn(
                  'flex items-start gap-3 cursor-pointer transition-opacity',
                  !confirmation1 && 'opacity-50 pointer-events-none'
                )}>
                  <input
                    type="checkbox"
                    checked={confirmation2}
                    onChange={(e) => setConfirmation2(e.target.checked)}
                    disabled={!confirmation1}
                    className="h-5 w-5 mt-0.5 bg-black border border-white/20 checked:bg-magenta checked:border-magenta focus:outline-none shrink-0"
                  />
                  <span className={cn(
                    'text-sm',
                    confirmation2 ? 'text-neon' : 'text-white'
                  )}>
                    <strong>2.</strong> I confirm that all camp days have been properly completed and attendance
                    records are accurate.
                  </span>
                </label>

                {/* Confirmation 3 */}
                <label className={cn(
                  'flex items-start gap-3 cursor-pointer transition-opacity',
                  !confirmation2 && 'opacity-50 pointer-events-none'
                )}>
                  <input
                    type="checkbox"
                    checked={confirmation3}
                    onChange={(e) => setConfirmation3(e.target.checked)}
                    disabled={!confirmation2}
                    className="h-5 w-5 mt-0.5 bg-black border border-white/20 checked:bg-magenta checked:border-magenta focus:outline-none shrink-0"
                  />
                  <span className={cn(
                    'text-sm',
                    confirmation3 ? 'text-neon' : 'text-white'
                  )}>
                    <strong>3.</strong> I am ready to permanently conclude this camp. This action cannot be undone
                    without administrator intervention.
                  </span>
                </label>

                {/* Confirmation progress */}
                <div className="pt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-magenta transition-all duration-300"
                      style={{
                        width: `${((confirmation1 ? 1 : 0) + (confirmation2 ? 1 : 0) + (confirmation3 ? 1 : 0)) / 3 * 100}%`
                      }}
                    />
                  </div>
                  <span className="text-xs text-white/50">
                    {(confirmation1 ? 1 : 0) + (confirmation2 ? 1 : 0) + (confirmation3 ? 1 : 0)}/3
                  </span>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10 bg-black/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-white/70 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConclude}
            disabled={loading || concluding || !canConclude || !allConfirmed || hasBlockers}
            className={cn(
              'flex items-center gap-2 px-6 py-2 font-bold uppercase tracking-wider transition-colors',
              loading || concluding || !canConclude || !allConfirmed || hasBlockers
                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                : 'bg-magenta text-white hover:bg-magenta/90'
            )}
          >
            {concluding ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Flag className="h-4 w-4" />
                Conclude Camp
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
