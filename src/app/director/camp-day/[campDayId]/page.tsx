'use client'

/**
 * Camp Day Control Panel
 *
 * Director's main interface for managing a camp day.
 * Tabs: Check-In, Groups, Live Day, Dismissal, Recap
 *
 * Styled consistently with the Empowered Sports Camp brand.
 */

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import { cn, parseDateSafe } from '@/lib/utils'
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  UsersRound,
  Calendar,
  QrCode,
  AlertTriangle,
  ChevronRight,
  Play,
  Square,
  Send,
  FileText,
  Mic,
  MessageSquare,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react'

type TabId = 'checkin' | 'groups' | 'liveday' | 'dismissal' | 'recap'

interface AthleteAttendance {
  id: string
  athlete_id: string
  athlete: {
    id: string
    first_name: string
    last_name: string
    photo_url: string | null
    date_of_birth: string | null
  }
  status: 'pending' | 'checked_in' | 'absent' | 'checked_out'
  check_in_time: string | null
  check_out_time: string | null
  check_in_method: string | null
  group_id: string | null
  group_name: string | null
  parent: {
    id: string
    first_name: string
    last_name: string
    phone: string | null
  } | null
}

interface CampDayDetails {
  id: string
  camp_id: string
  camp_name: string
  location: string
  date: string
  day_number: number
  title: string | null
  status: 'not_started' | 'check_in' | 'in_progress' | 'dismissal' | 'completed'
  notes: string | null
  attendance: AthleteAttendance[]
  stats: {
    registered: number
    checked_in: number
    absent: number
    checked_out: number
  }
  groups: Array<{
    id: string
    name: string
    color: string
    athlete_count: number
  }>
  // Recap fields
  sport_played?: string
  guest_speaker?: string
  word_of_the_day?: string
  recap_notes?: string
}

interface PickupTokenInfo {
  id: string
  token: string
  athlete_id: string
  athlete_name: string
  status: 'active' | 'used' | 'expired'
  used_at: string | null
}

