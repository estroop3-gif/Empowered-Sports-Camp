'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { parseDateSafe, formatTime12h } from '@/lib/utils'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import {
  Calendar,
  Users,
  MapPin,
  Clock,
  CheckCircle,
  ArrowRight,
  Loader2,
  Search,
  ClipboardList,
  LayoutDashboard,
} from 'lucide-react'
import { fetchCampsForDirector, type DirectorCampDetail } from '@/lib/services/camps'

/**
 * Director Camps Page
 *
 * Shows camps assigned to this director with:
 * - Grouping tool access
 * - Schedule view
 * - Quick stats
 *
 * All features are gated behind LMS completion.
 */

export default function DirectorCampsPage() {
  const { hasCompletedRequiredLms } = useAuth()
  const [loading, setLoading] = useState(true)
  const [camps, setCamps] = useState<DirectorCampDetail[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'upcoming' | 'past'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadCamps()
  }, [])

  async function loadCamps() {
    // Fetch camps - in production, filter by staff_assignments for this director
    const { data, error } = await fetchCampsForDirector()

    if (error) {
      console.error('Error loading camps:', error)
    }

    if (data) {
      setCamps(data)
    }

    setLoading(false)
  }

  // Filter camps
  const today = new Date().toISOString().split('T')[0]
  const filteredCamps = camps.filter((camp) => {
    // Search filter
    if (searchTerm && !camp.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }

    // Status filter
    switch (filter) {
      case 'active':
        return camp.start_date <= today && camp.end_date >= today
      case 'upcoming':
        return camp.start_date > today
      case 'past':
        return camp.end_date < today
      default:
        return true
    }
  })

  // Count by status
  const activeCamps = camps.filter((c) => c.start_date <= today && c.end_date >= today)
  const upcomingCamps = camps.filter((c) => c.start_date > today)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-magenta animate-spin" />
      </div>
    )
  }

  return (
    <LmsGate featureName="camp management">
      <div>
        <PortalPageHeader
          title="My Camps"
          description="View and manage camps you're assigned to"
        />

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <PortalCard>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-neon/20 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-neon" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{activeCamps.length}</p>
                <p className="text-sm text-white/50">Active Now</p>
              </div>
            </div>
          </PortalCard>

          <PortalCard>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-purple/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{upcomingCamps.length}</p>
                <p className="text-sm text-white/50">Upcoming</p>
              </div>
            </div>
          </PortalCard>

          <PortalCard>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-magenta/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-magenta" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{camps.length}</p>
                <p className="text-sm text-white/50">Total Assigned</p>
              </div>
            </div>
          </PortalCard>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search camps..."
              className="w-full pl-10 pr-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {(['all', 'active', 'upcoming', 'past'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${
                  filter === f
                    ? 'bg-neon text-black'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Camps List */}
        {filteredCamps.length > 0 ? (
          <div className="space-y-4">
            {filteredCamps.map((camp) => {
              const isActive = camp.start_date <= today && camp.end_date >= today
              const isUpcoming = camp.start_date > today
              const location = camp.location

              return (
                <PortalCard
                  key={camp.id}
                  accent={isActive ? 'neon' : isUpcoming ? 'purple' : undefined}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className={`px-2 py-1 text-xs font-bold uppercase ${
                          isActive
                            ? 'bg-neon/10 text-neon'
                            : isUpcoming
                              ? 'bg-purple/10 text-purple'
                              : 'bg-white/10 text-white/50'
                        }`}>
                          {isActive ? 'Active' : isUpcoming ? 'Upcoming' : 'Past'}
                        </div>
                        <div className={`px-2 py-1 text-xs font-bold uppercase ${
                          camp.grouping_status === 'finalized'
                            ? 'bg-neon/10 text-neon'
                            : camp.grouping_status === 'reviewed'
                              ? 'bg-purple/10 text-purple'
                              : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          Groups: {camp.grouping_status}
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-white mt-2">{camp.name}</h3>

                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-white/50">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {parseDateSafe(camp.start_date).toLocaleDateString()} - {parseDateSafe(camp.end_date).toLocaleDateString()}
                        </span>
                        {camp.start_time && camp.end_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatTime12h(camp.start_time)} - {formatTime12h(camp.end_time)}
                          </span>
                        )}
                        {location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {location.name}, {location.city}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          Ages {camp.min_age}-{camp.max_age} • {camp.capacity} capacity
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/director/camps/${camp.id}/roster`}
                        className="px-4 py-2 bg-white/10 text-white text-sm font-bold uppercase tracking-wider hover:bg-white/20 transition-colors flex items-center gap-1"
                      >
                        <ClipboardList className="h-4 w-4" />
                        Roster
                      </Link>
                      <Link
                        href={`/director/camps/${camp.id}/grouping`}
                        className="px-4 py-2 bg-white/10 text-white text-sm font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
                      >
                        Groups
                      </Link>
                      <Link
                        href={`/director/camps/${camp.id}/schedule`}
                        className="px-4 py-2 bg-white/10 text-white text-sm font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
                      >
                        Schedule
                      </Link>
                      <Link
                        href={`/director/camps/${camp.id}/hq`}
                        className="px-4 py-2 bg-neon text-black text-sm font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors flex items-center gap-1"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Camp HQ
                      </Link>
                    </div>
                  </div>
                </PortalCard>
              )
            })}
          </div>
        ) : (
          <PortalCard>
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No Camps Found</h3>
              <p className="text-white/50">
                {searchTerm
                  ? 'No camps match your search'
                  : filter !== 'all'
                    ? `No ${filter} camps`
                    : 'No camps assigned to you yet'}
              </p>
            </div>
          </PortalCard>
        )}
      </div>
    </LmsGate>
  )
}
