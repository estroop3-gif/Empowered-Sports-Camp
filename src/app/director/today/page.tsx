'use client'

/**
 * Today's Camps Dashboard
 *
 * Director view showing all camps running today.
 * Entry point to Camp Day control panels and Camp HQ.
 * Styled consistently with the Empowered Sports Camp brand.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import { cn, formatTime12h } from '@/lib/utils'
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Loader2,
  ChevronRight,
  Play,
  Square,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  LayoutDashboard,
  UsersRound,
  FileText,
} from 'lucide-react'
import type { DirectorTodayCamp } from '@/lib/services/director-dashboard'

export default function TodaysCampsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [campDays, setCampDays] = useState<DirectorTodayCamp[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchCampDays()

    // Refresh every minute
    const interval = setInterval(fetchCampDays, 60000)
    return () => clearInterval(interval)
  }, [selectedDate])

  async function fetchCampDays() {
    try {
      // Use the director dashboard API for today's camps
      const res = await fetch('/api/director/dashboard')
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load camps')
      }

      // Filter by selected date if not today
      const today = new Date().toISOString().split('T')[0]
      if (selectedDate === today) {
        setCampDays(json.data?.today_camps || [])
      } else {
        // For other dates, we'll need a separate endpoint
        // For now, show empty for non-today dates
        setCampDays([])
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  function handleRefresh() {
    setRefreshing(true)
    fetchCampDays()
  }

  const today = new Date().toISOString().split('T')[0]
  const isToday = selectedDate === today

  // Group camps by status
  const activeCamps = campDays.filter((c) => c.status === 'in_progress')
  const pendingCamps = campDays.filter((c) => c.status === 'not_started')
  const finishedCamps = campDays.filter((c) => c.status === 'finished')

  return (
    <LmsGate featureName="today's camps">
      <div>
        <PortalPageHeader
          title="Today's Camps"
          description={isToday
            ? `${campDays.length} camp${campDays.length !== 1 ? 's' : ''} scheduled for today`
            : `Viewing camps for ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`
          }
          actions={
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn('h-5 w-5', refreshing && 'animate-spin')} />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
              />
            </div>
          }
        />

        {/* Active Camps Alert */}
        {activeCamps.length > 0 && (
          <div className="mb-6 p-4 bg-neon/10 border border-neon/30 flex items-center gap-4">
            <div className="h-10 w-10 bg-neon/20 flex items-center justify-center">
              <Play className="h-5 w-5 text-neon" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-white">
                {activeCamps.length} Camp{activeCamps.length !== 1 ? 's' : ''} Currently Running
              </div>
              <div className="text-sm text-white/50">
                Click any camp to access Camp HQ or Camp Day operations
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-12 w-12 text-neon animate-spin" />
          </div>
        ) : error ? (
          <PortalCard>
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Error Loading Camps</h3>
              <p className="text-white/50 mb-4">{error}</p>
              <button
                onClick={handleRefresh}
                className="px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
              >
                Try Again
              </button>
            </div>
          </PortalCard>
        ) : campDays.length === 0 ? (
          <PortalCard>
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">No Camps {isToday ? 'Today' : 'Scheduled'}</h2>
              <p className="text-white/50 mb-6">
                {isToday
                  ? "You don't have any camps scheduled for today."
                  : `No camps scheduled for ${new Date(selectedDate).toLocaleDateString()}.`}
              </p>
              <Link
                href="/director/camps"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
              >
                View All Camps
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </PortalCard>
        ) : (
          <div className="space-y-8">
            {/* Active Camps Section */}
            {activeCamps.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-neon uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  In Progress ({activeCamps.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {activeCamps.map((camp) => (
                    <CampDayCard key={camp.id} camp={camp} />
                  ))}
                </div>
              </div>
            )}

            {/* Pending Camps Section */}
            {pendingCamps.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-white/70 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Not Started ({pendingCamps.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pendingCamps.map((camp) => (
                    <CampDayCard key={camp.id} camp={camp} />
                  ))}
                </div>
              </div>
            )}

            {/* Finished Camps Section */}
            {finishedCamps.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-purple uppercase tracking-wider mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Completed ({finishedCamps.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {finishedCamps.map((camp) => (
                    <CampDayCard key={camp.id} camp={camp} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </LmsGate>
  )
}

// =============================================================================
// Camp Day Card Component
// =============================================================================

function CampDayCard({ camp }: { camp: DirectorTodayCamp }) {
  const statusConfig = {
    not_started: {
      label: 'Not Started',
      color: 'bg-white/10 text-white/50',
      icon: Clock,
      accent: undefined as 'neon' | 'purple' | 'magenta' | undefined,
    },
    in_progress: {
      label: 'In Progress',
      color: 'bg-neon/20 text-neon',
      icon: Play,
      accent: 'neon' as const,
    },
    finished: {
      label: 'Completed',
      color: 'bg-purple/20 text-purple',
      icon: CheckCircle,
      accent: 'purple' as const,
    },
  }

  const status = statusConfig[camp.status]
  const StatusIcon = status.icon
  const hasCampDayId = camp.id && !camp.id.startsWith('pending-')

  return (
    <PortalCard accent={status.accent}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white truncate">{camp.camp_name}</h3>
          {camp.location_name && (
            <p className="text-sm text-white/50 flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {camp.location_city}, {camp.location_state}
            </p>
          )}
        </div>
        <span className={cn('px-2 py-1 text-xs font-bold uppercase flex-shrink-0', status.color)}>
          <StatusIcon className="h-3 w-3 inline mr-1" />
          {status.label}
        </span>
      </div>

      {/* Info Row */}
      <div className="flex items-center gap-4 text-sm text-white/50 mb-4">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Day {camp.day_number}/{camp.total_days}
        </span>
        {camp.start_time && camp.end_time && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime12h(camp.start_time)} - {formatTime12h(camp.end_time)}
          </span>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2 py-4 border-t border-b border-white/10">
        <div className="text-center">
          <p className="text-xl font-bold text-white">{camp.stats.registered}</p>
          <p className="text-[10px] text-white/40 uppercase">Registered</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-neon">{camp.stats.checked_in}</p>
          <p className="text-[10px] text-white/40 uppercase">Checked In</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-purple">{camp.stats.checked_out}</p>
          <p className="text-[10px] text-white/40 uppercase">Picked Up</p>
        </div>
        <div className="text-center">
          <p className={cn('text-xl font-bold', camp.stats.absent > 0 ? 'text-magenta' : 'text-white/30')}>
            {camp.stats.absent}
          </p>
          <p className="text-[10px] text-white/40 uppercase">Absent</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mt-4">
        <Link
          href={`/director/camps/${camp.camp_id}/hq`}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-neon text-black font-bold uppercase tracking-wider text-xs hover:bg-neon/90 transition-colors"
        >
          <LayoutDashboard className="h-3 w-3" />
          Camp HQ
        </Link>
        {hasCampDayId && (
          <>
            <Link
              href={`/director/camp-day/${camp.id}?tab=checkin`}
              className="flex items-center justify-center gap-1 px-3 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-xs hover:bg-white/20 transition-colors"
            >
              <CheckCircle className="h-3 w-3" />
              Check-In
            </Link>
            {(camp.status === 'in_progress' || camp.status === 'finished') && !camp.recap_complete && (
              <Link
                href={`/director/camp-day/${camp.id}?tab=recap`}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-purple text-white font-bold uppercase tracking-wider text-xs hover:bg-purple/90 transition-colors"
              >
                <FileText className="h-3 w-3" />
                Recap
              </Link>
            )}
          </>
        )}
        <Link
          href={`/director/camps/${camp.camp_id}/grouping`}
          className="flex items-center justify-center gap-1 px-3 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-xs hover:bg-white/20 transition-colors"
        >
          <UsersRound className="h-3 w-3" />
          Groups
        </Link>
      </div>

      {/* Footer Hint */}
      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
        <span className="text-xs text-white/40">
          {camp.status === 'not_started'
            ? 'Ready to start check-in'
            : camp.status === 'finished'
            ? camp.recap_complete ? 'Day complete' : 'Recap needed'
            : `${camp.stats.on_site} campers on-site`}
        </span>
        <ChevronRight className="h-4 w-4 text-white/20" />
      </div>
    </PortalCard>
  )
}
