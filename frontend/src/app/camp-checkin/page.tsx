'use client'

/**
 * Camp Check-In Landing Page
 *
 * Parent-facing page for checking in athletes to camp.
 * - Shows athletes registered for today's camps
 * - Handles onboarding confirmations if needed
 * - Allows quick QR-based check-in
 */

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

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

export default function CampCheckInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const campId = searchParams.get('campId')

  const [loading, setLoading] = useState(true)
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

  // Fetch check-in status
  useEffect(() => {
    const fetchStatus = async () => {
      if (!campId) {
        setError('No camp specified. Please scan a valid check-in QR code.')
        setLoading(false)
        return
      }

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
    }

    fetchStatus()
  }, [campId])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading check-in status...</p>
        </div>
      </div>
    )
  }

  if (error && !status) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Check-In Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/dashboard"
            className="inline-block bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!status || status.registrations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="text-gray-400 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">No Registrations Found</h1>
          <p className="text-gray-600 mb-6">
            You don&apos;t have any athletes registered for this camp.
          </p>
          <Link
            href="/camps"
            className="inline-block bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
          >
            Browse Camps
          </Link>
        </div>
      </div>
    )
  }

  const campInfo = status.registrations[0]?.camp
  const uncheckedCount = status.registrations.filter((r) => !r.is_checked_in).length
  const checkedInCount = status.registrations.filter((r) => r.is_checked_in).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-orange-600 text-white py-6 px-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold">Camp Check-In</h1>
          {campInfo && (
            <p className="text-orange-100 mt-1">{campInfo.name}</p>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">
        {/* Camp Info Card */}
        {campInfo && (
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">{campInfo.name}</h2>
                <p className="text-sm text-gray-600">{campInfo.location}</p>
              </div>
              <span className="text-sm text-gray-500">
                {campInfo.start_time} - {campInfo.end_time}
              </span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Already Checked In */}
        {checkedInCount > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-green-800 mb-2">Already Checked In</h3>
            {status.registrations
              .filter((r) => r.is_checked_in)
              .map((r) => (
                <div key={r.athlete.id} className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-green-800">
                    {r.athlete.first_name} {r.athlete.last_name}
                  </span>
                  <span className="text-sm text-green-600 ml-auto">
                    {r.check_in_time && new Date(r.check_in_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              ))}
          </div>
        )}

        {/* Athletes to Check In */}
        {uncheckedCount > 0 && (
          <>
            <h3 className="font-medium text-gray-900 mb-2">Select Athletes to Check In</h3>
            <div className="space-y-2 mb-6">
              {status.registrations
                .filter((r) => !r.is_checked_in)
                .map((r) => (
                  <div
                    key={r.athlete.id}
                    className={`bg-white rounded-lg shadow p-4 cursor-pointer transition-all ${
                      selectedAthletes.has(r.athlete.id)
                        ? 'ring-2 ring-orange-500'
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => toggleAthleteSelection(r.athlete.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                          selectedAthletes.has(r.athlete.id)
                            ? 'bg-orange-600 border-orange-600'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedAthletes.has(r.athlete.id) && (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-600 font-medium">
                            {r.athlete.first_name[0]}{r.athlete.last_name[0]}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {r.athlete.first_name} {r.athlete.last_name}
                        </p>
                        {r.athlete.age_group && (
                          <p className="text-sm text-gray-500">{r.athlete.age_group}</p>
                        )}
                      </div>
                      {r.needs_onboarding && !r.onboarding && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          Needs info
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {/* Onboarding Modal */}
            {showOnboarding && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Confirm Information
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Please confirm the following for{' '}
                    {status.registrations.find((r) => r.athlete.id === showOnboarding)?.athlete.first_name}:
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
                          className="mt-1 h-4 w-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
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
                        <span className="text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowOnboarding(null)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
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
                      className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="w-full py-4 bg-orange-600 text-white text-lg font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">All Set!</h2>
            <p className="text-gray-600 mb-6">All your athletes are checked in for today.</p>
            <Link
              href="/portal/pickup"
              className="inline-block bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
            >
              View Pickup Codes
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
