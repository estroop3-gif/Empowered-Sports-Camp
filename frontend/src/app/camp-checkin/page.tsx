'use client'

/**
 * Camp Check-In Landing Page
 *
 * Parent-facing page for checking in athletes to camp.
 * - If no campId specified, shows camp selector for kiosk mode
 * - Shows athletes registered for today's camps
 * - Handles onboarding confirmations if needed
 * - Allows quick QR-based check-in
 *
 * STATUS: Coming Soon - Feature is implemented but disabled for launch.
 * To enable: Set FEATURE_CHECKIN_KIOSK_ENABLED to true
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useBannerOffset } from '@/hooks/useBannerOffset'

// Feature flag - set to true to enable the check-in kiosk
const FEATURE_CHECKIN_KIOSK_ENABLED = false

interface CampOption {
  id: string
  name: string
  start_date: string
  end_date: string
  location_name: string | null
  city: string | null
  state: string | null
  registered_count: number
  checked_in_count: number
}

interface Athlete {
  id: string
  first_name: string
  last_name: string
  photo_url: string | null
  age_group: string | null
}

interface CampInfo {
  id: string
  name: string
  location: string
  start_time: string
  end_time: string
}

interface RegistrationInfo {
  id: string
  athlete: Athlete
  camp: CampInfo
  is_checked_in: boolean
  check_in_time: string | null
  needs_onboarding: boolean
  onboarding: {
    emergency_contact_confirmed: boolean
    medical_info_confirmed: boolean
    pickup_auth_confirmed: boolean
    waiver_accepted: boolean
  } | null
}

interface CheckInStatus {
  registrations: RegistrationInfo[]
  camp_day_id: string | null
}

// Coming Soon component for when feature is disabled
function ComingSoonPage() {
  const { topWithNavbar } = useBannerOffset()

  return (
    <div
      className="min-h-screen bg-black flex items-center justify-center p-4"
      style={{ paddingTop: `${topWithNavbar}px` }}
    >
      <div className="max-w-lg w-full text-center">
        {/* Icon */}
        <div className="w-24 h-24 mx-auto mb-8 relative">
          <div className="absolute inset-0 bg-neon/20 rounded-full animate-pulse" />
          <div className="absolute inset-2 bg-dark-100 rounded-full flex items-center justify-center border border-neon/30">
            <svg
              className="w-10 h-10 text-neon"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-black uppercase tracking-wider text-white mb-4">
          Coming Soon
        </h1>

        {/* Subtitle */}
        <div className="inline-block px-4 py-2 bg-neon/10 border border-neon/30 mb-6">
          <span className="text-neon font-bold uppercase tracking-wider text-sm">
            QR Code Check-In Kiosk
          </span>
        </div>

        {/* Description */}
        <p className="text-white/60 mb-8 max-w-md mx-auto">
          Our streamlined QR code check-in system is currently in development.
          Soon you&apos;ll be able to quickly check in campers using QR codes
          at self-service kiosks.
        </p>

        {/* Features Preview */}
        <div className="bg-dark-100 border border-white/10 p-6 mb-8 text-left">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">
            Upcoming Features
          </h3>
          <ul className="space-y-3">
            {[
              'Quick QR code scanning for fast check-ins',
              'Self-service kiosk mode for drop-off areas',
              'Real-time attendance tracking',
              'Digital onboarding confirmation',
              'Secure pickup verification',
            ].map((feature, i) => (
              <li key={i} className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-neon flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-white/70">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Back Button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}

// Main check-in functionality component
function CheckInKiosk() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const campIdParam = searchParams.get('campId')
  const { topWithNavbar } = useBannerOffset()

  // Kiosk mode - when no campId in URL, show camp selector
  const [kioskMode, setKioskMode] = useState(!campIdParam)
  const [selectedCampId, setSelectedCampId] = useState<string | null>(campIdParam)
  const [availableCamps, setAvailableCamps] = useState<CampOption[]>([])
  const [loadingCamps, setLoadingCamps] = useState(!campIdParam)

  const [loading, setLoading] = useState(!!campIdParam)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<CheckInStatus | null>(null)
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set())
  const [checkingIn, setCheckingIn] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState<string | null>(null)
  const [onboardingConfirmations, setOnboardingConfirmations] = useState<{
    [athleteId: string]: {
      emergency_contact_confirmed: boolean
      medical_info_confirmed: boolean
      pickup_auth_confirmed: boolean
      waiver_accepted: boolean
    }
  }>({})

  // Fetch available camps for kiosk mode
  useEffect(() => {
    const fetchCamps = async () => {
      if (campIdParam) return // Skip if campId provided in URL

      try {
        const res = await fetch('/api/camp-checkin/camps')
        const json = await res.json()

        if (res.ok && json.data) {
          setAvailableCamps(json.data)
        }
      } catch (err) {
        console.error('Failed to load camps:', err)
      } finally {
        setLoadingCamps(false)
      }
    }

    fetchCamps()
  }, [campIdParam])

  // Fetch check-in status when camp is selected
  const fetchCheckInStatus = useCallback(async (campId: string) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/camp-checkin/status?campId=${campId}`)
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load check-in status')
      }

      setStatus(json.data)

      // Pre-select athletes not yet checked in
      const unchecked = new Set<string>()
      json.data.registrations
        .filter((r: RegistrationInfo) => !r.is_checked_in)
        .forEach((r: RegistrationInfo) => unchecked.add(r.athlete.id))
      setSelectedAthletes(unchecked)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch check-in status on initial load if campId provided
  useEffect(() => {
    if (campIdParam) {
      fetchCheckInStatus(campIdParam)
    }
  }, [campIdParam, fetchCheckInStatus])

  // Handle camp selection in kiosk mode
  const handleSelectCamp = (campId: string) => {
    setSelectedCampId(campId)
    setKioskMode(false)
    fetchCheckInStatus(campId)
  }

  // Handle back to camp selection
  const handleBackToCampSelection = () => {
    setKioskMode(true)
    setSelectedCampId(null)
    setStatus(null)
    setError(null)
    setSelectedAthletes(new Set())
  }

  const campId = selectedCampId

  const toggleAthleteSelection = (athleteId: string) => {
    const newSelected = new Set(selectedAthletes)
    if (newSelected.has(athleteId)) {
      newSelected.delete(athleteId)
    } else {
      newSelected.add(athleteId)
    }
    setSelectedAthletes(newSelected)
  }

  const handleOnboardingChange = (
    athleteId: string,
    field: keyof typeof onboardingConfirmations[string],
    value: boolean
  ) => {
    setOnboardingConfirmations((prev) => ({
      ...prev,
      [athleteId]: {
        ...(prev[athleteId] || {
          emergency_contact_confirmed: false,
          medical_info_confirmed: false,
          pickup_auth_confirmed: false,
          waiver_accepted: false,
        }),
        [field]: value,
      },
    }))
  }

  const isOnboardingComplete = (athleteId: string) => {
    const conf = onboardingConfirmations[athleteId]
    if (!conf) return false
    return (
      conf.emergency_contact_confirmed &&
      conf.medical_info_confirmed &&
      conf.pickup_auth_confirmed &&
      conf.waiver_accepted
    )
  }

  const handleCheckIn = async () => {
    if (!campId || selectedAthletes.size === 0) return

    // Validate onboarding for selected athletes
    const athletesNeedingOnboarding = status?.registrations.filter(
      (r) => selectedAthletes.has(r.athlete.id) && r.needs_onboarding && !r.onboarding
    )

    if (athletesNeedingOnboarding?.length) {
      // Check if all have completed onboarding
      const incomplete = athletesNeedingOnboarding.filter(
        (r) => !isOnboardingComplete(r.athlete.id)
      )
      if (incomplete.length > 0) {
        setShowOnboarding(incomplete[0].athlete.id)
        return
      }
    }

    setCheckingIn(true)
    setError(null)

    try {
      // Prepare request
      const athletes = status?.registrations
        .filter((r) => selectedAthletes.has(r.athlete.id) && !r.is_checked_in)
        .map((r) => ({
          athlete_id: r.athlete.id,
          registration_id: r.id,
        }))

      const onboarding = Object.entries(onboardingConfirmations)
        .filter(([athleteId]) => selectedAthletes.has(athleteId))
        .map(([athleteId, conf]) => ({
          athlete_id: athleteId,
          ...conf,
        }))

      const res = await fetch('/api/camp-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          camp_id: campId,
          athletes,
          onboarding: onboarding.length > 0 ? onboarding : undefined,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to check in')
      }

      // Redirect to success page
      router.push(`/camp-checkin/success?count=${json.data.checked_in}&campId=${campId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed')
    } finally {
      setCheckingIn(false)
    }
  }

  // Kiosk Mode - Camp Selector
  if (kioskMode) {
    if (loadingCamps) {
      return (
        <div
          className="min-h-screen bg-black flex items-center justify-center"
          style={{ paddingTop: `${topWithNavbar}px` }}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon mx-auto"></div>
            <p className="mt-4 text-white/50">Loading camps...</p>
          </div>
        </div>
      )
    }

    return (
      <div
        className="min-h-screen bg-black"
        style={{ paddingTop: `${topWithNavbar}px` }}
      >
        {/* Header */}
        <div className="bg-dark-100 border-b border-white/10 py-6 px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-black uppercase tracking-wider text-white">
              Check-In Kiosk
            </h1>
            <p className="text-white/50 mt-2">Select a camp to begin check-in</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          {availableCamps.length === 0 ? (
            <div className="bg-dark-100 border border-white/10 p-8 text-center">
              <div className="text-white/30 mb-4">
                <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">No Active Camps</h2>
              <p className="text-white/50">
                There are no camps available for check-in today.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {availableCamps.map((camp) => {
                const startDate = new Date(camp.start_date)
                const endDate = new Date(camp.end_date)
                const isToday = new Date().toDateString() === startDate.toDateString()
                const isOngoing = new Date() >= startDate && new Date() <= endDate

                return (
                  <button
                    key={camp.id}
                    onClick={() => handleSelectCamp(camp.id)}
                    className="bg-dark-100 border border-white/10 p-6 text-left hover:border-neon/50 hover:bg-dark-100/80 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold text-white group-hover:text-neon transition-colors">
                        {camp.name}
                      </h3>
                      {(isToday || isOngoing) && (
                        <span className="px-2 py-1 bg-neon/20 text-neon text-xs font-bold uppercase">
                          {isToday ? 'Today' : 'Active'}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 text-sm text-white/50">
                      {camp.location_name && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{camp.location_name}</span>
                        </div>
                      )}
                      {(camp.city || camp.state) && (
                        <div className="flex items-center gap-2 pl-6">
                          <span>{[camp.city, camp.state].filter(Boolean).join(', ')}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>
                          {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                      <div className="text-sm">
                        <span className="text-white font-medium">{camp.checked_in_count}</span>
                        <span className="text-white/50"> / {camp.registered_count} checked in</span>
                      </div>
                      <div className="text-neon group-hover:translate-x-1 transition-transform">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div
        className="min-h-screen bg-black flex items-center justify-center"
        style={{ paddingTop: `${topWithNavbar}px` }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon mx-auto"></div>
          <p className="mt-4 text-white/50">Loading check-in status...</p>
        </div>
      </div>
    )
  }

  if (error && !status) {
    return (
      <div
        className="min-h-screen bg-black flex items-center justify-center p-4"
        style={{ paddingTop: `${topWithNavbar}px` }}
      >
        <div className="bg-dark-100 border border-white/10 p-6 max-w-md w-full text-center">
          <div className="text-red-400 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Check-In Error</h1>
          <p className="text-white/50 mb-6">{error}</p>
          {!campIdParam && (
            <button
              onClick={handleBackToCampSelection}
              className="inline-block bg-neon text-black px-6 py-2 font-bold uppercase tracking-wider hover:bg-neon/90"
            >
              Back to Camp Selection
            </button>
          )}
          {campIdParam && (
            <Link
              href="/dashboard"
              className="inline-block bg-neon text-black px-6 py-2 font-bold uppercase tracking-wider hover:bg-neon/90"
            >
              Go to Dashboard
            </Link>
          )}
        </div>
      </div>
    )
  }

  if (!status || status.registrations.length === 0) {
    return (
      <div
        className="min-h-screen bg-black flex items-center justify-center p-4"
        style={{ paddingTop: `${topWithNavbar}px` }}
      >
        <div className="bg-dark-100 border border-white/10 p-6 max-w-md w-full text-center">
          <div className="text-white/30 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">No Registrations Found</h1>
          <p className="text-white/50 mb-6">
            You don&apos;t have any athletes registered for this camp.
          </p>
          {!campIdParam && (
            <button
              onClick={handleBackToCampSelection}
              className="inline-block bg-neon text-black px-6 py-2 font-bold uppercase tracking-wider hover:bg-neon/90"
            >
              Back to Camp Selection
            </button>
          )}
          {campIdParam && (
            <Link
              href="/camps"
              className="inline-block bg-neon text-black px-6 py-2 font-bold uppercase tracking-wider hover:bg-neon/90"
            >
              Browse Camps
            </Link>
          )}
        </div>
      </div>
    )
  }

  const campInfo = status.registrations[0]?.camp
  const uncheckedCount = status.registrations.filter((r) => !r.is_checked_in).length
  const checkedInCount = status.registrations.filter((r) => r.is_checked_in).length

  return (
    <div
      className="min-h-screen bg-black"
      style={{ paddingTop: `${topWithNavbar}px` }}
    >
      {/* Header */}
      <div className="bg-dark-100 border-b border-white/10 py-6 px-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-4">
            {!campIdParam && (
              <button
                onClick={handleBackToCampSelection}
                className="p-2 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-2xl font-black uppercase tracking-wider text-white">Camp Check-In</h1>
              {campInfo && (
                <p className="text-white/50 mt-1">{campInfo.name}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">
        {/* Camp Info Card */}
        {campInfo && (
          <div className="bg-dark-100 border border-white/10 p-4 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-white">{campInfo.name}</h2>
                <p className="text-sm text-white/50">{campInfo.location}</p>
              </div>
              <span className="text-sm text-white/50">
                {campInfo.start_time} - {campInfo.end_time}
              </span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 mb-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Already Checked In */}
        {checkedInCount > 0 && (
          <div className="bg-green-500/10 border border-green-500/30 p-4 mb-4">
            <h3 className="font-bold text-green-400 mb-2">Already Checked In</h3>
            {status.registrations
              .filter((r) => r.is_checked_in)
              .map((r) => (
                <div key={r.athlete.id} className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-white">
                    {r.athlete.first_name} {r.athlete.last_name}
                  </span>
                  <span className="text-sm text-green-400 ml-auto">
                    {r.check_in_time && new Date(r.check_in_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              ))}
          </div>
        )}

        {/* Athletes to Check In */}
        {uncheckedCount > 0 && (
          <>
            <h3 className="font-bold text-white mb-2">Select Athletes to Check In</h3>
            <div className="space-y-2 mb-6">
              {status.registrations
                .filter((r) => !r.is_checked_in)
                .map((r) => (
                  <div
                    key={r.athlete.id}
                    className={`bg-dark-100 border p-4 cursor-pointer transition-all ${
                      selectedAthletes.has(r.athlete.id)
                        ? 'border-neon ring-1 ring-neon'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                    onClick={() => toggleAthleteSelection(r.athlete.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                          selectedAthletes.has(r.athlete.id)
                            ? 'bg-neon border-neon'
                            : 'border-white/30'
                        }`}
                      >
                        {selectedAthletes.has(r.athlete.id) && (
                          <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {r.athlete.photo_url ? (
                        <img
                          src={r.athlete.photo_url}
                          alt={r.athlete.first_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                          <span className="text-white/70 font-medium">
                            {r.athlete.first_name[0]}{r.athlete.last_name[0]}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-white">
                          {r.athlete.first_name} {r.athlete.last_name}
                        </p>
                        {r.athlete.age_group && (
                          <p className="text-sm text-white/50">{r.athlete.age_group}</p>
                        )}
                      </div>
                      {r.needs_onboarding && !r.onboarding && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1">
                          Needs info
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {/* Onboarding Modal */}
            {showOnboarding && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[70]">
                <div className="bg-dark-100 border border-white/10 max-w-md w-full p-6">
                  <h3 className="text-lg font-bold text-white mb-4">
                    Confirm Information
                  </h3>
                  <p className="text-white/50 mb-4">
                    Please confirm the following for{' '}
                    <span className="text-white">{status.registrations.find((r) => r.athlete.id === showOnboarding)?.athlete.first_name}</span>:
                  </p>

                  <div className="space-y-3 mb-6">
                    {[
                      { key: 'emergency_contact_confirmed', label: 'Emergency contact information is up to date' },
                      { key: 'medical_info_confirmed', label: 'Medical information and allergies are up to date' },
                      { key: 'pickup_auth_confirmed', label: 'Authorized pickup persons are up to date' },
                      { key: 'waiver_accepted', label: 'I accept the camp liability waiver' },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 accent-neon bg-transparent border-white/30 rounded focus:ring-neon focus:ring-offset-0"
                          checked={
                            onboardingConfirmations[showOnboarding]?.[
                              key as keyof typeof onboardingConfirmations[string]
                            ] || false
                          }
                          onChange={(e) =>
                            handleOnboardingChange(
                              showOnboarding,
                              key as keyof typeof onboardingConfirmations[string],
                              e.target.checked
                            )
                          }
                        />
                        <span className="text-white/70">{label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowOnboarding(null)}
                      className="flex-1 px-4 py-2 border border-white/20 text-white/70 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (isOnboardingComplete(showOnboarding)) {
                          setShowOnboarding(null)
                          handleCheckIn()
                        }
                      }}
                      disabled={!isOnboardingComplete(showOnboarding)}
                      className="flex-1 px-4 py-2 bg-neon text-black font-bold hover:bg-neon/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Check In Button */}
            <button
              onClick={handleCheckIn}
              disabled={selectedAthletes.size === 0 || checkingIn}
              className="w-full py-4 bg-neon text-black text-lg font-bold uppercase tracking-wider hover:bg-neon/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {checkingIn ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Checking In...
                </span>
              ) : (
                `Check In ${selectedAthletes.size} Athlete${selectedAthletes.size !== 1 ? 's' : ''}`
              )}
            </button>
          </>
        )}

        {/* All Checked In */}
        {uncheckedCount === 0 && checkedInCount > 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">All Set!</h2>
            <p className="text-white/50 mb-6">All your athletes are checked in for today.</p>
            <Link
              href="/portal/pickup"
              className="inline-block bg-neon text-black px-6 py-3 font-bold uppercase tracking-wider hover:bg-neon/90"
            >
              View Pickup Codes
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

// Default export - renders Coming Soon or the actual kiosk based on feature flag
export default function CampCheckInPage() {
  if (!FEATURE_CHECKIN_KIOSK_ENABLED) {
    return <ComingSoonPage />
  }
  return <CheckInKiosk />
}
