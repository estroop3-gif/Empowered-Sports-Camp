'use client'

/**
 * CIT Camp Schedule Detail Page
 *
 * Shows detailed schedule for a specific camp the CIT is assigned to.
 */

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { PortalPageHeader, PortalCard } from '@/components/portal'
import { cn } from '@/lib/utils'
import {
  Loader2,
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

/** Convert "HH:MM" or "HH:MM:SS" 24h time to "H:MM AM/PM" */
function formatTime12h(time?: string | null): string {
  if (!time) return ''
  const [hStr, mStr] = time.split(':')
  let h = parseInt(hStr, 10)
  const m = mStr || '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return `${h}:${m} ${ampm}`
}

interface ScheduleBlock {
  id: string
  start_time: string
  end_time: string
  title: string
  block_type: string
  description: string | null
  location_notes: string | null
}

interface CampDay {
  id: string
  date: string
  day_number: number
  status: string
  schedule_blocks: ScheduleBlock[]
}

interface CampScheduleData {
  camp: {
    id: string
    name: string
    start_date: string
    end_date: string
    start_time: string | null
    end_time: string | null
    location_name: string | null
    location_city: string | null
    role: string
    station_name: string | null
    call_time: string | null
  }
  camp_days: CampDay[]
}

export default function CitCampSchedulePage({
  params,
}: {
  params: Promise<{ campId: string }>
}) {
  const { campId } = use(params)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<CampScheduleData | null>(null)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadSchedule()
  }, [campId])

  async function loadSchedule() {
    try {
      setLoading(true)
      const res = await fetch(`/api/cit/camps/${campId}`)
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load schedule')
      }

      setData(json.data)

      // Auto-expand today's day or first day
      if (json.data?.camp_days?.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0]
        const todayDay = json.data.camp_days.find(
          (d: CampDay) => d.date.split('T')[0] === todayStr
        )
        setExpandedDays(new Set([todayDay?.id || json.data.camp_days[0].id]))
      }

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function toggleDay(dayId: string) {
    setExpandedDays((prev) => {
      const next = new Set(prev)
      if (next.has(dayId)) {
        next.delete(dayId)
      } else {
        next.add(dayId)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-orange-400 animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div>
        <PortalPageHeader
          title="Camp Schedule"
          description="View your camp schedule"
        />
        <PortalCard>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Error Loading Schedule</h3>
            <p className="text-white/50 mb-4">{error}</p>
            <div className="flex justify-center gap-4">
              <Link
                href="/cit/camps"
                className="px-6 py-3 bg-white/10 text-white font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
              >
                Back to Camps
              </Link>
              <button
                onClick={loadSchedule}
                className="px-6 py-3 bg-orange-400 text-black font-bold uppercase tracking-wider hover:bg-orange-400/90 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </PortalCard>
      </div>
    )
  }

  return (
    <div>
      <PortalPageHeader
        title={data.camp.name}
        description="Camp Schedule"
        actions={
          <Link
            href="/cit/camps"
            className="px-4 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/20 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        }
      />

      {/* Camp Info */}
      <PortalCard accent="orange" className="mb-6">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <span className="flex items-center gap-2 text-white">
            <Calendar className="h-4 w-4 text-orange-400" />
            {new Date(data.camp.start_date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
            })} - {new Date(data.camp.end_date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          {data.camp.location_name && (
            <span className="flex items-center gap-2 text-white">
              <MapPin className="h-4 w-4 text-orange-400" />
              {data.camp.location_name}
            </span>
          )}
          {data.camp.start_time && data.camp.end_time && (
            <span className="flex items-center gap-2 text-white">
              <Clock className="h-4 w-4 text-orange-400" />
              {formatTime12h(data.camp.start_time)} - {formatTime12h(data.camp.end_time)}
            </span>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-4">
          <span className="text-sm text-white/50">
            <span className="text-white">Your Role:</span> {data.camp.role}
          </span>
          {data.camp.station_name && (
            <span className="text-sm text-orange-400">
              <span className="text-white/50">Station:</span> {data.camp.station_name}
            </span>
          )}
          {data.camp.call_time && (
            <span className="text-sm text-purple">
              <span className="text-white/50">Call Time:</span> {data.camp.call_time}
            </span>
          )}
        </div>
      </PortalCard>

      {/* Schedule Days */}
      {data.camp_days.length === 0 ? (
        <PortalCard>
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/50">No schedule has been created for this camp yet.</p>
          </div>
        </PortalCard>
      ) : (
        <div className="space-y-4">
          {data.camp_days.map((day) => {
            const isExpanded = expandedDays.has(day.id)
            const isToday =
              day.date.split('T')[0] === new Date().toISOString().split('T')[0]

            return (
              <PortalCard key={day.id} className={isToday ? 'border-orange-400/50' : ''}>
                <button
                  onClick={() => toggleDay(day.id)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'w-10 h-10 flex items-center justify-center text-lg font-bold',
                        isToday ? 'bg-orange-400 text-black' : 'bg-white/10 text-white'
                      )}
                    >
                      {day.day_number}
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-white">
                        Day {day.day_number}
                        {isToday && <span className="text-orange-400 ml-2">(Today)</span>}
                      </h3>
                      <p className="text-sm text-white/50">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-white/40">
                      {day.schedule_blocks.length} activities
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-white/50" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-white/50" />
                    )}
                  </div>
                </button>

                {isExpanded && day.schedule_blocks.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                    {day.schedule_blocks.map((block) => (
                      <div
                        key={block.id}
                        className={cn(
                          'p-3 bg-white/5 flex items-start gap-4',
                          block.block_type === 'break' && 'opacity-60'
                        )}
                      >
                        <div className="w-28 flex-shrink-0">
                          <span className="text-sm font-mono text-orange-400">
                            {formatTime12h(block.start_time)}
                          </span>
                          <span className="text-white/30 mx-1">-</span>
                          <span className="text-sm font-mono text-white/50">
                            {formatTime12h(block.end_time)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-white">{block.title}</h4>
                          {block.description && (
                            <p className="text-sm text-white/50 mt-1 whitespace-pre-wrap">{block.description}</p>
                          )}
                          {block.location_notes && (
                            <p className="text-xs text-purple mt-1">
                              <MapPin className="h-3 w-3 inline mr-1" />
                              {block.location_notes}
                            </p>
                          )}
                        </div>
                        <span
                          className={cn(
                            'px-2 py-0.5 text-xs font-bold uppercase',
                            block.block_type === 'activity' && 'bg-neon/20 text-neon',
                            block.block_type === 'break' && 'bg-white/10 text-white/50',
                            block.block_type === 'transition' && 'bg-purple/20 text-purple',
                            block.block_type === 'curriculum' && 'bg-orange-400/20 text-orange-400',
                            block.block_type === 'meal' && 'bg-yellow-400/20 text-yellow-400'
                          )}
                        >
                          {block.block_type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </PortalCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
