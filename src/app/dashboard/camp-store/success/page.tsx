'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { useConcessionCredits } from '@/hooks/useConcessionCredits'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react'

interface SessionData {
  concessionCredits: number
  athleteId: string
  campId: string
  registrationId: string
  status: string
}

export default function CampStoreSuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const { user, loading: authLoading } = useAuth()
  const { invalidateAthlete } = useConcessionCredits()

  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [athleteName, setAthleteName] = useState<string | null>(null)
  const [campName, setCampName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading || !user) return
    if (!sessionId) {
      setError('No session ID found.')
      setLoading(false)
      return
    }

    async function fetchData() {
      try {
        const sessionRes = await fetch(`/api/store/checkout?sessionId=${sessionId}`)
        if (!sessionRes.ok) throw new Error('Failed to load session')
        const sessionJson = await sessionRes.json()
        const data: SessionData = sessionJson.data
        setSessionData(data)

        // Safety net: ensure credits are fulfilled even if webhook was missed.
        // This is idempotent — safe to call even if the webhook already processed it.
        if (data.concessionCredits > 0 && data.status === 'paid') {
          await fetch('/api/concession-credits/fulfill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          }).catch((err) => console.error('Fulfill safety-net failed:', err))
        }

        // Invalidate cached credit balances so dashboard shows updated values
        await invalidateAthlete(data.athleteId).catch(() => {})

        const [athleteRes, campRes] = await Promise.all([
          fetch(`/api/athletes?action=byId&athleteId=${data.athleteId}`),
          fetch(`/api/camps?action=byId&campId=${data.campId}`),
        ])

        if (athleteRes.ok) {
          const athleteJson = await athleteRes.json()
          setAthleteName(
            `${athleteJson.data.first_name} ${athleteJson.data.last_name}`
          )
        }

        if (campRes.ok) {
          const campJson = await campRes.json()
          setCampName(campJson.data.name)
        }
      } catch (err) {
        console.error('Error fetching success data:', err)
        setError('Unable to load purchase details.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [sessionId, user, authLoading])

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neon" />
      </div>
    )
  }

  if (error || !sessionData) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-lg text-white">{error || 'Something went wrong.'}</p>
        <Link href="/dashboard">
          <Button variant="outline-white">Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  const dollars = (sessionData.concessionCredits / 100).toFixed(2)

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 py-12">
      <CheckCircle className="h-16 w-16 text-neon" />

      <h1 className="text-3xl font-bold text-white">Credits Added!</h1>

      <p className="text-5xl font-extrabold text-neon">${dollars}</p>

      {athleteName && (
        <p className="text-lg text-zinc-300">
          Athlete: <span className="font-semibold text-white">{athleteName}</span>
        </p>
      )}

      {campName && (
        <p className="text-lg text-zinc-300">
          Camp: <span className="font-semibold text-white">{campName}</span>
        </p>
      )}

      <div
        className={cn(
          'mt-2 max-w-md rounded-lg border border-amber-400/30 bg-amber-400/10 px-5 py-4 text-center text-sm text-amber-400'
        )}
      >
        We are a cash free camp. Camper states first and last name at concession
        to use credits. No rollover or refunds.
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Link href="/dashboard">
          <Button variant="outline-white" className="w-full sm:w-auto">
            Back to Dashboard
          </Button>
        </Link>
        <Link href="/dashboard/camp-store?section=credits">
          <Button className="w-full bg-neon text-black hover:bg-neon/90 sm:w-auto">
            Add More Credits
          </Button>
        </Link>
      </div>
    </div>
  )
}
