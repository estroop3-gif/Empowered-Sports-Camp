'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  UserPlus,
  Mail,
  CheckCircle2,
  X,
  Loader2,
  AlertCircle,
  Sparkles,
  Heart,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/**
 * BuildHerSquadStep
 *
 * "Build Her Squad" feature for camp registration.
 * Parents can invite other parents to group their athletes together.
 * All squad members get grouped by the algorithm via friendGroupId.
 */

interface Athlete {
  id: string
  firstName: string
  lastName: string
}

interface SquadMember {
  id: string
  athleteId: string
  parentId: string
  athleteName: string
  parentName: string
  parentEmail: string
  status: 'requested' | 'accepted' | 'declined'
}

interface PendingInvite {
  id: string
  squadId: string
  inviterName: string
  campName: string
  campId: string
}

interface BuildHerSquadStepProps {
  campId: string
  campName: string
  tenantId: string
  registeredAthletes: Athlete[]
  parentName: string
  parentEmail: string
  onContinue: () => void
  onBack: () => void
  onSquadUpdate?: (squadId: string | null) => void
}

export function BuildHerSquadStep({
  campId,
  campName,
  tenantId,
  registeredAthletes,
  parentName,
  parentEmail,
  onContinue,
  onBack,
  onSquadUpdate,
}: BuildHerSquadStepProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [squad, setSquad] = useState<{
    id: string
    label: string
    members: SquadMember[]
  } | null>(null)
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSent, setInviteSent] = useState(false)
  const [skipSquad, setSkipSquad] = useState(false)

  // Fetch existing squad and invites
  useEffect(() => {
    async function fetchSquadData() {
      try {
        setIsLoading(true)

        // Fetch squads for this parent and camp
        const squadRes = await fetch(`/api/squads?action=list&campId=${campId}`)
        const squadData = await squadRes.json()

        if (squadData.data && squadData.data.length > 0) {
          const existingSquad = squadData.data[0]
          setSquad(existingSquad)
          onSquadUpdate?.(existingSquad.id)
        }

        // Fetch pending invites
        const invitesRes = await fetch(`/api/squads?action=invites&campId=${campId}`)
        const invitesData = await invitesRes.json()

        if (invitesData.data) {
          setPendingInvites(invitesData.data)
        }
      } catch (error) {
        console.error('Failed to fetch squad data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSquadData()
  }, [campId, onSquadUpdate])

  const createSquad = async () => {
    try {
      setIsLoading(true)
      setInviteError(null)

      const athleteIds = registeredAthletes.map((a) => a.id)

      const res = await fetch('/api/squads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          campId,
          tenantId,
          label: `${parentName}'s Squad`,
          athleteIds,
        }),
      })

      const data = await res.json()

      if (data.error) {
        setInviteError(data.error)
        return
      }

      setSquad({
        id: data.data.id,
        label: data.data.label,
        members: registeredAthletes.map((a) => ({
          id: `temp-${a.id}`,
          athleteId: a.id,
          parentId: '',
          athleteName: `${a.firstName} ${a.lastName}`,
          parentName: parentName,
          parentEmail: parentEmail,
          status: 'accepted' as const,
        })),
      })
      onSquadUpdate?.(data.data.id)
    } catch (error) {
      console.error('Failed to create squad:', error)
      setInviteError('Failed to create squad. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const sendInvite = async () => {
    if (!inviteEmail || !squad) return

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail)) {
      setInviteError('Please enter a valid email address')
      return
    }

    if (inviteEmail.toLowerCase() === parentEmail.toLowerCase()) {
      setInviteError("You can't invite yourself")
      return
    }

    try {
      setIsLoading(true)
      setInviteError(null)

      const res = await fetch('/api/squads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'invite',
          squadId: squad.id,
          inviteeEmail: inviteEmail,
          inviterName: parentName,
          campName,
          campId,
          tenantId,
        }),
      })

      const data = await res.json()

      if (data.error) {
        setInviteError(data.error)
        return
      }

      setInviteEmail('')
      setInviteSent(true)
      setTimeout(() => setInviteSent(false), 3000)
    } catch (error) {
      console.error('Failed to send invite:', error)
      setInviteError('Failed to send invite. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const respondToInvite = async (memberId: string, response: 'accepted' | 'declined') => {
    try {
      setIsLoading(true)

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
        console.error('Failed to respond to invite:', data.error)
        return
      }

      // Remove from pending invites
      setPendingInvites((prev) => prev.filter((inv) => inv.id !== memberId))

      // If accepted, update squad data
      if (response === 'accepted' && data.data?.squadId) {
        onSquadUpdate?.(data.data.squadId)
      }
    } catch (error) {
      console.error('Failed to respond to invite:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && !squad && pendingInvites.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 text-neon animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-magenta" />
          <span className="text-xs font-bold uppercase tracking-widest text-magenta">
            Optional
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
          Build Her Squad
        </h1>
        <p className="mt-2 text-white/60 max-w-md mx-auto">
          Want her to be grouped with friends at camp? Invite other parents to join your squad!
        </p>
      </div>

      {/* Pending Invites Section */}
      {pendingInvites.length > 0 && (
        <div className="p-6 border-2 border-purple/30 bg-purple/5">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-purple" />
            <h2 className="font-bold uppercase tracking-wider text-white">
              Squad Invitations
            </h2>
          </div>
          <div className="space-y-3">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-4 bg-white/5 border border-white/10"
              >
                <div>
                  <p className="text-white font-medium">
                    {invite.inviterName} invited you to join their squad
                  </p>
                  <p className="text-sm text-white/50">{invite.campName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => respondToInvite(invite.id, 'declined')}
                    className="p-2 text-white/40 hover:text-red-500 transition-colors"
                    disabled={isLoading}
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => respondToInvite(invite.id, 'accepted')}
                    className="px-4 py-2 bg-neon text-black font-bold uppercase text-sm hover:bg-neon/90 transition-colors"
                    disabled={isLoading}
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      {!skipSquad ? (
        <>
          {!squad ? (
            // Create Squad Section
            <div className="p-8 border border-white/10 bg-white/[0.02] text-center space-y-6">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-neon/10 border border-neon/30 mx-auto">
                <Users className="h-8 w-8 text-neon" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Start a Squad</h2>
                <p className="mt-2 text-white/60">
                  Create a squad to invite friends. Athletes in the same squad will be grouped
                  together during camp activities.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  variant="neon"
                  onClick={createSquad}
                  disabled={isLoading || registeredAthletes.length === 0}
                  className="min-w-[200px]"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Users className="h-4 w-4 mr-2" />
                  )}
                  Create Squad
                </Button>
                <button
                  onClick={() => setSkipSquad(true)}
                  className="text-sm text-white/50 hover:text-white transition-colors"
                >
                  Skip for now
                </button>
              </div>
              {inviteError && (
                <p className="text-sm text-red-500 flex items-center justify-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {inviteError}
                </p>
              )}
            </div>
          ) : (
            // Squad Created - Invite Section
            <div className="space-y-6">
              {/* Squad Info */}
              <div className="p-6 border border-neon/30 bg-neon/5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-neon text-black flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white">{squad.label}</h2>
                    <p className="text-sm text-white/50">
                      {squad.members.length} member{squad.members.length !== 1 && 's'}
                    </p>
                  </div>
                </div>

                {/* Squad Members */}
                <div className="space-y-2 mb-6">
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
                          <p className="text-white font-medium">{member.athleteName}</p>
                          <p className="text-xs text-white/40">{member.parentName}</p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'text-xs font-bold uppercase tracking-wider px-2 py-1',
                          member.status === 'accepted' && 'text-neon bg-neon/10',
                          member.status === 'requested' && 'text-yellow-500 bg-yellow-500/10',
                          member.status === 'declined' && 'text-red-500 bg-red-500/10'
                        )}
                      >
                        {member.status}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Invite Form */}
                <div className="pt-4 border-t border-white/10">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-3 flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-magenta" />
                    Invite a Friend
                  </h3>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => {
                          setInviteEmail(e.target.value)
                          setInviteError(null)
                        }}
                        placeholder="friend@email.com"
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-neon transition-colors"
                      />
                    </div>
                    <Button
                      variant="dark"
                      onClick={sendInvite}
                      disabled={isLoading || !inviteEmail}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : inviteSent ? (
                        <CheckCircle2 className="h-4 w-4 text-neon" />
                      ) : (
                        'Send'
                      )}
                    </Button>
                  </div>
                  {inviteError && (
                    <p className="mt-2 text-sm text-red-500 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {inviteError}
                    </p>
                  )}
                  {inviteSent && (
                    <p className="mt-2 text-sm text-neon flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Invitation sent successfully!
                    </p>
                  )}
                  <p className="mt-3 text-xs text-white/40">
                    They&apos;ll receive an email invitation to join your squad. Once they register
                    and accept, their athlete will be grouped with yours!
                  </p>
                </div>
              </div>

              {/* Benefits Note */}
              <div className="flex items-start gap-3 p-4 bg-magenta/5 border border-magenta/20">
                <Heart className="h-5 w-5 text-magenta flex-shrink-0 mt-0.5" />
                <div className="text-sm text-white/60">
                  <span className="text-magenta font-medium">Squad Benefits:</span> Athletes in the
                  same squad are placed in the same activity groups during camp. Perfect for best
                  friends who want to stick together!
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        // Skipped state
        <div className="p-8 border border-white/10 bg-white/[0.02] text-center space-y-4">
          <p className="text-white/60">
            No problem! You can always create a squad later from your parent portal.
          </p>
          <button
            onClick={() => setSkipSquad(false)}
            className="text-neon hover:text-neon/80 text-sm font-medium transition-colors"
          >
            Changed your mind? Create a squad
          </button>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-6">
        <Button variant="outline-white" size="lg" className="sm:w-auto" onClick={onBack}>
          Back
        </Button>
        <Button variant="neon" size="lg" className="flex-1" onClick={onContinue}>
          Continue to Add-Ons
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