export default function CampDayControlPanel({
  params,
}: {
  params: Promise<{ campDayId: string }>
}) {
  const { campDayId } = use(params)
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as TabId) || 'checkin'

  const [activeTab, setActiveTab] = useState<TabId>(initialTab)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [campDay, setCampDay] = useState<CampDayDetails | null>(null)
  const [pickupTokens, setPickupTokens] = useState<PickupTokenInfo[]>([])
  const [showQRModal, setShowQRModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [manualCheckoutReason, setManualCheckoutReason] = useState('')
  const [showManualCheckout, setShowManualCheckout] = useState<string | null>(null)

  // Recap form state
  const [sportPlayed, setSportPlayed] = useState('')
  const [guestSpeaker, setGuestSpeaker] = useState('')
  const [wordOfTheDay, setWordOfTheDay] = useState('')
  const [recapNotes, setRecapNotes] = useState('')
  const [savingRecap, setSavingRecap] = useState(false)
  const [recapSaved, setRecapSaved] = useState(false)
  const [sendingEmail, setSendingEmail] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState<string | null>(null)

  // Fetch camp day details
  useEffect(() => {
    const fetchCampDay = async () => {
      try {
        const res = await fetch(`/api/camp-days/${campDayId}`)
        const json = await res.json()

        if (!res.ok) {
          throw new Error(json.error || 'Failed to load camp day')
        }

        setCampDay(json.data)

        // Populate recap form
        if (json.data) {
          setSportPlayed(json.data.sport_played || '')
          setGuestSpeaker(json.data.guest_speaker || '')
          setWordOfTheDay(json.data.word_of_the_day || '')
          setRecapNotes(json.data.recap_notes || json.data.notes || '')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    fetchCampDay()

    // Refresh every 30 seconds
    const interval = setInterval(fetchCampDay, 30000)
    return () => clearInterval(interval)
  }, [campDayId])

  // Fetch pickup tokens when on dismissal tab
  useEffect(() => {
    if (activeTab !== 'dismissal') return

    const fetchTokens = async () => {
      try {
        const res = await fetch(`/api/camp-days/${campDayId}/pickup-tokens`)
        const json = await res.json()

        if (res.ok) {
          setPickupTokens(json.data || [])
        }
      } catch (err) {
        console.error('Failed to fetch pickup tokens:', err)
      }
    }

    fetchTokens()
    const interval = setInterval(fetchTokens, 15000)
    return () => clearInterval(interval)
  }, [campDayId, activeTab])

  const updateStatus = async (newStatus: CampDayDetails['status']) => {
    setActionLoading('status')
    try {
      const res = await fetch(`/api/camp-days/${campDayId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to update status')
      }

      // Refresh
      const refresh = await fetch(`/api/camp-days/${campDayId}`)
      const json = await refresh.json()
      if (refresh.ok) setCampDay(json.data)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setActionLoading(null)
    }
  }

  const handleManualCheckIn = async (athleteId: string) => {
    setActionLoading(athleteId)
    try {
      const res = await fetch(`/api/camp-days/${campDayId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athlete_id: athleteId }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to check in')
      }

      // Refresh
      const refresh = await fetch(`/api/camp-days/${campDayId}`)
      const json = await refresh.json()
      if (refresh.ok) setCampDay(json.data)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Check-in failed')
    } finally {
      setActionLoading(null)
    }
  }

  const handleMarkAbsent = async (athleteId: string) => {
    setActionLoading(athleteId)
    try {
      const res = await fetch(`/api/camp-days/${campDayId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athlete_id: athleteId, action: 'absent' }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to mark absent')
      }

      // Refresh
      const refresh = await fetch(`/api/camp-days/${campDayId}`)
      const json = await refresh.json()
      if (refresh.ok) setCampDay(json.data)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    } finally {
      setActionLoading(null)
    }
  }

  const generatePickupCodes = async () => {
    setActionLoading('generate')
    try {
      const res = await fetch(`/api/camp-days/${campDayId}/pickup-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to generate codes')
      }

      // Refresh tokens
      const refresh = await fetch(`/api/camp-days/${campDayId}/pickup-tokens`)
      const json = await refresh.json()
      if (refresh.ok) setPickupTokens(json.data || [])
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    } finally {
      setActionLoading(null)
    }
  }

  const handleManualCheckout = async (athleteId: string) => {
    if (!manualCheckoutReason.trim()) {
      alert('Please provide a reason for manual checkout')
      return
    }

    setActionLoading(athleteId)
    try {
      const res = await fetch(`/api/camp-days/${campDayId}/pickup-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual_checkout',
          athlete_id: athleteId,
          reason: manualCheckoutReason,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to checkout')
      }

      setShowManualCheckout(null)
      setManualCheckoutReason('')

      // Refresh
      const refresh = await fetch(`/api/camp-days/${campDayId}`)
      const json = await refresh.json()
      if (refresh.ok) setCampDay(json.data)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Checkout failed')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSaveRecap = async () => {
    setSavingRecap(true)
    setRecapSaved(false)

    try {
      const res = await fetch(`/api/camp-days/${campDayId}/recap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport_played: sportPlayed,
          guest_speaker: guestSpeaker,
          word_of_the_day: wordOfTheDay,
          notes: recapNotes,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to save recap')
      }

      setRecapSaved(true)
      setTimeout(() => setRecapSaved(false), 3000)

      // Refresh
      const refresh = await fetch(`/api/camp-days/${campDayId}`)
      const json = await refresh.json()
      if (refresh.ok) setCampDay(json.data)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save recap')
    } finally {
      setSavingRecap(false)
    }
  }

  const handleSendEmail = async (emailType: 'daily_recap' | 'post_camp') => {
    setSendingEmail(emailType)
    setEmailSent(null)

    try {
      const res = await fetch(`/api/camp-days/${campDayId}/communications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: emailType,
          recap_data: {
            sport_played: sportPlayed,
            guest_speaker: guestSpeaker,
            word_of_the_day: wordOfTheDay,
            notes: recapNotes,
          },
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to send email')
      }

      setEmailSent(emailType)
      setTimeout(() => setEmailSent(null), 5000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setSendingEmail(null)
    }
  }

  const checkInQRUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/camp-checkin?campId=${campDay?.camp_id}`
      : ''

  const filteredAttendance = campDay?.attendance.filter((a) => {
    if (!searchTerm) return true
    const name = `${a.athlete.first_name} ${a.athlete.last_name}`.toLowerCase()
    return name.includes(searchTerm.toLowerCase())
  })

  const tabs: { id: TabId; label: string; icon: typeof CheckCircle }[] = [
    { id: 'checkin', label: 'Check-In', icon: CheckCircle },
    { id: 'groups', label: 'Groups', icon: UsersRound },
    { id: 'liveday', label: 'Live Day', icon: Play },
    { id: 'dismissal', label: 'Dismissal', icon: XCircle },
    { id: 'recap', label: 'Recap', icon: FileText },
  ]

  if (loading) {
    return (
      <LmsGate featureName="camp day management">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 text-neon animate-spin" />
        </div>
      </LmsGate>
    )
  }

  if (error || !campDay) {
    return (
      <LmsGate featureName="camp day management">
        <PortalCard>
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-magenta mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Error Loading Camp Day</h3>
            <p className="text-white/50 mb-6">{error || 'Camp day not found'}</p>
            <Link
              href="/director/today"
              className="inline-flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Today's Camps
            </Link>
          </div>
        </PortalCard>
      </LmsGate>
    )
  }

  const statusConfig = {
    not_started: { label: 'Not Started', color: 'bg-white/10 text-white/50' },
    check_in: { label: 'Check-In', color: 'bg-blue-500/20 text-blue-400' },
    in_progress: { label: 'In Progress', color: 'bg-neon/20 text-neon' },
    dismissal: { label: 'Dismissal', color: 'bg-orange-500/20 text-orange-400' },
    completed: { label: 'Completed', color: 'bg-purple/20 text-purple' },
  }

  const status = statusConfig[campDay.status]

  return (
    <LmsGate featureName="camp day management">
      <div>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/director/today"
              className="p-2 bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white uppercase tracking-wider">
                {campDay.camp_name}
              </h1>
              <p className="text-white/50">
                Day {campDay.day_number} - {parseDateSafe(campDay.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <span className={cn('px-3 py-1 text-sm font-bold uppercase', status.color)}>
              {status.label}
            </span>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-white/5 border border-white/10 text-center">
              <p className="text-2xl font-bold text-white">{campDay.stats.registered}</p>
              <p className="text-xs text-white/50 uppercase">Registered</p>
            </div>
            <div className="p-4 bg-neon/5 border border-neon/30 text-center">
              <p className="text-2xl font-bold text-neon">{campDay.stats.checked_in}</p>
              <p className="text-xs text-white/50 uppercase">Checked In</p>
            </div>
            <div className="p-4 bg-magenta/5 border border-magenta/30 text-center">
              <p className="text-2xl font-bold text-magenta">{campDay.stats.absent}</p>
              <p className="text-xs text-white/50 uppercase">Absent</p>
            </div>
            <div className="p-4 bg-purple/5 border border-purple/30 text-center">
              <p className="text-2xl font-bold text-purple">{campDay.stats.checked_out}</p>
              <p className="text-xs text-white/50 uppercase">Picked Up</p>
            </div>
          </div>
        </div>

        {/* Status Actions */}
        <div className="mb-6 flex items-center gap-4">
          {campDay.status === 'not_started' && (
            <button
              onClick={() => updateStatus('check_in')}
              disabled={actionLoading === 'status'}
              className="px-6 py-3 bg-blue-500 text-white font-bold uppercase tracking-wider hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {actionLoading === 'status' ? 'Starting...' : 'Start Check-In'}
            </button>
          )}
          {campDay.status === 'check_in' && (
            <button
              onClick={() => updateStatus('in_progress')}
              disabled={actionLoading === 'status'}
              className="px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 disabled:opacity-50 transition-colors"
            >
              {actionLoading === 'status' ? 'Starting...' : 'Start Camp Day'}
            </button>
          )}
          {campDay.status === 'in_progress' && (
            <button
              onClick={() => updateStatus('dismissal')}
              disabled={actionLoading === 'status'}
              className="px-6 py-3 bg-orange-500 text-white font-bold uppercase tracking-wider hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {actionLoading === 'status' ? 'Starting...' : 'Begin Dismissal'}
            </button>
          )}
          {campDay.status === 'dismissal' && (
            <button
              onClick={() => updateStatus('completed')}
              disabled={actionLoading === 'status'}
              className="px-6 py-3 bg-purple text-white font-bold uppercase tracking-wider hover:bg-purple/90 disabled:opacity-50 transition-colors"
            >
              {actionLoading === 'status' ? 'Completing...' : 'Complete Day'}
            </button>
          )}

          <Link
            href={`/director/camps/${campDay.camp_id}/hq`}
            className="px-4 py-3 bg-white/10 text-white font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
          >
            Open Camp HQ
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-white/10">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 border-b-2 transition-colors font-bold uppercase tracking-wider text-sm',
                  activeTab === tab.id
                    ? 'border-neon text-neon'
                    : 'border-transparent text-white/50 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'checkin' && (
          <CheckInTab
            campDay={campDay}
            filteredAttendance={filteredAttendance || []}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            actionLoading={actionLoading}
            handleManualCheckIn={handleManualCheckIn}
            handleMarkAbsent={handleMarkAbsent}
            showQRModal={showQRModal}
            setShowQRModal={setShowQRModal}
            checkInQRUrl={checkInQRUrl}
          />
        )}

        {activeTab === 'groups' && (
          <GroupsTab campDay={campDay} />
        )}

        {activeTab === 'liveday' && (
          <LiveDayTab campDay={campDay} />
        )}

        {activeTab === 'dismissal' && (
          <DismissalTab
            campDay={campDay}
            filteredAttendance={filteredAttendance || []}
            pickupTokens={pickupTokens}
            actionLoading={actionLoading}
            generatePickupCodes={generatePickupCodes}
            showManualCheckout={showManualCheckout}
            setShowManualCheckout={setShowManualCheckout}
            manualCheckoutReason={manualCheckoutReason}
            setManualCheckoutReason={setManualCheckoutReason}
            handleManualCheckout={handleManualCheckout}
          />
        )}

        {activeTab === 'recap' && (
          <RecapTab
            campDay={campDay}
            sportPlayed={sportPlayed}
            setSportPlayed={setSportPlayed}
            guestSpeaker={guestSpeaker}
            setGuestSpeaker={setGuestSpeaker}
            wordOfTheDay={wordOfTheDay}
            setWordOfTheDay={setWordOfTheDay}
            recapNotes={recapNotes}
            setRecapNotes={setRecapNotes}
            savingRecap={savingRecap}
            recapSaved={recapSaved}
            handleSaveRecap={handleSaveRecap}
            sendingEmail={sendingEmail}
            emailSent={emailSent}
            handleSendEmail={handleSendEmail}
          />
        )}
      </div>
    </LmsGate>
  )
}

// =============================================================================
// Tab Components
// =============================================================================

function CheckInTab({
  campDay,
  filteredAttendance,
  searchTerm,
  setSearchTerm,
  actionLoading,
  handleManualCheckIn,
  handleMarkAbsent,
  showQRModal,
  setShowQRModal,
  checkInQRUrl,
}: {
  campDay: CampDayDetails
  filteredAttendance: AthleteAttendance[]
  searchTerm: string
  setSearchTerm: (v: string) => void
  actionLoading: string | null
  handleManualCheckIn: (id: string) => void
  handleMarkAbsent: (id: string) => void
  showQRModal: boolean
  setShowQRModal: (v: boolean) => void
  checkInQRUrl: string
}) {
  return (
    <div className="space-y-4">
      {/* QR Code Button */}
      <PortalCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-neon/20 flex items-center justify-center">
              <QrCode className="h-6 w-6 text-neon" />
            </div>
            <div>
              <h3 className="font-bold text-white">Check-In QR Code</h3>
              <p className="text-sm text-white/50">Display for parents to scan</p>
            </div>
          </div>
          <button
            onClick={() => setShowQRModal(true)}
            className="px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
          >
            Show QR Code
          </button>
        </div>
      </PortalCard>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search athletes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
        />
      </div>

      {/* Attendance List */}
      <PortalCard>
        <div className="divide-y divide-white/10">
          {filteredAttendance.map((att) => (
            <div key={att.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {att.athlete.photo_url ? (
                  <img
                    src={att.athlete.photo_url}
                    alt=""
                    className="w-10 h-10 object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-white/10 flex items-center justify-center text-white font-bold">
                    {att.athlete.first_name[0]}{att.athlete.last_name[0]}
                  </div>
                )}
                <div>
                  <p className="font-bold text-white">
                    {att.athlete.first_name} {att.athlete.last_name}
                  </p>
                  {att.group_name && (
                    <p className="text-sm text-white/50">{att.group_name}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                {att.check_in_time && (
                  <span className="text-sm text-white/50">
                    {new Date(att.check_in_time).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                )}

                <span
                  className={cn(
                    'px-2 py-1 text-xs font-bold uppercase',
                    att.status === 'checked_in'
                      ? 'bg-neon/20 text-neon'
                      : att.status === 'absent'
                      ? 'bg-magenta/20 text-magenta'
                      : att.status === 'checked_out'
                      ? 'bg-purple/20 text-purple'
                      : 'bg-yellow-500/20 text-yellow-400'
                  )}
                >
                  {att.status.replace('_', ' ')}
                </span>

                {att.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleManualCheckIn(att.athlete_id)}
                      disabled={actionLoading === att.athlete_id}
                      className="px-3 py-1 bg-neon text-black text-xs font-bold uppercase hover:bg-neon/90 disabled:opacity-50 transition-colors"
                    >
                      Check In
                    </button>
                    <button
                      onClick={() => handleMarkAbsent(att.athlete_id)}
                      disabled={actionLoading === att.athlete_id}
                      className="px-3 py-1 bg-magenta/20 text-magenta text-xs font-bold uppercase hover:bg-magenta/30 disabled:opacity-50 transition-colors"
                    >
                      Absent
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </PortalCard>

      {/* QR Modal */}
      {showQRModal && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"
          onClick={() => setShowQRModal(false)}
        >
          <div
            className="bg-dark-100 border border-white/10 p-8 max-w-md w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wider">
              Check-In QR Code
            </h2>
            <p className="text-white/50 mb-6">{campDay.camp_name}</p>

            <div className="bg-white p-4 inline-block mb-6">
              <QRCodeSVG value={checkInQRUrl} size={250} level="H" />
            </div>

            <p className="text-sm text-white/50 mb-6">
              Parents scan this code to check in their athletes
            </p>

            <button
              onClick={() => setShowQRModal(false)}
              className="w-full py-3 bg-white/10 text-white font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function GroupsTab({ campDay }: { campDay: CampDayDetails }) {
  return (
    <PortalCard title="Camp Groups">
      {campDay.groups && campDay.groups.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campDay.groups.map((group) => (
            <div
              key={group.id}
              className="p-4 bg-white/5 border border-white/10"
              style={{ borderLeftColor: group.color, borderLeftWidth: 4 }}
            >
              <h4 className="font-bold text-white">{group.name}</h4>
              <p className="text-sm text-white/50">{group.athlete_count} athletes</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <UsersRound className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50">No groups configured for this camp.</p>
          <Link
            href={`/director/camps/${campDay.camp_id}/grouping`}
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
          >
            Open Grouping Tool
          </Link>
        </div>
      )}
    </PortalCard>
  )
}

function LiveDayTab({ campDay }: { campDay: CampDayDetails }) {
  return (
    <PortalCard title="Live Day View">
      <div className="text-center py-12">
        <Play className="h-12 w-12 text-white/20 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Schedule Progress</h3>
        <p className="text-white/50 mb-6">
          Track schedule progress, incidents, and notes throughout the day.
        </p>
        <Link
          href={`/director/camps/${campDay.camp_id}/hq?tab=schedule`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
        >
          View Schedule in Camp HQ
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </PortalCard>
  )
}

function DismissalTab({
  campDay,
  filteredAttendance,
  pickupTokens,
  actionLoading,
  generatePickupCodes,
  showManualCheckout,
  setShowManualCheckout,
  manualCheckoutReason,
  setManualCheckoutReason,
  handleManualCheckout,
}: {
  campDay: CampDayDetails
  filteredAttendance: AthleteAttendance[]
  pickupTokens: PickupTokenInfo[]
  actionLoading: string | null
  generatePickupCodes: () => void
  showManualCheckout: string | null
  setShowManualCheckout: (v: string | null) => void
  manualCheckoutReason: string
  setManualCheckoutReason: (v: string) => void
  handleManualCheckout: (id: string) => void
}) {
  const pendingPickup = filteredAttendance.filter((a) => a.status === 'checked_in')

  return (
    <div className="space-y-4">
      {/* Generate Codes */}
      {campDay.status === 'dismissal' && (
        <PortalCard>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white">Pickup Codes</h3>
              <p className="text-sm text-white/50">Generate QR pickup codes for parents</p>
            </div>
            <button
              onClick={generatePickupCodes}
              disabled={actionLoading === 'generate'}
              className="px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 disabled:opacity-50 transition-colors"
            >
              {actionLoading === 'generate' ? 'Generating...' : 'Generate Codes'}
            </button>
          </div>
        </PortalCard>
      )}

      {/* Pending Pickup */}
      <PortalCard title={`Pending Pickup (${pendingPickup.length})`}>
        <div className="divide-y divide-white/10">
          {pendingPickup.map((att) => {
            const token = pickupTokens.find((t) => t.athlete_id === att.athlete_id)
            return (
              <div key={att.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/10 flex items-center justify-center text-white font-bold">
                    {att.athlete.first_name[0]}{att.athlete.last_name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-white">
                      {att.athlete.first_name} {att.athlete.last_name}
                    </p>
                    {att.parent && (
                      <p className="text-sm text-white/50">
                        Parent: {att.parent.first_name} {att.parent.last_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {token ? (
                    <span className="px-2 py-1 text-xs font-bold uppercase bg-neon/20 text-neon">
                      Code Ready
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-bold uppercase bg-yellow-500/20 text-yellow-400">
                      Pending
                    </span>
                  )}

                  <button
                    onClick={() => setShowManualCheckout(att.athlete_id)}
                    className="px-3 py-1 bg-orange-500/20 text-orange-400 text-xs font-bold uppercase hover:bg-orange-500/30 transition-colors"
                  >
                    Manual Checkout
                  </button>
                </div>
              </div>
            )
          })}

          {pendingPickup.length === 0 && (
            <div className="py-8 text-center">
              <CheckCircle className="h-12 w-12 text-neon mx-auto mb-4" />
              <p className="text-white/50">All campers have been picked up!</p>
            </div>
          )}
        </div>
      </PortalCard>

      {/* Manual Checkout Modal */}
      {showManualCheckout && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"
          onClick={() => setShowManualCheckout(null)}
        >
          <div
            className="bg-dark-100 border border-white/10 p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">
              Manual Checkout
            </h3>
            <p className="text-white/60 mb-4">
              Please provide a reason for manual checkout (e.g., parent verified by ID).
            </p>
            <textarea
              className="w-full h-24 px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none mb-4"
              placeholder="Reason for manual checkout..."
              value={manualCheckoutReason}
              onChange={(e) => setManualCheckoutReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowManualCheckout(null)
                  setManualCheckoutReason('')
                }}
                className="flex-1 px-4 py-2 bg-white/10 text-white font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleManualCheckout(showManualCheckout)}
                disabled={!manualCheckoutReason.trim() || actionLoading === showManualCheckout}
                className="flex-1 px-4 py-2 bg-orange-500 text-white font-bold uppercase tracking-wider hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                {actionLoading === showManualCheckout ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RecapTab({
  campDay,
  sportPlayed,
  setSportPlayed,
  guestSpeaker,
  setGuestSpeaker,
  wordOfTheDay,
  setWordOfTheDay,
  recapNotes,
  setRecapNotes,
  savingRecap,
  recapSaved,
  handleSaveRecap,
  sendingEmail,
  emailSent,
  handleSendEmail,
}: {
  campDay: CampDayDetails
  sportPlayed: string
  setSportPlayed: (v: string) => void
  guestSpeaker: string
  setGuestSpeaker: (v: string) => void
  wordOfTheDay: string
  setWordOfTheDay: (v: string) => void
  recapNotes: string
  setRecapNotes: (v: string) => void
  savingRecap: boolean
  recapSaved: boolean
  handleSaveRecap: () => void
  sendingEmail: string | null
  emailSent: string | null
  handleSendEmail: (type: 'daily_recap' | 'post_camp') => void
}) {
  return (
    <div className="space-y-6">
      {/* Attendance Summary */}
      <PortalCard title="Attendance Summary">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white/5 text-center">
            <p className="text-2xl font-bold text-white">{campDay.stats.registered}</p>
            <p className="text-xs text-white/50 uppercase">Registered</p>
          </div>
          <div className="p-4 bg-neon/5 text-center">
            <p className="text-2xl font-bold text-neon">
              {campDay.stats.checked_in + campDay.stats.checked_out}
            </p>
            <p className="text-xs text-white/50 uppercase">Attended</p>
          </div>
          <div className="p-4 bg-magenta/5 text-center">
            <p className="text-2xl font-bold text-magenta">{campDay.stats.absent}</p>
            <p className="text-xs text-white/50 uppercase">Absent</p>
          </div>
          <div className="p-4 bg-purple/5 text-center">
            <p className="text-2xl font-bold text-purple">{campDay.stats.checked_out}</p>
            <p className="text-xs text-white/50 uppercase">Picked Up</p>
          </div>
        </div>
      </PortalCard>

      {/* Daily Recap Form */}
      <PortalCard title="Daily Recap" accent="neon">
        <div className="space-y-4">
          {/* Sport Played */}
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
              Sport Played
            </label>
            <input
              type="text"
              value={sportPlayed}
              onChange={(e) => setSportPlayed(e.target.value)}
              placeholder="e.g., Basketball, Soccer, Flag Football..."
              className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
            />
          </div>

          {/* Guest Speaker */}
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
              Guest Speaker (Optional)
            </label>
            <input
              type="text"
              value={guestSpeaker}
              onChange={(e) => setGuestSpeaker(e.target.value)}
              placeholder="e.g., Coach John Smith, Local Athlete..."
              className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
            />
          </div>

          {/* Word of the Day */}
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
              Word of the Day
            </label>
            <input
              type="text"
              value={wordOfTheDay}
              onChange={(e) => setWordOfTheDay(e.target.value)}
              placeholder="e.g., Perseverance, Teamwork, Integrity..."
              className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
              Additional Notes
            </label>
            <textarea
              value={recapNotes}
              onChange={(e) => setRecapNotes(e.target.value)}
              placeholder="Highlights, notable moments, incidents to mention..."
              rows={4}
              className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
            />
          </div>

          {/* Save Button */}
          {recapSaved && (
            <div className="p-3 bg-neon/10 border border-neon/30 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-neon" />
              <span className="text-neon text-sm font-bold">Recap saved successfully!</span>
            </div>
          )}

          <button
            onClick={handleSaveRecap}
            disabled={savingRecap}
            className="w-full py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 disabled:opacity-50 transition-colors"
          >
            {savingRecap ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              'Save Recap'
            )}
          </button>
        </div>
      </PortalCard>

      {/* Communication Triggers */}
      <PortalCard title="Send Communications" accent="purple">
        <p className="text-white/50 text-sm mb-4">
          Send emails to all parents for this camp session. Make sure to save your recap first.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Daily Recap Email */}
          <div className="p-4 bg-white/5 border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <MessageSquare className="h-6 w-6 text-purple" />
              <h4 className="font-bold text-white">Daily Recap Email</h4>
            </div>
            <p className="text-sm text-white/50 mb-4">
              Send today's recap including sport, word of the day, and notes to all parents.
            </p>
            {emailSent === 'daily_recap' && (
              <div className="p-2 bg-neon/10 border border-neon/30 text-neon text-xs mb-4 flex items-center gap-2">
                <CheckCircle className="h-3 w-3" />
                Email queued for delivery!
              </div>
            )}
            <button
              onClick={() => handleSendEmail('daily_recap')}
              disabled={sendingEmail !== null}
              className="w-full py-2 bg-purple text-white font-bold uppercase tracking-wider text-sm hover:bg-purple/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {sendingEmail === 'daily_recap' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Daily Recap
                </>
              )}
            </button>
          </div>

          {/* Post-Camp Email (only show on last day or completed) */}
          {(campDay.status === 'completed') && (
            <div className="p-4 bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <Mic className="h-6 w-6 text-magenta" />
                <h4 className="font-bold text-white">Post-Camp Email</h4>
              </div>
              <p className="text-sm text-white/50 mb-4">
                Send thank-you message with survey link to all parents (use for final day).
              </p>
              {emailSent === 'post_camp' && (
                <div className="p-2 bg-neon/10 border border-neon/30 text-neon text-xs mb-4 flex items-center gap-2">
                  <CheckCircle className="h-3 w-3" />
                  Email queued for delivery!
                </div>
              )}
              <button
                onClick={() => handleSendEmail('post_camp')}
                disabled={sendingEmail !== null}
                className="w-full py-2 bg-magenta text-white font-bold uppercase tracking-wider text-sm hover:bg-magenta/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {sendingEmail === 'post_camp' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Post-Camp Email
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </PortalCard>
    </div>
  )
}
