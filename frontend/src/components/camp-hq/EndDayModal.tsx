'use client'

/**
 * End Day Modal Component
 *
 * Displays current day statistics, allows entering recap data,
 * and provides options for ending the day with report generation.
 */

import { useState, useEffect } from 'react'
import {
  X,
  Loader2,
  Square,
  AlertTriangle,
  Users,
  CheckCircle,
  FileText,
  Mail,
  MessageSquare,
  Trophy,
  Mic,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EndDayInfo {
  day_number: number
  date: string
  camp_day_id: string
  camp_name: string
  stats: {
    checked_in: number
    checked_out: number
    on_site: number
    not_arrived: number
    absent: number
  }
  on_site_campers?: Array<{
    name: string
    registration_id: string
  }>
  existing_recap?: {
    word_of_the_day: string | null
    primary_sport: string | null
    secondary_sport: string | null
    guest_speaker: string | null
    notes: string | null
  }
}

interface EndDayWarning {
  type: 'warning' | 'error'
  message: string
}

interface EndDayModalProps {
  campId: string
  campDayId: string
  onClose: () => void
  onSuccess: () => void
}

export function EndDayModal({ campId, campDayId, onClose, onSuccess }: EndDayModalProps) {
  const [loading, setLoading] = useState(true)
  const [ending, setEnding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dayInfo, setDayInfo] = useState<EndDayInfo | null>(null)
  const [warnings, setWarnings] = useState<EndDayWarning[]>([])

  // Recap form state
  const [wordOfTheDay, setWordOfTheDay] = useState('')
  const [primarySport, setPrimarySport] = useState('')
  const [secondarySport, setSecondarySport] = useState('')
  const [guestSpeaker, setGuestSpeaker] = useState('')
  const [notes, setNotes] = useState('')

  // Options
  const [generateReport, setGenerateReport] = useState(true)
  const [sendEmails, setSendEmails] = useState(true)
  const [autoCheckoutAll, setAutoCheckoutAll] = useState(true)
  const [forceEnd, setForceEnd] = useState(false)

  // Three-step confirmation
  const [confirmation1, setConfirmation1] = useState(false)
  const [confirmation2, setConfirmation2] = useState(false)
  const [confirmation3, setConfirmation3] = useState(false)

  const allConfirmed = confirmation1 && confirmation2 && confirmation3

  // Load day information
  useEffect(() => {
    async function loadDayInfo() {
      try {
        const res = await fetch(`/api/camps/${campId}/hq/day/${campDayId}/end-info`)
        const json = await res.json()

        if (!res.ok) {
          setError(json.error || 'Failed to load day information')
          return
        }

        setDayInfo(json.data.info)
        setWarnings(json.data.warnings || [])

        // Pre-fill recap form if existing data
        if (json.data.info.existing_recap) {
          const recap = json.data.info.existing_recap
          setWordOfTheDay(recap.word_of_the_day || '')
          setPrimarySport(recap.primary_sport || '')
          setSecondarySport(recap.secondary_sport || '')
          setGuestSpeaker(recap.guest_speaker || '')
          setNotes(recap.notes || '')
        }
      } catch (err) {
        setError('Failed to load day information')
      } finally {
        setLoading(false)
      }
    }
    loadDayInfo()
  }, [campId, campDayId])

  async function handleEndDay() {
    if (ending) return
    setEnding(true)
    setError(null)

    try {
      const res = await fetch(`/api/camps/${campId}/hq/day/${campDayId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recap: {
            word_of_the_day: wordOfTheDay || null,
            primary_sport: primarySport || null,
            secondary_sport: secondarySport || null,
            guest_speaker: guestSpeaker || null,
            notes: notes || null,
          },
          generate_report: generateReport,
          send_emails: sendEmails,
          auto_checkout_all: autoCheckoutAll,
          force: forceEnd,
        }),
      })

      // Handle authentication errors specifically
      if (res.status === 401) {
        setError('Your session has expired. Please refresh the page and try again.')
        setEnding(false)
        return
      }

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Failed to end day')
        setEnding(false)
        return
      }

      onSuccess()
    } catch (err) {
      setError('Failed to end day. Please check your connection and try again.')
      setEnding(false)
    }
  }

  const hasErrors = warnings.some((w) => w.type === 'error')
  const hasCampersOnSite = !!(dayInfo && dayInfo.stats.on_site > 0)

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-xl bg-dark-100 border border-white/20 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-purple/20 flex items-center justify-center">
              <Square className="h-5 w-5 text-purple" />
            </div>
            <h2 className="text-lg font-bold text-white">End Camp Day</h2>
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
              <Loader2 className="h-8 w-8 text-purple animate-spin" />
            </div>
          ) : error && !dayInfo ? (
            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          ) : dayInfo ? (
            <>
              {/* Day Stats Card */}
              <div className="p-4 bg-purple/5 border border-purple/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 bg-purple text-white flex items-center justify-center font-bold text-lg">
                      {dayInfo.day_number}
                    </div>
                    <div>
                      <div className="font-bold text-white">Day {dayInfo.day_number}</div>
                      <div className="text-sm text-white/50">
                        {new Date(dayInfo.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attendance Stats */}
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="p-2 bg-neon/10 border border-neon/30">
                    <div className="text-xl font-bold text-neon">
                      {dayInfo.stats.checked_in + dayInfo.stats.checked_out}
                    </div>
                    <div className="text-[10px] text-white/50 uppercase">Arrived</div>
                  </div>
                  <div className="p-2 bg-purple/10 border border-purple/30">
                    <div className="text-xl font-bold text-purple">
                      {dayInfo.stats.checked_out}
                    </div>
                    <div className="text-[10px] text-white/50 uppercase">Checked Out</div>
                  </div>
                  <div
                    className={cn(
                      'p-2 border',
                      dayInfo.stats.on_site > 0
                        ? 'bg-yellow-500/10 border-yellow-500/30'
                        : 'bg-white/5 border-white/10'
                    )}
                  >
                    <div
                      className={cn(
                        'text-xl font-bold',
                        dayInfo.stats.on_site > 0 ? 'text-yellow-400' : 'text-white/50'
                      )}
                    >
                      {dayInfo.stats.on_site}
                    </div>
                    <div className="text-[10px] text-white/50 uppercase">Still On-Site</div>
                  </div>
                  <div className="p-2 bg-white/5 border border-white/10">
                    <div className="text-xl font-bold text-white/50">
                      {dayInfo.stats.absent}
                    </div>
                    <div className="text-[10px] text-white/50 uppercase">Absent</div>
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

              {/* Campers Still On-Site */}
              {hasCampersOnSite && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30">
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-bold text-yellow-400 mb-1">
                        {dayInfo.stats.on_site} Camper{dayInfo.stats.on_site !== 1 ? 's' : ''} Still On-Site
                      </div>
                      {dayInfo.on_site_campers && dayInfo.on_site_campers.length > 0 && (
                        <div className="text-xs text-white/50 mb-3">
                          {dayInfo.on_site_campers.slice(0, 5).map((c) => c.name).join(', ')}
                          {dayInfo.on_site_campers.length > 5 &&
                            ` and ${dayInfo.on_site_campers.length - 5} more`}
                        </div>
                      )}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoCheckoutAll}
                          onChange={(e) => setAutoCheckoutAll(e.target.checked)}
                          className="h-4 w-4 bg-black border border-white/20 checked:bg-neon checked:border-neon focus:outline-none"
                        />
                        <span className="text-sm text-white">Auto-checkout all remaining campers</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Day Recap Form */}
              <div className="space-y-4">
                <div className="text-xs text-white/40 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Day Recap
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                      <MessageSquare className="h-3 w-3 inline mr-1" />
                      Word of the Day
                    </label>
                    <input
                      type="text"
                      value={wordOfTheDay}
                      onChange={(e) => setWordOfTheDay(e.target.value)}
                      placeholder="e.g., Teamwork"
                      className="w-full bg-black border border-white/20 px-4 py-2 text-white placeholder:text-white/30 focus:border-purple focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                      <Mic className="h-3 w-3 inline mr-1" />
                      Guest Speaker
                    </label>
                    <input
                      type="text"
                      value={guestSpeaker}
                      onChange={(e) => setGuestSpeaker(e.target.value)}
                      placeholder="e.g., Coach Smith"
                      className="w-full bg-black border border-white/20 px-4 py-2 text-white placeholder:text-white/30 focus:border-purple focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                      <Trophy className="h-3 w-3 inline mr-1" />
                      Primary Sport
                    </label>
                    <input
                      type="text"
                      value={primarySport}
                      onChange={(e) => setPrimarySport(e.target.value)}
                      placeholder="e.g., Basketball"
                      className="w-full bg-black border border-white/20 px-4 py-2 text-white placeholder:text-white/30 focus:border-purple focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                      <Trophy className="h-3 w-3 inline mr-1" />
                      Secondary Sport
                    </label>
                    <input
                      type="text"
                      value={secondarySport}
                      onChange={(e) => setSecondarySport(e.target.value)}
                      placeholder="e.g., Soccer"
                      className="w-full bg-black border border-white/20 px-4 py-2 text-white placeholder:text-white/30 focus:border-purple focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any notes about the day..."
                    rows={3}
                    className="w-full bg-black border border-white/20 px-4 py-2 text-white placeholder:text-white/30 focus:border-purple focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3 pt-2">
                <div className="text-xs text-white/40 uppercase tracking-wider">Options</div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateReport}
                    onChange={(e) => setGenerateReport(e.target.checked)}
                    className="h-4 w-4 bg-black border border-white/20 checked:bg-purple checked:border-purple focus:outline-none"
                  />
                  <FileText className="h-4 w-4 text-white/50" />
                  <span className="text-sm text-white">Generate daily report PDF</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendEmails}
                    onChange={(e) => setSendEmails(e.target.checked)}
                    className="h-4 w-4 bg-black border border-white/20 checked:bg-purple checked:border-purple focus:outline-none"
                  />
                  <Mail className="h-4 w-4 text-white/50" />
                  <span className="text-sm text-white">Send daily recap emails to parents</span>
                </label>

                {hasCampersOnSite && !autoCheckoutAll && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forceEnd}
                      onChange={(e) => setForceEnd(e.target.checked)}
                      className="h-4 w-4 bg-black border border-white/20 checked:bg-magenta checked:border-magenta focus:outline-none"
                    />
                    <AlertTriangle className="h-4 w-4 text-magenta" />
                    <span className="text-sm text-magenta">
                      Force end day with campers still on-site
                    </span>
                  </label>
                )}
              </div>

              {/* Three-Step Confirmation */}
              <div className="p-4 bg-purple/5 border border-purple/30 space-y-4">
                <div className="text-xs text-purple uppercase tracking-wider font-bold mb-3">
                  Required Confirmations (3 of 3)
                </div>

                {/* Confirmation 1 */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmation1}
                    onChange={(e) => setConfirmation1(e.target.checked)}
                    className="h-5 w-5 mt-0.5 bg-black border border-white/20 checked:bg-purple checked:border-purple focus:outline-none shrink-0"
                  />
                  <span className={cn(
                    'text-sm',
                    confirmation1 ? 'text-neon' : 'text-white'
                  )}>
                    <strong>1.</strong> I confirm that all campers have been properly checked out or
                    the auto-checkout option is selected.
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
                    className="h-5 w-5 mt-0.5 bg-black border border-white/20 checked:bg-purple checked:border-purple focus:outline-none shrink-0"
                  />
                  <span className={cn(
                    'text-sm',
                    confirmation2 ? 'text-neon' : 'text-white'
                  )}>
                    <strong>2.</strong> I have reviewed and entered the daily recap information
                    (word of the day, sports, guest speaker).
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
                    className="h-5 w-5 mt-0.5 bg-black border border-white/20 checked:bg-purple checked:border-purple focus:outline-none shrink-0"
                  />
                  <span className={cn(
                    'text-sm',
                    confirmation3 ? 'text-neon' : 'text-white'
                  )}>
                    <strong>3.</strong> I am ready to officially end this camp day. All attendance
                    records will be finalized.
                  </span>
                </label>

                {/* Confirmation progress */}
                <div className="pt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-purple transition-all duration-300"
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
                  <div className="flex items-center justify-between gap-3">
                    <span>{error}</span>
                    {error.includes('session has expired') && (
                      <button
                        onClick={() => window.location.reload()}
                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-medium whitespace-nowrap"
                      >
                        Refresh Page
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex flex-col border-t border-white/10 bg-black/50 shrink-0">
          {/* Button disabled reason hint */}
          {!loading && !ending && (
            hasErrors ? (
              <div className="px-4 pt-3 text-xs text-red-400">
                Cannot end day: Please resolve the errors above.
              </div>
            ) : !allConfirmed ? (
              <div className="px-4 pt-3 text-xs text-yellow-400">
                Please complete all 3 confirmations above to enable the End Day button.
              </div>
            ) : hasCampersOnSite && !autoCheckoutAll && !forceEnd ? (
              <div className="px-4 pt-3 text-xs text-yellow-400">
                Campers are still on-site. Enable auto-checkout or force end to continue.
              </div>
            ) : null
          )}
          <div className="flex items-center justify-end gap-3 p-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-white/70 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleEndDay}
              disabled={
                loading ||
                ending ||
                hasErrors ||
                !allConfirmed ||
                (hasCampersOnSite && !autoCheckoutAll && !forceEnd)
              }
              className={cn(
                'flex items-center gap-2 px-6 py-2 font-bold uppercase tracking-wider transition-colors',
                loading ||
                  ending ||
                  hasErrors ||
                  !allConfirmed ||
                  (hasCampersOnSite && !autoCheckoutAll && !forceEnd)
                  ? 'bg-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-purple text-white hover:bg-purple/90'
              )}
            >
              {ending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Square className="h-4 w-4" />
                  End Day
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
