'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Mail,
  Calendar,
  MapPin,
  ArrowRight,
  Sparkles,
  Heart,
  AlertCircle,
} from 'lucide-react'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/context'

/**
 * Parent Squad Management Page
 *
 * Parents can:
 * - View squads they've created
 * - View and respond to squad invitations
 * - See which athletes are in their squads
 */

interface SquadMember {
  id: string
  athleteName: string
  parentName: string
  status: 'requested' | 'accepted' | 'declined' | 'removed'
}

interface Squad {
  id: string
  label: string
  campName: string
  campId: string
  campDates: string
  isOwner: boolean
  members: SquadMember[]
  createdAt: string
}

interface SquadInvite {
  id: string
  squadId: string
  campName: string
  campId: string
  inviterName: string
  athleteNames: string[]
  createdAt: string
}

export default function SquadsPage() {
  const searchParams = useSearchParams()
  const filterCampId = searchParams.get('campId')
  const { user } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [squads, setSquads] = useState<Squad[]>([])
  const [pendingInvites, setPendingInvites] = useState<SquadInvite[]>([])
  const [respondingTo, setRespondingTo] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)

        // Fetch squads
        const squadUrl = filterCampId
          ? `/api/squads?action=list&campId=${filterCampId}`
          : '/api/squads?action=list'
        const squadRes = await fetch(squadUrl)
        const squadData = await squadRes.json()

        if (squadData.data) {
          // Transform to display format
          const transformedSquads: Squad[] = squadData.data.map((s: {
            id: string
            label: string
            campId: string
            camp?: { name: string; startDate: string; endDate: string }
            createdByParentId: string
            members: Array<{
              id: string
              athlete: { firstName: string; lastName: string }
              parent: { firstName: string; lastName: string }
              status: string
            }>
            createdAt: string
          }) => ({
            id: s.id,
            label: s.label,
            campName: s.camp?.name || 'Camp',
            campId: s.campId,
            campDates: s.camp ? formatDateRange(s.camp.startDate, s.camp.endDate) : '',
            isOwner: user?.id === s.createdByParentId,
            members: s.members.map((m) => ({
              id: m.id,
              athleteName: `${m.athlete.firstName} ${m.athlete.lastName}`,
              parentName: `${m.parent.firstName || ''} ${m.parent.lastName || ''}`.trim(),
              status: m.status as 'requested' | 'accepted' | 'declined' | 'removed',
            })),
            createdAt: s.createdAt,
          }))
          setSquads(transformedSquads)
        }

        // Fetch pending invites
        const inviteUrl = filterCampId
          ? `/api/squads?action=invites&campId=${filterCampId}`
          : '/api/squads?action=invites'
        const inviteRes = await fetch(inviteUrl)
        const inviteData = await inviteRes.json()

        if (inviteData.data) {
          setPendingInvites(inviteData.data)
        }
      } catch (error) {
        console.error('Failed to fetch squad data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [filterCampId, user?.id])

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}, ${startDate.getFullYear()}`
  }

  const handleRespond = async (memberId: string, response: 'accepted' | 'declined') => {
    try {
      setRespondingTo(memberId)

      const res = await fetch('/api/squads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'respond',
          memberId,
          response,
        }),
      })

      const data = await res.json()

      if (data.error) {
        console.error('Failed to respond:', data.error)
        return
      }

      // Remove from pending invites
      setPendingInvites((prev) => prev.filter((inv) => inv.id !== memberId))

      // If accepted, refresh squads to show updated membership
      if (response === 'accepted') {
        const squadRes = await fetch('/api/squads?action=list')
        const squadData = await squadRes.json()
        if (squadData.data) {
          setSquads(squadData.data)
        }
      }
    } catch (error) {
      console.error('Failed to respond to invite:', error)
    } finally {
      setRespondingTo(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle2 className="h-4 w-4 text-neon" />
      case 'declined':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'requested':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return null
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'In Squad'
      case 'declined':
        return 'Declined'
      case 'requested':
        return 'Pending'
      default:
        return status
    }
  }

  if (isLoading) {
    return (
      <AdminLayout userRole="parent" userName="Parent">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 text-neon animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout userRole="parent" userName="Parent">
      <PageHeader
        title="Her Squad"
        description="Manage friend groups for camp activities"
      />

      {/* Pending Invitations */}
      {pendingInvites.length > 0 && (
        <div className="mb-8">
          <ContentCard
            title="Squad Invitations"
            description="Respond to join your athlete to a friend squad"
            accent="magenta"
          >
            <div className="space-y-4">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="p-5 bg-magenta/5 border border-magenta/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-5 w-5 text-magenta" />
                        <h3 className="font-bold text-white">
                          {invite.inviterName} invited you!
                        </h3>
                      </div>
                      <p className="text-sm text-white/60 mb-3">
                        Join their squad for <span className="text-white">{invite.campName}</span> so your athletes can be grouped together during camp activities.
                      </p>
                      <div className="flex items-center gap-4 text-xs text-white/40">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {invite.campName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {invite.athleteNames?.length || 1} athlete{(invite.athleteNames?.length || 1) > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline-white"
                        size="sm"
                        onClick={() => handleRespond(invite.id, 'declined')}
                        disabled={respondingTo === invite.id}
                      >
                        {respondingTo === invite.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Decline'
                        )}
                      </Button>
                      <Button
                        variant="neon"
                        size="sm"
                        onClick={() => handleRespond(invite.id, 'accepted')}
                        disabled={respondingTo === invite.id}
                      >
                        {respondingTo === invite.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Accept
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ContentCard>
        </div>
      )}

      {/* My Squads */}
      {squads.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {squads.map((squad) => (
            <ContentCard
              key={squad.id}
              title={squad.label}
              accent={squad.isOwner ? 'neon' : 'purple'}
            >
              <div className="space-y-4">
                {/* Camp Info */}
                <div className="flex items-center gap-4 text-sm text-white/50">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {squad.campName}
                  </span>
                  {squad.campDates && (
                    <span>{squad.campDates}</span>
                  )}
                </div>

                {/* Members List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">
                    Squad Members
                  </h4>
                  {squad.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-white/5 border border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-neon/20 text-neon flex items-center justify-center text-sm font-bold">
                          {member.athleteName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{member.athleteName}</p>
                          <p className="text-xs text-white/40">{member.parentName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(member.status)}
                        <span
                          className={cn(
                            'text-xs font-medium',
                            member.status === 'accepted' && 'text-neon',
                            member.status === 'requested' && 'text-yellow-500',
                            member.status === 'declined' && 'text-red-500'
                          )}
                        >
                          {getStatusLabel(member.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Squad Benefits */}
                <div className="flex items-start gap-2 p-3 bg-neon/5 border border-neon/20">
                  <Heart className="h-4 w-4 text-neon flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-white/60">
                    Accepted squad members will be grouped together during camp activities.
                  </p>
                </div>

                {/* Actions */}
                {squad.isOwner && (
                  <div className="pt-2 border-t border-white/10">
                    <Link
                      href={`/register/${squad.campId}#squad`}
                      className="flex items-center gap-2 text-sm text-neon hover:text-neon/80 transition-colors"
                    >
                      <UserPlus className="h-4 w-4" />
                      Invite More Friends
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            </ContentCard>
          ))}
        </div>
      ) : (
        // Empty State
        <ContentCard>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-neon/10 border border-neon/30 mb-6">
              <Users className="h-10 w-10 text-neon" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No Squads Yet</h2>
            <p className="text-white/60 max-w-md mx-auto mb-6">
              When you register for a camp, you can create a squad and invite other parents. Their athletes will be grouped with yours during camp activities!
            </p>
            <Link href="/camps">
              <Button variant="neon" size="lg">
                <Sparkles className="h-4 w-4 mr-2" />
                Browse Camps
              </Button>
            </Link>
          </div>
        </ContentCard>
      )}

      {/* Info Banner */}
      <div className="mt-8 p-6 border border-white/10 bg-white/[0.02]">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 bg-magenta/10 border border-magenta/30 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-6 w-6 text-magenta" />
          </div>
          <div>
            <h3 className="font-bold text-white mb-1">How "Build Her Squad" Works</h3>
            <ul className="text-sm text-white/60 space-y-1">
              <li>1. Create a squad during camp registration</li>
              <li>2. Invite other parents by email</li>
              <li>3. When they accept, their athletes join your squad</li>
              <li>4. All squad members are grouped together during camp activities</li>
            </ul>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
