'use client'

/**
 * Coach Today Page
 *
 * Shows today's schedule and active camps for the coach.
 * Focused "game-day" view with schedule blocks and group info.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import { cn } from '@/lib/utils'
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Loader2,
  CheckCircle,
  AlertCircle,
  Target,
  BookOpen,
  Play,
} from 'lucide-react'
import type { CoachTodaySchedule } from '@/lib/services/coach-dashboard'

export default function CoachTodayPage() {
  const [loading, setLoading] = useState(true)
  const [schedules, setSchedules] = useState<CoachTodaySchedule[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTodaySchedule()
  }, [])

  async function loadTodaySchedule() {
    try {
      const res = await fetch('/api/coach/today')
      const json = await res.json()

      if (!res.ok) throw new Error(json.error || 'Failed to load schedule')

      setSchedules(json.data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule')
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div>
      <PortalPageHeader
        title="Today's Schedule"
        description={today}
        actions={
          <Link
            href="/coach/curriculum"
            className="px-4 py-2 bg-blue-400 text-black font-bold uppercase tracking-wider text-sm hover:bg-blue-400/90 transition-colors"
          >
            View Curriculum
          </Link>
        }
      />

      <LmsGate variant="card" featureName="today's schedule">
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
                onClick={loadTodaySchedule}
                className="mt-4 px-4 py-2 bg-blue-400 text-black font-bold uppercase text-sm"
              >
                Retry
              </button>
            </div>
          </PortalCard>
        ) : schedules.length === 0 ? (
          <PortalCard>
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No Camps Today</h3>
              <p className="text-white/50 mb-4">
                You don&apos;t have any camps scheduled for today.
              </p>
              <Link
                href="/coach/camps"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/20 transition-colors"
              >
                View All Camps
              </Link>
            </div>
          </PortalCard>
        ) : (
          <div className="space-y-8">
            {schedules.map((schedule) => (
              <TodayScheduleCard key={schedule.camp_id} schedule={schedule} />
            ))}
          </div>
        )}
      </LmsGate>
    </div>
  )
}

function TodayScheduleCard({ schedule }: { schedule: CoachTodaySchedule }) {
  return (
    <PortalCard accent="neon">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-bold text-white">{schedule.camp_name}</h2>
            <span className="px-2 py-1 text-xs font-bold uppercase bg-neon/20 text-neon">
              <Play className="h-3 w-3 inline mr-1" />
              Day {schedule.day_number} of {schedule.total_days}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
            {schedule.location_name && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {schedule.location_name}
              </span>
            )}
            {schedule.camp_start_time && schedule.camp_end_time && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {schedule.camp_start_time} - {schedule.camp_end_time}
              </span>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {schedule.quick_stats.total_campers}
            </div>
            <div className="text-xs text-white/40 uppercase">Campers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-neon">
              {schedule.quick_stats.checked_in}
            </div>
            <div className="text-xs text-white/40 uppercase">Checked In</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {schedule.quick_stats.on_site}
            </div>
            <div className="text-xs text-white/40 uppercase">On Site</div>
          </div>
        </div>
      </div>

      {/* Your Shift */}
      {schedule.call_time && (
        <div className="mb-6 p-4 bg-blue-400/10 border border-blue-400/30">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-white/40 uppercase mb-1">Your Shift</div>
              <div className="text-lg font-bold text-blue-400">
                {schedule.call_time} - {schedule.shift_end_time || 'TBD'}
              </div>
            </div>
            {schedule.station_name && (
              <div className="text-right">
                <div className="text-xs text-white/40 uppercase mb-1">Station</div>
                <div className="flex items-center gap-2 text-lg font-bold text-white">
                  <Target className="h-5 w-5 text-blue-400" />
                  {schedule.station_name}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Schedule Timeline */}
        <div>
          <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-4">
            Schedule
          </h3>
          {schedule.schedule_blocks.length > 0 ? (
            <div className="space-y-2">
              {schedule.schedule_blocks.map((block) => (
                <div
                  key={block.id}
                  className={cn(
                    'flex items-start gap-3 p-3',
                    block.is_my_station
                      ? 'bg-blue-400/10 border-l-2 border-blue-400'
                      : 'bg-white/5'
                  )}
                >
                  <div className="text-sm text-white/50 w-24 flex-shrink-0">
                    {block.start_time}
                    <br />
                    <span className="text-xs">- {block.end_time}</span>
                  </div>
                  <div className="flex-1">
                    <div className={cn(
                      'font-medium',
                      block.is_my_station ? 'text-blue-400' : 'text-white'
                    )}>
                      {block.title}
                    </div>
                    {block.location_notes && (
                      <div className="text-xs text-white/40 mt-1">
                        {block.location_notes}
                      </div>
                    )}
                    {block.is_my_station && (
                      <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 text-xs bg-blue-400/20 text-blue-400">
                        <Target className="h-3 w-3" />
                        Your station
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-white/40 py-4">
              No schedule blocks defined.
            </div>
          )}
        </div>

        {/* Groups */}
        <div>
          <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-4">
            Groups
          </h3>
          {schedule.groups.length > 0 ? (
            <div className="space-y-2">
              {schedule.groups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-3 bg-white/5 border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    {group.team_color && (
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white/20"
                        style={{ backgroundColor: group.team_color }}
                      />
                    )}
                    <div>
                      <div className="font-medium text-white">{group.name}</div>
                      {(group.min_grade || group.max_grade) && (
                        <div className="text-xs text-white/40">
                          Grades {group.min_grade}-{group.max_grade}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-white/40" />
                    <span className="text-sm font-bold text-white">
                      {group.camper_count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-white/40 py-4">
              No groups assigned yet.
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {schedule.notes && (
        <div className="mt-6 p-4 bg-white/5 border border-white/10">
          <div className="text-xs text-white/40 uppercase mb-2">Notes</div>
          <div className="text-white/70">{schedule.notes}</div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap gap-3">
        <Link
          href={`/coach/camps?campId=${schedule.camp_id}`}
          className="px-4 py-2 bg-blue-400 text-black font-bold uppercase tracking-wider text-sm hover:bg-blue-400/90 transition-colors"
        >
          Camp Details
        </Link>
        <Link
          href={`/coach/curriculum?campId=${schedule.camp_id}`}
          className="px-4 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/20 transition-colors"
        >
          <BookOpen className="h-4 w-4 inline mr-2" />
          Curriculum
        </Link>
      </div>
    </PortalCard>
  )
}
