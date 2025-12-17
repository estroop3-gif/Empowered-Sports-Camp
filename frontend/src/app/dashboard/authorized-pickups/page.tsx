'use client'

/**
 * Authorized Pickups Selection Page
 *
 * When a parent has multiple athletes, this page lets them select
 * which athlete they want to manage authorized pickup persons for.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/button'
import {
  Shield,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Crown,
} from 'lucide-react'

interface Athlete {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  photo_url: string | null
}

export default function AuthorizedPickupsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login')
      } else {
        loadAthletes()
      }
    }
  }, [user, authLoading])

  const loadAthletes = async () => {
    if (!user?.id) return

    try {
      const res = await fetch(`/api/athletes?action=byParent&parentId=${user.id}`)
      const data = await res.json()

      if (data.data) {
        setAthletes(data.data)
        // If only one athlete, redirect directly
        if (data.data.length === 1) {
          router.push(`/dashboard/athletes/${data.data[0].id}?tab=safety`)
          return
        }
      }
    } catch (err) {
      console.error('Failed to load athletes:', err)
    }
    setLoading(false)
  }

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neon" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-neon transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center bg-cyan-400/10 border border-cyan-400/30 mb-4">
            <Shield className="h-8 w-8 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-white">
            Authorized Pickups
          </h1>
          <p className="mt-2 text-white/50">
            Select an athlete to manage their authorized pickup persons
          </p>
        </div>

        {/* Athlete Cards */}
        {athletes.length === 0 ? (
          <div className="bg-dark-100 border border-white/10 p-8 text-center">
            <Crown className="h-12 w-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/60">No athletes found</p>
            <Link href="/dashboard/athletes/new">
              <Button variant="neon" className="mt-4">
                Add an Athlete
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {athletes.map((athlete) => (
              <Link
                key={athlete.id}
                href={`/dashboard/athletes/${athlete.id}?tab=safety`}
                className="flex items-center justify-between p-4 bg-dark-100 border border-white/10 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 bg-neon/10 border border-neon/30 flex items-center justify-center">
                    {athlete.photo_url ? (
                      <img
                        src={athlete.photo_url}
                        alt={athlete.first_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-neon font-black text-xl">
                        {athlete.first_name[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-white">
                      {athlete.first_name} {athlete.last_name}
                    </h3>
                    <p className="text-sm text-white/50">
                      Age {calculateAge(athlete.date_of_birth)}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-white/30 group-hover:text-cyan-400 transition-colors" />
              </Link>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 p-4 bg-cyan-400/5 border border-cyan-400/20">
          <h3 className="font-bold text-cyan-400 text-sm uppercase tracking-wider mb-2">
            About Authorized Pickups
          </h3>
          <p className="text-sm text-white/60">
            Authorized pickup persons are trusted adults who can pick up your child from camp.
            Camp staff will verify identification before releasing your child to anyone on this list.
          </p>
        </div>
      </main>
    </div>
  )
}
