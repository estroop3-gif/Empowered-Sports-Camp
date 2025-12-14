'use client'

/**
 * Camp Day Control Panel
 *
 * Director's main interface for managing a camp day.
 * Tabs: Check-In, Groups, Live Day, Dismissal, Recap
 */

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'

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
  const [activeTab, setActiveTab] = useState<TabId>('checkin')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [campDay, setCampDay] = useState<CampDayDetails | null>(null)
  const [pickupTokens, setPickupTokens] = useState<PickupTokenInfo[]>([])
  const [showQRModal, setShowQRModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [manualCheckoutReason, setManualCheckoutReason] = useState('')
  const [showManualCheckout, setShowManualCheckout] = useState<string | null>(null)

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

  const checkInQRUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/camp-checkin?campId=${campDay?.camp_id}`
      : ''

  const filteredAttendance = campDay?.attendance.filter((a) => {
    if (!searchTerm) return true
    const name = `${a.athlete.first_name} ${a.athlete.last_name}`.toLowerCase()
    return name.includes(searchTerm.toLowerCase())
  })

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    {
      id: 'checkin',
      label: 'Check-In',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'groups',
      label: 'Groups',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      id: 'liveday',
      label: 'Live Day',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: 'dismissal',
      label: 'Dismissal',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      ),
    },
    {
      id: 'recap',
      label: 'Recap',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading camp day...</p>
        </div>
      </div>
    )
  }

  if (error || !campDay) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-6 max-w-md w-full text-center">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error || 'Camp day not found'}</p>
          <Link
            href="/director/today"
            className="inline-block bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
          >
            Back to Today&apos;s Camps
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/director/today"
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{campDay.camp_name}</h1>
                <p className="text-sm text-gray-500">
                  Day {campDay.day_number} - {new Date(campDay.date).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Status Badge & Actions */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span
                  className={`inline-block text-sm font-medium px-3 py-1 rounded-full ${
                    campDay.status === 'not_started'
                      ? 'bg-gray-100 text-gray-800'
                      : campDay.status === 'check_in'
                      ? 'bg-blue-100 text-blue-800'
                      : campDay.status === 'in_progress'
                      ? 'bg-green-100 text-green-800'
                      : campDay.status === 'dismissal'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {campDay.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
              </div>

              {campDay.status === 'not_started' && (
                <button
                  onClick={() => updateStatus('check_in')}
                  disabled={actionLoading === 'status'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Start Check-In
                </button>
              )}
              {campDay.status === 'check_in' && (
                <button
                  onClick={() => updateStatus('in_progress')}
                  disabled={actionLoading === 'status'}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Start Camp Day
                </button>
              )}
              {campDay.status === 'in_progress' && (
                <button
                  onClick={() => updateStatus('dismissal')}
                  disabled={actionLoading === 'status'}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  Begin Dismissal
                </button>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{campDay.stats.registered}</p>
              <p className="text-xs text-gray-500">Registered</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{campDay.stats.checked_in}</p>
              <p className="text-xs text-gray-500">Checked In</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{campDay.stats.absent}</p>
              <p className="text-xs text-gray-500">Absent</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-purple-600">{campDay.stats.checked_out}</p>
              <p className="text-xs text-gray-500">Picked Up</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 border-b border-gray-200 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Check-In Tab */}
        {activeTab === 'checkin' && (
          <div>
            {/* QR Code Button */}
            <div className="bg-white rounded-lg shadow p-4 mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Check-In QR Code</h3>
                <p className="text-sm text-gray-500">
                  Display this QR code for parents to scan
                </p>
              </div>
              <button
                onClick={() => setShowQRModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                Show QR Code
              </button>
            </div>

            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search athletes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* Attendance List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Athlete
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Parent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Time
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAttendance?.map((att) => (
                    <tr key={att.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {att.athlete.photo_url ? (
                            <img
                              src={att.athlete.photo_url}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-600 font-medium">
                                {att.athlete.first_name[0]}{att.athlete.last_name[0]}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">
                              {att.athlete.first_name} {att.athlete.last_name}
                            </p>
                            {att.group_name && (
                              <p className="text-sm text-gray-500">{att.group_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {att.parent ? (
                          <div>
                            <p className="text-sm text-gray-900">
                              {att.parent.first_name} {att.parent.last_name}
                            </p>
                            {att.parent.phone && (
                              <p className="text-sm text-gray-500">{att.parent.phone}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            att.status === 'checked_in'
                              ? 'bg-green-100 text-green-800'
                              : att.status === 'absent'
                              ? 'bg-red-100 text-red-800'
                              : att.status === 'checked_out'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {att.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {att.check_in_time
                          ? new Date(att.check_in_time).toLocaleTimeString([], {
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {att.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleManualCheckIn(att.athlete_id)}
                              disabled={actionLoading === att.athlete_id}
                              className="text-sm text-green-600 hover:text-green-800 disabled:opacity-50"
                            >
                              Check In
                            </button>
                            <button
                              onClick={() => handleMarkAbsent(att.athlete_id)}
                              disabled={actionLoading === att.athlete_id}
                              className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                            >
                              Mark Absent
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Groups Tab */}
        {activeTab === 'groups' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Camp Groups</h3>
            {campDay.groups && campDay.groups.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {campDay.groups.map((group) => (
                  <div
                    key={group.id}
                    className="border border-gray-200 rounded-lg p-4"
                    style={{ borderLeftColor: group.color, borderLeftWidth: 4 }}
                  >
                    <h4 className="font-medium text-gray-900">{group.name}</h4>
                    <p className="text-sm text-gray-500">{group.athlete_count} athletes</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No groups configured for this camp.</p>
            )}
          </div>
        )}

        {/* Live Day Tab */}
        {activeTab === 'liveday' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Day View</h3>
            <p className="text-gray-500 mb-6">
              Track schedule progress, incidents, and notes throughout the day.
            </p>
            {/* Placeholder - would include schedule blocks, incident logging, etc. */}
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-400">Schedule tracking and incident logging coming soon</p>
            </div>
          </div>
        )}

        {/* Dismissal Tab */}
        {activeTab === 'dismissal' && (
          <div>
            {/* Generate Codes Button */}
            {campDay.status === 'dismissal' && (
              <div className="bg-white rounded-lg shadow p-4 mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Pickup Codes</h3>
                  <p className="text-sm text-gray-500">
                    Generate pickup codes for checked-in athletes
                  </p>
                </div>
                <button
                  onClick={generatePickupCodes}
                  disabled={actionLoading === 'generate'}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {actionLoading === 'generate' ? 'Generating...' : 'Generate Codes'}
                </button>
              </div>
            )}

            {/* Athletes pending pickup */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Pending Pickup</h3>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Athlete
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Parent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Code Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {campDay.attendance
                    .filter((a) => a.status === 'checked_in')
                    .map((att) => {
                      const token = pickupTokens.find((t) => t.athlete_id === att.athlete_id)
                      return (
                        <tr key={att.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              {att.athlete.photo_url ? (
                                <img
                                  src={att.athlete.photo_url}
                                  alt=""
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                  <span className="text-gray-600 font-medium">
                                    {att.athlete.first_name[0]}{att.athlete.last_name[0]}
                                  </span>
                                </div>
                              )}
                              <p className="font-medium text-gray-900">
                                {att.athlete.first_name} {att.athlete.last_name}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {att.parent ? (
                              <p className="text-sm text-gray-900">
                                {att.parent.first_name} {att.parent.last_name}
                              </p>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {token ? (
                              <span className="text-green-600 text-sm">Code generated</span>
                            ) : (
                              <span className="text-yellow-600 text-sm">Pending</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => setShowManualCheckout(att.athlete_id)}
                              className="text-sm text-orange-600 hover:text-orange-800"
                            >
                              Manual Checkout
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recap Tab */}
        {activeTab === 'recap' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Day Recap</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Attendance Summary</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Total Registered</span>
                    <span className="font-medium">{campDay.stats.registered}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Attended</span>
                    <span className="font-medium text-green-600">{campDay.stats.checked_in + campDay.stats.checked_out}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Absent</span>
                    <span className="font-medium text-red-600">{campDay.stats.absent}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Picked Up</span>
                    <span className="font-medium text-purple-600">{campDay.stats.checked_out}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2">Notes</h4>
                <textarea
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Add day notes..."
                  defaultValue={campDay.notes || ''}
                />
              </div>
            </div>

            {campDay.status !== 'completed' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => updateStatus('completed')}
                  disabled={actionLoading === 'status'}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  Mark Day Complete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setShowQRModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-md w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-2">Check-In QR Code</h2>
            <p className="text-gray-500 mb-6">{campDay.camp_name}</p>

            <div className="bg-white p-4 rounded-xl border-2 border-gray-100 inline-block mb-4">
              <QRCodeSVG value={checkInQRUrl} size={250} level="H" includeMargin />
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Parents scan this code to check in their athletes
            </p>

            <button
              onClick={() => setShowQRModal(false)}
              className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Manual Checkout Modal */}
      {showManualCheckout && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowManualCheckout(null)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Manual Checkout</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for manual checkout (e.g., parent verified by ID,
              authorized pickup person, etc.)
            </p>
            <textarea
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 mb-4"
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
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleManualCheckout(showManualCheckout)}
                disabled={!manualCheckoutReason.trim() || actionLoading === showManualCheckout}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {actionLoading === showManualCheckout ? 'Processing...' : 'Confirm Checkout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
