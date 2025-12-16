'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Loader2, Mail, ArrowRight, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/button'

// Role display info
const ROLE_INFO: Record<string, { name: string; description: string; color: string; bgColor: string }> = {
  licensee_owner: {
    name: 'Licensee Owner',
    description: 'Run your own Empowered Sports Camp franchise in your territory. Manage camps, staff, and grow your business.',
    color: 'text-neon',
    bgColor: 'bg-neon/10',
  },
  director: {
    name: 'Camp Director',
    description: 'Lead and manage camp sessions. Oversee daily operations, coaches, and campers to create amazing experiences.',
    color: 'text-magenta',
    bgColor: 'bg-magenta/10',
  },
  coach: {
    name: 'Coach',
    description: 'Coach young athletes and help them develop their athletic skills, confidence, and love for sports.',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  cit_volunteer: {
    name: 'CIT Volunteer',
    description: 'Join our Coaches-in-Training program. Develop leadership skills while helping younger athletes grow.',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
}

interface InviteData {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  targetRole: string
  roleDisplayName: string
  expiresAt: string
  status: string
}

function JoinPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const token = searchParams.get('token')

  const [invite, setInvite] = useState<InviteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)

  // Fetch invite details
  useEffect(() => {
    async function fetchInvite() {
      if (!token) {
        setError('No invitation token provided')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/invites?token=${token}`)
        const result = await response.json()

        if (result.error || !result.data) {
          setError(result.error || 'Invalid invitation')
        } else {
          setInvite(result.data)
        }
      } catch (err) {
        setError('Failed to load invitation')
      }

      setLoading(false)
    }

    fetchInvite()
  }, [token])

  // Accept the invite
  const handleAcceptInvite = async () => {
    if (!token) return

    setAccepting(true)
    setError(null)

    try {
      const response = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const result = await response.json()

      if (result.error) {
        setError(result.error)
      } else {
        setAccepted(true)
        // Redirect to appropriate dashboard after a short delay
        setTimeout(() => {
          const role = invite?.targetRole.toLowerCase()
          if (role === 'licensee_owner' || role === 'director' || role === 'coach') {
            router.push('/portal')
          } else if (role === 'hq_admin') {
            router.push('/admin')
          } else {
            router.push('/dashboard')
          }
        }, 2000)
      }
    } catch (err) {
      setError('Failed to accept invitation')
    }

    setAccepting(false)
  }

  // Loading state
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-neon mx-auto mb-4" />
          <p className="text-white/60">Loading invitation...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !invite) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-red-500/10 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Invalid Invitation</h1>
          <p className="text-white/60 mb-8">{error}</p>
          <Link href="/">
            <Button variant="outline-neon">Return Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Success state
  if (accepted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-neon/10 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-neon" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Welcome to the Team!</h1>
          <p className="text-white/60 mb-4">
            You've been added as a <span className="text-neon font-semibold">{invite?.roleDisplayName}</span>.
          </p>
          <p className="text-white/40 text-sm">Redirecting to your dashboard...</p>
        </div>
      </div>
    )
  }

  const roleInfo = invite ? ROLE_INFO[invite.targetRole] || {
    name: invite.roleDisplayName,
    description: 'Join our team',
    color: 'text-neon',
    bgColor: 'bg-neon/10',
  } : null

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-black/95 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/" className="inline-flex items-center gap-2 text-white hover:text-neon transition-colors">
            <span className="text-xl font-black uppercase tracking-wider">Empowered</span>
            <span className="text-xl font-light uppercase tracking-wider text-neon">Athletes</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          {/* Invite Header */}
          <div className={`${roleInfo?.bgColor} p-8 border-b border-white/10`}>
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 bg-black/30 rounded-lg`}>
                <ShieldCheck className={`h-8 w-8 ${roleInfo?.color}`} />
              </div>
              <div>
                <p className="text-white/60 text-sm uppercase tracking-wider">You're Invited</p>
                <h1 className={`text-2xl font-bold ${roleInfo?.color}`}>{roleInfo?.name}</h1>
              </div>
            </div>
            <p className="text-white/70">{roleInfo?.description}</p>
          </div>

          {/* Invite Details */}
          <div className="p-8">
            {invite && (
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="h-5 w-5 text-white/40" />
                  <span className="text-white/60">Invitation sent to:</span>
                  <span className="text-white font-medium">{invite.email}</span>
                </div>
                <p className="text-white/40 text-sm">
                  Expires: {new Date(invite.expiresAt).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            {user ? (
              // User is logged in
              <div className="space-y-4">
                {user.email.toLowerCase() === invite?.email.toLowerCase() ? (
                  // Email matches - can accept
                  <Button
                    variant="neon"
                    size="lg"
                    className="w-full"
                    onClick={handleAcceptInvite}
                    disabled={accepting}
                  >
                    {accepting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Accepting...
                      </>
                    ) : (
                      <>
                        Accept Invitation
                        <ArrowRight className="h-5 w-5 ml-2" />
                      </>
                    )}
                  </Button>
                ) : (
                  // Email doesn't match
                  <div className="text-center">
                    <p className="text-amber-400 mb-4">
                      You're signed in as <span className="font-medium">{user.email}</span>, but this
                      invitation was sent to <span className="font-medium">{invite?.email}</span>.
                    </p>
                    <p className="text-white/60 text-sm mb-6">
                      Please sign out and sign in with the correct email address.
                    </p>
                    <Link href="/login">
                      <Button variant="outline-neon">Sign Out & Use Different Email</Button>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              // User is not logged in
              <div className="space-y-4">
                <p className="text-white/60 text-center mb-6">
                  Create an account or sign in to accept this invitation.
                </p>
                <Link href={`/register?token=${token}&email=${encodeURIComponent(invite?.email || '')}`}>
                  <Button variant="neon" size="lg" className="w-full">
                    Create Account
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </Link>
                <Link href={`/login?redirect=/join?token=${token}`}>
                  <Button variant="outline-neon" size="lg" className="w-full">
                    Already have an account? Sign In
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-neon mx-auto mb-4" />
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  )
}
