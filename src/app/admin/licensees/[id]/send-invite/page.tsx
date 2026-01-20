'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import {
  ArrowLeft,
  Mail,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  MapPin,
} from 'lucide-react'

// Licensee type for API response
interface Licensee {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  city: string | null
  state: string | null
  created_at: string
  role_id?: string
  tenant_id?: string | null
  is_active?: boolean
  tenant_name?: string | null
  territory_name?: string | null
}

/**
 * Send Licensee Application Invite Page
 *
 * Allows hq_admin to send or resend an application invite email
 * to a licensee.
 */

export default function SendInvitePage() {
  const router = useRouter()
  const params = useParams()
  const licenseeId = params.id as string

  const [licensee, setLicensee] = useState<Licensee | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch licensee data via API
  useEffect(() => {
    async function fetchLicensee() {
      setLoading(true)
      try {
        const response = await fetch(`/api/licensees?action=byId&id=${licenseeId}`)
        const result = await response.json()

        if (result.error || !result.data) {
          setError(result.error || 'Licensee not found')
        } else {
          setLicensee(result.data)
        }
      } catch (err) {
        setError('Failed to load licensee')
      }

      setLoading(false)
    }

    if (licenseeId) {
      fetchLicensee()
    }
  }, [licenseeId])

  const handleSendInvite = async () => {
    if (!licensee) return

    setSending(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/licensees/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseeId }),
      })

      const result = await response.json()

      if (result.error) {
        setError(result.error)
      } else {
        setSent(true)
      }
    } catch (err) {
      setError('Failed to send email')
    }

    setSending(false)
  }

  if (loading) {
    return (
      <AdminLayout userRole="hq_admin" userName="Admin">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 text-neon animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  if (!licensee) {
    return (
      <AdminLayout userRole="hq_admin" userName="Admin">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-black uppercase tracking-wider text-white mb-2">
              Licensee Not Found
            </h2>
            <p className="text-white/50 mb-6">{error}</p>
            <Link
              href="/admin/licensees"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Licensees
            </Link>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (sent) {
    return (
      <AdminLayout userRole="hq_admin" userName="Admin">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="mx-auto h-20 w-20 bg-neon/10 border border-neon/30 flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 text-neon" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-wider text-white mb-2">
              Invite Sent!
            </h2>
            <p className="text-white/50 mb-6">
              An application email has been sent to{' '}
              <span className="text-neon">{licensee.email}</span>
            </p>
            <div className="space-y-3">
              <Link
                href="/admin/licensees"
                className="flex items-center justify-center gap-2 w-full py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
              >
                Back to Licensees
              </Link>
              <button
                onClick={() => setSent(false)}
                className="flex items-center justify-center gap-2 w-full py-3 border border-white/20 text-white/60 font-bold uppercase tracking-wider hover:border-white/40 hover:text-white transition-colors"
              >
                <Mail className="h-4 w-4" />
                Send Another
              </button>
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const displayName = licensee.first_name && licensee.last_name
    ? `${licensee.first_name} ${licensee.last_name}`
    : licensee.email

  return (
    <AdminLayout userRole="hq_admin" userName="Admin">
      <div className="mb-6">
        <Link
          href="/admin/licensees"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-neon transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to All Licensees
        </Link>
      </div>

      <PageHeader
        title="Send Application Invite"
        description="Send or resend the licensee application email."
      />

      <div className="max-w-2xl">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-400">Error sending email</p>
              <p className="text-sm text-red-400/70">{error}</p>
            </div>
          </div>
        )}

        {/* Licensee Info Card */}
        <ContentCard title="Recipient" accent="magenta" className="mb-6">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 bg-magenta/10 border border-magenta/30 flex items-center justify-center flex-shrink-0">
              <span className="text-magenta text-xl font-bold">
                {(licensee.first_name?.[0] || licensee.email[0] || 'L').toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">{displayName}</h3>
              <div className="flex items-center gap-2 text-white/50 text-sm mt-1">
                <Mail className="h-4 w-4" />
                {licensee.email}
              </div>
              {licensee.territory_name && (
                <div className="flex items-center gap-2 text-white/50 text-sm mt-1">
                  <MapPin className="h-4 w-4" />
                  {licensee.territory_name}
                  {licensee.city && licensee.state && (
                    <span className="text-white/30">
                      ({licensee.city}, {licensee.state})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </ContentCard>

        {/* Email Preview Card */}
        <ContentCard title="Email Preview" accent="neon" className="mb-6">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1">
                Subject
              </p>
              <p className="text-white">
                Complete Your Licensee Application - {licensee.territory_name || 'Empowered Sports Camp'}
              </p>
            </div>
            <div className="border-t border-white/10 pt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                Message Preview
              </p>
              <div className="bg-black/50 p-4 border border-white/10 text-sm text-white/70 space-y-3">
                <p>Hi {licensee.first_name || 'there'},</p>
                <p>
                  You have been invited to become a licensed operator for Empowered
                  Sports Camp in the {licensee.territory_name || 'your assigned'} territory.
                </p>
                <p>
                  Please click the link below to complete your application and set up
                  your account:
                </p>
                <p className="text-neon underline">[Application Link]</p>
                <p>This link will expire in 7 days.</p>
                <p className="text-white/50">
                  - The Empowered Sports Camp Team
                </p>
              </div>
            </div>
          </div>
        </ContentCard>

        {/* Note */}
        <div className="p-4 bg-purple/10 border border-purple/30 mb-6">
          <p className="text-sm text-purple">
            <strong>Note:</strong> This is currently a placeholder. When Resend is
            configured, this will send an actual email to the licensee with a link
            to complete their application.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleSendInvite}
            disabled={sending}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors disabled:opacity-50"
          >
            {sending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Send Invite Email
              </>
            )}
          </button>
          <Link
            href="/admin/licensees"
            className="flex items-center justify-center gap-2 px-6 py-4 border border-white/20 text-white/60 font-bold uppercase tracking-wider hover:border-white/40 hover:text-white transition-colors"
          >
            Cancel
          </Link>
        </div>
      </div>
    </AdminLayout>
  )
}
