'use client'

/**
 * Admin Camp Squads Page
 *
 * Shows all squad pairings for a camp — who requested who, who approved it,
 * and the full audit trail of every invite and response.
 */

import { use, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  UserMinus,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  Mail,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type MemberStatus = 'accepted' | 'declined' | 'requested' | 'removed'

interface SquadMember {
  id: string
  athleteId: string
  athleteName: string
  athleteGrade: string | null
  parentId: string
  parentName: string
  parentEmail: string
  status: MemberStatus
  invitedByEmail: string | null
  respondedAt: string | null
  createdAt: string
}

interface AdminSquad {
  id: string
  label: string
  campId: string
  campName: string
  createdAt: string
  createdByParent: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  }
  members: SquadMember[]
}

interface PendingInvite {
  id: string
  squadId: string | null
  invitedEmail: string
  invitedByName: string | null
  campName: string
  athleteNames: string[]
  status: string
  expiresAt: string
  claimedAt: string | null
  claimedByUserId: string | null
  createdAt: string
}

// ─── Status helpers ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<MemberStatus, { label: string; color: string; icon: React.ElementType }> = {
  accepted: { label: 'Accepted', color: 'text-green-400 bg-green-400/10 border-green-400/30', icon: CheckCircle2 },
  declined: { label: 'Declined', color: 'text-red-400 bg-red-400/10 border-red-400/30', icon: XCircle },
  requested: { label: 'Pending', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', icon: Clock },
  removed: { label: 'Removed', color: 'text-white/40 bg-white/5 border-white/10', icon: UserMinus },
}

