'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Calendar, MapPin, Mail, Download, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCheckout } from '@/lib/checkout/context'
import { parseDateSafe, formatTime12h } from '@/lib/utils'
import type { CampSession } from '@/types/registration'
import { InviteFriendModal } from '@/components/camps/InviteFriendModal'

/**
 * ConfirmationStep
 *
 * DESIGN NOTES:
 * - Celebratory success state
 * - Confirmation number prominently displayed
 * - What's next section
 * - Quick actions (add to calendar, share)
 */

interface ConfirmationStepProps {
  campSession: CampSession | null
  confirmationNumber: string
}

function formatDate(dateString: string): string {
  return parseDateSafe(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatTime = formatTime12h

export function ConfirmationStep({ campSession, confirmationNumber }: ConfirmationStepProps) {
  const { state, totals } = useCheckout()
  const [inviteOpen, setInviteOpen] = useState(false)

  const handleAddToCalendar = () => {
    if (!campSession) return

    const startDate = new Date(campSession.startDate)
    const endDate = new Date(campSession.endDate)

    // Create Google Calendar URL
    const gcalUrl = new URL('https://calendar.google.com/calendar/render')
    gcalUrl.searchParams.set('action', 'TEMPLATE')
    gcalUrl.searchParams.set('text', `${campSession.name} - Empowered Athletes`)
    gcalUrl.searchParams.set('dates', `${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`)
    if (campSession.location) {
      gcalUrl.searchParams.set('location', `${campSession.location.name}, ${campSession.location.city}, ${campSession.location.state}`)
    }
    gcalUrl.searchParams.set('details', `Camp registration confirmation: ${confirmationNumber}`)

    window.open(gcalUrl.toString(), '_blank')
  }

  return (
    <div className="space-y-8 text-center">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="h-24 w-24 bg-neon flex items-center justify-center animate-pulse">
            <CheckCircle2 className="h-12 w-12 text-black" />
          </div>
          <div className="absolute inset-0 bg-neon/30 blur-2xl -z-10" />
        </div>
      </div>

      {/* Success Message */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-wider text-white">
          You're Registered!
        </h1>
        <p className="mt-2 text-white/60">
          Get ready to unleash your inner champion.
        </p>
      </div>

      {/* Confirmation Number */}
      <div className="bg-white/5 border border-white/10 p-6 inline-block">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
          Confirmation Number
        </p>
        <p className="text-2xl font-black tracking-wider text-neon">
          {confirmationNumber}
        </p>
      </div>

      {/* Camp Details */}
      {campSession && (
        <div className="bg-white/5 border border-white/10 p-6 text-left space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-wider text-white text-center">
            {campSession.name}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-neon shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white">
                  {formatDate(campSession.startDate)}
                </p>
                <p className="text-xs text-white/50">
                  through {formatDate(campSession.endDate)}
                </p>
                <p className="text-xs text-white/50 mt-1">
                  {formatTime(campSession.dailyStartTime)} - {formatTime(campSession.dailyEndTime)}
                </p>
              </div>
            </div>

            {campSession.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-magenta shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">
                    {campSession.location.name}
                  </p>
                  <p className="text-xs text-white/50">
                    {campSession.location.addressLine1}
                  </p>
                  <p className="text-xs text-white/50">
                    {campSession.location.city}, {campSession.location.state} {campSession.location.zipCode}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Registered Campers */}
          <div className="pt-4 border-t border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
              Registered Campers
            </p>
            <div className="flex flex-wrap gap-2">
              {state.campers.map((camper) => (
                <span
                  key={camper.id}
                  className="px-3 py-1 bg-neon/10 border border-neon/30 text-sm font-semibold text-neon"
                >
                  {camper.firstName} {camper.lastName}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Email Notice */}
      <div className="bg-neon/10 border border-neon/30 p-4">
        <div className="flex items-center justify-center gap-2 text-neon">
          <Mail className="h-5 w-5" />
          <p className="font-semibold">
            Confirmation Email Sent!
          </p>
        </div>
        <p className="text-sm text-white/60 mt-1">
          We&apos;ve sent a detailed confirmation to <span className="text-white">{state.parentInfo.email}</span>
        </p>
      </div>

      {/* What's Next */}
      <div className="bg-gradient-to-r from-neon/10 via-magenta/10 to-purple/10 border border-white/10 p-6 text-left">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4">
          What's Next?
        </h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="h-6 w-6 bg-neon text-black text-xs font-bold flex items-center justify-center shrink-0">
              1
            </span>
            <span className="text-sm text-white/80">
              Check your email for a detailed confirmation with packing list and schedule.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="h-6 w-6 bg-magenta text-white text-xs font-bold flex items-center justify-center shrink-0">
              2
            </span>
            <span className="text-sm text-white/80">
              Complete the online health form (link in email) at least 3 days before camp.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="h-6 w-6 bg-purple text-white text-xs font-bold flex items-center justify-center shrink-0">
              3
            </span>
            <span className="text-sm text-white/80">
              Arrive 15 minutes early on the first day for check-in.
            </span>
          </li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button variant="outline-neon" onClick={handleAddToCalendar}>
          <Calendar className="h-4 w-4 mr-2" />
          Add to Calendar
        </Button>
        <Button variant="outline-neon">
          <Download className="h-4 w-4 mr-2" />
          Download Receipt
        </Button>
        <Button variant="outline-neon" onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite a Friend
        </Button>
      </div>

      {/* Return to Dashboard */}
      <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/dashboard">
          <Button variant="neon" size="lg">
            Go to Parent Dashboard
          </Button>
        </Link>
        <Link href="/camps">
          <Button variant="outline-white" size="lg">
            Browse More Camps
          </Button>
        </Link>
      </div>

      {/* Support */}
      <p className="text-xs text-white/40">
        Questions? Contact us at{' '}
        <a href="mailto:info@empoweredathletes.com" className="text-neon hover:underline">
          info@empoweredathletes.com
        </a>
      </p>

      {campSession && (
        <InviteFriendModal
          campId={campSession.id}
          campName={campSession.name}
          tenantId={campSession.tenantId}
          isOpen={inviteOpen}
          onClose={() => setInviteOpen(false)}
          inviterName={`${state.parentInfo.firstName} ${state.parentInfo.lastName}`.trim()}
          inviterEmail={state.parentInfo.email}
          athleteNames={state.campers.map(c => `${c.firstName} ${c.lastName}`)}
        />
      )}
    </div>
  )
}
