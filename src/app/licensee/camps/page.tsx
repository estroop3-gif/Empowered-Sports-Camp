'use client'

/**
 * Licensee Camps Page (My Camps)
 *
 * Shows all camps for the licensee's territory with management actions.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import { cn, parseDateSafe } from '@/lib/utils'
import {
  Calendar,
  MapPin,
  Users,
  Loader2,
  ChevronRight,
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  LayoutDashboard,
  UserCircle,
  UsersRound,
  DollarSign,
  Filter,
} from 'lucide-react'
import type { LicenseeCampSummary } from '@/lib/services/licensee-dashboard'

export default function LicenseeCampsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [camps, setCamps] = useState<LicenseeCampSummary[]>([])
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadCamps()
  }, [])

  async function loadCamps() {
    try {
      setLoading(true)
      const res = await fetch('/api/licensee/camps')
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
    planning: camps.filter((c) => c.status === 'planning').length,
    registration: camps.filter((c) => c.status === 'registration').length,
    running: camps.filter((c) => c.status === 'running').length,
    completed: camps.filter((c) => c.status === 'completed').length,
  }

  return (
    <LmsGate featureName="camp management">
      <div>
        <PortalPageHeader
          title="My Camps"
          description={`${camps.length} camp${camps.length !== 1 ? 's' : ''} in your territory`}
          actions={
            <Link
              href="/portal/camps/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider text-sm hover:bg-neon/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Camp
            </Link>
          }
        />

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['all', 'planning', 'registration', 'running', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={cn(
                'px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors',
                filter === status
                  ? 'bg-neon text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              )}
            >
              {status === 'all' ? 'All' : status} ({statusCounts[status]})
            </button>
          ))}
        </div>

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
                onClick={loadCamps}
                className="px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
              >
                Try Again
              </button>
            </div>
          </PortalCard>
        ) : filteredCamps.length === 0 ? (
          <PortalCard>
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">
                {filter === 'all' ? 'No Camps Yet' : `No ${filter} camps`}
              </h2>
              <p className="text-white/50 mb-6">
                {filter === 'all'
                  ? 'Create your first camp to get started.'
                  : `You don't have any camps in ${filter} status.`}
              </p>
              {filter === 'all' && (
                <Link
                  href="/portal/camps/new"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create Camp
                </Link>
              )}
            </div>
          </PortalCard>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCamps.map((camp) => (
              <CampCard key={camp.id} camp={camp} />
            ))}
          </div>
        )}
      </div>
    </LmsGate>
  )
}

function CampCard({ camp }: { camp: LicenseeCampSummary }) {
  const statusConfig = {
    planning: {
      label: 'Planning',
      color: 'bg-white/20 text-white/70',
      icon: Clock,
      accent: undefined as 'neon' | 'purple' | 'magenta' | undefined,
    },
    registration: {
      label: 'Registration',
      color: 'bg-purple/20 text-purple',
      icon: Users,
      accent: 'purple' as const,
    },
    running: {
      label: 'Running',
      color: 'bg-neon/20 text-neon',
      icon: Play,
      accent: 'neon' as const,
    },
    completed: {
      label: 'Completed',
      color: 'bg-white/10 text-white/50',
      icon: CheckCircle,
      accent: undefined,
    },
  }

  const config = statusConfig[camp.status]
  const StatusIcon = config.icon
  const enrollmentPercent = camp.capacity > 0 ? (camp.enrolled_count / camp.capacity) * 100 : 0

  return (
    <PortalCard accent={config.accent}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white truncate">{camp.name}</h3>
          {camp.location_city && (
            <p className="text-sm text-white/50 flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {camp.location_city}, {camp.location_state}
            </p>
          )}
        </div>
        <span className={cn('px-2 py-1 text-xs font-bold uppercase flex-shrink-0', config.color)}>
          <StatusIcon className="h-3 w-3 inline mr-1" />
          {config.label}
        </span>
      </div>

      {/* Info */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-white/50 mb-4">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {parseDateSafe(camp.start_date).toLocaleDateString()} - {parseDateSafe(camp.end_date).toLocaleDateString()}
        </span>
      </div>

      {/* Enrollment Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-white/50">Enrollment</span>
          <span className="text-white font-bold">
            {camp.enrolled_count} / {camp.capacity}
          </span>
        </div>
        <div className="w-full h-2 bg-white/10 overflow-hidden">
          <div
            className={cn(
              'h-full transition-all',
              enrollmentPercent >= 90 ? 'bg-neon' : enrollmentPercent >= 50 ? 'bg-purple' : 'bg-white/30'
            )}
            style={{ width: `${Math.min(enrollmentPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Director */}
      <div className="flex items-center justify-between p-2 bg-white/5 mb-4">
        <span className="text-xs text-white/40 uppercase">Director</span>
        <span className="text-sm text-white">
          {camp.director_name || <span className="text-white/40">Not assigned</span>}
        </span>
      </div>

      {/* Royalty Status for Completed Camps */}
      {camp.status === 'completed' && camp.royalty_status && (
        <div
          className={cn(
            'flex items-center justify-between p-2 mb-4',
            camp.royalty_status === 'paid'
              ? 'bg-neon/10 border border-neon/30'
              : camp.royalty_status === 'invoice_generated'
              ? 'bg-yellow-500/10 border border-yellow-500/30'
              : 'bg-magenta/10 border border-magenta/30'
          )}
        >
          <span className="text-xs uppercase flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            Royalty
          </span>
          <span
            className={cn(
              'text-xs font-bold uppercase',
              camp.royalty_status === 'paid'
                ? 'text-neon'
                : camp.royalty_status === 'invoice_generated'
                ? 'text-yellow-400'
                : 'text-magenta'
            )}
          >
            {camp.royalty_status === 'paid'
              ? 'Paid'
              : camp.royalty_status === 'invoice_generated'
              ? 'Invoice Sent'
              : 'Needs Closeout'}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/licensee/camps/${camp.id}/hq`}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-neon text-black font-bold uppercase tracking-wider text-xs hover:bg-neon/90 transition-colors"
        >
          <LayoutDashboard className="h-3 w-3" />
          Camp HQ
        </Link>
        <Link
          href={`/portal/camps/${camp.id}`}
          className="flex items-center justify-center gap-1 px-3 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-xs hover:bg-white/20 transition-colors"
        >
          <UserCircle className="h-3 w-3" />
          Staff
        </Link>
        <Link
          href={`/licensee/camps/${camp.id}/hq?tab=roster`}
          className="flex items-center justify-center gap-1 px-3 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-xs hover:bg-white/20 transition-colors"
        >
          <Users className="h-3 w-3" />
          Campers
        </Link>
      </div>
    </PortalCard>
  )
}
