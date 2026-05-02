'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Users,
  Check,
  X,
  Mail,
  Clock,
  UserPlus,
  Loader2,
  ChevronDown,
  ChevronRight,
  Pencil,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SquadMember {
  id: string
  athleteName: string
  parentName: string
  status: 'requested' | 'accepted' | 'declined' | 'removed'
  notes: string | null
  isOwnAthlete: boolean
}

interface SentInvite {
  id: string
  invitedEmail: string
  status: string
  createdAt: string
}

interface CampSquad {
  id: string
  label: string
  isOwner: boolean
  members: SquadMember[]
}

interface AthleteCamp {
  campId: string
  campName: string
  campDates: string
  tenantId: string
  registrationId: string
  squad: CampSquad | null
  sentInvites: SentInvite[]
}

interface AthleteData {
  athleteId: string
  firstName: string
  lastName: string
  camps: AthleteCamp[]
}

interface IncomingInvite {
  id: string
  squadId: string
  campId: string
  campName: string
  invitingParentName: string
  athleteNames: string[]
  status: string
  createdAt: string
}

interface OtherCamper {
  athleteId: string
  athleteName: string
  grade: string | null
  parentName: string
  parentId: string
}

interface DashboardData {
  parentEmail: string
  athletes: AthleteData[]
  incomingInvites: IncomingInvite[]
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function FriendRequestsCard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedAthletes, setExpandedAthletes] = useState<Set<string>>(new Set())
  const [respondingToInvite, setRespondingToInvite] = useState<string | null>(null)

  // Request pairing state
  const [requestingCampId, setRequestingCampId] = useState<string | null>(null)
  const [otherCampers, setOtherCampers] = useState<OtherCamper[]>([])
  const [loadingCampers, setLoadingCampers] = useState(false)
  const [requestingTarget, setRequestingTarget] = useState<string | null>(null)
  const [requestNotes, setRequestNotes] = useState('')

  // Email invite state
  const [invitingCampId, setInvitingCampId] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [sendingInvite, setSendingInvite] = useState(false)

  // Notes editing state
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null)
  const [editNotesValue, setEditNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/squads/dashboard')
      if (!res.ok) return
      const result = await res.json()
      if (result.data) {
        setData(result.data)
        // Auto-expand all athletes
        const ids = new Set<string>(result.data.athletes.map((a: AthleteData) => a.athleteId))
        setExpandedAthletes(ids)
      }
    } catch (err) {
      console.error('Failed to load squad dashboard:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSquadResponse = async (memberId: string, response: 'accepted' | 'declined') => {
    setRespondingToInvite(memberId)
    try {
      const res = await fetch('/api/squads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'respond', memberId, response }),
      })
      if (res.ok) {
        await fetchData()
      }
    } catch (err) {
      console.error('Failed to respond:', err)
    }
    setRespondingToInvite(null)
  }

  const handleOpenRequestPairing = async (campId: string) => {
    if (requestingCampId === campId) {
      setRequestingCampId(null)
      return
    }
    setRequestingCampId(campId)
    setLoadingCampers(true)
    try {
      const res = await fetch(`/api/squads?action=otherCampers&campId=${campId}`)
      const result = await res.json()
      setOtherCampers(result.data || [])
    } catch {
      setOtherCampers([])
    }
    setLoadingCampers(false)
  }

  const handleRequestSquad = async (
    campId: string,
    tenantId: string,
    targetAthleteId: string,
    athleteIds: string[]
  ) => {
    setRequestingTarget(targetAthleteId)
    try {
      const res = await fetch('/api/squads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'requestSquad',
          campId,
          tenantId,
          targetAthleteId,
          athleteIds,
          notes: requestNotes || undefined,
        }),
      })
      if (res.ok) {
        setRequestingCampId(null)
        setRequestNotes('')
        await fetchData()
      }
    } catch (err) {
      console.error('Failed to request squad:', err)
    }
    setRequestingTarget(null)
  }

  const handleSendEmailInvite = async (campId: string, campName: string, tenantId: string) => {
    if (!inviteEmail.trim()) return
    setSendingInvite(true)
    try {
      const res = await fetch('/api/squads/guest-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviterEmail: data?.parentEmail || '',
          inviteeEmail: inviteEmail.trim(),
          campId,
          campName,
          tenantId,
        }),
      })
      if (res.ok) {
        setInvitingCampId(null)
        setInviteEmail('')
        await fetchData()
      }
    } catch (err) {
      console.error('Failed to send invite:', err)
    }
    setSendingInvite(false)
  }

  const handleSaveNotes = async (memberId: string) => {
    setSavingNotes(true)
    try {
      const res = await fetch('/api/squads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateNotes',
          memberId,
          notes: editNotesValue,
        }),
      })
      if (res.ok) {
        setEditingNotesId(null)
        await fetchData()
      }
    } catch (err) {
      console.error('Failed to save notes:', err)
    }
    setSavingNotes(false)
  }

  const toggleAthlete = (id: string) => {
    setExpandedAthletes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Check className="h-3 w-3 text-neon" />
      case 'declined':
      case 'removed':
        return <X className="h-3 w-3 text-red-400" />
      default:
        return <Clock className="h-3 w-3 text-yellow-400" />
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'text-neon'
      case 'declined':
      case 'removed':
        return 'text-red-400'
      default:
        return 'text-yellow-400'
    }
  }

  if (loading) {
    return (
      <div className="bg-dark-100 border border-white/10">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-purple/30">
          <Users className="h-5 w-5 text-purple" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-white">
            Friend Requests
          </h2>
        </div>
        <div className="p-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-purple/50" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const { athletes, incomingInvites } = data
  const hasAnyContent =
    incomingInvites.length > 0 ||
    athletes.some((a) => a.camps.length > 0)

  return (
    <div className="bg-dark-100 border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-purple/30">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-purple" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-white">
            Friend Requests
          </h2>
          {incomingInvites.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold bg-purple/20 text-purple border border-purple/30">
              {incomingInvites.length} pending
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Incoming Invites */}
        {incomingInvites.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple">
              Incoming Invites
            </h3>
            {incomingInvites.map((invite) => (
              <div
                key={invite.id}
                className="p-4 bg-purple/5 border border-purple/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-bold text-white">{invite.campName}</h4>
                    <p className="text-sm text-white/60 mt-1">
                      <span className="text-purple">{invite.invitingParentName}</span> wants to
                      squad up!
                    </p>
                    <p className="text-xs text-white/40 mt-2">
                      Athletes to group: {invite.athleteNames.join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="neon"
                      size="sm"
                      onClick={() => handleSquadResponse(invite.id, 'accepted')}
                      disabled={respondingToInvite === invite.id}
                    >
                      {respondingToInvite === invite.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline-white"
                      size="sm"
                      onClick={() => handleSquadResponse(invite.id, 'declined')}
                      disabled={respondingToInvite === invite.id}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Per-Athlete Sections */}
        {athletes.length > 0 ? (
          athletes.map((athlete) => {
            const isExpanded = expandedAthletes.has(athlete.athleteId)

            if (athlete.camps.length === 0) return null

            return (
              <div key={athlete.athleteId} className="space-y-3">
                <button
                  onClick={() => toggleAthlete(athlete.athleteId)}
                  className="flex items-center gap-2 w-full text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-purple" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-purple" />
                  )}
                  <span className="text-sm font-bold text-white">
                    {athlete.firstName} {athlete.lastName}
                  </span>
                  <span className="text-xs text-white/40">
                    {athlete.camps.length} camp{athlete.camps.length !== 1 ? 's' : ''}
                  </span>
                </button>

                {isExpanded &&
                  athlete.camps.map((camp) => (
                    <div
                      key={camp.campId}
                      className="ml-6 p-4 bg-black/50 border border-white/10 space-y-3"
                    >
                      <div>
                        <h4 className="font-bold text-white text-sm">{camp.campName}</h4>
                        <p className="text-xs text-white/40">{camp.campDates}</p>
                      </div>

                      {/* Squad Members */}
                      {camp.squad && camp.squad.members.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-white/50">
                            Squad Members
                          </p>
                          {camp.squad.members.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between gap-2 py-1"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {statusIcon(member.status)}
                                <span className="text-sm text-white truncate">
                                  {member.athleteName}
                                  {member.isOwnAthlete && (
                                    <span className="text-white/30 ml-1">(yours)</span>
                                  )}
                                </span>
                                <span
                                  className={cn('text-xs', statusColor(member.status))}
                                >
                                  {member.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                {member.notes && editingNotesId !== member.id && (
                                  <span className="text-xs text-white/30 italic truncate max-w-[120px]">
                                    {member.notes}
                                  </span>
                                )}
                                {camp.squad!.isOwner && editingNotesId === member.id ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={editNotesValue}
                                      onChange={(e) => setEditNotesValue(e.target.value)}
                                      placeholder="Add a note..."
                                      className="w-32 px-2 py-0.5 text-xs bg-black border border-white/20 text-white placeholder-white/30 focus:border-purple/50 focus:outline-none"
                                    />
                                    <button
                                      onClick={() => handleSaveNotes(member.id)}
                                      disabled={savingNotes}
                                      className="text-neon hover:text-neon/80"
                                    >
                                      {savingNotes ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Check className="h-3 w-3" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => setEditingNotesId(null)}
                                      className="text-white/40 hover:text-white/60"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  camp.squad!.isOwner && (
                                    <button
                                      onClick={() => {
                                        setEditingNotesId(member.id)
                                        setEditNotesValue(member.notes || '')
                                      }}
                                      className="text-white/30 hover:text-purple transition-colors"
                                      title="Edit notes"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Sent Email Invites */}
                      {camp.sentInvites.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-white/50">
                            Email Invites Sent
                          </p>
                          {camp.sentInvites.map((inv) => (
                            <div
                              key={inv.id}
                              className="flex items-center gap-2 py-1"
                            >
                              <Mail className="h-3 w-3 text-white/30" />
                              <span className="text-sm text-white/70">{inv.invitedEmail}</span>
                              <span
                                className={cn(
                                  'text-xs',
                                  inv.status === 'pending'
                                    ? 'text-yellow-400'
                                    : 'text-neon'
                                )}
                              >
                                {inv.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant="outline-white"
                          size="sm"
                          onClick={() => handleOpenRequestPairing(camp.campId)}
                          className="text-xs"
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          Request Pairing
                        </Button>
                        <Button
                          variant="outline-white"
                          size="sm"
                          onClick={() => {
                            setInvitingCampId(
                              invitingCampId === camp.campId ? null : camp.campId
                            )
                            setInviteEmail('')
                          }}
                          className="text-xs"
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          Invite by Email
                        </Button>
                      </div>

                      {/* Request Pairing Panel */}
                      {requestingCampId === camp.campId && (
                        <div className="p-3 bg-purple/5 border border-purple/20 space-y-3">
                          <p className="text-xs font-bold uppercase tracking-wider text-purple">
                            Select a Camper to Pair With
                          </p>
                          {loadingCampers ? (
                            <div className="flex justify-center py-4">
                              <Loader2 className="h-4 w-4 animate-spin text-purple/50" />
                            </div>
                          ) : otherCampers.length === 0 ? (
                            <p className="text-xs text-white/40 py-2">
                              No other campers registered for this camp yet.
                            </p>
                          ) : (
                            <>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {otherCampers.map((camper) => (
                                  <div
                                    key={camper.athleteId}
                                    className="flex items-center justify-between p-2 bg-black/30 border border-white/5 hover:border-purple/30 transition-colors"
                                  >
                                    <div>
                                      <p className="text-sm text-white">
                                        {camper.athleteName}
                                      </p>
                                      <p className="text-xs text-white/40">
                                        Parent: {camper.parentName}
                                        {camper.grade && ` • Grade ${camper.grade}`}
                                      </p>
                                    </div>
                                    <Button
                                      variant="neon"
                                      size="sm"
                                      onClick={() =>
                                        handleRequestSquad(
                                          camp.campId,
                                          camp.tenantId,
                                          camper.athleteId,
                                          [athlete.athleteId]
                                        )
                                      }
                                      disabled={requestingTarget === camper.athleteId}
                                      className="text-xs"
                                    >
                                      {requestingTarget === camper.athleteId ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        'Request'
                                      )}
                                    </Button>
                                  </div>
                                ))}
                              </div>
                              <div>
                                <input
                                  type="text"
                                  value={requestNotes}
                                  onChange={(e) => setRequestNotes(e.target.value)}
                                  placeholder="Optional note (e.g. they're cousins)"
                                  className="w-full px-3 py-1.5 text-xs bg-black border border-white/20 text-white placeholder-white/30 focus:border-purple/50 focus:outline-none"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Email Invite Panel */}
                      {invitingCampId === camp.campId && (
                        <div className="p-3 bg-purple/5 border border-purple/20 space-y-3">
                          <p className="text-xs font-bold uppercase tracking-wider text-purple">
                            Invite a Friend by Email
                          </p>
                          <div className="flex items-center gap-2">
                            <input
                              type="email"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              placeholder="friend@email.com"
                              className="flex-1 px-3 py-1.5 text-sm bg-black border border-white/20 text-white placeholder-white/30 focus:border-purple/50 focus:outline-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSendEmailInvite(camp.campId, camp.campName, camp.tenantId)
                                }
                              }}
                            />
                            <Button
                              variant="neon"
                              size="sm"
                              onClick={() =>
                                handleSendEmailInvite(camp.campId, camp.campName, camp.tenantId)
                              }
                              disabled={sendingInvite || !inviteEmail.trim()}
                            >
                              {sendingInvite ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Send className="h-3 w-3 mr-1" />
                                  Send
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )
          })
        ) : !hasAnyContent ? (
          <div className="text-center py-6">
            <div className="inline-flex h-12 w-12 items-center justify-center bg-purple/10 border border-purple/30 mb-3">
              <Users className="h-6 w-6 text-purple" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">No Squad Activity Yet</h3>
            <p className="text-xs text-white/40 max-w-xs mx-auto">
              Register for a camp to start building your squad and inviting friends.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
