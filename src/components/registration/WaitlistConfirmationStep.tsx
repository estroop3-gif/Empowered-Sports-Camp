'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ClipboardList, CheckCircle2, Loader2, Calendar, MapPin, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCheckout } from '@/lib/checkout/context'
import type { CampSession } from '@/types/registration'

/**
 * WaitlistConfirmationStep
 *
 * Final step in the waitlist flow. Submits registration data to the
 * waitlist join API and shows the waitlist position + next steps.
 */

interface WaitlistConfirmationStepProps {
  campSession: CampSession
  onBack: () => void
}

export function WaitlistConfirmationStep({ campSession, onBack }: WaitlistConfirmationStepProps) {
  const { state } = useCheckout()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/waitlist/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campId: campSession.id,
          tenantId: campSession.tenantId,
          parent: state.parentInfo,
          campers: state.campers,
          promoCode: state.promoCode?.code || null,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to join waitlist')
      }

      setWaitlistPosition(json.data.waitlistPosition)
      setIsSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Pre-submission: show review & submit button
  if (!isSubmitted) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-wider text-white">
            Join the Waitlist
          </h2>
          <p className="text-white/60 mt-2">
            This camp is currently full. Confirm your details below to join the waitlist.
          </p>
        </div>

        {/* Summary */}
        <div className="bg-dark-100 border border-white/10 p-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white/40">Registration Summary</h3>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Camp</span>
              <span className="text-white font-semibold">{campSession.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Dates</span>
              <span className="text-white font-semibold">
                {new Date(campSession.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(campSession.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            {campSession.location && (
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Location</span>
                <span className="text-white font-semibold">{campSession.location.name}</span>
              </div>
            )}
            <div className="border-t border-white/10 pt-3">
              <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">Campers</p>
              {state.campers.map((camper) => (
                <div key={camper.id} className="flex justify-between text-sm">
                  <span className="text-white">{camper.firstName} {camper.lastName}</span>
                  <span className="text-white/60">Age {camper.age}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Parent/Guardian</span>
              <span className="text-white font-semibold">
                {state.parentInfo.firstName} {state.parentInfo.lastName}
              </span>
            </div>
          </div>
        </div>

        {/* Info box */}
        <div className="bg-purple/10 border border-purple/30 p-4">
          <p className="text-sm text-white/80">
            <strong className="text-purple">No payment required now.</strong>{' '}
            When a spot opens, we&apos;ll email you with a 48-hour window to complete payment.
          </p>
        </div>

        {error && (
          <div className="bg-magenta/10 border border-magenta/30 p-4">
            <p className="text-sm text-magenta">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline-neon"
            size="lg"
            onClick={onBack}
            disabled={isSubmitting}
          >
            Back
          </Button>
          <Button
            variant="neon"
            size="lg"
            className="flex-1"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Joining Waitlist...
              </>
            ) : (
              <>
                <ClipboardList className="h-5 w-5 mr-2" />
                Join Waitlist
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // Post-submission: show success + position
  return (
    <div className="space-y-8 text-center">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="h-20 w-20 bg-neon/20 flex items-center justify-center">
            <CheckCircle2 className="h-12 w-12 text-neon" />
          </div>
          <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-purple flex items-center justify-center text-white text-xs font-bold">
            {waitlistPosition}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-black uppercase tracking-wider text-white">
          You&apos;re on the Waitlist!
        </h2>
        <p className="text-white/60 mt-2">
          {state.campers.length === 1
            ? `${state.campers[0].firstName} is #${waitlistPosition} on the waitlist for ${campSession.name}.`
            : `Your campers are on the waitlist for ${campSession.name}.`
          }
        </p>
      </div>

      {/* Position highlight */}
      <div className="bg-neon/10 border border-neon/30 p-6">
        <p className="text-4xl font-black text-neon">#{waitlistPosition}</p>
        <p className="text-sm text-white/60 mt-1 uppercase tracking-wider">Your Waitlist Position</p>
      </div>

      {/* How it works */}
      <div className="bg-dark-100 border border-white/10 p-6 text-left space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-neon">What Happens Next</h3>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="h-6 w-6 bg-neon/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-neon">1</span>
            </div>
            <p className="text-sm text-white/80">We&apos;ll notify you by email when a spot opens up.</p>
          </div>
          <div className="flex gap-3">
            <div className="h-6 w-6 bg-neon/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-neon">2</span>
            </div>
            <p className="text-sm text-white/80">You&apos;ll have <strong className="text-white">48 hours</strong> to complete your payment.</p>
          </div>
          <div className="flex gap-3">
            <div className="h-6 w-6 bg-neon/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-neon">3</span>
            </div>
            <p className="text-sm text-white/80">If you miss the window, you&apos;ll be moved back in the queue.</p>
          </div>
        </div>
      </div>

      {/* Camp details reminder */}
      <div className="bg-dark-100 border border-white/10 p-4 text-left">
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Calendar className="h-4 w-4 text-neon" />
          <span>
            {new Date(campSession.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(campSession.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
        {campSession.location && (
          <div className="flex items-center gap-2 text-sm text-white/60 mt-2">
            <MapPin className="h-4 w-4 text-neon" />
            <span>{campSession.location.name}, {campSession.location.city}, {campSession.location.state}</span>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="pt-4">
        <Link href="/camps">
          <Button variant="neon" size="lg" className="w-full sm:w-auto">
            Browse More Camps
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
