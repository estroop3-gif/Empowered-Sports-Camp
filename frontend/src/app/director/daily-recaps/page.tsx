'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import {
  Calendar,
  AlertTriangle,
  Save,
  Loader2,
  ChevronDown,
  Flag,
  ThumbsUp,
} from 'lucide-react'
import { fetchActiveCamps, type DirectorCamp } from '@/lib/services/camps'

/**
 * Director Daily Recaps Page
 *
 * Allows directors to:
 * - Enter daily notes for active camps
 * - Flag incidents
 * - Mark highlights and wins
 * - View past recaps
 *
 * Gated behind LMS completion.
 */

interface DailyRecap {
  id?: string
  camp_id: string
  recap_date: string
  summary: string
  highlights: string
  incidents: string
  attendance_notes: string
  created_by: string
  created_at?: string
}

export default function DailyRecapsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [camps, setCamps] = useState<DirectorCamp[]>([])
  const [selectedCampId, setSelectedCampId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [recap, setRecap] = useState<DailyRecap | null>(null)
  const [showIncidentFlag, setShowIncidentFlag] = useState(false)

  // Form state
  const [summary, setSummary] = useState('')
  const [highlights, setHighlights] = useState('')
  const [incidents, setIncidents] = useState('')
  const [attendanceNotes, setAttendanceNotes] = useState('')

  useEffect(() => {
    loadActiveCampsData()
  }, [])

  useEffect(() => {
    if (selectedCampId && selectedDate) {
      loadRecap()
    }
  }, [selectedCampId, selectedDate])

  async function loadActiveCampsData() {
    const { data, error } = await fetchActiveCamps()

    if (error) {
      console.error('Error loading camps:', error)
    }

    if (data && data.length > 0) {
      setCamps(data)
      setSelectedCampId(data[0].id)
    }

    setLoading(false)
  }

  async function loadRecap() {
    // Note: daily_recaps table doesn't exist yet
    // This is a placeholder for future implementation
    // Reset form for new recap
    setRecap(null)
    setSummary('')
    setHighlights('')
    setIncidents('')
    setAttendanceNotes('')
    setShowIncidentFlag(false)
  }

  async function handleSave() {
    if (!selectedCampId || !selectedDate) return

    setSaving(true)

    // Note: daily_recaps table doesn't exist yet
    // This is a placeholder - in production, save to database
    const recapData: DailyRecap = {
      camp_id: selectedCampId,
      recap_date: selectedDate,
      summary,
      highlights,
      incidents: showIncidentFlag ? incidents : '',
      attendance_notes: attendanceNotes,
      created_by: user?.id || '',
    }

    // Simulate save delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setRecap({ ...recapData, id: 'temp-id', created_at: new Date().toISOString() })
    setSaving(false)
  }

  const selectedCamp = camps.find((c) => c.id === selectedCampId)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-magenta animate-spin" />
      </div>
    )
  }

  return (
    <LmsGate featureName="daily recaps">
      <div>
        <PortalPageHeader
          title="Daily Recaps"
          description="Document daily activities, highlights, and any incidents"
        />

        {camps.length === 0 ? (
          <PortalCard>
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No Active Camps</h3>
              <p className="text-white/50">
                Daily recaps are available for camps that are currently running.
              </p>
            </div>
          </PortalCard>
        ) : (
          <>
            {/* Camp & Date Selection */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              {/* Camp Selector */}
              <div className="flex-1">
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Select Camp
                </label>
                <div className="relative">
                  <select
                    value={selectedCampId}
                    onChange={(e) => setSelectedCampId(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none appearance-none"
                  >
                    {camps.map((camp) => (
                      <option key={camp.id} value={camp.id}>
                        {camp.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 pointer-events-none" />
                </div>
              </div>

              {/* Date Selector */}
              <div className="md:w-48">
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  min={selectedCamp?.start_date}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                />
              </div>
            </div>

            {/* Recap Form */}
            <div className="space-y-6">
              {/* Daily Summary */}
              <PortalCard title="Daily Summary" accent="neon">
                <p className="text-sm text-white/50 mb-4">
                  Provide a brief overview of how the day went.
                </p>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="How did the day go overall? Any notable observations?"
                  rows={4}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
                />
              </PortalCard>

              {/* Highlights */}
              <PortalCard title="Highlights & Wins" accent="purple">
                <div className="flex items-center gap-2 mb-4">
                  <ThumbsUp className="h-5 w-5 text-purple" />
                  <p className="text-sm text-white/50">
                    Celebrate successes, breakthroughs, and positive moments.
                  </p>
                </div>
                <textarea
                  value={highlights}
                  onChange={(e) => setHighlights(e.target.value)}
                  placeholder="What went well? Any standout moments or athlete achievements?"
                  rows={4}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-purple focus:outline-none resize-none"
                />
              </PortalCard>

              {/* Incident Flag */}
              <PortalCard
                title="Incident Report"
                accent={showIncidentFlag ? 'magenta' : undefined}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-5 w-5 ${showIncidentFlag ? 'text-magenta' : 'text-white/30'}`} />
                    <p className="text-sm text-white/50">
                      Flag any incidents, injuries, or concerns.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowIncidentFlag(!showIncidentFlag)}
                    className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${
                      showIncidentFlag
                        ? 'bg-magenta text-white'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    {showIncidentFlag ? (
                      <>
                        <Flag className="h-4 w-4 inline mr-2" />
                        Incident Flagged
                      </>
                    ) : (
                      'Flag Incident'
                    )}
                  </button>
                </div>

                {showIncidentFlag && (
                  <textarea
                    value={incidents}
                    onChange={(e) => setIncidents(e.target.value)}
                    placeholder="Describe the incident(s) in detail. Include who was involved, what happened, and any actions taken."
                    rows={4}
                    className="w-full px-4 py-3 bg-black border border-magenta/50 text-white placeholder:text-white/30 focus:border-magenta focus:outline-none resize-none"
                  />
                )}
              </PortalCard>

              {/* Attendance Notes */}
              <PortalCard title="Attendance Notes">
                <p className="text-sm text-white/50 mb-4">
                  Note any absences, late arrivals, or early departures.
                </p>
                <textarea
                  value={attendanceNotes}
                  onChange={(e) => setAttendanceNotes(e.target.value)}
                  placeholder="Any attendance-related notes?"
                  rows={3}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
                />
              </PortalCard>

              {/* Save Button */}
              <div className="flex items-center justify-between">
                <div>
                  {recap?.created_at && (
                    <p className="text-sm text-white/40">
                      Last saved: {new Date(recap.created_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-8 py-4 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      {recap ? 'Update Recap' : 'Save Recap'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </LmsGate>
  )
}
