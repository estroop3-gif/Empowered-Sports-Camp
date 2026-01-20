'use client'

/**
 * CIT Today's Schedule Page
 *
 * Shows detailed view of today's camps and schedule blocks for the CIT.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PortalPageHeader, PortalCard } from '@/components/portal'
import { cn } from '@/lib/utils'
import {
  Loader2,
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
  Users,
  ChevronRight,
  Sun,
  Coffee,
} from 'lucide-react'
import type { CitTodaySchedule } from '@/lib/services/cit-dashboard'

export default function CitTodayPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [schedules, setSchedules] = useState<CitTodaySchedule[]>([])

  useEffect(() => {
    loadSchedule()
  }, [])

  async function loadSchedule() {
    try {
      setLoading(true)
      const res = await fetch('/api/cit/today')
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load schedule')
      }

      setSchedules(json.data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

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
          title="Today's Schedule"
          description={today}
        />
        <PortalCard>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Error Loading Schedule</h3>
            <p className="text-white/50 mb-4">{error}</p>
            <button
              onClick={loadSchedule}
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
        title="Today's Schedule"
        description={today}
        actions={
          <Link
            href="/cit/camps"
            className="px-4 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/20 transition-colors"
          >
            All Camps
          </Link>
        }
      />

      {schedules.length === 0 ? (
        <PortalCard accent="orange">
          <div className="text-center py-12">
            <Sun className="h-16 w-16 text-orange-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Camps Today</h3>
            <p className="text-white/50 mb-4">
              You don&apos;t have any camps scheduled for today. Enjoy your day off!
            </p>
            <Link
              href="/cit/camps"
              className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors"
            >
              View Upcoming Camps
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </PortalCard>
      ) : (
        <div className="space-y-6">
          {schedules.map((schedule) => (
            <div key={schedule.camp_id}>
              {/* Camp Header */}
              <PortalCard accent="orange" className="mb-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">{schedule.camp_name}</h2>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                      {schedule.location_name && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {schedule.location_name}
                        </span>
                      )}
                      {schedule.camp_start_time && schedule.camp_end_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Camp: {schedule.camp_start_time} - {schedule.camp_end_time}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-start md:items-end gap-2">
                    <span className="text-sm text-white/50">
                      Your Role: <span className="text-white">{schedule.role}</span>
                    </span>
                    {schedule.station_name && (
                      <span className="px-3 py-1 bg-orange-400/20 text-orange-400 text-sm font-bold uppercase">
                        {schedule.station_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrival Info */}
                {schedule.call_time && (
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-4">
                    <div className="h-12 w-12 bg-neon/20 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-neon" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-neon">{schedule.call_time}</p>
                      <p className="text-sm text-white/50">Your arrival time</p>
                    </div>
                    {schedule.location_address && (
                      <div className="ml-auto text-right">
                        <p className="text-sm text-white/70">{schedule.location_address}</p>
                      </div>
                    )}
                  </div>
                )}
              </PortalCard>

              {/* Groups */}
              {schedule.groups.length > 0 && (
                <PortalCard title="Today's Groups" className="mb-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {schedule.groups.map((group) => (
                      <div
                        key={group.id}
                        className={cn(
                          'p-3 border',
                          group.team_color === 'pink'
                            ? 'bg-pink-500/10 border-pink-500/30'
                            : group.team_color === 'purple'
                            ? 'bg-purple/10 border-purple/30'
                            : 'bg-white/5 border-white/10'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{group.name}</span>
                          <span className="flex items-center gap-1 text-sm text-white/50">
                            <Users className="h-4 w-4" />
                            {group.camper_count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </PortalCard>
              )}

              {/* Schedule Timeline */}
              <PortalCard title="Today's Timeline">
                {schedule.schedule_blocks.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
                    <p className="text-white/50">No schedule has been set for today.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {schedule.schedule_blocks.map((block, index) => {
                      const isBreak = block.block_type === 'break' || block.block_type === 'meal'
                      const isHighlighted = block.is_assigned

                      return (
                        <div
                          key={block.id}
                          className={cn(
                            'flex items-stretch gap-4',
                            isBreak && 'opacity-60'
                          )}
                        >
                          {/* Time */}
                          <div className="w-24 flex-shrink-0 text-right">
                            <span className="text-sm font-mono text-orange-400">
                              {block.start_time}
                            </span>
                          </div>

                          {/* Timeline connector */}
                          <div className="relative w-4 flex flex-col items-center">
                            <div
                              className={cn(
                                'w-3 h-3 rounded-full border-2 z-10',
                                isHighlighted
                                  ? 'bg-orange-400 border-orange-400'
                                  : isBreak
                                  ? 'bg-white/20 border-white/30'
                                  : 'bg-white/10 border-white/30'
                              )}
                            />
                            {index < schedule.schedule_blocks.length - 1 && (
                              <div className="absolute top-3 w-0.5 h-full bg-white/10" />
                            )}
                          </div>

                          {/* Content */}
                          <div
                            className={cn(
                              'flex-1 p-3 mb-2',
                              isHighlighted
                                ? 'bg-orange-400/10 border border-orange-400/30'
                                : 'bg-white/5 border border-white/10'
                            )}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h4 className="font-bold text-white flex items-center gap-2">
                                  {isBreak && <Coffee className="h-4 w-4 text-white/50" />}
                                  {block.title}
                                  {isHighlighted && (
                                    <span className="px-2 py-0.5 text-xs bg-orange-400 text-black font-bold uppercase">
                                      Your Station
                                    </span>
                                  )}
                                </h4>
                                {block.location_notes && (
                                  <p className="text-sm text-purple mt-1 flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {block.location_notes}
                                  </p>
                                )}
                              </div>
                              <span className="text-xs text-white/40 whitespace-nowrap">
                                {block.start_time} - {block.end_time}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </PortalCard>

              {/* Notes */}
              {schedule.notes && (
                <PortalCard title="Notes for Today" className="mt-4">
                  <p className="text-white/70">{schedule.notes}</p>
                </PortalCard>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reminders */}
      <PortalCard className="mt-6 bg-white/5">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 bg-purple/20 flex items-center justify-center flex-shrink-0">
            <Coffee className="h-5 w-5 text-purple" />
          </div>
          <div>
            <h3 className="font-bold text-white mb-1">Reminders</h3>
            <ul className="text-sm text-white/60 space-y-1">
              <li>Wear your Empowered Sports Camp staff shirt</li>
              <li>Bring water and sunscreen</li>
              <li>Arrive at least 15 minutes before your call time</li>
              <li>Check in with the Camp Director when you arrive</li>
            </ul>
          </div>
        </div>
      </PortalCard>
    </div>
  )
}
