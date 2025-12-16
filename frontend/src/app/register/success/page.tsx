'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Calendar,
  MapPin,
  Users,
  Home,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Registration Success Page
 *
 * Handles the redirect from Stripe Checkout after successful payment.
 * Confirms the registration and displays confirmation details.
 */

interface RegistrationDetails {
  confirmationNumber: string
  campName: string
  campDates: string
  location: string
  athleteNames: string[]
  totalPaid: string
  squadName?: string
}

export default function RegistrationSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [registration, setRegistration] = useState<RegistrationDetails | null>(null)

  const sessionId = searchParams.get('session_id')
  const isDemo = searchParams.get('demo') === 'true'
  const isFree = searchParams.get('free') === 'true'

  useEffect(() => {
    async function confirmRegistration() {
      if (!sessionId && !isFree) {
        setError('Missing payment session. Please contact support.')
        setIsLoading(false)
        return
      }

      try {
        // Confirm the registration via API
        const response = await fetch('/api/registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'confirm',
            sessionId: sessionId || 'free_registration',
          }),
        })

        const result = await response.json()

        if (result.error) {
          // If already confirmed, that's okay - just show success
          if (result.error.includes('already confirmed')) {
            // Try to fetch registration details instead
            setRegistration({
              confirmationNumber: `EA-${(sessionId || 'FREE').slice(-8).toUpperCase()}`,
              campName: 'Your Camp',
              campDates: 'Check your email for dates',
              location: 'Check your email for location',
              athleteNames: ['Your athlete'],
              totalPaid: isFree ? '$0.00' : 'See confirmation email',
            })
          } else {
            setError(result.error)
          }
        } else {
          // Parse registration data
          const data = result.data
          setRegistration({
            confirmationNumber: data.confirmationNumber || `EA-${(sessionId || 'FREE').slice(-8).toUpperCase()}`,
            campName: data.campName || 'Camp Registration',
            campDates: data.campDates || 'See confirmation email',
            location: data.location || 'See confirmation email',
            athleteNames: data.athleteNames || ['Registered athlete'],
            totalPaid: data.totalPaid || (isFree ? '$0.00' : 'Paid'),
            squadName: data.squadName,
          })
        }
      } catch (err) {
        console.error('Failed to confirm registration:', err)
        // Even if API fails, show basic success for demo/free
        if (isDemo || isFree) {
          setRegistration({
            confirmationNumber: `EA-${Date.now().toString(36).toUpperCase()}`,
            campName: 'Camp Registration',
            campDates: 'Check your email for dates',
            location: 'Check your email for location',
            athleteNames: ['Your athlete'],
            totalPaid: isFree ? '$0.00' : 'Paid (Demo)',
          })
        } else {
          setError('Failed to confirm your registration. Please contact support with your session ID.')
        }
      } finally {
        setIsLoading(false)
      }
    }

    confirmRegistration()
  }, [sessionId, isDemo, isFree])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-neon animate-spin mx-auto" />
          <h1 className="text-2xl font-bold text-white">Confirming Your Registration</h1>
          <p className="text-white/60">Please wait while we finalize your registration...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="h-20 w-20 rounded-full bg-red-500/10 border-2 border-red-500 flex items-center justify-center mx-auto">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-white">
            Something Went Wrong
          </h1>
          <p className="text-white/60">{error}</p>
          {sessionId && (
            <p className="text-xs text-white/40">
              Session ID: {sessionId}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button variant="outline-white" onClick={() => router.push('/camps')}>
              Back to Camps
            </Button>
            <Button variant="neon" onClick={() => router.push('/contact')}>
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-neon/5 rounded-full blur-[200px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-magenta/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-16 sm:py-24">
        {/* Success Header */}
        <div className="text-center space-y-6 mb-12">
          <div className="h-24 w-24 rounded-full bg-neon/10 border-2 border-neon flex items-center justify-center mx-auto animate-pulse">
            <CheckCircle2 className="h-12 w-12 text-neon" />
          </div>
          <div>
            <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-wider text-white">
              You&apos;re In!
            </h1>
            <p className="mt-2 text-xl text-neon font-bold">
              Registration Confirmed
            </p>
          </div>
          {isDemo && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-sm">
              <AlertCircle className="h-4 w-4" />
              Demo Mode - No actual payment processed
            </div>
          )}
        </div>

        {/* Confirmation Details */}
        <div className="bg-dark-100 border border-white/10 p-6 sm:p-8 space-y-6">
          {/* Confirmation Number */}
          <div className="text-center p-4 bg-neon/5 border border-neon/30">
            <p className="text-xs text-white/50 uppercase tracking-wider mb-1">
              Confirmation Number
            </p>
            <p className="text-2xl font-black text-neon tracking-wider">
              {registration?.confirmationNumber}
            </p>
          </div>

          {/* Camp Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold uppercase tracking-wider text-white">
              Camp Details
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10">
                <Calendar className="h-5 w-5 text-magenta flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-wider">Camp</p>
                  <p className="text-white font-medium">{registration?.campName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10">
                <MapPin className="h-5 w-5 text-purple flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-wider">Location</p>
                  <p className="text-white font-medium">{registration?.location}</p>
                </div>
              </div>
            </div>

            {/* Athletes */}
            <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10">
              <Users className="h-5 w-5 text-neon flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wider">Registered Athletes</p>
                <p className="text-white font-medium">
                  {registration?.athleteNames?.join(', ')}
                </p>
              </div>
            </div>

            {/* Squad */}
            {registration?.squadName && (
              <div className="flex items-start gap-3 p-4 bg-magenta/5 border border-magenta/30">
                <Users className="h-5 w-5 text-magenta flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-magenta/70 uppercase tracking-wider">Her Squad</p>
                  <p className="text-white font-medium">{registration.squadName}</p>
                  <p className="text-xs text-white/50 mt-1">
                    Squad members will be grouped together at camp!
                  </p>
                </div>
              </div>
            )}

            {/* Total */}
            <div className="flex items-center justify-between p-4 bg-neon/5 border border-neon/30">
              <span className="text-white font-bold uppercase tracking-wider">Total Paid</span>
              <span className="text-2xl font-black text-neon">{registration?.totalPaid}</span>
            </div>
          </div>

          {/* Email Notice */}
          <div className="text-center text-sm text-white/50 pt-4 border-t border-white/10">
            A confirmation email has been sent with all the details.
            <br />
            Check your inbox (and spam folder) for next steps.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Link href="/" className="flex-1">
            <Button variant="outline-white" size="lg" className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <Link href="/portal" className="flex-1">
            <Button variant="neon" size="lg" className="w-full">
              View in Portal
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>

        {/* What's Next */}
        <div className="mt-12 text-center">
          <h3 className="text-lg font-bold uppercase tracking-wider text-white mb-4">
            What&apos;s Next?
          </h3>
          <ul className="text-white/60 space-y-2 text-sm">
            <li>Check your email for detailed camp information</li>
            <li>Complete any required medical forms before camp starts</li>
            <li>Mark your calendar for drop-off and pick-up times</li>
            <li>Get excited for an amazing camp experience!</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
