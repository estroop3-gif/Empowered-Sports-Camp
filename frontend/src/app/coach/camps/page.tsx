'use client'

/**
 * Coach Camps Page
 *
 * Lists all camps assigned to the coach with filtering and detail views.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import { cn } from '@/lib/utils'
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Loader2,
  ChevronRight,
  Filter,
  Play,
  CheckCircle,
  AlertCircle,
  Target,
  ArrowLeft,
} from 'lucide-react'
import type { CoachCampSummary } from '@/lib/services/coach-dashboard'

type FilterStatus = 'all' | 'upcoming' | 'in_progress' | 'completed'

export default function CoachCampsPage() {
  const searchParams = useSearchParams()
  const campIdParam = searchParams.get('campId')

  const [loading, setLoading] = useState(true)
  const [camps, setCamps] = useState<CoachCampSummary[]>([])
  const [selectedCamp, setSelectedCamp] = useState<any>(null)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCamps()
  }, [filter])

  useEffect(() => {
    if (campIdParam) {
      loadCampDetail(campIdParam)
    } else {
      setSelectedCamp(null)
    }
  }, [campIdParam])

  async function loadCamps() {
    try {
      const res = await fetch(`/api/coach/camps?status=${filter}`)
      const json = await res.json()

      if (!res.ok) throw new Error(json.error || 'Failed to load camps')

      setCamps(json.data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load camps')
    } finally {
      setLoading(false)
    }
  }

  async function loadCampDetail(campId: string) {
    try {
      const res = await fetch(`/api/coach/camps?campId=${campId}`)
      const json = await res.json()

      if (!res.ok) throw new Error(json.error || 'Failed to load camp')

      setSelectedCamp(json.data)
    } catch (err) {
      console.error('Failed to load camp detail:', err)
    }
  }

  if (selectedCamp) {
    return <CampDetailView camp={selectedCamp} />
  }

  return (
    <div>
      <PortalPageHeader
        title="My Camps"
        description="View all camps you're assigned to coach"
      />

      <LmsGate variant="card" featureName="camp viewing">
        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          <Filter className="h-4 w-4 text-white/40" />
          {(['all', 'upcoming', 'in_progress', 'completed'] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={cn(
                'px-3 py-1 text-sm font-medium uppercase tracking-wider transition-colors',
                filter === status
                  ? 'bg-blue-400 text-black'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              )}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
          </div>
        ) : error ? (
          <PortalCard>
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
              <p className="text-white/50">{error}</p>
              <button
                onClick={loadCamps}
                className="mt-4 px-4 py-2 bg-blue-400 text-black font-bold uppercase text-sm"
              >
                Retry
              </button>
            </div>
          </PortalCard>
        ) : camps.length === 0 ? (
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
          <div className="grid gap-4 md:grid-cols-2">
            {camps.map((camp) => (
              <CampCard key={camp.id} camp={camp} />
            ))}
          </div>
        )}
      </LmsGate>
    </div>
  )
}

function CampCard({ camp }: { camp: CoachCampSummary }) {
  const statusConfig = {
    upcoming: { label: 'Upcoming', color: 'bg-blue-400/20 text-blue-400' },
    in_progress: { label: 'In Progress', color: 'bg-neon/20 text-neon' },
    completed: { label: 'Completed', color: 'bg-white/10 text-white/50' },
  }

  const status = statusConfig[camp.status]

  return (
    <Link
      href={`/coach/camps?campId=${camp.id}`}
      className="p-4 bg-white/5 border border-white/10 hover:border-blue-400/50 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-bold text-white">{camp.name}</h3>
        <span className={cn('px-2 py-1 text-xs font-bold uppercase', status.color)}>
          {status.label}
        </span>
      </div>

      <div className="space-y-2 text-sm text-white/50">
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3" />
          <span>
            {new Date(camp.start_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })} - {new Date(camp.end_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>

        {camp.location_name && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3 w-3" />
            <span>{camp.location_city}, {camp.location_state}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Users className="h-3 w-3" />
          <span>{camp.registered_count}/{camp.capacity} campers</span>
        </div>

        {camp.station_name && (
          <div className="flex items-center gap-2 text-blue-400">
            <Target className="h-3 w-3" />
            <span>{camp.station_name}</span>
          </div>
        )}
      </div>

      {camp.status === 'in_progress' && camp.day_number && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <span className="text-sm text-neon">
            Day {camp.day_number} of {camp.total_days}
          </span>
        </div>
      )}

      {camp.status === 'upcoming' && camp.days_until_start && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <span className="text-sm text-blue-400">
            Starts in {camp.days_until_start} day{camp.days_until_start > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </Link>
  )
}

function CampDetailView({ camp }: { camp: any }) {
  if (!camp) return null

  return (
    <div>
      <PortalPageHeader
        title={camp.camp.name}
        description={`${camp.camp.location_city || ''} ${camp.camp.location_state || ''}`}
        actions={
          <Link
            href="/coach/camps"
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Camps
          </Link>
        }
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Assignment Info */}
          <PortalCard title="Your Assignment" accent="neon">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-3 bg-white/5">
                <div className="text-xs text-white/40 uppercase mb-1">Role</div>
                <div className="font-bold text-white capitalize">{camp.assignment.role}</div>
              </div>
              {camp.assignment.station_name && (
                <div className="p-3 bg-blue-400/10 border border-blue-400/30">
                  <div className="text-xs text-white/40 uppercase mb-1">Station</div>
                  <div className="font-bold text-blue-400">{camp.assignment.station_name}</div>
                </div>
              )}
              {camp.assignment.call_time && (
                <div className="p-3 bg-white/5">
                  <div className="text-xs text-white/40 uppercase mb-1">Call Time</div>
                  <div className="font-bold text-white">{camp.assignment.call_time}</div>
                </div>
              )}
              {camp.assignment.shift_end_time && (
                <div className="p-3 bg-white/5">
                  <div className="text-xs text-white/40 uppercase mb-1">End Time</div>
                  <div className="font-bold text-white">{camp.assignment.shift_end_time}</div>
                </div>
              )}
            </div>
            {camp.assignment.notes && (
              <div className="mt-4 p-3 bg-white/5">
                <div className="text-xs text-white/40 uppercase mb-1">Notes</div>
                <div className="text-white/70">{camp.assignment.notes}</div>
              </div>
            )}
          </PortalCard>

          {/* Schedule */}
          <PortalCard title="Camp Schedule">
            {camp.camp_days.length === 0 ? (
              <div className="text-center py-8 text-white/50">
                No schedule data available yet.
              </div>
            ) : (
              <div className="space-y-4">
                {camp.camp_days.map((day: any) => (
                  <div key={day.id} className="p-3 bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-white">Day {day.day_number}</h4>
                      <span className="text-xs text-white/40">
                        {day.date && new Date(day.date).toLocaleDateString()}
                      </span>
                    </div>
                    {day.schedule_blocks.length > 0 ? (
                      <div className="space-y-2">
                        {day.schedule_blocks.map((block: any) => (
                          <div
                            key={block.id}
                            className={cn(
                              'flex items-center gap-3 p-2 text-sm',
                              block.is_my_station
                                ? 'bg-blue-400/10 border border-blue-400/30'
                                : 'bg-white/5'
                            )}
                          >
                            <span className="text-white/50 w-28 flex-shrink-0">
                              {block.start_time} - {block.end_time}
                            </span>
                            <span className={cn(
                              'font-medium',
                              block.is_my_station ? 'text-blue-400' : 'text-white'
                            )}>
                              {block.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-white/40">No schedule blocks</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </PortalCard>
        </div>

        <div className="space-y-6">
          {/* Camp Info */}
          <PortalCard title="Camp Details">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-white/40" />
                <span className="text-white">
                  {new Date(camp.camp.start_date).toLocaleDateString()} -{' '}
                  {new Date(camp.camp.end_date).toLocaleDateString()}
                </span>
              </div>
              {camp.camp.start_time && camp.camp.end_time && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-white/40" />
                  <span className="text-white">
                    {camp.camp.start_time} - {camp.camp.end_time}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-white/40" />
                <span className="text-white">
                  {camp.camp.registered_count}/{camp.camp.capacity} campers
                </span>
              </div>
              {camp.camp.location_name && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-white/40" />
                  <span className="text-white">{camp.camp.location_name}</span>
                </div>
              )}
            </div>
          </PortalCard>

          {/* Groups */}
          <PortalCard title="Groups">
            {camp.groups.length === 0 ? (
              <div className="text-center py-4 text-white/40 text-sm">
                No groups assigned yet.
              </div>
            ) : (
              <div className="space-y-2">
                {camp.groups.map((group: any) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between p-3 bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-2">
                      {group.team_color && (
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: group.team_color }}
                        />
                      )}
                      <span className="font-medium text-white">{group.name}</span>
                    </div>
                    <span className="text-sm text-white/50">
                      {group.camper_count} campers
                    </span>
                  </div>
                ))}
              </div>
            )}
          </PortalCard>

          {/* Staff */}
          <PortalCard title="Staff">
            {camp.staff.length === 0 ? (
              <div className="text-center py-4 text-white/40 text-sm">
                No staff assignments.
              </div>
            ) : (
              <div className="space-y-2">
                {camp.staff.map((staff: any) => (
                  <div
                    key={staff.id}
                    className="flex items-center justify-between p-2 bg-white/5"
                  >
                    <span className="text-sm text-white">{staff.name}</span>
                    <span className="text-xs text-white/40 capitalize">{staff.role}</span>
                  </div>
                ))}
              </div>
            )}
          </PortalCard>
        </div>
      </div>
    </div>
  )
}
