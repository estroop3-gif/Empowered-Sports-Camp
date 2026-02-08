'use client'

/**
 * Director Dashboard Overview Component
 *
 * Main dashboard view for Camp Directors (Independent Contractors).
 * Shows:
 * - Welcome card with role summary
 * - Today's camps with quick actions
 * - Upcoming camps
 * - EmpowerU progress (Operational portal)
 * - Incentive snapshot
 * - Quick links
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PortalCard } from '@/components/portal'
import { cn, parseDateSafe, formatTime12h } from '@/lib/utils'
import {
  LayoutDashboard,
  Calendar,
  MapPin,
  Users,
  Clock,
  Loader2,
  ChevronRight,
  Play,
  Square,
  CheckCircle,
  AlertCircle,
  GraduationCap,
  DollarSign,
  Trophy,
  FileText,
  Mail,
  UsersRound,
  TrendingUp,
  Target,
  ClipboardList,
  Zap,
} from 'lucide-react'
import type { DirectorDashboardData } from '@/lib/services/director-dashboard'
import { AssignmentRequestsCard } from '@/components/staff-requests'

interface DirectorDashboardOverviewProps {
  initialData?: DirectorDashboardData | null
}

export function DirectorDashboardOverview({ initialData }: DirectorDashboardOverviewProps) {
  const [loading, setLoading] = useState(!initialData)
  const [data, setData] = useState<DirectorDashboardData | null>(initialData || null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!initialData) {
      loadDashboardData()
    }
  }, [initialData])

  async function loadDashboardData() {
    try {
      const res = await fetch('/api/director/dashboard')
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load dashboard')
      }

      setData(json.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-neon animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <PortalCard>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Error Loading Dashboard</h3>
          <p className="text-white/50 mb-4">{error || 'Unable to load dashboard data'}</p>
          <button
            onClick={loadDashboardData}
            className="px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </PortalCard>
    )
  }

  const { user, today_camps, upcoming_camps, empoweru_progress, incentive_snapshot, quick_actions } = data
  const firstName = user.name.split(' ')[0]

  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <WelcomeCard firstName={firstName} />

      {/* Assignment Requests */}
      <AssignmentRequestsCard />

      {/* Quick Actions Bar */}
      {quick_actions.has_active_camp && (
        <QuickActionsBar quickActions={quick_actions} />
      )}

      {/* Main Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column - Today's Camps and Upcoming */}
        <div className="lg:col-span-2 space-y-8">
          {/* Today's Camps */}
          <TodayCampsCard camps={today_camps} />

          {/* Upcoming Camps */}
          <UpcomingCampsCard camps={upcoming_camps} />
        </div>

        {/* Right Column - Progress and Incentives */}
        <div className="space-y-8">
          {/* EmpowerU Progress */}
          <EmpowerUProgressCard progress={empoweru_progress} />

          {/* Incentive Snapshot */}
          <IncentiveSnapshotCard snapshot={incentive_snapshot} />

          {/* Quick Links */}
          <QuickLinksCard />
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Sub-components
// =============================================================================

function WelcomeCard({ firstName }: { firstName: string }) {
  return (
    <PortalCard accent="neon">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome, {firstName}
          </h2>
          <p className="text-white/70 mb-3">
            You are an Empowered Sports Camp Director (Independent Contractor).
          </p>
          <div className="space-y-1 text-sm text-white/50">
            <p className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-neon" />
              Run assigned camps according to the Empowered plan
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-neon" />
              Complete required EmpowerU training
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-neon" />
              Use Camp HQ for grouping, check-in, camp flow, and recap
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/director/camps"
            className="px-4 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/20 transition-colors"
          >
            My Camps
          </Link>
          <Link
            href="/director/empoweru"
            className="px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider text-sm hover:bg-neon/90 transition-colors"
          >
            EmpowerU
          </Link>
        </div>
      </div>
    </PortalCard>
  )
}

function QuickActionsBar({
  quickActions,
}: {
  quickActions: DirectorDashboardData['quick_actions']
}) {
  return (
    <div className="p-4 bg-neon/10 border border-neon/30 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-neon/20 flex items-center justify-center">
          <Play className="h-5 w-5 text-neon" />
        </div>
        <div>
          <div className="font-bold text-white">Camp In Progress</div>
          <div className="text-sm text-white/50">Quick access to today's operations</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {quickActions.active_camp_id && (
          <Link
            href={`/director/camps/${quickActions.active_camp_id}/hq`}
            className="px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider text-sm hover:bg-neon/90 transition-colors"
          >
            Open Camp HQ
          </Link>
        )}
        {quickActions.active_camp_day_id && (
          <Link
            href={`/director/camp-day/${quickActions.active_camp_day_id}?tab=checkin`}
            className="px-4 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/20 transition-colors"
          >
            Check-In
          </Link>
        )}
        {quickActions.needs_recap && quickActions.active_camp_day_id && (
          <Link
            href={`/director/camp-day/${quickActions.active_camp_day_id}?tab=recap`}
            className="px-4 py-2 bg-purple text-white font-bold uppercase tracking-wider text-sm hover:bg-purple/90 transition-colors"
          >
            Daily Recap
          </Link>
        )}
      </div>
    </div>
  )
}

