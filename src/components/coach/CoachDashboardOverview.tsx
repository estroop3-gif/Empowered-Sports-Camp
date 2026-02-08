'use client'

/**
 * Coach Dashboard Overview Component
 *
 * Main dashboard view for Coaches - a focused "game-day hub".
 * Shows:
 * - Welcome card with role summary
 * - Today's camps with schedule blocks and quick actions
 * - Upcoming camps
 * - EmpowerU training progress
 * - Incentive snapshot
 * - Quick links
 *
 * Answers:
 * - What camps am I coaching?
 * - What's my schedule today?
 * - Which athletes/groups am I responsible for?
 * - Where am I on training and incentives?
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PortalCard } from '@/components/portal'
import { cn, parseDateSafe, formatTime12h } from '@/lib/utils'
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Loader2,
  ChevronRight,
  Play,
  CheckCircle,
  AlertCircle,
  GraduationCap,
  Trophy,
  BookOpen,
  Inbox,
  UserCheck,
  Zap,
  Target,
} from 'lucide-react'
import type { CoachDashboardOverview as CoachDashboardData } from '@/lib/services/coach-dashboard'
import { AssignmentRequestsCard } from '@/components/staff-requests'

interface CoachDashboardOverviewProps {
  initialData?: CoachDashboardData | null
}

export function CoachDashboardOverview({ initialData }: CoachDashboardOverviewProps) {
  const [loading, setLoading] = useState(!initialData)
  const [data, setData] = useState<CoachDashboardData | null>(initialData || null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!initialData) {
      loadDashboardData()
    }
  }, [initialData])

  async function loadDashboardData() {
    try {
      const res = await fetch('/api/coach/dashboard')
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
        <Loader2 className="h-12 w-12 text-blue-400 animate-spin" />
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
            className="px-6 py-3 bg-blue-400 text-black font-bold uppercase tracking-wider hover:bg-blue-400/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </PortalCard>
    )
  }

  const {
    profile,
    todays_camps,
    upcoming_camps,
    empoweru_progress,
    incentive_snapshot,
    messages,
    quick_stats,
    quick_actions,
  } = data

  const firstName = profile.first_name || profile.email.split('@')[0]

  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <WelcomeCard firstName={firstName} quickStats={quick_stats} />

      {/* Assignment Requests */}
      <AssignmentRequestsCard />

      {/* Training Alert Banner */}
      {quick_actions.needs_training && (
        <TrainingAlertBanner />
      )}

      {/* Quick Actions Bar - If active camp */}
      {quick_actions.has_active_camp && (
        <ActiveCampBar campId={quick_actions.active_camp_id!} />
      )}

      {/* Main Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column - Today's Schedule and Camps */}
        <div className="lg:col-span-2 space-y-8">
          {/* Today's Schedule */}
          <TodayScheduleCard camps={todays_camps} />

          {/* Upcoming Camps */}
          <UpcomingCampsCard camps={upcoming_camps} />
        </div>

        {/* Right Column - Progress, Incentives, Messages */}
        <div className="space-y-8">
          {/* EmpowerU Progress */}
          <EmpowerUProgressCard progress={empoweru_progress} />

          {/* Incentive Snapshot */}
          <IncentiveSnapshotCard snapshot={incentive_snapshot} />

          {/* Messages */}
          <MessagesCard messages={messages} />

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

function WelcomeCard({
  firstName,
  quickStats,
}: {
  firstName: string
  quickStats: CoachDashboardData['quick_stats']
}) {
  return (
    <PortalCard accent="neon">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome, {firstName}
          </h2>
          <p className="text-white/70 mb-3">
            You are an Empowered Sports Coach. Here&apos;s your game-day hub.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2 text-white/60">
              <Calendar className="h-4 w-4" />
              <span>{quickStats.camps_assigned} camps assigned</span>
            </div>
            <div className="flex items-center gap-2 text-white/60">
              <Play className="h-4 w-4 text-neon" />
              <span>{quickStats.active_camps_today} active today</span>
            </div>
            <div className="flex items-center gap-2 text-white/60">
              <GraduationCap className="h-4 w-4 text-purple" />
              <span>{quickStats.modules_completed} modules done</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/coach/camps"
            className="px-4 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/20 transition-colors"
          >
            My Camps
          </Link>
          <Link
            href="/coach/today"
            className="px-4 py-2 bg-blue-400 text-black font-bold uppercase tracking-wider text-sm hover:bg-blue-400/90 transition-colors"
          >
            Today
          </Link>
        </div>
      </div>
    </PortalCard>
  )
}

