'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Calendar,
  Crown,
  CreditCard,
  Settings,
  Plus,
  ArrowRight,
  MapPin,
  CheckCircle,
  AlertCircle,
  Zap,
  User,
  Loader2,
  Shield,
  ShoppingBag,
  Coins,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LogoutButton } from '@/components/layout/user-menu'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
// Types (no longer imported from services)
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
  stripe_customer_id: string | null
  onboarding_completed: boolean
}

interface Athlete {
  id: string
  parent_id: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string | null
  grade: string | null
  school: string | null
  tshirt_size: string | null
  allergies: string | null
  medical_notes: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  photo_url: string | null
}

interface Registration {
  id: string
  athlete_id: string
  camp_id: string
  status: string
  payment_status: string
  notes: string | null
  created_at: string
  athletes?: {
    first_name: string
    last_name: string
  }
  camps?: {
    name: string
    start_date: string
    end_date: string
    location: string
    location_name: string | null
    city: string | null
    state: string | null
    price_cents: number
  }
}

/**
 * Parent Dashboard
 *
 * DESIGN NOTES:
 * - Personal view for parents/guardians
 * - Manage their athletes and view registrations
 * - Same fierce esports brand aesthetic
 * - All data fetched live from database
 */

export default function ParentDashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login')
      } else {
        loadDashboardData()
      }
    }
  }, [user, authLoading, router])

  const loadDashboardData = async (retryCount = 0) => {
    if (!user?.id) return

    try {
      // Load all data in parallel
      const [profileRes, athletesRes, registrationsRes] = await Promise.all([
        fetch(`/api/profiles?action=byId&profileId=${user.id}`),
        fetch(`/api/athletes?action=byParent&parentId=${user.id}`),
        fetch(`/api/registrations?action=byParent&parentId=${user.id}`),
      ])

      // Check for 401 - token might be expired
      if (profileRes.status === 401 || athletesRes.status === 401 || registrationsRes.status === 401) {
        if (retryCount < 1) {
          // Try to refresh the session and retry once
          console.log('[Dashboard] Got 401, attempting session refresh...')
          const { refreshAndSyncSession } = await import('@/lib/auth/cognito-client')
          const refreshed = await refreshAndSyncSession()
          if (refreshed) {
            console.log('[Dashboard] Session refreshed, retrying...')
            return loadDashboardData(retryCount + 1)
          }
        }
        // Refresh failed or already retried - redirect to login
        console.log('[Dashboard] Session refresh failed, redirecting to login')
        router.push('/login')
        return
      }

      const [profileResult, athletesResult, registrationsResult] = await Promise.all([
        profileRes.json(),
        athletesRes.json(),
        registrationsRes.json(),
      ])

      if (profileResult.data) {
        setProfile(profileResult.data)
      }

      if (athletesResult.data) {
        setAthletes(athletesResult.data)
      }

      if (registrationsResult.data) {
        setRegistrations(registrationsResult.data)
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    }

    setLoading(false)
  }

  // Calculate athlete age from DOB
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

  // Get registration counts per athlete
  const getAthleteCampCounts = (athleteId: string) => {
    const athleteRegs = registrations.filter(r => r.athlete_id === athleteId && r.camps)
    const today = new Date()
    const upcoming = athleteRegs.filter(r => r.camps && new Date(r.camps.start_date) >= today).length
    const completed = athleteRegs.filter(r =>
      r.camps && (new Date(r.camps.end_date) < today || r.status === 'completed')
    ).length
    return { upcoming, completed }
  }

  // Split registrations into upcoming and past (only those with camp data)
  const today = new Date()
  const upcomingRegistrations = registrations.filter(
    (r): r is Registration & { camps: NonNullable<Registration['camps']>; athletes: NonNullable<Registration['athletes']> } =>
      !!r.camps && !!r.athletes && new Date(r.camps.start_date) >= today && r.status !== 'cancelled'
  )
  const pastRegistrations = registrations.filter(
    (r): r is Registration & { camps: NonNullable<Registration['camps']>; athletes: NonNullable<Registration['athletes']> } =>
      !!r.camps && !!r.athletes && (new Date(r.camps.end_date) < today || r.status === 'completed')
  )

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    const yearOptions: Intl.DateTimeFormatOptions = { year: 'numeric' }
    return `${start.toLocaleDateString('en-US', options)}-${end.toLocaleDateString('en-US', options)}, ${end.toLocaleDateString('en-US', yearOptions)}`
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  const getUserName = () => {
    if (profile?.first_name) {
      return `${profile.first_name} ${profile.last_name || ''}`.trim()
    }
    return profile?.email?.split('@')[0] || 'Parent'
  }

  const getUserEmail = () => {
    return profile?.email || ''
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neon" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase tracking-wider text-white">
            Welcome back, {profile?.first_name || 'Parent'}
          </h1>
          <p className="mt-2 text-white/50">
            Manage your athletes and camp registrations
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Athletes Section */}
            <div className="bg-dark-100 border border-white/10">
              <div className="flex items-center justify-between px-6 py-4 border-b border-neon/30">
                <div className="flex items-center gap-3">
                  <Crown className="h-5 w-5 text-neon" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-white">
                    My Athletes
                  </h2>
                </div>
                <Link
                  href="/dashboard/athletes/new"
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neon hover:text-neon/80 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Athlete
                </Link>
              </div>
              <div className="p-6">
                {athletes.length === 0 ? (
                  // Empty state for no athletes
                  <div className="text-center py-8">
                    <div className="inline-flex h-16 w-16 items-center justify-center bg-neon/10 border border-neon/30 mb-4">
                      <Crown className="h-8 w-8 text-neon" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">No Athletes Yet</h3>
                    <p className="text-sm text-white/50 mb-6 max-w-xs mx-auto">
                      Add your young athlete to register them for camps and track their progress.
                    </p>
                    <Link href="/dashboard/athletes/new">
                      <Button variant="neon">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Athlete
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {athletes.map((athlete) => {
                      const counts = getAthleteCampCounts(athlete.id)
                      return (
                        <Link
                          key={athlete.id}
                          href={`/dashboard/athletes/${athlete.id}`}
                          className="p-4 bg-black/50 border border-white/10 hover:border-neon/30 hover:bg-neon/5 transition-all group"
                        >
                          <div className="flex items-start gap-4">
                            <div className="h-14 w-14 bg-neon/10 border border-neon/30 flex items-center justify-center group-hover:bg-neon/20 transition-colors">
                              <span className="text-neon font-black text-xl">{athlete.first_name[0]}</span>
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-white">{athlete.first_name} {athlete.last_name}</h3>
                              <p className="text-xs text-white/40 mt-1">
                                Age {calculateAge(athlete.date_of_birth)}
                                {athlete.tshirt_size && ` • Size ${athlete.tshirt_size}`}
                              </p>
                              <div className="flex gap-4 mt-3">
                                <span className="text-xs text-neon font-bold">
                                  {counts.upcoming} upcoming
                                </span>
                                <span className="text-xs text-white/40">
                                  {counts.completed} completed
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Registrations Section */}
            <div className="bg-dark-100 border border-white/10">
              <div className="px-6 py-4 border-b border-magenta/30">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setActiveTab('upcoming')}
                    className={cn(
                      'text-sm font-bold uppercase tracking-wider transition-colors',
                      activeTab === 'upcoming' ? 'text-magenta' : 'text-white/40 hover:text-white/60'
                    )}
                  >
                    Upcoming ({upcomingRegistrations.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('past')}
                    className={cn(
                      'text-sm font-bold uppercase tracking-wider transition-colors',
                      activeTab === 'past' ? 'text-magenta' : 'text-white/40 hover:text-white/60'
                    )}
                  >
                    Past ({pastRegistrations.length})
                  </button>
                </div>
              </div>
              <div className="p-6">
                {activeTab === 'upcoming' ? (
                  upcomingRegistrations.length === 0 ? (
                    // Empty state for no upcoming registrations
                    <div className="text-center py-8">
                      <div className="inline-flex h-16 w-16 items-center justify-center bg-magenta/10 border border-magenta/30 mb-4">
                        <Calendar className="h-8 w-8 text-magenta" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">No Upcoming Camps</h3>
                      <p className="text-sm text-white/50 mb-6 max-w-xs mx-auto">
                        {athletes.length === 0
                          ? 'Add an athlete first, then register them for a camp.'
                          : 'Browse available camps and register your athlete for one.'}
                      </p>
                      <Link href="/camps">
                        <Button variant="outline-neon">
                          <Calendar className="h-4 w-4 mr-2" />
                          Browse Camps
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {upcomingRegistrations.map((reg) => (
                        <Link
                          key={reg.id}
                          href={`/dashboard/registrations/${reg.id}`}
                          className={cn(
                            'block p-4 border transition-all cursor-pointer hover:border-neon/50',
                            reg.status === 'pending_payment'
                              ? 'bg-magenta/5 border-magenta/30 hover:bg-magenta/10'
                              : 'bg-black/50 border-white/10 hover:bg-neon/5'
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-white">{reg.camps.name}</h4>
                                {reg.status === 'confirmed' || reg.status === 'registered' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-neon/10 text-neon text-xs font-bold uppercase tracking-wider border border-neon/30">
                                    <CheckCircle className="h-3 w-3" />
                                    Confirmed
                                  </span>
                                ) : reg.status === 'pending_payment' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-magenta/10 text-magenta text-xs font-bold uppercase tracking-wider border border-magenta/30">
                                    <AlertCircle className="h-3 w-3" />
                                    Payment Due
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/10 text-white/60 text-xs font-bold uppercase tracking-wider border border-white/20">
                                    {reg.status}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-white/60 mt-1">
                                Athlete: <span className="text-white">{reg.athletes.first_name} {reg.athletes.last_name}</span>
                              </p>
                              <div className="flex items-center gap-4 mt-2 flex-wrap">
                                <span className="flex items-center gap-1 text-xs text-white/40">
                                  <Calendar className="h-3 w-3" />
                                  {formatDateRange(reg.camps.start_date, reg.camps.end_date)}
                                </span>
                                {(reg.camps.location_name || reg.camps.city) && (
                                  <span className="flex items-center gap-1 text-xs text-white/40">
                                    <MapPin className="h-3 w-3" />
                                    {reg.camps.location_name || reg.camps.city}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-neon">{formatCurrency(reg.camps.price_cents)}</p>
                              <p className="text-xs text-white/40 mt-1">Click to view details</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )
                ) : (
                  pastRegistrations.length === 0 ? (
                    // Empty state for no past registrations
                    <div className="text-center py-8">
                      <p className="text-sm text-white/40">No past camp registrations yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pastRegistrations.map((reg) => (
                        <Link
                          key={reg.id}
                          href={`/dashboard/registrations/${reg.id}`}
                          className="block p-4 bg-black/30 border border-white/5 hover:border-white/20 hover:bg-black/40 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-white/70">{reg.camps.name}</h4>
                              <p className="text-sm text-white/40 mt-1">
                                {reg.athletes.first_name} {reg.athletes.last_name}
                              </p>
                              <p className="text-xs text-white/30 mt-1">
                                {formatDateRange(reg.camps.start_date, reg.camps.end_date)}
                              </p>
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-white/30">
                              Completed
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="bg-dark-100 border border-white/10">
              <div className="px-6 py-4 border-b border-purple/30">
                <h2 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple" />
                  Quick Actions
                </h2>
              </div>
              <div className="p-4 space-y-2">
                <Link
                  href="/camps"
                  className="flex items-center justify-between p-3 bg-black/50 border border-white/10 hover:border-neon/30 hover:bg-neon/5 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-neon" />
                    <span className="text-sm font-semibold text-white">Find Camps</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-neon transition-colors" />
                </Link>
                <Link
                  href="/dashboard/athletes/new"
                  className="flex items-center justify-between p-3 bg-black/50 border border-white/10 hover:border-magenta/30 hover:bg-magenta/5 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Plus className="h-5 w-5 text-magenta" />
                    <span className="text-sm font-semibold text-white">Add Athlete</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-magenta transition-colors" />
                </Link>
                {athletes.length > 0 && (
                  <Link
                    href={athletes.length === 1 ? `/dashboard/athletes/${athletes[0].id}?tab=safety` : '/dashboard/authorized-pickups'}
                    className="flex items-center justify-between p-3 bg-black/50 border border-white/10 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-cyan-400" />
                      <span className="text-sm font-semibold text-white">Authorized Pickups</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-cyan-400 transition-colors" />
                  </Link>
                )}
                {upcomingRegistrations.length > 0 && (
                  <>
                    <Link
                      href="/dashboard/camp-store"
                      className="flex items-center justify-between p-3 bg-black/50 border border-white/10 hover:border-orange-400/30 hover:bg-orange-400/5 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <ShoppingBag className="h-5 w-5 text-orange-400" />
                        <span className="text-sm font-semibold text-white">Camp Store</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-orange-400 transition-colors" />
                    </Link>
                    <Link
                      href="/dashboard/camp-store?section=credits"
                      className="flex items-center justify-between p-3 bg-black/50 border border-white/10 hover:border-amber-400/30 hover:bg-amber-400/5 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <Coins className="h-5 w-5 text-amber-400" />
                        <span className="text-sm font-semibold text-white">Concession Credits</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-amber-400 transition-colors" />
                    </Link>
                  </>
                )}
                <Link
                  href="/dashboard/payments"
                  className="flex items-center justify-between p-3 bg-black/50 border border-white/10 hover:border-purple/30 hover:bg-purple/5 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-purple" />
                    <span className="text-sm font-semibold text-white">Payment History</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-purple transition-colors" />
                </Link>
              </div>
            </div>

            {/* Account Info */}
            <div className="bg-dark-100 border border-white/10">
              <div className="px-6 py-4 border-b border-white/10">
                <h2 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                  <User className="h-4 w-4 text-white/50" />
                  Account
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Name</p>
                    <p className="text-sm text-white">{getUserName()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Email</p>
                    <p className="text-sm text-white">{getUserEmail()}</p>
                  </div>
                  {profile?.phone && (
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider">Phone</p>
                      <p className="text-sm text-white">{profile.phone}</p>
                    </div>
                  )}
                  {(profile?.city || profile?.state) && (
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider">Location</p>
                      <p className="text-sm text-white">
                        {[profile?.city, profile?.state].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Account Settings
                  </Link>
                  <LogoutButton showLabel className="text-sm" />
                </div>
              </div>
            </div>

            {/* Support Card */}
            <div className="bg-gradient-to-br from-neon/10 via-magenta/10 to-purple/10 border border-white/10 p-6">
              <h3 className="font-bold text-white">Need Help?</h3>
              <p className="text-sm text-white/50 mt-2">
                Our team is here to answer any questions about camps or registrations.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 mt-4 text-sm font-bold uppercase tracking-wider text-neon hover:text-neon/80 transition-colors"
              >
                Contact Support
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