function TodayCampsCard({
  camps,
}: {
  camps: DirectorDashboardData['today_camps']
}) {
  if (camps.length === 0) {
    return (
      <PortalCard title="Today's Camps">
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No Camps Today</h3>
          <p className="text-white/50">
            Check your upcoming camps below or view the full schedule.
          </p>
          <Link
            href="/director/camps"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/20 transition-colors"
          >
            View All Camps
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </PortalCard>
    )
  }

  return (
    <PortalCard title="Today's Camps" accent="neon">
      <div className="space-y-4">
        {camps.map((camp) => (
          <TodayCampItem key={camp.id} camp={camp} />
        ))}
      </div>
    </PortalCard>
  )
}

function TodayCampItem({
  camp,
}: {
  camp: DirectorDashboardData['today_camps'][0]
}) {
  const statusConfig = {
    not_started: { label: 'Not Started', color: 'bg-white/10 text-white/50', icon: Clock },
    in_progress: { label: 'In Progress', color: 'bg-neon/20 text-neon', icon: Play },
    finished: { label: 'Finished', color: 'bg-purple/20 text-purple', icon: CheckCircle },
  }

  const status = statusConfig[camp.status]
  const StatusIcon = status.icon

  return (
    <div className="p-4 bg-white/5 border border-white/10">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-bold text-white">{camp.camp_name}</h3>
            <span className={cn('px-2 py-1 text-xs font-bold uppercase', status.color)}>
              <StatusIcon className="h-3 w-3 inline mr-1" />
              {status.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
            {camp.location_name && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {camp.location_city}, {camp.location_state}
              </span>
            )}
            {camp.start_time && camp.end_time && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime12h(camp.start_time)} - {formatTime12h(camp.end_time)}
              </span>
            )}
            <span className="text-white/40">
              Day {camp.day_number} of {camp.total_days}
            </span>
          </div>

          {/* Attendance Stats */}
          <div className="flex flex-wrap gap-4 mt-3 text-sm">
            <span className="flex items-center gap-1 text-white/70">
              <Users className="h-3 w-3" />
              {camp.stats.registered} registered
            </span>
            <span className="flex items-center gap-1 text-neon">
              <CheckCircle className="h-3 w-3" />
              {camp.stats.checked_in} checked in
            </span>
            {camp.stats.on_site > 0 && (
              <span className="flex items-center gap-1 text-neon">
                {camp.stats.on_site} on-site
              </span>
            )}
            {camp.stats.checked_out > 0 && (
              <span className="flex items-center gap-1 text-purple">
                {camp.stats.checked_out} checked out
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/director/camps/${camp.camp_id}/hq`}
            className="px-3 py-2 bg-neon text-black font-bold uppercase tracking-wider text-xs hover:bg-neon/90 transition-colors"
          >
            Camp HQ
          </Link>
          {camp.id && !camp.id.startsWith('pending-') && (
            <>
              <Link
                href={`/director/camp-day/${camp.id}?tab=checkin`}
                className="px-3 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-xs hover:bg-white/20 transition-colors"
              >
                Check-In
              </Link>
              {(camp.status === 'in_progress' || camp.status === 'finished') && !camp.recap_complete && (
                <Link
                  href={`/director/camp-day/${camp.id}?tab=recap`}
                  className="px-3 py-2 bg-purple text-white font-bold uppercase tracking-wider text-xs hover:bg-purple/90 transition-colors"
                >
                  Complete Recap
                </Link>
              )}
            </>
          )}
          <Link
            href={`/director/camps/${camp.camp_id}/grouping`}
            className="px-3 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-xs hover:bg-white/20 transition-colors"
          >
            Groups
          </Link>
        </div>
      </div>
    </div>
  )
}

function UpcomingCampsCard({
  camps,
}: {
  camps: DirectorDashboardData['upcoming_camps']
}) {
  // Filter to only show camps that haven't started or are within the next 14 days
  const upcomingOnly = camps.filter((c) => c.days_until_start > 0).slice(0, 5)

  if (upcomingOnly.length === 0) {
    return (
      <PortalCard title="Upcoming Camps">
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50">No upcoming camps scheduled.</p>
        </div>
      </PortalCard>
    )
  }

  return (
    <PortalCard title="Upcoming Camps">
      <div className="space-y-3">
        {upcomingOnly.map((camp) => (
          <Link
            key={camp.id}
            href={`/director/camps/${camp.id}/hq`}
            className="flex items-center justify-between p-3 bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
          >
            <div>
              <div className="font-bold text-white">{camp.name}</div>
              <div className="flex items-center gap-3 text-sm text-white/50">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {parseDateSafe(camp.start_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })} - {parseDateSafe(camp.end_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                {camp.location_name && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {camp.location_city}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-white">
                {camp.registered_count}/{camp.capacity}
              </div>
              <div className="text-xs text-white/40">
                {camp.days_until_start === 1
                  ? 'Tomorrow'
                  : `${camp.days_until_start} days`}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <Link
        href="/director/camps"
        className="mt-4 flex items-center justify-center gap-2 p-3 bg-white/5 text-white/70 font-bold uppercase tracking-wider text-sm hover:bg-white/10 transition-colors"
      >
        View All Camps
        <ChevronRight className="h-4 w-4" />
      </Link>
    </PortalCard>
  )
}

function EmpowerUProgressCard({
  progress,
}: {
  progress: DirectorDashboardData['empoweru_progress']
}) {
  const hasLockedFeatures = progress.locked_features.length > 0

  return (
    <PortalCard title="EmpowerU Progress" accent="purple">
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-white/50">Operational Training</span>
          <span className="font-bold text-white">
            {progress.completed_modules}/{progress.total_modules}
          </span>
        </div>
        <div className="h-3 bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple to-neon transition-all"
            style={{ width: `${progress.percent_complete}%` }}
          />
        </div>
      </div>

      {/* Status */}
      {progress.required_completed ? (
        <div className="p-3 bg-neon/10 border border-neon/30 flex items-center gap-2 text-sm mb-4">
          <CheckCircle className="h-4 w-4 text-neon flex-shrink-0" />
          <span className="text-neon">Required training complete!</span>
        </div>
      ) : (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-2 text-sm mb-4">
          <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
          <span className="text-yellow-400">Complete required training to unlock all features</span>
        </div>
      )}

      {/* Locked Features Warning */}
      {hasLockedFeatures && (
        <div className="mb-4 text-xs text-white/40">
          <span className="font-bold">Locked:</span>{' '}
          {progress.locked_features.join(', ').replace(/_/g, ' ')}
        </div>
      )}

      {/* Next Module */}
      {progress.next_module && (
        <div className="p-3 bg-white/5 border border-white/10">
          <div className="text-xs text-white/40 uppercase mb-1">Next Module</div>
          <div className="font-bold text-white">{progress.next_module.title}</div>
          <div className="text-xs text-white/50 mt-1">
            ~{progress.next_module.estimated_minutes} min
          </div>
        </div>
      )}

      <Link
        href="/director/empoweru"
        className="mt-4 flex items-center justify-center gap-2 p-3 bg-purple text-white font-bold uppercase tracking-wider text-sm hover:bg-purple/90 transition-colors"
      >
        <GraduationCap className="h-4 w-4" />
        Open EmpowerU
      </Link>
    </PortalCard>
  )
}

function IncentiveSnapshotCard({
  snapshot,
}: {
  snapshot: DirectorDashboardData['incentive_snapshot']
}) {
  const formatCurrency = (val: number) => `$${val.toFixed(2)}`

  return (
    <PortalCard title="Incentive Snapshot" accent="magenta">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-white/5">
          <div className="text-2xl font-bold text-neon">
            {formatCurrency(snapshot.total_compensation)}
          </div>
          <div className="text-xs text-white/50 uppercase">Total Earned</div>
        </div>
        <div className="p-3 bg-white/5">
          <div className="text-2xl font-bold text-white">
            {snapshot.total_sessions}
          </div>
          <div className="text-xs text-white/50 uppercase">Sessions</div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="space-y-2 text-sm">
        {snapshot.avg_csat_score !== null && (
          <div className="flex items-center justify-between">
            <span className="text-white/50">Avg CSAT Score</span>
            <span className="font-bold text-white">
              {snapshot.avg_csat_score.toFixed(1)}
            </span>
          </div>
        )}
        {snapshot.avg_enrollment !== null && (
          <div className="flex items-center justify-between">
            <span className="text-white/50">Avg Enrollment</span>
            <span className="font-bold text-white">
              {Math.round(snapshot.avg_enrollment)}
            </span>
          </div>
        )}
        {snapshot.pending_compensation > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-white/50">Pending</span>
            <span className="font-bold text-yellow-400">
              {formatCurrency(snapshot.pending_compensation)}
            </span>
          </div>
        )}
      </div>

      {/* Pending Badge */}
      {snapshot.current_camp_pending && (
        <div className="mt-4 p-2 bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-400">
          Current camp incentive calculation pending
        </div>
      )}

      <Link
        href="/director/incentives"
        className="mt-4 flex items-center justify-center gap-2 p-3 bg-white/10 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/20 transition-colors"
      >
        <Trophy className="h-4 w-4" />
        View Scorecards
      </Link>
    </PortalCard>
  )
}

function QuickLinksCard() {
  const links = [
    { href: '/director/communications', label: 'Send Communication', icon: Mail },
    { href: '/director/daily-recaps', label: 'Daily Recaps', icon: FileText },
    { href: '/director/curriculum', label: 'Curriculum', icon: ClipboardList },
    { href: '/camp-checkin', label: 'Check-In Kiosk', icon: Zap },
  ]

  return (
    <PortalCard title="Quick Links">
      <div className="space-y-2">
        {links.map((link) => {
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
            >
              <Icon className="h-4 w-4 text-white/50" />
              <span className="text-sm font-medium text-white">{link.label}</span>
              <ChevronRight className="h-4 w-4 text-white/30 ml-auto" />
            </Link>
          )
        })}
      </div>
    </PortalCard>
  )
}

export default DirectorDashboardOverview
