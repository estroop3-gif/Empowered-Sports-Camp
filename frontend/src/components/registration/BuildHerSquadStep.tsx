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
  UserCheck,
  Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/**
 * BuildHerSquadStep
 *
 * "Build Her Squad" feature for camp registration.
 * Shows other registered campers to request squad grouping with.
 * Also allows inviting friends who haven't registered yet.
 */

interface Athlete {
  id: string
  firstName: string
  lastName: string
}

interface RegisteredCamper {
  athleteId: string
  athleteName: string
  athleteFirstName?: string
  athleteLastName?: string
  grade: string | null
  parentName: string
  parentId: string
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
  isAuthenticated?: boolean // Whether user is logged in
  onContinue: () => void
  onBack: () => void
  onSquadUpdate?: (squadId: string | null) => void
}

// Helper function to format name with privacy (Last Name, First Initial)
function formatPrivacyName(firstName: string, lastName: string): string {
  const firstInitial = firstName?.charAt(0)?.toUpperCase() || ''
  return `${lastName}, ${firstInitial}.`
}

export function BuildHerSquadStep({
  campId,
  campName,
  tenantId,
  registeredAthletes,
  parentName,
  parentEmail,
  isAuthenticated = true,
  onContinue,
  onBack,
  onSquadUpdate,
}: BuildHerSquadStepProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [otherCampers, setOtherCampers] = useState<RegisteredCamper[]>([])
  const [selectedCampers, setSelectedCampers] = useState<Set<string>>(new Set())
  const [requestedCampers, setRequestedCampers] = useState<Set<string>>(new Set())
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSent, setInviteSent] = useState(false)
  const [sendingRequest, setSendingRequest] = useState(false)
  const [sendingInvite, setSendingInvite] = useState(false)
  const [existingSquad, setExistingSquad] = useState<{
    id: string
    label: string
    members: SquadMember[]
  } | null>(null)

  // Fetch other registered campers and existing squad data
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)

        // Fetch other registered campers for this camp
        const campersRes = await fetch(`/api/squads?action=otherCampers&campId=${campId}`)
        const campersData = await campersRes.json()

        if (campersData.data) {
          setOtherCampers(campersData.data)
        }

        // Fetch existing squad data
        const squadRes = await fetch(`/api/squads?action=list&campId=${campId}`)
        const squadData = await squadRes.json()

        if (squadData.data && squadData.data.length > 0) {
          const squad = squadData.data[0]
          setExistingSquad(squad)
          onSquadUpdate?.(squad.id)

          // Mark already requested campers
          const requested = new Set<string>()
          squad.members?.forEach((m: SquadMember) => {
            if (m.status === 'requested' || m.status === 'accepted') {
              requested.add(m.athleteId)
            }
          })
          setRequestedCampers(requested)
        }

        // Fetch pending invites from other parents
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

    fetchData()
  }, [campId, onSquadUpdate])

  const toggleCamperSelection = (athleteId: string) => {
    if (requestedCampers.has(athleteId)) return // Already requested

    setSelectedCampers(prev => {
      const next = new Set(prev)
      if (next.has(athleteId)) {
        next.delete(athleteId)
      } else {
        next.add(athleteId)
      }
      return next
    })
  }

  const sendSquadRequests = async () => {
    if (selectedCampers.size === 0) return

    setSendingRequest(true)
    setInviteError(null)

    try {
      const athleteIds = registeredAthletes.map(a => a.id)

      // Send request for each selected camper
      for (const targetAthleteId of selectedCampers) {
        const res = await fetch('/api/squads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'requestSquad',
            campId,
            tenantId,
            athleteIds,
            targetAthleteId,
          }),
        })

        const data = await res.json()

        if (data.error) {
          console.error('Failed to send squad request:', data.error)
          continue
        }

        // Update squad if we got one back
        if (data.data?.squadId) {
          onSquadUpdate?.(data.data.squadId)
        }
      }

      // Move selected to requested
      setRequestedCampers(prev => new Set([...prev, ...selectedCampers]))
      setSelectedCampers(new Set())
    } catch (error) {
      console.error('Failed to send squad requests:', error)
      setInviteError('Failed to send requests. Please try again.')
    } finally {
      setSendingRequest(false)
    }
  }

  const sendEmailInvite = async () => {
    if (!inviteEmail) return

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

    setSendingInvite(true)
    setInviteError(null)

    try {
      // Use guest invite API if not authenticated
      if (!isAuthenticated) {
        const athleteNames = registeredAthletes.map(a => `${a.firstName} ${a.lastName}`)

        const res = await fetch('/api/squads/guest-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inviterEmail: parentEmail,
            inviterName: parentName,
            inviteeEmail: inviteEmail,
            campId,
            campName,
            tenantId,
            athleteNames,
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
        return
      }

      // Authenticated flow - create squad if needed
      let squadId = existingSquad?.id

      if (!squadId) {
        const createRes = await fetch('/api/squads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            campId,
            tenantId,
            label: `${parentName}'s Squad`,
            athleteIds: registeredAthletes.map(a => a.id),
          }),
        })

        const createData = await createRes.json()
        if (createData.error) {
          setInviteError(createData.error)
          return
        }
        squadId = createData.data.id
        onSquadUpdate?.(squadId ?? null)
      }

      // Send the invite
      const res = await fetch('/api/squads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'invite',
          squadId,
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
      setSendingInvite(false)
    }
  }

  const respondToInvite = async (memberId: string, response: 'accepted' | 'declined') => {
    try {
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
      setPendingInvites(prev => prev.filter(inv => inv.id !== memberId))

      // If accepted, update squad data
      if (response === 'accepted' && data.data?.squadId) {
        onSquadUpdate?.(data.data.squadId)
      }
    } catch (error) {
      console.error('Failed to respond to invite:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 text-neon animate-spin" />
      </div>
    )
  }

  const hasOtherCampers = otherCampers.length > 0
  const hasNoExistingAthletes = registeredAthletes.length === 0

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
          Want her to be grouped with friends at camp? Select campers below or invite a friend!
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
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => respondToInvite(invite.id, 'accepted')}
                    className="px-4 py-2 bg-neon text-black font-bold uppercase text-sm hover:bg-neon/90 transition-colors"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No existing athletes message */}
      {hasNoExistingAthletes && (
        <div className="bg-purple/10 border border-purple/30 p-4">
          <p className="text-sm text-white/70">
            <span className="text-purple font-medium">Note:</span> Since you&apos;re registering new athletes,
            you can still invite friends to join your squad. They&apos;ll be grouped together once you complete registration.
          </p>
        </div>
      )}

      {/* Other Registered Campers Section */}
      {hasOtherCampers ? (
        <div className="p-6 border border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-neon" />
            <h2 className="font-bold uppercase tracking-wider text-white">
              Campers Already Registered
            </h2>
          </div>
          <p className="text-sm text-white/50 mb-4">
            Select campers you&apos;d like to be grouped with. Their parents will receive a request.
          </p>

          <div className="space-y-2 mb-6">
            {otherCampers.map((camper) => {
              const isSelected = selectedCampers.has(camper.athleteId)
              const isRequested = requestedCampers.has(camper.athleteId)

              // Format name for privacy: "Last Name, F."
              // Use firstName/lastName if available, otherwise parse from athleteName
              let displayName = camper.athleteName
              let initial = camper.athleteName.charAt(0)
              if (camper.athleteFirstName && camper.athleteLastName) {
                displayName = formatPrivacyName(camper.athleteFirstName, camper.athleteLastName)
                initial = camper.athleteLastName.charAt(0)
              } else if (camper.athleteName.includes(' ')) {
                // Parse "First Last" format
                const parts = camper.athleteName.split(' ')
                const firstName = parts[0]
                const lastName = parts.slice(1).join(' ')
                displayName = formatPrivacyName(firstName, lastName)
                initial = lastName.charAt(0)
              }

              return (
                <button
                  key={camper.athleteId}
                  onClick={() => toggleCamperSelection(camper.athleteId)}
                  disabled={isRequested}
                  className={cn(
                    'w-full flex items-center justify-between p-4 border transition-all',
                    isRequested
                      ? 'bg-neon/10 border-neon/30 cursor-default'
                      : isSelected
                        ? 'bg-purple/20 border-purple hover:bg-purple/30'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'h-10 w-10 flex items-center justify-center text-sm font-bold',
                      isRequested
                        ? 'bg-neon/20 text-neon'
                        : isSelected
                          ? 'bg-purple/30 text-purple'
                          : 'bg-white/10 text-white/60'
                    )}>
                      {initial}
                    </div>
                    <div className="text-left">
                      <p className="text-white font-medium">{displayName}</p>
                      <p className="text-xs text-white/40">
                        {camper.grade ? `Grade ${camper.grade}` : 'Camper'}
                      </p>
                    </div>
                  </div>
                  {isRequested ? (
                    <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-neon">
                      <CheckCircle2 className="h-4 w-4" />
                      Requested
                    </span>
                  ) : isSelected ? (
                    <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-purple">
                      <UserCheck className="h-4 w-4" />
                      Selected
                    </span>
                  ) : (
                    <span className="text-xs text-white/30">Tap to select</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Send Requests Button */}
          {selectedCampers.size > 0 && (
            <Button
              variant="neon"
              onClick={sendSquadRequests}
              disabled={sendingRequest}
              className="w-full"
            >
              {sendingRequest ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Squad Request{selectedCampers.size > 1 ? 's' : ''} ({selectedCampers.size})
            </Button>
          )}
        </div>
      ) : (
        // No other campers registered yet
        <div className="p-8 border border-white/10 bg-white/[0.02] text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-white/5 border border-white/10 mx-auto mb-4">
            <Users className="h-8 w-8 text-white/30" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Other Campers Yet</h3>
          <p className="text-white/50 text-sm max-w-sm mx-auto">
            Be the first to register! You can still invite friends using the form below.
          </p>
        </div>
      )}

      {/* Invite a Friend Section */}
      <div className="p-6 border border-magenta/20 bg-magenta/5">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="h-5 w-5 text-magenta" />
          <h2 className="font-bold uppercase tracking-wider text-white">
            Invite a Friend
          </h2>
        </div>
        <p className="text-sm text-white/50 mb-4">
          Know someone who should join? Send them an invite to register for this camp.
        </p>

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
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-magenta transition-colors"
            />
          </div>
          <Button
            variant="dark"
            onClick={sendEmailInvite}
            disabled={sendingInvite || !inviteEmail}
          >
            {sendingInvite ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : inviteSent ? (
              <CheckCircle2 className="h-4 w-4 text-neon" />
            ) : (
              'Send Invite'
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
          They&apos;ll receive an email with a link to register for {campName}. Once they sign up, their camper will be grouped with yours!
        </p>
      </div>

      {/* Squad Benefits Note */}
      <div className="flex items-start gap-3 p-4 bg-neon/5 border border-neon/20">
        <Heart className="h-5 w-5 text-neon flex-shrink-0 mt-0.5" />
        <div className="text-sm text-white/60">
          <span className="text-neon font-medium">Squad Benefits:</span> Athletes in the
          same squad are placed in the same activity groups during camp. Perfect for best
          friends who want to stick together!
        </div>
      </div>

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
