'use client'

/**
 * CIT My Camps Page
 *
 * Shows all camps where the CIT is assigned with details and schedule links.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PortalPageHeader, PortalCard } from '@/components/portal'
import { cn, parseDateSafe, formatTime12h } from '@/lib/utils'
import {
  Loader2,
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  Star,
  CheckCircle,
  Play,
} from 'lucide-react'
import type { CitCampSummary } from '@/lib/services/cit-dashboard'

type FilterStatus = 'all' | 'upcoming' | 'in_progress' | 'completed'

export default function CitCampsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [camps, setCamps] = useState<CitCampSummary[]>([])
  const [filter, setFilter] = useState<FilterStatus>('all')

  useEffect(() => {
    loadCamps()
  }, [])

  async function loadCamps() {
    try {
      setLoading(true)
      const res = await fetch('/api/cit/camps')
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load camps')
      }

      setCamps(json.data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const filteredCamps = camps.filter((camp) => {
    if (filter === 'all') return true
    return camp.status === filter
  })

  const statusCounts = {
    all: camps.length,
    upcoming: camps.filter((c) => c.status === 'upcoming').length,
    in_progress: camps.filter((c) => c.status === 'in_progress').length,
    completed: camps.filter((c) => c.status === 'completed').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-orange-400 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PortalPageHeader
          title="My Camps"
          description="Your camp assignments"
        />
        <PortalCard>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Error Loading Camps</h3>
            <p className="text-white/50 mb-4">{error}</p>
            <button
              onClick={loadCamps}
              className="px-6 py-3 bg-orange-400 text-black font-bold uppercase tracking-wider hover:bg-orange-400/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </PortalCard>
      </div>
    )
  }

  return (
    <div>
      <PortalPageHeader
        title="My Camps"
        description="View your camp assignments and schedules"
      />

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { value: 'all', label: 'All Camps' },
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'completed', label: 'Completed' },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value as FilterStatus)}
            className={cn(
              'px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors',
              filter === opt.value
                ? 'bg-orange-400 text-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            )}
          >
            {opt.label} ({statusCounts[opt.value as FilterStatus]})
          </button>
        ))}
      </div>

      {/* Camp List */}
      {filteredCamps.length === 0 ? (
        <PortalCard>
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Camps Found</h3>
            <p className="text-white/50">
              {filter === 'all'
                ? "You haven't been assigned to any camps yet."
                : `No ${filter.replace('_', ' ')} camps.`}
            </p>
          </div>
        </PortalCard>
      ) : (
        <div className="space-y-4">
          {filteredCamps.map((camp) => (
            <CampCard key={camp.id} camp={camp} />
          ))}
        </div>
      )}
    </div>
  )
}

function CampCard({ camp }: { camp: CitCampSummary }) {
  const statusConfig = {
    upcoming: {
      label: 'Upcoming',
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/20',
      icon: Calendar,
    },
    in_progress: {
      label: 'In Progress',
      color: 'text-neon',
      bgColor: 'bg-neon/20',
      icon: Play,
    },
    completed: {
      label: 'Completed',
      color: 'text-white/50',
      bgColor: 'bg-white/10',
      icon: CheckCircle,
    },
  }

  const config = statusConfig[camp.status]
  const StatusIcon = config.icon

  return (
    <PortalCard className="hover:border-orange-400/30 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-start gap-3 mb-2">
            <h3 className="text-lg font-bold text-white">{camp.name}</h3>
            <span className={cn('px-2 py-0.5 text-xs font-bold uppercase flex items-center gap-1', config.bgColor, config.color)}>
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </span>
            {camp.is_lead && (
              <span className="px-2 py-0.5 text-xs font-bold uppercase bg-yellow-400/20 text-yellow-400 flex items-center gap-1">
                <Star className="h-3 w-3" />
                Lead
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-white/50 mb-3">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {parseDateSafe(camp.start_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })} - {parseDateSafe(camp.end_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            {camp.location_name && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {camp.location_name}
                {camp.location_city && `, ${camp.location_city}`}
              </span>
            )}
            {camp.start_time && camp.end_time && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatTime12h(camp.start_time)} - {formatTime12h(camp.end_time)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-white/70">
              <span className="text-white/40">Role:</span> {camp.role}
            </span>
            {camp.station_name && (
              <span className="text-orange-400">
                <span className="text-white/40">Station:</span> {camp.station_name}
              </span>
            )}
            {camp.call_time && (
              <span className="text-purple">
                <span className="text-white/40">Call Time:</span> {formatTime12h(camp.call_time)}
              </span>
            )}
            <span className="text-white/50">
              <span className="text-white/40">Territory:</span> {camp.licensee_name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {camp.days_until_start !== null && camp.status === 'upcoming' && (
            <div className="text-right mr-4">
              <div className="text-2xl font-bold text-orange-400">{camp.days_until_start}</div>
              <div className="text-xs text-white/40 uppercase">Days Away</div>
            </div>
          )}

          {camp.status === 'in_progress' && (
            <Link
              href="/cit/today"
              className="px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider text-sm hover:bg-neon/90 transition-colors"
            >
              Today&apos;s Schedule
            </Link>
          )}

          <Link
            href={`/cit/camps/${camp.id}`}
            className="px-4 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/20 transition-colors flex items-center gap-2"
          >
            View Schedule
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </PortalCard>
  )
}
