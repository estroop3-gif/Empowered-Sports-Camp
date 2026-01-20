'use client'

/**
 * Coach Athlete Detail Page
 *
 * Read-only view of athlete profiles for coaches.
 * Coaches can view athlete information including safety data
 * but cannot modify any athlete data.
 */

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  User,
  Calendar,
  GraduationCap,
  Phone,
  Mail,
  Heart,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  ArrowLeft,
  Archive,
  Trophy,
  Shirt,
  Hash,
  Users,
  Clock,
  CheckCircle,
  Eye,
} from 'lucide-react'

interface Athlete {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string | null
  grade: string | null
  school: string | null
  medical_notes: string | null
  allergies: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relationship: string | null
  photo_url: string | null
  t_shirt_size: string | null
  jersey_number_preference: string | null
  primary_sport_interest: string | null
  secondary_sport_interest: string | null
  pickup_notes: string | null
  is_active: boolean
  risk_flag: string | null
  parent?: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    phone: string | null
  }
}

interface Registration {
  id: string
  camp_id: string
  camp_name: string
  camp_start_date: string
  camp_end_date: string
  status: string
}

interface PageProps {
  params: Promise<{ athleteId: string }>
}

export default function CoachAthleteDetailPage({ params }: PageProps) {
  const { athleteId } = use(params)
  const router = useRouter()

  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<'profile' | 'safety' | 'sports' | 'history'>('profile')

  useEffect(() => {
    loadAthlete()
  }, [athleteId])

  const loadAthlete = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/coach/athletes/${athleteId}`, {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load athlete')
      }

      setAthlete(data.athlete)
      setRegistrations(data.registrations || [])
    } catch (err) {
      console.error('Failed to load athlete:', err)
      setError((err as Error).message)
    }
    setLoading(false)
  }

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date()
    const birth = new Date(dateOfBirth)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <LmsGate featureName="athlete roster">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-neon" />
        </div>
      </LmsGate>
    )
  }

  if (!athlete) {
    return (
      <LmsGate featureName="athlete roster">
        <div className="text-center py-20">
          <User className="h-12 w-12 text-white/20 mx-auto mb-3" />
          <p className="text-lg font-bold text-white/60">{error || 'Athlete not found'}</p>
          <Button
            variant="dark"
            className="mt-4"
            onClick={() => router.push('/coach/athletes')}
          >
            Back to Athletes
          </Button>
        </div>
      </LmsGate>
    )
  }

  const age = calculateAge(athlete.date_of_birth)
  const parentName = [athlete.parent?.first_name, athlete.parent?.last_name].filter(Boolean).join(' ') || 'Unknown'
  const isMale = athlete.gender?.toLowerCase() === 'male'

  const renderReadOnlyField = (
    label: string,
    value: string | null | undefined,
    icon?: React.ReactNode
  ) => {
    const displayValue = value || '—'
    return (
      <div>
        <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
          {icon}
          {label}
        </label>
        <p className="text-white py-2">{displayValue}</p>
      </div>
    )
  }

  return (
    <LmsGate featureName="athlete roster">
      <div>
        <PortalPageHeader
          title={`${athlete.first_name} ${athlete.last_name}`}
          description={`Age ${age} • ${athlete.grade || 'Grade not set'}`}
          actions={
            <div className="flex items-center gap-3">
              <Button
                variant="dark"
                size="sm"
                onClick={() => router.push('/coach/athletes')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <span className="px-3 py-1.5 text-xs font-bold uppercase bg-white/10 border border-white/20 text-white/60 flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Read Only
              </span>
            </div>
          }
        />

        {/* Status Alerts */}
        {!athlete.is_active && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 flex items-center gap-2">
            <Archive className="h-4 w-4 text-amber-400" />
            <span className="text-amber-400 font-medium">This athlete is archived</span>
          </div>
        )}

        {athlete.risk_flag && athlete.risk_flag !== 'none' && (
          <div className={cn(
            "mb-6 p-4 flex items-start gap-3",
            athlete.risk_flag === 'monitor'
              ? "bg-amber-500/10 border border-amber-500/30"
              : "bg-red-500/10 border border-red-500/30"
          )}>
            <ShieldAlert className={cn(
              "h-5 w-5 flex-shrink-0 mt-0.5",
              athlete.risk_flag === 'monitor' ? "text-amber-400" : "text-red-400"
            )} />
            <div>
              <p className={cn(
                "font-bold uppercase text-sm",
                athlete.risk_flag === 'monitor' ? "text-amber-400" : "text-red-400"
              )}>
                {athlete.risk_flag === 'monitor' ? 'Monitor Flag' : 'Restricted Flag'}
              </p>
              <p className="text-white/60 text-sm mt-1">
                {athlete.risk_flag === 'monitor'
                  ? 'This athlete requires additional attention during camp activities.'
                  : 'This athlete has restrictions. Please follow specific guidelines for this athlete.'}
              </p>
            </div>
          </div>
        )}

        {/* Profile Header with Photo */}
        <PortalCard className="mb-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Photo */}
            <div className={cn(
              "h-32 w-32 flex items-center justify-center border-2 overflow-hidden flex-shrink-0",
              isMale ? "bg-amber-500/10 border-amber-500/30" : "bg-neon/10 border-neon/30"
            )}>
              {athlete.photo_url ? (
                <Image
                  src={athlete.photo_url}
                  alt={`${athlete.first_name} ${athlete.last_name}`}
                  width={128}
                  height={128}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className={cn("font-black text-4xl", isMale ? "text-amber-500" : "text-neon")}>
                  {athlete.first_name[0]?.toUpperCase()}
                </span>
              )}
            </div>

            {/* Basic Info Summary */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h2 className="text-2xl font-black text-white">
                  {athlete.first_name} {athlete.last_name}
                </h2>
                {!athlete.is_active && (
                  <span className="px-2 py-1 text-xs font-bold uppercase bg-white/10 border border-white/20 text-white/60">
                    Archived
                  </span>
                )}
                {athlete.risk_flag && athlete.risk_flag !== 'none' && (
                  <span className={cn(
                    "px-2 py-1 text-xs font-bold uppercase flex items-center gap-1",
                    athlete.risk_flag === 'monitor'
                      ? "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                      : "bg-red-500/10 border border-red-500/30 text-red-400"
                  )}>
                    <ShieldAlert className="h-3 w-3" />
                    {athlete.risk_flag}
                  </span>
                )}
                {isMale && (
                  <span className="px-2 py-1 text-xs font-bold uppercase bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Male
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-white/40 text-xs uppercase tracking-wider">Age</span>
                  <p className="text-white font-semibold">{age} years old</p>
                </div>
                <div>
                  <span className="text-white/40 text-xs uppercase tracking-wider">Gender</span>
                  <p className={cn("font-semibold", isMale ? "text-amber-400" : "text-pink-400")}>
                    {athlete.gender || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-white/40 text-xs uppercase tracking-wider">Grade</span>
                  <p className="text-white font-semibold">{athlete.grade || '—'}</p>
                </div>
                <div>
                  <span className="text-white/40 text-xs uppercase tracking-wider">Registrations</span>
                  <p className="text-neon font-semibold">{registrations.length} camps</p>
                </div>
              </div>
            </div>
          </div>
        </PortalCard>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'safety', label: 'Safety & Medical', icon: Heart },
            { id: 'sports', label: 'Sports', icon: Trophy },
            { id: 'history', label: 'Camp History', icon: Clock },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors',
                activeTab === tab.id
                  ? 'bg-neon text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <PortalCard title="Basic Information">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {renderReadOnlyField('First Name', athlete.first_name)}
                  {renderReadOnlyField('Last Name', athlete.last_name)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {renderReadOnlyField('Date of Birth', formatDate(athlete.date_of_birth), <Calendar className="h-3 w-3 inline mr-1" />)}
                  {renderReadOnlyField('Gender', athlete.gender)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {renderReadOnlyField('Grade Level', athlete.grade, <GraduationCap className="h-3 w-3 inline mr-1" />)}
                  {renderReadOnlyField('School', athlete.school)}
                </div>
              </div>
            </PortalCard>

            <PortalCard title="Parent/Guardian">
              <div className="space-y-4">
                <div className="bg-white/5 p-4 space-y-2">
                  <p className="font-semibold text-white">{parentName}</p>
                  <p className="text-sm text-white/60 flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    {athlete.parent?.email || 'No email'}
                  </p>
                  {athlete.parent?.phone && (
                    <p className="text-sm text-white/60 flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {athlete.parent.phone}
                    </p>
                  )}
                </div>
                <p className="text-xs text-white/40">
                  Contact parent/guardian for any concerns about the athlete.
                </p>
              </div>
            </PortalCard>
          </div>
        )}

        {activeTab === 'safety' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <PortalCard title="Emergency Contact" accent="orange">
              <div className="space-y-4">
                {renderReadOnlyField('Contact Name', athlete.emergency_contact_name)}
                {renderReadOnlyField('Phone Number', athlete.emergency_contact_phone)}
                {renderReadOnlyField('Relationship', athlete.emergency_contact_relationship)}
              </div>
            </PortalCard>

            <PortalCard title="Medical Information" accent="magenta">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    Allergies
                  </label>
                  <div className={cn(
                    "p-3",
                    athlete.allergies ? "bg-red-500/10 border border-red-500/30 text-red-300" : "text-white/60"
                  )}>
                    {athlete.allergies || 'No allergies reported'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    <Heart className="h-3 w-3 inline mr-1" />
                    Medical Notes
                  </label>
                  <div className={cn(
                    "p-3",
                    athlete.medical_notes ? "bg-amber-500/10 border border-amber-500/30 text-amber-300" : "text-white/60"
                  )}>
                    {athlete.medical_notes || 'No medical notes'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    <Users className="h-3 w-3 inline mr-1" />
                    Pickup Notes
                  </label>
                  <div className={cn(
                    "p-3",
                    athlete.pickup_notes ? "bg-white/5 border border-white/20 text-white" : "text-white/60"
                  )}>
                    {athlete.pickup_notes || 'No special pickup instructions'}
                  </div>
                </div>
              </div>
            </PortalCard>
          </div>
        )}

        {activeTab === 'sports' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <PortalCard title="Sport Interests">
              <div className="space-y-4">
                {renderReadOnlyField('Primary Sport Interest', athlete.primary_sport_interest, <Trophy className="h-3 w-3 inline mr-1" />)}
                {renderReadOnlyField('Secondary Sport Interest', athlete.secondary_sport_interest)}
              </div>
            </PortalCard>

            <PortalCard title="Preferences">
              <div className="space-y-4">
                {renderReadOnlyField('T-Shirt Size', athlete.t_shirt_size, <Shirt className="h-3 w-3 inline mr-1" />)}
                {renderReadOnlyField('Jersey Number Preference', athlete.jersey_number_preference, <Hash className="h-3 w-3 inline mr-1" />)}
              </div>
            </PortalCard>
          </div>
        )}

        {activeTab === 'history' && (
          <PortalCard title="Camp History">
            {registrations.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-10 w-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/40">No camp registrations in your assigned camps</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Camp</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Dates</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map((reg) => (
                      <tr key={reg.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3 font-medium text-white">{reg.camp_name}</td>
                        <td className="px-4 py-3 text-sm text-white/60">
                          {formatDate(reg.camp_start_date)} - {formatDate(reg.camp_end_date)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "px-2 py-1 text-xs font-bold uppercase flex items-center gap-1 w-fit",
                            reg.status === 'confirmed' && "bg-neon/10 text-neon",
                            reg.status === 'pending' && "bg-amber-500/10 text-amber-400",
                            reg.status === 'cancelled' && "bg-red-500/10 text-red-400",
                          )}>
                            {reg.status === 'confirmed' && <CheckCircle className="h-3 w-3" />}
                            {reg.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PortalCard>
        )}

        {/* Read-Only Notice */}
        <div className="mt-8 p-4 bg-white/5 border border-white/10 text-center">
          <p className="text-white/40 text-sm">
            <Eye className="h-4 w-4 inline mr-2" />
            This athlete profile is read-only. Contact your administrator if you need to make changes.
          </p>
        </div>
      </div>
    </LmsGate>
  )
}
