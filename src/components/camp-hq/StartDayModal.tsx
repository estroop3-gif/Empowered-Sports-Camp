'use client'

/**
 * Start Day Modal Component
 *
 * Displays day information, warnings from previous day, and registered camper count
 * before starting a new camp day.
 */

import { useState, useEffect } from 'react'
import { X, Loader2, Play, AlertTriangle, Users, Calendar, Clock, CheckCircle } from 'lucide-react'
import { cn, parseDateSafe } from '@/lib/utils'

interface StartDayWarning {
  type: 'warning' | 'error'
  message: string
}

interface StartDayInfo {
  day_number: number
  date: string
  registered_count: number
  camp_name: string
  start_time: string | null
  end_time: string | null
  previous_day?: {
    day_number: number
    unchecked_out_count: number
    camper_names?: string[]
  }
}

interface StartDayModalProps {
  campId: string
  onClose: () => void
  onSuccess: () => void
}

export function StartDayModal({ campId, onClose, onSuccess }: StartDayModalProps) {
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dayInfo, setDayInfo] = useState<StartDayInfo | null>(null)
  const [warnings, setWarnings] = useState<StartDayWarning[]>([])
  const [autoCheckoutPrevious, setAutoCheckoutPrevious] = useState(true)
  const [confirmed, setConfirmed] = useState(false)

  // Load day information and warnings
  useEffect(() => {
    async function loadDayInfo() {
      try {
        const res = await fetch(`/api/camps/${campId}/hq/day/start-info`)
        const json = await res.json()

        if (!res.ok) {
          setError(json.error || 'Failed to load day information')
          return
        }

        setDayInfo(json.data.info)
        setWarnings(json.data.warnings || [])
      } catch (err) {
        setError('Failed to load day information')
      } finally {
        setLoading(false)
      }
    }
    loadDayInfo()
  }, [campId])

  async function handleStartDay() {
    if (starting) return
    setStarting(true)
    setError(null)

    try {
      const res = await fetch(`/api/camps/${campId}/hq/day/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auto_checkout_previous: autoCheckoutPrevious,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Failed to start day')
        setStarting(false)
        return
      }

      onSuccess()
    } catch (err) {
      setError('Failed to start day')
      setStarting(false)
    }
  }

  const hasErrors = warnings.some((w) => w.type === 'error')
  const hasWarnings = warnings.some((w) => w.type === 'warning')
  const hasPreviousDayIssues = dayInfo?.previous_day && dayInfo.previous_day.unchecked_out_count > 0

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-dark-100 border border-white/20 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-neon/20 flex items-center justify-center">
              <Play className="h-5 w-5 text-neon" />
            </div>
            <h2 className="text-lg font-bold text-white">Start Camp Day</h2>
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
              <Loader2 className="h-8 w-8 text-neon animate-spin" />
            </div>
          ) : error && !dayInfo ? (
            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          ) : dayInfo ? (
            <>
              {/* Day Info Card */}
              <div className="p-4 bg-neon/5 border border-neon/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 bg-neon text-black flex items-center justify-center font-bold text-lg">
                      {dayInfo.day_number}
                    </div>
                    <div>
                      <div className="font-bold text-white">Day {dayInfo.day_number}</div>
                      <div className="text-sm text-white/50">
                        {parseDateSafe(dayInfo.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {dayInfo.start_time && dayInfo.end_time && (
                    <div className="flex items-center gap-2 text-white/70">
                      <Clock className="h-4 w-4 text-neon" />
                      <span>{dayInfo.start_time} - {dayInfo.end_time}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-white/70">
                    <Users className="h-4 w-4 text-neon" />
                    <span>{dayInfo.registered_count} campers registered</span>
                  </div>
                </div>
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="space-y-2">
                  {warnings.map((warning, idx) => (
                    <div
                      key={idx}
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

              {/* Previous Day Warning */}
              {hasPreviousDayIssues && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-bold text-yellow-400 mb-1">
                        Day {dayInfo.previous_day!.day_number} has unchecked-out campers
                      </div>
                      <p className="text-sm text-white/70 mb-3">
                        {dayInfo.previous_day!.unchecked_out_count} camper{dayInfo.previous_day!.unchecked_out_count !== 1 ? 's were' : ' was'} not checked out from the previous day.
                      </p>
                      {dayInfo.previous_day!.camper_names && dayInfo.previous_day!.camper_names.length > 0 && (
                        <div className="text-xs text-white/50 mb-3">
                          {dayInfo.previous_day!.camper_names.slice(0, 5).join(', ')}
                          {dayInfo.previous_day!.camper_names.length > 5 && ` and ${dayInfo.previous_day!.camper_names.length - 5} more`}
                        </div>
                      )}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoCheckoutPrevious}
                          onChange={(e) => setAutoCheckoutPrevious(e.target.checked)}
                          className="h-4 w-4 bg-black border border-white/20 checked:bg-neon checked:border-neon focus:outline-none"
                        />
                        <span className="text-sm text-white">Auto-checkout all from previous day</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Confirmation Message */}
              {!hasErrors && (
                <div className="p-3 bg-neon/5 border border-neon/20 text-sm text-white/70 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-neon shrink-0" />
                  <span>
                    Starting the day will set the camp status to "In Progress" and enable check-in for campers.
                  </span>
                </div>
              )}

              {/* Confirmation Checkbox */}
              {!hasErrors && dayInfo && (
                <div className="p-4 bg-white/5 border border-white/10">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-0.5 h-5 w-5 bg-black border border-white/30 checked:bg-neon checked:border-neon focus:outline-none focus:ring-2 focus:ring-neon/50"
                    />
                    <span className="text-sm text-white">
                      I confirm I am ready to start Day {dayInfo.day_number} and begin accepting camper check-ins
                    </span>
                  </label>
                </div>
              )}

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
            onClick={handleStartDay}
            disabled={loading || starting || hasErrors || !confirmed}
            className={cn(
              'flex items-center gap-2 px-6 py-2 font-bold uppercase tracking-wider transition-colors',
              loading || starting || hasErrors || !confirmed
                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                : 'bg-neon text-black hover:bg-neon/90'
            )}
          >
            {starting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start Day
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
