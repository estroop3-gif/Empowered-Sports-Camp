'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Crown,
  Plus,
  ArrowRight,
  CheckCircle,
  Zap,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/lib/auth/context'
// Type definition (no longer imported from service)
interface Profile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  avatar_url: string | null
  onboarding_completed: boolean
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login')
      } else {
        loadProfile()
      }
    }
  }, [user, authLoading])

  const loadProfile = async () => {
    if (!user?.id) return

    try {
      const res = await fetch(`/api/profiles?action=byId&profileId=${user.id}`)
      const { data, error } = await res.json()

      if (error) {
        console.error('Error loading profile:', error)
      } else {
        setProfile(data)
      }
    } catch (err) {
      console.error('Error loading profile:', err)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neon" />
      </div>
    )
  }

  const fullName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : 'Parent'

  const hasLocation = profile?.city || profile?.state || profile?.zip_code
  const locationString = [profile?.city, profile?.state, profile?.zip_code]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-10 w-10">
              <Image
                src="/images/logo.png"
                alt="Empowered Athletes"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <span className="text-lg font-black uppercase tracking-wider text-white">Empowered</span>
              <span className="text-lg font-light uppercase tracking-wider text-neon ml-2">Athletes</span>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <div className="inline-flex h-16 w-16 items-center justify-center bg-neon/10 border border-neon/30 mb-6">
            <CheckCircle className="h-8 w-8 text-neon" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-wider text-white mb-4">
            Welcome, {profile?.first_name || 'Parent'}!
          </h1>
          <p className="text-xl text-white/60 max-w-lg mx-auto">
            Your account has been created successfully. Now let&apos;s add your athletes so they can join the action.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Profile Summary Card */}
          <div className="bg-dark-100 border border-white/10">
            <div className="px-6 py-4 border-b border-neon/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-neon" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-white">
                  Your Profile
                </h2>
              </div>
              <Link
                href="/dashboard/settings"
                className="text-xs font-bold uppercase tracking-wider text-white/40 hover:text-neon transition-colors"
              >
                Edit
              </Link>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 bg-neon/10 border border-neon/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-black text-neon">
                    {(profile?.first_name?.[0] || 'P').toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white truncate">{fullName}</h3>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <Mail className="h-4 w-4 text-white/40" />
                      <span className="truncate">{profile?.email}</span>
                    </div>
                    {profile?.phone && (
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <Phone className="h-4 w-4 text-white/40" />
                        <span>{profile.phone}</span>
                      </div>
                    )}
                    {hasLocation && (
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <MapPin className="h-4 w-4 text-white/40" />
                        <span>{locationString}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Completion Indicator */}
              {(!profile?.phone || !hasLocation) && (
                <div className="mt-6 p-3 bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-xs text-yellow-500">
                    <Zap className="h-4 w-4 inline mr-1" />
                    Complete your profile to make registration faster
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Add Athletes Card */}
          <div className="bg-dark-100 border border-white/10">
            <div className="px-6 py-4 border-b border-magenta/30">
              <div className="flex items-center gap-3">
                <Crown className="h-5 w-5 text-magenta" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-white">
                  Your Athletes
                </h2>
              </div>
            </div>
            <div className="p-6">
              <div className="text-center py-8">
                <div className="inline-flex h-16 w-16 items-center justify-center bg-magenta/10 border border-magenta/30 mb-4">
                  <Crown className="h-8 w-8 text-magenta" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">No Athletes Yet</h3>
                <p className="text-sm text-white/50 mb-6 max-w-xs mx-auto">
                  Add your young athlete to register them for camps and track their progress.
                </p>
                <Link href="/dashboard/athletes/new?from=onboarding">
                  <Button variant="neon" size="lg">
                    <Plus className="h-5 w-5 mr-2" />
                    Add Your First Athlete
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps Section */}
        <div className="mt-12 bg-gradient-to-br from-neon/5 via-purple/5 to-magenta/5 border border-white/10 p-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
            <Zap className="h-6 w-6 text-neon" />
            What&apos;s Next?
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 bg-neon/10 border border-neon/30 flex items-center justify-center flex-shrink-0">
                <span className="text-neon font-black">1</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Add Athletes</h3>
                <p className="text-xs text-white/50 mt-1">
                  Enter your child&apos;s info so they&apos;re ready to register for camps.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 bg-purple/10 border border-purple/30 flex items-center justify-center flex-shrink-0">
                <span className="text-purple font-black">2</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Browse Camps</h3>
                <p className="text-xs text-white/50 mt-1">
                  Find the perfect camp based on location, dates, and your athlete&apos;s age.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 bg-magenta/10 border border-magenta/30 flex items-center justify-center flex-shrink-0">
                <span className="text-magenta font-black">3</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Register</h3>
                <p className="text-xs text-white/50 mt-1">
                  Complete registration and watch your athlete grow!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/dashboard/athletes/new?from=onboarding">
            <Button variant="neon" size="lg" className="w-full sm:w-auto">
              <Plus className="h-5 w-5 mr-2" />
              Add an Athlete
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline-neon" size="lg" className="w-full sm:w-auto">
              Skip for Now, Go to Dashboard
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
