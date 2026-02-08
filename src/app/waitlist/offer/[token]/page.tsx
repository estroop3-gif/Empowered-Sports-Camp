'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, Calendar, MapPin, Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'

interface OfferDetails {
  registrationId: string
  campName: string
  campDates: { start: string; end: string }
  location: { name: string; address: string; city: string; state: string }
  camperName: string
  totalPriceCents: number
  offerExpiresAt: string | null
  isExpired: boolean
  hasOffer: boolean
}

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    function update() {
      const now = new Date().getTime()
      const target = new Date(expiresAt).getTime()
      const diff = target - now

      if (diff <= 0) {
        setTimeLeft('Expired')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  return <span>{timeLeft}</span>
}

export default function WaitlistOfferPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = params.token as string
  const action = searchParams.get('action')

  const [offer, setOffer] = useState<OfferDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [declined, setDeclined] = useState(false)

  useEffect(() => {
    async function fetchOffer() {
      try {
        const res = await fetch(`/api/waitlist/offer/${token}`)
        const json = await res.json()

        if (!res.ok) {
          setError(json.error || 'Offer not found')
          return
        }

        setOffer(json.data)

        // Auto-decline if action=decline
        if (action === 'decline') {
          handleDecline()
        }
      } catch {
        setError('Failed to load offer details')
      } finally {
        setLoading(false)
      }
    }

    if (token) fetchOffer()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const handleAccept = async () => {
    setAccepting(true)
    setError(null)

    try {
      const res = await fetch('/api/waitlist/accept-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to accept offer')
      }

      // Redirect to Stripe checkout
      if (json.data?.checkoutUrl) {
        router.push(json.data.checkoutUrl)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setAccepting(false)
    }
  }

  const handleDecline = async () => {
    setDeclining(true)
    setError(null)

    try {
      const res = await fetch('/api/waitlist/decline-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to decline offer')
      }

      setDeclined(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setDeclining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-neon animate-spin" />
      </div>
    )
  }

  if (declined) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-6">
          <XCircle className="h-16 w-16 text-white/40 mx-auto" />
          <h1 className="text-2xl font-black uppercase tracking-wider text-white">
            Offer Declined
          </h1>
          <p className="text-white/60">
            You&apos;ve been removed from the waitlist. The spot will be offered to the next person in line.
          </p>
          <Link href="/camps">
            <Button variant="neon" size="lg">
              Browse Camps
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (error && !offer) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-6">
          <XCircle className="h-16 w-16 text-magenta mx-auto" />
          <h1 className="text-2xl font-black uppercase tracking-wider text-white">
            Offer Not Found
          </h1>
          <p className="text-white/60">{error}</p>
          <Link href="/camps">
            <Button variant="neon" size="lg">
              Browse Camps
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!offer) return null

  // Expired state
  if (offer.isExpired) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-6">
          <Clock className="h-16 w-16 text-yellow-400 mx-auto" />
          <h1 className="text-2xl font-black uppercase tracking-wider text-white">
            Offer Expired
          </h1>
          <p className="text-white/60">
            This offer has expired. You&apos;ve been moved back in the waitlist queue. We&apos;ll email you if another spot opens.
          </p>
          <Link href="/camps">
            <Button variant="neon" size="lg">
              Browse Camps
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const startDate = new Date(offer.campDates.start).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
  const endDate = new Date(offer.campDates.end).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-neon via-magenta to-purple" />
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="flex items-center justify-center gap-3">
            <div className="relative h-8 w-8">
              <Image
                src="/images/logo.png"
                alt="Empowered Athletes"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-lg font-black uppercase tracking-wider text-white">
              Waitlist Offer
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="space-y-8">
          {/* Success header */}
          <div className="text-center">
            <CheckCircle2 className="h-16 w-16 text-neon mx-auto mb-4" />
            <h1 className="text-3xl font-black uppercase tracking-wider text-white">
              A Spot Opened!
            </h1>
            <p className="text-white/60 mt-2">
              Great news — a spot is available for <strong className="text-white">{offer.camperName}</strong>.
            </p>
          </div>

          {/* Countdown */}
          {offer.offerExpiresAt && (
            <div className="bg-neon/10 border border-neon/30 p-6 text-center">
              <p className="text-sm text-white/60 uppercase tracking-wider mb-2">Time Remaining</p>
              <p className="text-3xl font-black text-neon">
                <CountdownTimer expiresAt={offer.offerExpiresAt} />
              </p>
            </div>
          )}

          {/* Camp details */}
          <div className="bg-dark-100 border border-white/10 p-6 space-y-4">
            <h2 className="text-xl font-bold text-white">{offer.campName}</h2>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-white/60">
                <Calendar className="h-4 w-4 text-neon flex-shrink-0" />
                <span>{startDate} — {endDate}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-white/60">
                <MapPin className="h-4 w-4 text-neon flex-shrink-0" />
                <span>
                  {offer.location.name}
                  {offer.location.city && `, ${offer.location.city}`}
                  {offer.location.state && `, ${offer.location.state}`}
                </span>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 flex justify-between items-center">
              <span className="text-white/60">Camper</span>
              <span className="text-white font-semibold">{offer.camperName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60">Total</span>
              <span className="text-2xl font-black text-neon">
                {formatPrice(offer.totalPriceCents)}
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-magenta/10 border border-magenta/30 p-4">
              <p className="text-sm text-magenta">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-4">
            <Button
              variant="neon"
              size="lg"
              className="w-full text-lg py-6"
              onClick={handleAccept}
              disabled={accepting || declining}
            >
              {accepting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                'Complete Registration & Pay'
              )}
            </Button>

            <div className="text-center">
              <button
                onClick={handleDecline}
                disabled={accepting || declining}
                className="text-sm text-white/40 hover:text-white/60 transition-colors underline"
              >
                {declining ? 'Declining...' : 'No thanks, remove me from the waitlist'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
