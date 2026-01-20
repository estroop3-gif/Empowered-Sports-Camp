'use client'

/**
 * Camp HQ Shell Component
 *
 * The main command center for camp management. Provides a tabbed interface
 * for all camp operations:
 * - Overview: Camp summary, stats, quick actions
 * - Camp Day: Check-in, live day, dismissal, recap
 * - Campers: Integration with The Roster
 * - Groups: Integration with Grouping Tool
 * - Schedule: Schedule builder integration
 * - Staffing: Staff assignments and roles
 * - Reports: Attendance and other reports
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { PortalCard } from '@/components/portal'
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  UsersRound,
  Calendar,
  UserCog,
  FileBarChart,
  Loader2,
  MapPin,
  Clock,
  ArrowRight,
  Play,
  Square,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Send,
  DollarSign,
  Shield,
  Plus,
  Pencil,
  Trash2,
  Flag,
  Lock,
} from 'lucide-react'
import { IncentiveSummaryPanel, GuestSpeakerManager } from '@/components/incentives'
import { ScheduleBuilder } from '@/components/camp-hq/schedule'
import { AddStaffModal, EditStaffModal } from '@/components/camp-hq/staffing'
import { StartDayModal } from './StartDayModal'
import { EndDayModal } from './EndDayModal'
import { ConcludeCampModal } from './ConcludeCampModal'
import type {
  CampHqOverview,
  CampHqDay,
  CampHqStaffMember,
  CampHqGroup,
  CampHqQuickAction,
} from '@/lib/services/campHq'

// ============================================================================
// TYPES
// ============================================================================

export type CampHqTab =
  | 'overview'
  | 'camp-day'
  | 'campers'
  | 'groups'
  | 'schedule'
  | 'waivers'
  | 'staffing'
  | 'reports'
  | 'incentives'

interface CampHqShellProps {
  campId: string
  /** Role-based route prefix (e.g., '/admin/camps' or '/director/camps') */
  routePrefix: string
  /** Initial tab to show */
  initialTab?: CampHqTab
  /** Whether user can edit (admin/licensee can, director has limited) */
  canEdit?: boolean
  /** Whether user is admin (shows additional options) */
  isAdmin?: boolean
  /** Current user ID for actions */
  userId?: string
}

interface TabConfig {
  id: CampHqTab
  label: string
  icon: typeof LayoutDashboard
}