function StatusBadge({ status }: { status: MemberStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.requested
  const Icon = cfg.icon
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', cfg.color)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Squad Row ────────────────────────────────────────────────────────────────

function SquadRow({ squad }: { squad: AdminSquad }) {
  const [expanded, setExpanded] = useState(false)

  const accepted = squad.members.filter((m) => m.status === 'accepted')
  const pending = squad.members.filter((m) => m.status === 'requested')
  const declined = squad.members.filter((m) => m.status === 'declined')
  const removed = squad.members.filter((m) => m.status === 'removed')

  const creatorName =
    [squad.createdByParent.firstName, squad.createdByParent.lastName].filter(Boolean).join(' ') ||
    squad.createdByParent.email

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-4 px-4 py-3 bg-white/3 hover:bg-white/5 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-white/40 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-white/40 shrink-0" />
        )}

        <Users className="h-4 w-4 text-neon shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{squad.label}</span>
            <span className="text-xs text-white/40">Created by</span>
            <span className="text-xs text-white/70 font-medium">{creatorName}</span>
            <span className="text-xs text-white/30">{squad.createdByParent.email}</span>
          </div>
          <div className="text-xs text-white/40 mt-0.5">{formatDate(squad.createdAt)}</div>
        </div>

        {/* Summary chips */}
        <div className="flex items-center gap-2 shrink-0">
          {accepted.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 border border-green-400/20">
              {accepted.length} accepted
            </span>
          )}
          {pending.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
              {pending.length} pending
            </span>
          )}
          {declined.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 border border-red-400/20">
              {declined.length} declined
            </span>
          )}
          {removed.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10">
              {removed.length} removed
            </span>
          )}
          <span className="text-xs text-white/30">{squad.members.length} total</span>
        </div>
      </button>

      {/* Expanded member list */}
      {expanded && (
        <div className="border-t border-white/10">
          {squad.members.length === 0 ? (
            <div className="px-6 py-4 text-sm text-white/40 italic">No members yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-xs text-white/40 uppercase tracking-wider">
                  <th className="px-4 py-2 text-left font-medium">Athlete</th>
                  <th className="px-4 py-2 text-left font-medium">Parent / Guardian</th>
                  <th className="px-4 py-2 text-left font-medium">Invited By</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Requested</th>
                  <th className="px-4 py-2 text-left font-medium">Responded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {squad.members.map((member) => {
                  const isCreatorAthlete = member.parentId === squad.createdByParent.id
                  return (
                    <tr key={member.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">
                        {member.athleteName}
                        {member.athleteGrade && (
                          <span className="ml-2 text-xs text-white/40">Gr. {member.athleteGrade}</span>
                        )}
                        {isCreatorAthlete && (
                          <span className="ml-2 text-xs text-neon/70 border border-neon/20 px-1 rounded">
                            creator
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-white/80">{member.parentName}</div>
                        <div className="text-xs text-white/40">{member.parentEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-white/50 text-xs">
                        {member.invitedByEmail ?? (isCreatorAthlete ? 'Self (squad creator)' : '—')}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={member.status} />
                      </td>
                      <td className="px-4 py-3 text-white/40 text-xs">{formatDate(member.createdAt)}</td>
                      <td className="px-4 py-3 text-white/40 text-xs">{formatDate(member.respondedAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminCampSquadsPage({ params }: { params: Promise<{ campId: string }> }) {
  const { campId } = use(params)

  const [squads, setSquads] = useState<AdminSquad[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'squads' | 'pending'>('squads')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/squads?campId=${campId}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to load squads')
      }
      const body = await res.json()
      setSquads(body.squads ?? [])
      setPendingInvites(body.pendingInvites ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [campId])

  useEffect(() => {
    load()
  }, [load])

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalMembers = squads.reduce((sum, s) => sum + s.members.length, 0)
  const totalAccepted = squads.reduce((sum, s) => sum + s.members.filter((m) => m.status === 'accepted').length, 0)
  const totalPending = squads.reduce((sum, s) => sum + s.members.filter((m) => m.status === 'requested').length, 0)
  const totalDeclined = squads.reduce((sum, s) => sum + s.members.filter((m) => m.status === 'declined').length, 0)
  const campName = squads[0]?.campName ?? 'Camp'

  const tabs = [
    {
      id: 'squads' as const,
      label: `Squads (${squads.length})`,
      icon: Users,
    },
    {
      id: 'pending' as const,
      label: `Pre-Signup Invites (${pendingInvites.length})`,
      icon: Mail,
    },
  ]

  return (
    <AdminLayout userRole="hq_admin" userName="Admin">
      <PageHeader
        title="Squad Pairings"
        description={campName}
        breadcrumbs={[
          { label: 'Camps', href: '/admin/camps' },
          { label: campName, href: `/admin/camps/${campId}` },
          { label: 'Squad Pairings' },
        ]}
      >
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/camps/${campId}`}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Camp
          </Link>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-colors disabled:opacity-40"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </PageHeader>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Squads', value: squads.length, color: 'text-neon' },
          { label: 'Accepted Pairings', value: totalAccepted, color: 'text-green-400' },
          { label: 'Pending Responses', value: totalPending, color: 'text-yellow-400' },
          { label: 'Declined', value: totalDeclined, color: 'text-red-400' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white/3 border border-white/10 rounded-lg px-4 py-3 flex flex-col gap-1"
          >
            <span className={cn('text-2xl font-bold', stat.color)}>{stat.value}</span>
            <span className="text-xs text-white/40 uppercase tracking-wider">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-white/10 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap',
              activeTab === tab.id
                ? 'text-neon border-neon'
                : 'text-white/60 border-transparent hover:text-white hover:border-white/20'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Squads tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'squads' && (
        <ContentCard
          title="All Squads"
          description="Click a squad to expand and see every member, their status, who invited them, and when they responded."
          accent="neon"
        >
          {loading ? (
            <div className="flex items-center justify-center py-16 text-white/40 text-sm">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              Loading squads…
            </div>
          ) : squads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-white/40 gap-3">
              <Users className="h-10 w-10 opacity-30" />
              <p className="text-sm">No squads have been created for this camp yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {squads.map((squad) => (
                <SquadRow key={squad.id} squad={squad} />
              ))}
            </div>
          )}

          {!loading && squads.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5 text-xs text-white/30 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              {squads.length} squad{squads.length !== 1 ? 's' : ''} · {totalMembers} membership records · {totalAccepted}{' '}
              confirmed pairings
            </div>
          )}
        </ContentCard>
      )}

      {/* ── Pre-signup invites tab ───────────────────────────────────────────── */}
      {activeTab === 'pending' && (
        <ContentCard
          title="Pre-Signup Invites"
          description="Invites sent to email addresses that didn't have an account yet. These are claimed automatically when the person signs up."
          accent="purple"
        >
          {loading ? (
            <div className="flex items-center justify-center py-16 text-white/40 text-sm">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              Loading…
            </div>
          ) : pendingInvites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-white/40 gap-3">
              <Mail className="h-10 w-10 opacity-30" />
              <p className="text-sm">No pre-signup invites for this camp.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-white/40 uppercase tracking-wider">
                  <th className="px-4 py-2 text-left font-medium">Invited Email</th>
                  <th className="px-4 py-2 text-left font-medium">Invited By</th>
                  <th className="px-4 py-2 text-left font-medium">Athletes</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Sent</th>
                  <th className="px-4 py-2 text-left font-medium">Expires</th>
                  <th className="px-4 py-2 text-left font-medium">Claimed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pendingInvites.map((inv) => {
                  const isClaimed = !!inv.claimedAt
                  const isExpired = !isClaimed && new Date(inv.expiresAt) < new Date()
                  const statusLabel = isClaimed ? 'Claimed' : isExpired ? 'Expired' : 'Pending'
                  const statusColor = isClaimed
                    ? 'text-green-400 bg-green-400/10 border-green-400/30'
                    : isExpired
                      ? 'text-white/30 bg-white/5 border-white/10'
                      : 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'

                  return (
                    <tr key={inv.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{inv.invitedEmail}</td>
                      <td className="px-4 py-3 text-white/70">{inv.invitedByName ?? '—'}</td>
                      <td className="px-4 py-3 text-white/60 text-xs">
                        {inv.athleteNames.length > 0 ? inv.athleteNames.join(', ') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                            statusColor
                          )}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/40 text-xs">{formatDate(inv.createdAt)}</td>
                      <td className="px-4 py-3 text-white/40 text-xs">{formatDate(inv.expiresAt)}</td>
                      <td className="px-4 py-3 text-white/40 text-xs">{isClaimed ? formatDate(inv.claimedAt) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </ContentCard>
      )}
    </AdminLayout>
  )
}
