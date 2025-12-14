'use client'

/**
 * Today's Camps Dashboard
 *
 * Director view showing all camps running today.
 * Entry point to Camp Day control panels.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface CampDayInfo {
  id: string
  camp_id: string
  camp_name: string
  location: string
  day_number: number
  status: 'not_started' | 'check_in' | 'in_progress' | 'dismissal' | 'completed'
  date: string
  start_time: string
  end_time: string
  stats: {
    registered: number
    checked_in: number
    absent: number
    checked_out: number
  }
}

export default function TodaysCampsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [campDays, setCampDays] = useState<CampDayInfo[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    const fetchCampDays = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/camp-days?date=${selectedDate}`)
        const json = await res.json()

        if (!res.ok) {
          throw new Error(json.error || 'Failed to load camps')
        }

        setCampDays(json.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    fetchCampDays()

    // Refresh every minute
    const interval = setInterval(fetchCampDays, 60000)
    return () => clearInterval(interval)
  }, [selectedDate])

  const getStatusColor = (status: CampDayInfo['status']) => {
    switch (status) {
      case 'not_started':
        return 'bg-gray-100 text-gray-800'
      case 'check_in':
        return 'bg-blue-100 text-blue-800'
      case 'in_progress':
        return 'bg-green-100 text-green-800'
      case 'dismissal':
        return 'bg-orange-100 text-orange-800'
      case 'completed':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: CampDayInfo['status']) => {
    switch (status) {
      case 'not_started':
        return 'Not Started'
      case 'check_in':
        return 'Check-In'
      case 'in_progress':
        return 'In Progress'
      case 'dismissal':
        return 'Dismissal'
      case 'completed':
        return 'Completed'
      default:
        return status
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Today&apos;s Camps</h1>
              <p className="text-gray-500">Manage your camp days</p>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading camps...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        ) : campDays.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Camps Today</h2>
            <p className="text-gray-600">
              {selectedDate === new Date().toISOString().split('T')[0]
                ? "You don't have any camps scheduled for today."
                : `No camps scheduled for ${new Date(selectedDate).toLocaleDateString()}.`}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campDays.map((campDay) => (
              <Link
                key={campDay.id}
                href={`/director/camp-day/${campDay.id}`}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {campDay.camp_name}
                      </h3>
                      <p className="text-sm text-gray-500">{campDay.location}</p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(
                        campDay.status
                      )}`}
                    >
                      {getStatusLabel(campDay.status)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <span>Day {campDay.day_number}</span>
                    <span>
                      {campDay.start_time} - {campDay.end_time}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2 pt-4 border-t border-gray-100">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">
                        {campDay.stats?.registered || 0}
                      </p>
                      <p className="text-xs text-gray-500">Registered</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {campDay.stats?.checked_in || 0}
                      </p>
                      <p className="text-xs text-gray-500">Checked In</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">
                        {campDay.stats?.absent || 0}
                      </p>
                      <p className="text-xs text-gray-500">Absent</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {campDay.stats?.checked_out || 0}
                      </p>
                      <p className="text-xs text-gray-500">Picked Up</p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gray-50 px-6 py-3 rounded-b-lg border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {campDay.status === 'not_started'
                        ? 'Tap to start check-in'
                        : campDay.status === 'completed'
                        ? 'View day summary'
                        : 'Manage camp day'}
                    </span>
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