const TABS: TabConfig[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'camp-day', label: 'Camp Day', icon: CalendarCheck },
  { id: 'campers', label: 'Campers', icon: Users },
  { id: 'groups', label: 'Groups & Teams', icon: UsersRound },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'waivers', label: 'Waivers', icon: Shield },
  { id: 'staffing', label: 'Staffing', icon: UserCog },
  { id: 'reports', label: 'Reports', icon: FileBarChart },
  { id: 'incentives', label: 'Incentives', icon: DollarSign },
]

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CampHqShell({
  campId,
  routePrefix,
  initialTab = 'overview',
  canEdit = false,
  isAdmin = false,
  userId,
}: CampHqShellProps) {
  const [activeTab, setActiveTab] = useState<CampHqTab>(initialTab)
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<CampHqOverview | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load overview data
  const loadOverview = useCallback(async () => {
    try {
      const res = await fetch(`/api/camps/${campId}/hq`)
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load camp')
      }

      setOverview(json.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [campId])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  // Auto-refresh when day is in progress (every 30 seconds)
  useEffect(() => {
    if (!overview || overview.today.status !== 'in_progress') return

    const interval = setInterval(() => {
      loadOverview()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [overview, loadOverview])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-neon animate-spin" />
      </div>
    )
  }

  if (error || !overview) {
    return (
      <PortalCard>
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-magenta mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Error Loading Camp</h3>
          <p className="text-white/50 mb-4">{error || 'Camp not found'}</p>
          <button
            onClick={loadOverview}
            className="px-4 py-2 bg-white/10 text-white font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
          >
            <RefreshCw className="h-4 w-4 inline mr-2" />
            Retry
          </button>
        </div>
      </PortalCard>
    )
  }

  return (
    <div className="overflow-x-hidden">
      {/* Camp Header */}
      <CampHqHeader
        overview={overview}
        routePrefix={routePrefix}
        isAdmin={isAdmin}
      />

      {/* Tab Navigation */}
      <div className="border-b border-white/10 mb-6 -mx-4 lg:-mx-8 px-4 lg:px-8">
        <div className="flex gap-1 overflow-x-auto pb-px">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2',
                  isActive
                    ? 'border-neon text-neon bg-neon/5'
                    : 'border-transparent text-white/50 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-full">
        {activeTab === 'overview' && (
          <OverviewTab
            campId={campId}
            overview={overview}
            routePrefix={routePrefix}
            userId={userId}
            onRefresh={loadOverview}
          />
        )}
        {activeTab === 'camp-day' && (
          <CampDayTab
            campId={campId}
            overview={overview}
            routePrefix={routePrefix}
            userId={userId}
            onRefresh={loadOverview}
          />
        )}
        {activeTab === 'campers' && (
          <CampersTab campId={campId} routePrefix={routePrefix} />
        )}
        {activeTab === 'groups' && (
          <GroupsTab campId={campId} routePrefix={routePrefix} canEdit={canEdit} />
        )}
        {activeTab === 'schedule' && (
          <ScheduleTab campId={campId} routePrefix={routePrefix} />
        )}
        {activeTab === 'waivers' && (
          <WaiversTab campId={campId} routePrefix={routePrefix} />
        )}
        {activeTab === 'staffing' && (
          <StaffingTab campId={campId} routePrefix={routePrefix} />
        )}
        {activeTab === 'reports' && (
          <ReportsTab campId={campId} routePrefix={routePrefix} />
        )}
        {activeTab === 'incentives' && (
          <IncentivesTab
            campId={campId}
            overview={overview}
            canEdit={canEdit}
            isAdmin={isAdmin}
          />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// HEADER COMPONENT
// ============================================================================

function CampHqHeader({
  overview,
  routePrefix,
  isAdmin,
}: {
  overview: CampHqOverview
  routePrefix: string
  isAdmin: boolean
}) {
  const { camp, location, stats } = overview

  // Determine camp status
  const today = new Date().toISOString().split('T')[0]
  const isActive = camp.start_date <= today && camp.end_date >= today
  const isUpcoming = camp.start_date > today
  const isPast = camp.end_date < today

  return (
    <div className="mb-8">
      {/* Breadcrumb */}
      <div className="text-sm text-white/40 mb-4">
        <Link href={routePrefix} className="hover:text-white transition-colors">
          Camps
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white">{camp.name}</span>
      </div>

      {/* Camp Title */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl lg:text-3xl font-black text-white uppercase tracking-wider">
              Camp HQ
            </h1>
            <div
              className={cn(
                'px-3 py-1 text-xs font-bold uppercase',
                isActive
                  ? 'bg-neon/20 text-neon'
                  : isUpcoming
                    ? 'bg-purple/20 text-purple'
                    : 'bg-white/10 text-white/50'
              )}
            >
              {isActive ? 'Active' : isUpcoming ? 'Upcoming' : 'Past'}
            </div>
            <div
              className={cn(
                'px-3 py-1 text-xs font-bold uppercase',
                overview.grouping_status === 'finalized'
                  ? 'bg-neon/20 text-neon'
                  : overview.grouping_status === 'reviewed'
                    ? 'bg-purple/20 text-purple'
                    : 'bg-yellow-500/20 text-yellow-400'
              )}
            >
              Groups: {overview.grouping_status}
            </div>
          </div>
          <h2 className="text-xl text-white/80">{camp.name}</h2>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-white/50">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(camp.start_date).toLocaleDateString()} -{' '}
              {new Date(camp.end_date).toLocaleDateString()}
            </span>
            {camp.start_time && camp.end_time && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {camp.start_time} - {camp.end_time}
              </span>
            )}
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {location.name}, {location.city}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Ages {camp.min_age}-{camp.max_age}
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{stats.total_registered}</div>
            <div className="text-xs text-white/40 uppercase">Campers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{stats.percent_full}%</div>
            <div className="text-xs text-white/40 uppercase">Full</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{stats.total_staff}</div>
            <div className="text-xs text-white/40 uppercase">Staff</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {stats.days_completed}/{stats.days_total}
            </div>
            <div className="text-xs text-white/40 uppercase">Days</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab({
  campId,
  overview,
  routePrefix,
  userId,
  onRefresh,
}: {
  campId: string
  overview: CampHqOverview
  routePrefix: string
  userId?: string
  onRefresh: () => void
}) {
  const [actions, setActions] = useState<CampHqQuickAction[]>([])
  const [actionsLoading, setActionsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [refreshing, setRefreshing] = useState(false)

  // Modal states
  const [showStartDayModal, setShowStartDayModal] = useState(false)
  const [showEndDayModal, setShowEndDayModal] = useState(false)
  const [showConcludeModal, setShowConcludeModal] = useState(false)

  const loadActions = useCallback(async () => {
    try {
      const res = await fetch(`/api/camps/${campId}/hq/actions`)
      const json = await res.json()
      if (res.ok) {
        setActions(json.data || [])
      }
    } catch (err) {
      console.error('Failed to load actions:', err)
    } finally {
      setActionsLoading(false)
    }
  }, [campId])

  useEffect(() => {
    loadActions()
  }, [loadActions])

  // Update last updated timestamp when overview changes
  useEffect(() => {
    setLastUpdated(new Date())
  }, [overview])

  // Manual refresh handler
  const handleManualRefresh = async () => {
    setRefreshing(true)
    await Promise.all([onRefresh(), loadActions()])
    setRefreshing(false)
  }

  const handleModalSuccess = async () => {
    setShowStartDayModal(false)
    setShowEndDayModal(false)
    setShowConcludeModal(false)
    // Refresh both overview and actions to update button states
    await Promise.all([onRefresh(), loadActions()])
  }

  const { today, stats } = overview

  // Determine action availability
  const startDayAction = actions.find((a) => a.action === 'start_day')
  const endDayAction = actions.find((a) => a.action === 'end_day')

  // Check if camp is concluded/locked
  const isLocked = (overview.camp as { is_locked?: boolean }).is_locked || false
  const isConcluded = overview.camp.status === 'completed'
  const allDaysCompleted = stats.days_completed === stats.days_total

  return (
    <div className="space-y-6">
      {/* Live Status Indicator */}
      {today.status === 'in_progress' && (
        <div className="flex items-center justify-between p-3 bg-neon/10 border border-neon/30">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-neon"></span>
            </div>
            <span className="text-neon font-bold uppercase tracking-wider text-sm">Live - Day In Progress</span>
            <span className="text-white/50 text-xs">
              Auto-updates every 30s • Last: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className={cn(
              'flex items-center gap-2 px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors',
              refreshing
                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                : 'bg-white/10 text-white hover:bg-white/20'
            )}
          >
            <RefreshCw className={cn('h-3 w-3', refreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>
      )}

      {/* Locked/Concluded Banner */}
      {(isLocked || isConcluded) && (
        <div className="p-4 bg-magenta/10 border border-magenta/30 flex items-center gap-3">
          <Lock className="h-5 w-5 text-magenta shrink-0" />
          <div>
            <div className="font-bold text-magenta">
              {isConcluded ? 'Camp Concluded' : 'Camp Locked'}
            </div>
            <div className="text-sm text-white/50">
              {isConcluded
                ? 'This camp has been concluded. No further modifications can be made.'
                : 'This camp is locked. Contact an administrator to unlock.'}
            </div>
          </div>
        </div>
      )}

      {/* Camp Day Actions Card */}
      <PortalCard title="Camp Day Actions" accent={today.status === 'in_progress' ? 'neon' : undefined}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Status Info */}
          <div>
            {today.is_camp_day ? (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-white">
                    Day {today.day_number} - Today
                  </h3>
                  <div
                    className={cn(
                      'px-2 py-1 text-xs font-bold uppercase',
                      today.status === 'in_progress'
                        ? 'bg-neon/20 text-neon'
                        : today.status === 'finished'
                          ? 'bg-purple/20 text-purple'
                          : 'bg-white/10 text-white/50'
                    )}
                  >
                    {today.status === 'in_progress'
                      ? 'In Progress'
                      : today.status === 'finished'
                        ? 'Completed'
                        : 'Not Started'}
                  </div>
                </div>

                {/* Today's Attendance */}
                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-neon rounded-full" />
                    <span className="text-white">{today.on_site} on-site</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-purple rounded-full" />
                    <span className="text-white/70">{today.checked_out} checked out</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-white/30 rounded-full" />
                    <span className="text-white/50">{today.not_arrived} not arrived</span>
                  </div>
                  {today.absent > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 bg-magenta rounded-full" />
                      <span className="text-white/50">{today.absent} absent</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-white/50">
                {new Date(overview.camp.start_date) > new Date()
                  ? 'Camp has not started yet'
                  : 'No camp day scheduled for today'}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Start Day Button */}
            <button
              onClick={() => setShowStartDayModal(true)}
              disabled={isLocked || isConcluded || !startDayAction?.available}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors',
                !isLocked && !isConcluded && startDayAction?.available
                  ? 'bg-neon text-black hover:bg-neon/90'
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
              )}
              title={startDayAction?.reason}
            >
              <Play className="h-4 w-4" />
              Start Day
            </button>

            {/* End Day Button */}
            <button
              onClick={() => setShowEndDayModal(true)}
              disabled={isLocked || isConcluded || !endDayAction?.available || !overview.today.camp_day_id}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors',
                !isLocked && !isConcluded && endDayAction?.available
                  ? 'bg-purple text-white hover:bg-purple/90'
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
              )}
              title={endDayAction?.reason}
            >
              <Square className="h-4 w-4" />
              End Day
            </button>

            {/* Conclude Camp Button */}
            <button
              onClick={() => setShowConcludeModal(true)}
              disabled={isLocked || isConcluded}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors',
                !isLocked && !isConcluded
                  ? allDaysCompleted
                    ? 'bg-magenta text-white hover:bg-magenta/90'
                    : 'bg-magenta/50 text-white/70 hover:bg-magenta/70'
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
              )}
              title={
                isConcluded
                  ? 'Camp has already been concluded'
                  : isLocked
                    ? 'Camp is locked'
                    : !allDaysCompleted
                      ? 'Not all days completed - force conclude available'
                      : undefined
              }
            >
              <Flag className="h-4 w-4" />
              Conclude Camp
            </button>
          </div>
        </div>
      </PortalCard>

      {/* Modals */}
      {showStartDayModal && (
        <StartDayModal
          campId={campId}
          onClose={() => setShowStartDayModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {showEndDayModal && overview.today.camp_day_id && (
        <EndDayModal
          campId={campId}
          campDayId={overview.today.camp_day_id}
          onClose={() => setShowEndDayModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {showConcludeModal && (
        <ConcludeCampModal
          campId={campId}
          onClose={() => setShowConcludeModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <QuickLinkCard
          href={`${routePrefix}/${campId}/hq?tab=camp-day`}
          title="Camp Day"
          description="Check-in, live operations, dismissal"
          icon={CalendarCheck}
          accent="neon"
          onClick={() => {}}
        />
        <QuickLinkCard
          href={`${routePrefix}/${campId}/roster`}
          title="The Roster"
          description="View and manage all campers"
          icon={Users}
          accent="purple"
        />
        <QuickLinkCard
          href={`${routePrefix}/${campId}/grouping`}
          title="Grouping Tool"
          description="Manage camper groups"
          icon={UsersRound}
          accent="magenta"
        />
        <QuickLinkCard
          href={`${routePrefix}/${campId}/hq?tab=staffing`}
          title="Staff"
          description={`${stats.total_staff} assigned`}
          icon={UserCog}
          onClick={() => {}}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <PortalCard>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-neon/20 flex items-center justify-center">
              <Users className="h-6 w-6 text-neon" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {stats.total_registered}/{stats.total_capacity}
              </p>
              <p className="text-sm text-white/50">Registered Campers</p>
            </div>
          </div>
        </PortalCard>

        <PortalCard>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-purple/20 flex items-center justify-center">
              <UsersRound className="h-6 w-6 text-purple" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total_groups}</p>
              <p className="text-sm text-white/50">Groups</p>
            </div>
          </div>
        </PortalCard>

        <PortalCard>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-magenta/20 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-magenta" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {stats.days_remaining}
              </p>
              <p className="text-sm text-white/50">Days Remaining</p>
            </div>
          </div>
        </PortalCard>
      </div>
    </div>
  )
}

// ============================================================================
// CAMP DAY TAB
// ============================================================================

function CampDayTab({
  campId,
  overview,
  routePrefix,
  userId,
  onRefresh,
}: {
  campId: string
  overview: CampHqOverview
  routePrefix: string
  userId?: string
  onRefresh: () => void
}) {
  const [days, setDays] = useState<CampHqDay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDays() {
      try {
        const res = await fetch(`/api/camps/${campId}/hq/days`)
        const json = await res.json()
        if (res.ok) {
          setDays(json.data || [])
        }
      } catch (err) {
        console.error('Failed to load days:', err)
      } finally {
        setLoading(false)
      }
    }
    loadDays()
  }, [campId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-neon animate-spin" />
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6">
      {/* Today's Operations (if applicable) */}
      {overview.today.is_camp_day && overview.today.camp_day_id && (
        <PortalCard title="Today's Operations" accent="neon">
          <div className="grid gap-4 md:grid-cols-4">
            <Link
              href={`/director/camp-day/${overview.today.camp_day_id}?tab=checkin`}
              className="p-4 bg-white/5 hover:bg-white/10 transition-colors text-center"
            >
              <CheckCircle className="h-8 w-8 text-neon mx-auto mb-2" />
              <div className="font-bold text-white">Check-In</div>
              <div className="text-sm text-white/50">
                {overview.today.checked_in + overview.today.checked_out} arrived
              </div>
            </Link>
            <Link
              href={`/director/camp-day/${overview.today.camp_day_id}?tab=groups`}
              className="p-4 bg-white/5 hover:bg-white/10 transition-colors text-center"
            >
              <UsersRound className="h-8 w-8 text-purple mx-auto mb-2" />
              <div className="font-bold text-white">Groups View</div>
              <div className="text-sm text-white/50">Live groupings</div>
            </Link>
            <Link
              href={`/director/camp-day/${overview.today.camp_day_id}?tab=liveday`}
              className="p-4 bg-white/5 hover:bg-white/10 transition-colors text-center"
            >
              <Calendar className="h-8 w-8 text-magenta mx-auto mb-2" />
              <div className="font-bold text-white">Live Day</div>
              <div className="text-sm text-white/50">Schedule progress</div>
            </Link>
            <Link
              href={`/director/camp-day/${overview.today.camp_day_id}?tab=dismissal`}
              className="p-4 bg-white/5 hover:bg-white/10 transition-colors text-center"
            >
              <XCircle className="h-8 w-8 text-orange-400 mx-auto mb-2" />
              <div className="font-bold text-white">Dismissal</div>
              <div className="text-sm text-white/50">
                {overview.today.on_site} on-site
              </div>
            </Link>
          </div>
        </PortalCard>
      )}

      {/* All Days */}
      <PortalCard title="Camp Days">
        <div className="space-y-2">
          {days.map((day) => {
            const isToday = day.date === today
            const isPast = day.date < today

            return (
              <div
                key={day.id}
                className={cn(
                  'flex items-center justify-between p-4 border border-white/10',
                  isToday && 'bg-neon/5 border-neon/30',
                  day.status === 'finished' && 'opacity-60'
                )}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'h-10 w-10 flex items-center justify-center font-bold',
                      day.status === 'in_progress'
                        ? 'bg-neon text-black'
                        : day.status === 'finished'
                          ? 'bg-purple/20 text-purple'
                          : 'bg-white/10 text-white/50'
                    )}
                  >
                    {day.day_number}
                  </div>
                  <div>
                    <div className="font-bold text-white">
                      {day.title || `Day ${day.day_number}`}
                      {isToday && (
                        <span className="ml-2 text-xs text-neon uppercase">Today</span>
                      )}
                    </div>
                    <div className="text-sm text-white/50">
                      {new Date(day.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Stats */}
                  {(day.status === 'in_progress' || day.status === 'finished') && (
                    <div className="hidden sm:flex gap-4 text-sm">
                      <span className="text-neon">{day.stats.checked_in} in</span>
                      <span className="text-purple">{day.stats.checked_out} out</span>
                      {day.stats.absent > 0 && (
                        <span className="text-magenta">{day.stats.absent} absent</span>
                      )}
                    </div>
                  )}

                  {/* Status Badge */}
                  <div
                    className={cn(
                      'px-2 py-1 text-xs font-bold uppercase',
                      day.status === 'in_progress'
                        ? 'bg-neon/20 text-neon'
                        : day.status === 'finished'
                          ? 'bg-purple/20 text-purple'
                          : 'bg-white/10 text-white/40'
                    )}
                  >
                    {day.status === 'in_progress'
                      ? 'Live'
                      : day.status === 'finished'
                        ? 'Done'
                        : 'Scheduled'}
                  </div>

                  {/* Link to Day */}
                  {!day.id.startsWith('pending-') && (
                    <Link
                      href={`/director/camp-day/${day.id}`}
                      className="px-3 py-1 bg-white/10 text-white text-sm font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
                    >
                      Open
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </PortalCard>
    </div>
  )
}

// ============================================================================
// OTHER TABS (Placeholder implementations)
// ============================================================================

function CampersTab({ campId, routePrefix }: { campId: string; routePrefix: string }) {
  return (
    <PortalCard>
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-white/20 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Camper Management</h3>
        <p className="text-white/50 mb-6">
          View and manage all registered campers for this camp.
        </p>
        <Link
          href={`${routePrefix}/${campId}/roster`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
        >
          Open The Roster
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </PortalCard>
  )
}

interface TeamColorCamper {
  id: string
  camper_session_id: string
  name: string
  first_name: string
  last_name: string
  grade_level: number | null
  friend_group_id: string | null
  group_name: string | null
  team_color: 'pink' | 'purple' | null
  photo_url: string | null
}

interface TeamColorState {
  camp_id: string
  camp_name: string
  pink_team: { campers: TeamColorCamper[]; count: number }
  purple_team: { campers: TeamColorCamper[]; count: number }
  unassigned: { campers: TeamColorCamper[]; count: number }
  total_campers: number
  is_balanced: boolean
  balance_diff: number
}

// Helper to deduplicate campers by ID (prevents duplicate key errors)
function deduplicateCampers<T extends { id: string }>(campers: T[]): T[] {
  const seen = new Set<string>()
  return campers.filter(camper => {
    if (seen.has(camper.id)) {
      console.warn(`[CampHqShell] Duplicate camper ID detected: ${camper.id}`)
      return false
    }
    seen.add(camper.id)
    return true
  })
}

// Helper to deduplicate team color state
function deduplicateTeamColorState(state: TeamColorState | null): TeamColorState | null {
  if (!state) return null
  return {
    ...state,
    pink_team: {
      ...state.pink_team,
      campers: deduplicateCampers(state.pink_team.campers),
    },
    purple_team: {
      ...state.purple_team,
      campers: deduplicateCampers(state.purple_team.campers),
    },
    unassigned: {
      ...state.unassigned,
      campers: deduplicateCampers(state.unassigned.campers),
    },
  }
}

function GroupsTab({ campId, routePrefix, canEdit }: { campId: string; routePrefix: string; canEdit: boolean }) {
  const [groups, setGroups] = useState<CampHqGroup[]>([])
  const [teamColorState, setTeamColorState] = useState<TeamColorState | null>(null)
  const [loading, setLoading] = useState(true)
  const [teamColorsLoading, setTeamColorsLoading] = useState(true)
  const [autoAssigning, setAutoAssigning] = useState(false)
  const [updatingCamper, setUpdatingCamper] = useState<string | null>(null)

  useEffect(() => {
    async function loadGroups() {
      try {
        const res = await fetch(`/api/camps/${campId}/hq/groups`)
        const json = await res.json()
        if (res.ok) {
          setGroups(json.data || [])
        }
      } catch (err) {
        console.error('Failed to load groups:', err)
      } finally {
        setLoading(false)
      }
    }
    loadGroups()
  }, [campId])

  useEffect(() => {
    async function loadTeamColors() {
      try {
        const res = await fetch(`/api/camps/${campId}/hq/team-colors`)
        const json = await res.json()
        if (res.ok) {
          setTeamColorState(deduplicateTeamColorState(json.data))
        }
      } catch (err) {
        console.error('Failed to load team colors:', err)
      } finally {
        setTeamColorsLoading(false)
      }
    }
    loadTeamColors()
  }, [campId])

  async function handleAutoAssignTeamColors() {
    if (autoAssigning || !canEdit) return
    setAutoAssigning(true)

    try {
      const res = await fetch(`/api/camps/${campId}/hq/team-colors/auto`, {
        method: 'POST',
      })
      const json = await res.json()
      if (res.ok) {
        // Reload team colors
        const reloadRes = await fetch(`/api/camps/${campId}/hq/team-colors`)
        const reloadJson = await reloadRes.json()
        if (reloadRes.ok) {
          setTeamColorState(deduplicateTeamColorState(reloadJson.data))
        }
      } else {
        console.error('Auto-assign failed:', json.error)
      }
    } catch (err) {
      console.error('Failed to auto-assign:', err)
    } finally {
      setAutoAssigning(false)
    }
  }

  async function handleUpdateTeamColor(camperSessionId: string, teamColor: 'pink' | 'purple' | null) {
    if (!canEdit) return
    setUpdatingCamper(camperSessionId)

    try {
      const res = await fetch(`/api/camps/${campId}/hq/team-colors/${camperSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamColor }),
      })

      if (res.ok) {
        // Reload team colors
        const reloadRes = await fetch(`/api/camps/${campId}/hq/team-colors`)
        const reloadJson = await reloadRes.json()
        if (reloadRes.ok) {
          setTeamColorState(deduplicateTeamColorState(reloadJson.data))
        }
      }
    } catch (err) {
      console.error('Failed to update team color:', err)
    } finally {
      setUpdatingCamper(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-neon animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Groups Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">{groups.length} Groups</h3>
            <p className="text-white/50 text-sm">Manage camper groupings</p>
          </div>
          <Link
            href={`${routePrefix}/${campId}/grouping`}
            className="px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
          >
            Open Grouping Tool
          </Link>
        </div>

        {groups.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <PortalCard key={group.id}>
                <div className="flex items-start gap-3">
                  <div
                    className="h-10 w-10 flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: group.color || '#666' }}
                  >
                    {group.camper_count}
                  </div>
                  <div>
                    <div className="font-bold text-white">{group.name || 'Unnamed Group'}</div>
                    <div className="text-sm text-white/50">
                      {group.camper_count} campers
                      {group.staff_count > 0 && ` • ${group.staff_count} staff`}
                    </div>
                    {group.age_range && (
                      <div className="text-xs text-white/40 mt-1">
                        Ages {group.age_range.min}-{group.age_range.max}
                      </div>
                    )}
                  </div>
                </div>
              </PortalCard>
            ))}
          </div>
        ) : (
          <PortalCard>
            <div className="text-center py-8">
              <UsersRound className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/50">No groups created yet.</p>
            </div>
          </PortalCard>
        )}
      </div>

      {/* Team Colors Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Team Colors</h3>
            <p className="text-white/50 text-sm">
              Pink vs Purple teams for scrimmages and big-team activities
            </p>
          </div>
          {canEdit && (
            <button
              onClick={handleAutoAssignTeamColors}
              disabled={autoAssigning || teamColorsLoading}
              className={cn(
                'flex items-center gap-2 px-4 py-2 font-bold uppercase tracking-wider transition-colors',
                autoAssigning || teamColorsLoading
                  ? 'bg-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-neon text-black hover:bg-neon/90'
              )}
            >
              {autoAssigning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Auto-Assign Teams
            </button>
          )}
        </div>

        {teamColorsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-neon animate-spin" />
          </div>
        ) : teamColorState ? (
          <div className="space-y-4">
            {/* Balance Status */}
            <div className={cn(
              'p-3 border',
              teamColorState.is_balanced
                ? 'bg-neon/5 border-neon/30 text-neon'
                : 'bg-yellow-500/5 border-yellow-500/30 text-yellow-400'
            )}>
              <div className="flex items-center gap-2 text-sm font-bold uppercase">
                {teamColorState.is_balanced ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Teams Balanced
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    Teams Unbalanced (diff: {teamColorState.balance_diff})
                  </>
                )}
              </div>
            </div>

            {/* Team Columns */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Pink Team */}
              <PortalCard>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                  <div className="h-8 w-8 bg-pink-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {teamColorState.pink_team.count}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-pink-400 uppercase tracking-wider">Pink Team</h4>
                    <p className="text-xs text-white/50">{teamColorState.pink_team.count} campers</p>
                  </div>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {teamColorState.pink_team.campers.map((camper) => (
                    <TeamColorCamperRow
                      key={camper.id}
                      camper={camper}
                      canEdit={canEdit}
                      isUpdating={updatingCamper === camper.camper_session_id}
                      onUpdateColor={(color) => handleUpdateTeamColor(camper.camper_session_id, color)}
                      teamColor="pink"
                    />
                  ))}
                  {teamColorState.pink_team.campers.length === 0 && (
                    <p className="text-white/30 text-sm text-center py-4">No campers assigned</p>
                  )}
                </div>
              </PortalCard>

              {/* Purple Team */}
              <PortalCard>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                  <div className="h-8 w-8 bg-purple flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {teamColorState.purple_team.count}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-purple uppercase tracking-wider">Purple Team</h4>
                    <p className="text-xs text-white/50">{teamColorState.purple_team.count} campers</p>
                  </div>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {teamColorState.purple_team.campers.map((camper) => (
                    <TeamColorCamperRow
                      key={camper.id}
                      camper={camper}
                      canEdit={canEdit}
                      isUpdating={updatingCamper === camper.camper_session_id}
                      onUpdateColor={(color) => handleUpdateTeamColor(camper.camper_session_id, color)}
                      teamColor="purple"
                    />
                  ))}
                  {teamColorState.purple_team.campers.length === 0 && (
                    <p className="text-white/30 text-sm text-center py-4">No campers assigned</p>
                  )}
                </div>
              </PortalCard>
            </div>

            {/* Unassigned Campers */}
            {teamColorState.unassigned.count > 0 && (
              <PortalCard>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                  <div className="h-8 w-8 bg-white/20 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {teamColorState.unassigned.count}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-white/70 uppercase tracking-wider">Unassigned</h4>
                    <p className="text-xs text-white/50">{teamColorState.unassigned.count} campers need team assignment</p>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 max-h-[300px] overflow-y-auto">
                  {teamColorState.unassigned.campers.map((camper) => (
                    <TeamColorCamperRow
                      key={camper.id}
                      camper={camper}
                      canEdit={canEdit}
                      isUpdating={updatingCamper === camper.camper_session_id}
                      onUpdateColor={(color) => handleUpdateTeamColor(camper.camper_session_id, color)}
                      teamColor={null}
                    />
                  ))}
                </div>
              </PortalCard>
            )}
          </div>
        ) : (
          <PortalCard>
            <div className="text-center py-8">
              <UsersRound className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/50">Unable to load team colors.</p>
            </div>
          </PortalCard>
        )}
      </div>
    </div>
  )
}

function TeamColorCamperRow({
  camper,
  canEdit,
  isUpdating,
  onUpdateColor,
  teamColor,
}: {
  camper: TeamColorCamper
  canEdit: boolean
  isUpdating: boolean
  onUpdateColor: (color: 'pink' | 'purple' | null) => void
  teamColor: 'pink' | 'purple' | null
}) {
  return (
    <div className="flex items-center gap-3 p-2 bg-white/5 hover:bg-white/10 transition-colors">
      <div className="h-8 w-8 bg-white/10 flex items-center justify-center text-white font-bold text-xs uppercase">
        {camper.first_name.charAt(0)}{camper.last_name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-white text-sm truncate">{camper.name}</div>
        <div className="text-xs text-white/50">
          {camper.grade_level !== null ? `Grade ${camper.grade_level}` : ''}
          {camper.group_name && ` • ${camper.group_name}`}
          {camper.friend_group_id && (
            <span className="text-purple ml-1">[Friend Group]</span>
          )}
        </div>
      </div>
      {canEdit && (
        <div className="flex-shrink-0">
          {isUpdating ? (
            <Loader2 className="h-4 w-4 text-white/50 animate-spin" />
          ) : (
            <select
              value={teamColor || ''}
              onChange={(e) => {
                const value = e.target.value as 'pink' | 'purple' | ''
                onUpdateColor(value === '' ? null : value)
              }}
              className="bg-black border border-white/20 text-white text-xs px-2 py-1 focus:border-neon focus:outline-none"
            >
              <option value="">None</option>
              <option value="pink">Pink</option>
              <option value="purple">Purple</option>
            </select>
          )}
        </div>
      )}
    </div>
  )
}

function ScheduleTab({ campId }: { campId: string; routePrefix: string }) {
  return <ScheduleBuilder campId={campId} canEdit={true} />
}

function WaiversTab({ campId, routePrefix }: { campId: string; routePrefix: string }) {
  const [waiverData, setWaiverData] = useState<{
    requirements: Array<{
      waiverTemplateId: string
      title: string
      isRequired: boolean
      isSiteWide: boolean
    }>
    athletes: Array<{
      registrationId: string
      athlete: { id: string; firstName: string; lastName: string }
      parent: { id: string; firstName: string | null; lastName: string | null; email: string }
      waivers: Array<{
        waiverTemplateId: string
        title: string
        isRequired: boolean
        status: string
        signedAt?: string
        signerName?: string
      }>
      totalRequired: number
      totalSigned: number
      allRequiredSigned: boolean
    }>
    stats: {
      totalAthletes: number
      fullyCompliant: number
      pendingWaivers: number
    }
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadWaiverStatus() {
      try {
        const res = await fetch(`/api/camps/${campId}/waivers?includeSignings=true`)
        const json = await res.json()
        if (res.ok) {
          setWaiverData(json.data)
        } else {
          setError(json.error || 'Failed to load waiver status')
        }
      } catch (err) {
        console.error('Failed to load waivers:', err)
        setError('Failed to load waiver status')
      } finally {
        setLoading(false)
      }
    }
    loadWaiverStatus()
  }, [campId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-neon animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <PortalCard title="Waiver Status" accent="magenta">
        <div className="text-center py-8 text-magenta">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>{error}</p>
        </div>
      </PortalCard>
    )
  }

  if (!waiverData) {
    return (
      <PortalCard title="Waiver Status" accent="purple">
        <div className="text-center py-8 text-white/50">
          <Shield className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>No waiver data available</p>
        </div>
      </PortalCard>
    )
  }

  const { requirements, athletes, stats } = waiverData

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <PortalCard accent="neon">
          <div className="text-center py-2">
            <div className="text-3xl font-bold text-neon">{stats.fullyCompliant}</div>
            <div className="text-xs uppercase tracking-wider text-white/50">Compliant</div>
          </div>
        </PortalCard>
        <PortalCard accent="magenta">
          <div className="text-center py-2">
            <div className="text-3xl font-bold text-magenta">{stats.pendingWaivers}</div>
            <div className="text-xs uppercase tracking-wider text-white/50">Pending</div>
          </div>
        </PortalCard>
        <PortalCard accent="purple">
          <div className="text-center py-2">
            <div className="text-3xl font-bold text-purple">{stats.totalAthletes}</div>
            <div className="text-xs uppercase tracking-wider text-white/50">Total Athletes</div>
          </div>
        </PortalCard>
      </div>

      {/* Required Waivers */}
      {requirements.length > 0 && (
        <PortalCard title="Required Waivers" accent="purple">
          <div className="space-y-2">
            {requirements.map((req) => (
              <div key={req.waiverTemplateId} className="flex items-center gap-3 p-3 bg-black/30 border border-white/10">
                <Shield className={`h-4 w-4 ${req.isSiteWide ? 'text-magenta' : 'text-purple'}`} />
                <span className="flex-1 text-white">{req.title}</span>
                {req.isSiteWide && (
                  <span className="px-2 py-0.5 text-xs bg-magenta/10 text-magenta border border-magenta/30">SITE-WIDE</span>
                )}
                {req.isRequired && (
                  <span className="px-2 py-0.5 text-xs bg-neon/10 text-neon border border-neon/30">REQUIRED</span>
                )}
              </div>
            ))}
          </div>
        </PortalCard>
      )}

      {/* Athlete Waiver Status */}
      <PortalCard title="Athlete Waiver Status" accent="neon">
        {athletes.length === 0 ? (
          <div className="text-center py-8 text-white/50">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No registered athletes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {athletes.map((athlete) => (
              <div
                key={athlete.registrationId}
                className={`p-4 border transition-colors ${
                  athlete.allRequiredSigned
                    ? 'border-neon/30 bg-neon/5'
                    : 'border-magenta/30 bg-magenta/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 flex items-center justify-center ${
                      athlete.allRequiredSigned ? 'bg-neon/10 text-neon' : 'bg-magenta/10 text-magenta'
                    }`}>
                      {athlete.allRequiredSigned ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-white">
                        {athlete.athlete.firstName} {athlete.athlete.lastName}
                      </div>
                      <div className="text-xs text-white/50">
                        Parent: {athlete.parent.firstName} {athlete.parent.lastName}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${athlete.allRequiredSigned ? 'text-neon' : 'text-magenta'}`}>
                      {athlete.totalSigned}/{athlete.totalRequired}
                    </div>
                    <div className="text-xs text-white/50">Signed</div>
                  </div>
                </div>
                {/* Individual waiver status */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {athlete.waivers.map((waiver) => (
                    <span
                      key={waiver.waiverTemplateId}
                      className={`px-2 py-1 text-xs ${
                        waiver.status === 'signed'
                          ? 'bg-neon/10 text-neon border border-neon/30'
                          : 'bg-white/5 text-white/50 border border-white/20'
                      }`}
                    >
                      {waiver.status === 'signed' ? <CheckCircle className="h-3 w-3 inline mr-1" /> : null}
                      {waiver.title}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </PortalCard>
    </div>
  )
}

interface PendingRequest {
  id: string
  camp_id: string
  requested_user_id: string
  requested_user_name: string
  requested_user_email: string
  role: string
  status: string
  requested_at: string
  is_lead: boolean
  call_time: string | null
  station_name: string | null
}

function StaffingTab({ campId, routePrefix }: { campId: string; routePrefix: string }) {
  const [staff, setStaff] = useState<CampHqStaffMember[]>([])
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<CampHqStaffMember | null>(null)
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null)

  const loadStaff = useCallback(async () => {
    try {
      const [staffRes, requestsRes] = await Promise.all([
        fetch(`/api/camps/${campId}/hq/staff`),
        fetch(`/api/camps/${campId}/hq/staff/requests`),
      ])
      const staffJson = await staffRes.json()
      const requestsJson = await requestsRes.json()
      if (staffRes.ok) {
        setStaff(staffJson.data || [])
      }
      if (requestsRes.ok) {
        setPendingRequests(requestsJson.data || [])
      }
    } catch (err) {
      console.error('Failed to load staff:', err)
    } finally {
      setLoading(false)
    }
  }, [campId])

  useEffect(() => {
    loadStaff()
  }, [loadStaff])

  const handleCancelRequest = async (requestId: string) => {
    setCancellingRequestId(requestId)
    try {
      const res = await fetch(`/api/camps/${campId}/hq/staff/requests/${requestId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId))
      }
    } catch (err) {
      console.error('Failed to cancel request:', err)
    } finally {
      setCancellingRequestId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-neon animate-spin" />
      </div>
    )
  }

  const directors = staff.filter((s) => s.role === 'director')
  const coaches = staff.filter((s) => s.role === 'coach')
  const assistants = staff.filter((s) => s.role === 'assistant')
  const cits = staff.filter((s) => s.role === 'cit')
  const volunteers = staff.filter((s) => s.role === 'volunteer')

  const handleEdit = (member: CampHqStaffMember) => {
    setEditingAssignment(member)
  }

  const handleModalSuccess = () => {
    setShowAddModal(false)
    setEditingAssignment(null)
    loadStaff()
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Staff Assignments</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Staff
        </button>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <PortalCard title="Pending Requests" accent="purple">
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center gap-4 p-3 bg-purple/10 border border-purple/20"
              >
                {/* Avatar */}
                <div className="h-10 w-10 bg-purple/20 flex items-center justify-center text-purple font-bold text-sm uppercase shrink-0">
                  {request.requested_user_name.split(' ').map((n) => n.charAt(0)).join('').slice(0, 2)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white">
                      {request.requested_user_name}
                    </span>
                    <span className="px-1.5 py-0.5 text-[10px] bg-purple/30 text-purple font-bold uppercase">
                      Awaiting Response
                    </span>
                    {request.is_lead && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-neon/20 text-neon font-bold uppercase">
                        Lead
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-white/50 mt-0.5">
                    <span className="capitalize">{request.role}</span>
                    <span className="text-white/20">·</span>
                    <span>Sent {new Date(request.requested_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Cancel Button */}
                <button
                  onClick={() => handleCancelRequest(request.id)}
                  disabled={cancellingRequestId === request.id}
                  className="p-2 text-white/40 hover:text-red-400 transition-colors disabled:opacity-50"
                  title="Cancel request"
                >
                  {cancellingRequestId === request.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </PortalCard>
      )}

      {/* Directors */}
      {directors.length > 0 && (
        <PortalCard title="Directors" accent="neon">
          <div className="space-y-3">
            {directors.map((member) => (
              <StaffMemberRow key={member.id} member={member} onEdit={() => handleEdit(member)} />
            ))}
          </div>
        </PortalCard>
      )}

      {/* Coaches */}
      {coaches.length > 0 && (
        <PortalCard title="Coaches" accent="purple">
          <div className="space-y-3">
            {coaches.map((member) => (
              <StaffMemberRow key={member.id} member={member} onEdit={() => handleEdit(member)} />
            ))}
          </div>
        </PortalCard>
      )}

      {/* Assistants */}
      {assistants.length > 0 && (
        <PortalCard title="Assistants">
          <div className="space-y-3">
            {assistants.map((member) => (
              <StaffMemberRow key={member.id} member={member} onEdit={() => handleEdit(member)} />
            ))}
          </div>
        </PortalCard>
      )}

      {/* CITs */}
      {cits.length > 0 && (
        <PortalCard title="CITs">
          <div className="space-y-3">
            {cits.map((member) => (
              <StaffMemberRow key={member.id} member={member} onEdit={() => handleEdit(member)} />
            ))}
          </div>
        </PortalCard>
      )}

      {/* Volunteers */}
      {volunteers.length > 0 && (
        <PortalCard title="Volunteers">
          <div className="space-y-3">
            {volunteers.map((member) => (
              <StaffMemberRow key={member.id} member={member} onEdit={() => handleEdit(member)} />
            ))}
          </div>
        </PortalCard>
      )}

      {staff.length === 0 && (
        <PortalCard>
          <div className="text-center py-8">
            <UserCog className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/50">No staff assigned to this camp yet.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Staff
            </button>
          </div>
        </PortalCard>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <AddStaffModal
          campId={campId}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Edit Staff Modal */}
      {editingAssignment && (
        <EditStaffModal
          campId={campId}
          assignment={editingAssignment}
          onClose={() => setEditingAssignment(null)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  )
}

function StaffMemberRow({ member, onEdit }: { member: CampHqStaffMember; onEdit: () => void }) {
  return (
    <div className="flex items-center gap-4 p-3 bg-white/5 group">
      {/* Avatar */}
      <div className="h-10 w-10 bg-white/10 flex items-center justify-center text-white font-bold text-sm uppercase shrink-0">
        {member.first_name.charAt(0)}
        {member.last_name.charAt(0)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-white">
            {member.first_name} {member.last_name}
          </span>
          {member.is_lead && (
            <span className="px-1.5 py-0.5 text-[10px] bg-neon/20 text-neon font-bold uppercase">
              Lead
            </span>
          )}
          {member.is_ad_hoc && (
            <span className="px-1.5 py-0.5 text-[10px] bg-purple/20 text-purple font-bold uppercase">
              Ad-hoc
            </span>
          )}
        </div>
        <div className="text-sm text-white/50 truncate">{member.email}</div>
        {member.call_time && (
          <div className="text-xs text-white/40 mt-0.5">
            {member.call_time}{member.end_time ? ` - ${member.end_time}` : ''}
          </div>
        )}
      </div>

      {/* Station */}
      {member.station_name && (
        <div className="px-2 py-1 text-xs font-bold uppercase bg-white/10 text-white/70 shrink-0">
          {member.station_name}
        </div>
      )}

      {/* Edit Button */}
      <button
        onClick={onEdit}
        className="p-2 text-white/30 hover:text-white opacity-0 group-hover:opacity-100 transition-all shrink-0"
        title="Edit"
      >
        <Pencil className="h-4 w-4" />
      </button>
    </div>
  )
}

interface DailyReport {
  id: string
  dayNumber: number
  date: string
  status: string
  recap?: {
    wordOfTheDay?: string
    primarySport?: string
    secondarySport?: string
    guestSpeakerName?: string
  }
  stats: {
    checkedIn: number
    checkedOut: number
    absent: number
  }
}

function ReportsTab({ campId, routePrefix }: { campId: string; routePrefix: string }) {
  const [loading, setLoading] = useState(true)
  const [reportSummary, setReportSummary] = useState<{
    completedDays: number
    totalDays: number
    confirmedCampers: number
    avgAttendanceRate: number
  } | null>(null)

  useEffect(() => {
    async function loadReportSummary() {
      try {
        const res = await fetch(`/api/camps/${campId}/reports/daily`)
        if (res.ok) {
          const data = await res.json()
          setReportSummary({
            completedDays: data.attendance?.completedDays || 0,
            totalDays: data.attendance?.totalDays || 0,
            confirmedCampers: data.registration?.confirmed || 0,
            avgAttendanceRate: data.attendance?.averageAttendanceRate || 0,
          })
        }
      } catch (err) {
        console.error('Failed to load report summary:', err)
      } finally {
        setLoading(false)
      }
    }
    loadReportSummary()
  }, [campId])

  return (
    <div className="space-y-6">
      {/* Main Report Card */}
      <PortalCard title="Camp Report" accent="neon">
        <p className="text-white/50 text-sm mb-6">
          Comprehensive report with registration, attendance, daily breakdowns, and session highlights
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 text-neon animate-spin" />
          </div>
        ) : (
          <>
            {/* Quick Stats */}
            {reportSummary && (
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="text-center p-3 bg-neon/10 border border-neon/20">
                  <div className="text-2xl font-bold text-neon">{reportSummary.confirmedCampers}</div>
                  <div className="text-xs text-white/50">Campers</div>
                </div>
                <div className="text-center p-3 bg-purple/10 border border-purple/20">
                  <div className="text-2xl font-bold text-purple">
                    {reportSummary.avgAttendanceRate.toFixed(0)}%
                  </div>
                  <div className="text-xs text-white/50">Avg Attendance</div>
                </div>
                <div className="text-center p-3 bg-white/5 border border-white/10">
                  <div className="text-2xl font-bold text-white">{reportSummary.completedDays}</div>
                  <div className="text-xs text-white/50">Days Completed</div>
                </div>
                <div className="text-center p-3 bg-white/5 border border-white/10">
                  <div className="text-2xl font-bold text-white">{reportSummary.totalDays}</div>
                  <div className="text-xs text-white/50">Total Days</div>
                </div>
              </div>
            )}

            <Link
              href={`${routePrefix}/${campId}/reports`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
            >
              <FileBarChart className="h-5 w-5" />
              View Full Report
              <ArrowRight className="h-5 w-5" />
            </Link>
          </>
        )}
      </PortalCard>

      {/* Group Report - Keep separate as it's different */}
      <PortalCard title="Group Report">
        <p className="text-white/50 text-sm mb-4">
          Camper distribution across groups
        </p>
        <Link
          href={`${routePrefix}/${campId}/grouping/report`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
        >
          View Report
          <ArrowRight className="h-4 w-4" />
        </Link>
      </PortalCard>
    </div>
  )
}

// ============================================================================
// INCENTIVES TAB
// ============================================================================

function IncentivesTab({
  campId,
  overview,
  canEdit,
  isAdmin,
}: {
  campId: string
  overview: CampHqOverview
  canEdit?: boolean
  isAdmin?: boolean
}) {
  return (
    <div className="space-y-8">
      {/* Guest Speaker Manager */}
      <GuestSpeakerManager
        campId={campId}
        canEdit={canEdit}
        minSpeakersForBonus={3}
      />

      {/* Compensation Tracking */}
      <IncentiveSummaryPanel
        campId={campId}
        tenantId={overview.camp.tenant_id || undefined}
        canEdit={canEdit}
        isAdmin={isAdmin}
      />
    </div>
  )
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function QuickLinkCard({
  href,
  title,
  description,
  icon: Icon,
  accent,
  onClick,
}: {
  href: string
  title: string
  description: string
  icon: typeof LayoutDashboard
  accent?: 'neon' | 'purple' | 'magenta'
  onClick?: () => void
}) {
  const accentColors = {
    neon: 'bg-neon/10 text-neon',
    purple: 'bg-purple/10 text-purple',
    magenta: 'bg-magenta/10 text-magenta',
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className="block p-4 bg-black border border-white/10 hover:border-white/20 transition-colors"
    >
      <div
        className={cn(
          'h-10 w-10 flex items-center justify-center mb-3',
          accent ? accentColors[accent] : 'bg-white/10 text-white'
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="font-bold text-white text-sm uppercase tracking-wider">
        {title}
      </div>
      <div className="text-xs text-white/50 mt-1">{description}</div>
    </Link>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export default CampHqShell
