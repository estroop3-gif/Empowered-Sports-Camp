'use client'

/**
 * Admin Camp HQ Hub
 *
 * Quick access to Camp HQ for all active/recent camps.
 * Shows camps currently running or upcoming with direct links to their HQ.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  LayoutDashboard,
  Calendar,
  MapPin,
  Users,
  Clock,
  Loader2,
  ChevronRight,
  Play,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CampForHQ {
  id: string
  name: string
  slug: string
  start_date: string
  end_date: string
  status: string
  capacity: number
  registration_count?: number
  location?: {
    id: string
    name: string
    city: string | null
    state: string | null
  } | null
  tenant?: {
    id: string
    name: string
  } | null
  current_day?: number
  total_days?: number
}

export default function AdminCampHQPage() {
  const { user } = useAuth()
  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'
  const [loading, setLoading] = useState(true)
  const [camps, setCamps] = useState<CampForHQ[]>([])
  const [filter, setFilter] = useState<'active' | 'upcoming' | 'recent' | 'all'>('active')
  const [hasInitializedFilter, setHasInitializedFilter] = useState(false)

  useEffect(() => {
    loadCamps()
  }, [])

  // Auto-select the best filter based on available camps
  useEffect(() => {
    if (hasInitializedFilter || camps.length === 0) return

    const now = new Date()
    const hasActive = camps.some(camp => {
      const start = new Date(camp.start_date)
      const end = new Date(camp.end_date)
      return now >= start && now <= end
    })
    const hasUpcoming = camps.some(camp => {
      const start = new Date(camp.start_date)
      return start > now
    })

    if (hasActive) {
      setFilter('active')
    } else if (hasUpcoming) {
      setFilter('upcoming')
    } else {
      setFilter('all')
    }
    setHasInitializedFilter(true)
  }, [camps, hasInitializedFilter])

  async function loadCamps() {
    try {
      // Use the admin camps service endpoint
      const res = await fetch('/api/admin/camps')
      const json = await res.json()
      if (json.camps && Array.isArray(json.camps)) {
        setCamps(json.camps)
      } else if (json.data && Array.isArray(json.data)) {
        setCamps(json.data)
      } else if (Array.isArray(json)) {
        setCamps(json)
      } else {
        setCamps([])
      }
    } catch (err) {
      console.error('Failed to load camps:', err)
      setCamps([])
    } finally {
      setLoading(false)
    }
  }

  const now = new Date()

  const filteredCamps = camps.filter(camp => {
    const start = new Date(camp.start_date)
    const end = new Date(camp.end_date)

    switch (filter) {
      case 'active':
        return now >= start && now <= end
      case 'upcoming':
        return start > now
      case 'recent':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return end < now && end > weekAgo
      default:
        return true
    }
  })

  const activeCamps = camps.filter(camp => {
    const start = new Date(camp.start_date)
    const end = new Date(camp.end_date)
    return now >= start && now <= end
  })

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`
  }

  const getCampStatus = (camp: CampForHQ) => {
    const start = new Date(camp.start_date)
    const end = new Date(camp.end_date)

    if (now >= start && now <= end) {
      return { label: 'Active', color: 'bg-neon text-black', icon: Play }
    } else if (start > now) {
      return { label: 'Upcoming', color: 'bg-purple/20 text-purple', icon: Clock }
    } else {
      return { label: 'Completed', color: 'bg-white/10 text-white/50', icon: CheckCircle }
    }
  }

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <PageHeader
        title="Camp HQ"
        description="Quick access to camp operations dashboards"
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
              Click any camp below to access its Camp HQ dashboard
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['active', 'upcoming', 'recent', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors',
              filter === f
                ? 'bg-neon text-black'
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
            )}
          >
            {f === 'active' ? `Active (${activeCamps.length})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-neon" />
        </div>
      ) : filteredCamps.length === 0 ? (
        <ContentCard>
          <div className="py-12 text-center">
            <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">
              No {filter === 'all' ? '' : filter} camps found
            </h3>
            <p className="text-white/50">
              {filter === 'active'
                ? 'No camps are currently running'
                : filter === 'upcoming'
                ? 'No upcoming camps scheduled'
                : 'Try a different filter'}
            </p>
          </div>
        </ContentCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCamps.map((camp) => {
            const status = getCampStatus(camp)
            const StatusIcon = status.icon

            return (
              <Link
                key={camp.id}
                href={`/admin/camps/${camp.id}/hq`}
                className="group block bg-dark-100 border border-white/10 hover:border-neon/50 transition-all"
              >
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-white group-hover:text-neon transition-colors">
                      {camp.name}
                    </h3>
                    <span className={cn('px-2 py-1 text-xs font-bold uppercase', status.color)}>
                      {status.label}
                    </span>
                  </div>
                  <div className="text-sm text-white/50">
                    {camp.tenant?.name || 'Unassigned'}
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <Calendar className="h-4 w-4 text-white/40" />
                    {formatDateRange(camp.start_date, camp.end_date)}
                  </div>

                  {camp.location && (
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <MapPin className="h-4 w-4 text-white/40" />
                      {camp.location.city}, {camp.location.state}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <Users className="h-4 w-4 text-white/40" />
                    {camp.registration_count || 0} / {camp.capacity} registered
                  </div>
                </div>

                <div className="p-4 bg-white/5 flex items-center justify-between">
                  <span className="text-sm font-bold text-neon uppercase tracking-wider">
                    Open Camp HQ
                  </span>
                  <ChevronRight className="h-5 w-5 text-neon group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </AdminLayout>
  )
}