function TrainingAlertBanner() {
  return (
    <div className="p-6 bg-gradient-to-r from-purple/20 to-blue-400/20 border border-purple/30">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 bg-purple/20 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="h-6 w-6 text-purple" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Complete Your Training</h2>
            <p className="text-white/60 text-sm mt-1">
              Finish the required EmpowerU training modules to unlock all coach features.
            </p>
          </div>
        </div>
        <Link
          href="/coach/empoweru"
          className="inline-flex items-center gap-2 px-6 py-3 bg-purple text-white font-bold uppercase tracking-wider hover:bg-purple/90 transition-colors whitespace-nowrap"
        >
          Continue Training
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>
    </div>
  )
}

function ActiveCampBar({ campId }: { campId: string }) {
  return (
    <div className="p-4 bg-blue-400/10 border border-blue-400/30 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-blue-400/20 flex items-center justify-center">
          <Play className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <div className="font-bold text-white">Camp In Progress</div>
          <div className="text-sm text-white/50">You have an active camp today</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/coach/camps?campId=${campId}`}
          className="px-4 py-2 bg-blue-400 text-black font-bold uppercase tracking-wider text-sm hover:bg-blue-400/90 transition-colors"
        >
          View Camp
        </Link>
        <Link
          href="/coach/curriculum"
          className="px-4 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/20 transition-colors"
        >
          Curriculum
        </Link>
      </div>
    </div>
  )
}

function TodayScheduleCard({
  camps,
}: {
  camps: CoachDashboardData['todays_camps']
}) {
  if (camps.length === 0) {
    return (
      <PortalCard title="Today's Schedule">
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No Camps Today</h3>
          <p className="text-white/50">
            Check your upcoming camps below or view the full schedule.
          </p>
          <Link
            href="/coach/camps"
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
    <PortalCard title="Today's Schedule" accent="neon">
      <div className="space-y-6">
        {camps.map((camp) => (
          <TodayCampSchedule key={camp.camp_id} camp={camp} />
        ))}
      </div>
    </PortalCard>
  )
}

function TodayCampSchedule({
  camp,
}: {
  camp: CoachDashboardData['todays_camps'][0]
}) {
  return (
    <div className="p-4 bg-white/5 border border-white/10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-bold text-white">{camp.camp_name}</h3>
            <span className="px-2 py-1 text-xs font-bold uppercase bg-blue-400/20 text-blue-400">
              Day {camp.day_number} of {camp.total_days}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
            {camp.location_name && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {camp.location_name}
              </span>
            )}
            {camp.camp_start_time && camp.camp_end_time && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {camp.camp_start_time} - {camp.camp_end_time}
              </span>
            )}
            {camp.station_name && (
              <span className="flex items-center gap-1 text-blue-400">
                <Target className="h-3 w-3" />
                {camp.station_name}
              </span>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-1 text-white/70">
            <Users className="h-3 w-3" />
            {camp.quick_stats.total_campers} campers
          </span>
          <span className="flex items-center gap-1 text-neon">
            <CheckCircle className="h-3 w-3" />
            {camp.quick_stats.checked_in} checked in
          </span>
          {camp.quick_stats.on_site > 0 && (
            <span className="flex items-center gap-1 text-blue-400">
              {camp.quick_stats.on_site} on-site
            </span>
          )}
        </div>
      </div>

      {/* My Call Time */}
      {camp.call_time && (
        <div className="mb-4 p-2 bg-blue-400/10 border border-blue-400/30 text-sm">
          <span className="text-white/50">Your shift: </span>
          <span className="font-bold text-blue-400">
            {formatTime12h(camp.call_time)} - {camp.shift_end_time ? formatTime12h(camp.shift_end_time) : 'TBD'}
          </span>
        </div>
      )}

      {/* Schedule Blocks */}
      {camp.schedule_blocks.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-white/40 uppercase mb-2">Schedule</div>
          <div className="space-y-2">
            {camp.schedule_blocks.slice(0, 6).map((block) => (
              <div
                key={block.id}
                className={cn(
                  'flex items-center gap-3 p-2 text-sm',
                  block.is_my_station
                    ? 'bg-blue-400/10 border border-blue-400/30'
                    : 'bg-white/5'
                )}
              >
                <span className="text-white/50 w-24 flex-shrink-0">
                  {formatTime12h(block.start_time)} - {formatTime12h(block.end_time)}
                </span>
                <span className={cn(
                  'font-medium',
                  block.is_my_station ? 'text-blue-400' : 'text-white'
                )}>
                  {block.title}
                  {block.is_my_station && (
                    <span className="ml-2 text-xs text-blue-400">(Your station)</span>
                  )}
                </span>
              </div>
            ))}
            {camp.schedule_blocks.length > 6 && (
              <div className="text-xs text-white/40">
                +{camp.schedule_blocks.length - 6} more blocks
              </div>
            )}
          </div>
        </div>
      )}

      {/* Groups */}
      {camp.groups.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-white/40 uppercase mb-2">Groups</div>
          <div className="flex flex-wrap gap-2">
            {camp.groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10"
              >
                {group.team_color && (
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: group.team_color }}
                  />
                )}
                <span className="text-sm text-white">{group.name}</span>
                <span className="text-xs text-white/40">({group.camper_count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
        <Link
          href={`/coach/camps?campId=${camp.camp_id}`}
          className="px-3 py-2 bg-blue-400 text-black font-bold uppercase tracking-wider text-xs hover:bg-blue-400/90 transition-colors"
        >
          Camp Details
        </Link>
        <Link
          href="/coach/curriculum"
          className="px-3 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-xs hover:bg-white/20 transition-colors"
        >
          Curriculum
        </Link>
      </div>
    </div>
  )
}

function UpcomingCampsCard({
  camps,
}: {
  camps: CoachDashboardData['upcoming_camps']
}) {
  // Filter to only show upcoming camps
  const upcomingOnly = camps.filter((c) => c.status === 'upcoming').slice(0, 5)

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
            href={`/coach/camps?campId=${camp.id}`}
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
        href="/coach/camps"
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
  progress: CoachDashboardData['empoweru_progress']
}) {
  return (
    <PortalCard title="EmpowerU Training" accent="purple">
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-white/50">Core Training</span>
          <span className="font-bold text-white">
            {progress.completed_modules}/{progress.total_modules}
          </span>
        </div>
        <div className="h-3 bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple to-blue-400 transition-all"
            style={{ width: `${progress.completion_percentage}%` }}
          />
        </div>
      </div>

      {/* Status */}
      {progress.has_completed_core ? (
        <div className="p-3 bg-neon/10 border border-neon/30 flex items-center gap-2 text-sm mb-4">
          <CheckCircle className="h-4 w-4 text-neon flex-shrink-0" />
          <span className="text-neon">Core training complete!</span>
        </div>
      ) : (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-2 text-sm mb-4">
          <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
          <span className="text-yellow-400">Complete core training to unlock all features</span>
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
        href="/coach/empoweru"
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
  snapshot: CoachDashboardData['incentive_snapshot']
}) {
  const formatCurrency = (val: number) => `$${val.toFixed(2)}`

  return (
    <PortalCard title="Incentives" accent="magenta">
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

      {/* Current Camp */}
      {snapshot.current_camp && (
        <div className="mb-4 p-3 bg-blue-400/10 border border-blue-400/30">
          <div className="text-xs text-white/40 uppercase mb-1">Current Camp</div>
          <div className="font-bold text-white">{snapshot.current_camp.camp_name}</div>
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="text-white/50">Projected</span>
            <span className="font-bold text-blue-400">
              {formatCurrency(snapshot.current_camp.total)}
            </span>
          </div>
        </div>
      )}

      {/* Pending Badge */}
      {snapshot.pending_compensation > 0 && (
        <div className="mb-4 p-2 bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-400">
          {formatCurrency(snapshot.pending_compensation)} pending finalization
        </div>
      )}

      <Link
        href="/coach/incentives"
        className="mt-4 flex items-center justify-center gap-2 p-3 bg-white/10 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/20 transition-colors"
      >
        <Trophy className="h-4 w-4" />
        View Incentives
      </Link>
    </PortalCard>
  )
}

function MessagesCard({
  messages,
}: {
  messages: CoachDashboardData['messages']
}) {
  return (
    <PortalCard title="Messages">
      {messages.unread_count > 0 ? (
        <div className="mb-4 p-3 bg-blue-400/10 border border-blue-400/30 flex items-center gap-2">
          <Inbox className="h-4 w-4 text-blue-400" />
          <span className="text-sm text-blue-400 font-bold">
            {messages.unread_count} unread message{messages.unread_count > 1 ? 's' : ''}
          </span>
        </div>
      ) : (
        <div className="text-center py-4 text-white/40 text-sm">
          No unread messages
        </div>
      )}

      {messages.recent_messages.slice(0, 3).map((msg) => (
        <div
          key={msg.id}
          className={cn(
            'p-2 border-b border-white/5 last:border-0',
            !msg.is_read && 'bg-white/5'
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn(
              'text-sm font-medium truncate',
              msg.is_read ? 'text-white/60' : 'text-white'
            )}>
              {msg.subject}
            </span>
            {!msg.is_read && (
              <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0" />
            )}
          </div>
          <div className="text-xs text-white/40 mt-1">
            {new Date(msg.sent_at).toLocaleDateString()}
          </div>
        </div>
      ))}

      <Link
        href="/coach/messages"
        className="mt-4 flex items-center justify-center gap-2 p-3 bg-white/5 text-white/70 font-bold uppercase tracking-wider text-sm hover:bg-white/10 transition-colors"
      >
        <Inbox className="h-4 w-4" />
        All Messages
      </Link>
    </PortalCard>
  )
}

function QuickLinksCard() {
  const links = [
    { href: '/coach/curriculum', label: 'Curriculum Library', icon: BookOpen },
    { href: '/coach/today', label: "Today's Schedule", icon: Clock },
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

export default CoachDashboardOverview
