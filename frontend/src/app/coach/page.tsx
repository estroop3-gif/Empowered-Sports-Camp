'use client'

/**
 * Coach Dashboard
 *
 * Main landing page for coaches showing their assigned camps
 * with quick access to The Roster.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { Loader2, ClipboardList, Calendar, Users } from 'lucide-react'

interface AssignedCamp {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
  registrationCount: number
}

export default function CoachDashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [camps, setCamps] = useState<AssignedCamp[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAssignedCamps = async () => {
      if (!user) return
      try {
        // Fetch camps where user is assigned as staff
        const res = await fetch('/api/camps?assignedToMe=true')
        const json = await res.json()
        if (res.ok && json.data) {
          setCamps(json.data)
        }
      } catch (error) {
        console.error('Failed to fetch camps:', error)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      fetchAssignedCamps()
    }
  }, [user, authLoading])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Coach Dashboard</h1>
          <p className="text-gray-500 mt-2">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}! Here are your assigned camps.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {camps.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Camps Assigned</h3>
            <p className="text-gray-500">
              You haven&apos;t been assigned to any camps yet. Contact your director for assignments.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {camps.map((camp) => {
              const isActive = camp.status === 'in_progress'
              const isUpcoming = new Date(camp.startDate) > new Date()

              return (
                <div
                  key={camp.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-bold text-gray-900">{camp.name}</h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          isActive
                            ? 'bg-green-100 text-green-800'
                            : isUpcoming
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {isActive ? 'Active' : isUpcoming ? 'Upcoming' : camp.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(camp.startDate).toLocaleDateString()} -{' '}
                          {new Date(camp.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{camp.registrationCount} campers registered</span>
                      </div>
                    </div>

                    <Link
                      href={`/coach/camps/${camp.id}/roster`}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <ClipboardList className="w-4 h-4" />
                      Open The Roster
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
