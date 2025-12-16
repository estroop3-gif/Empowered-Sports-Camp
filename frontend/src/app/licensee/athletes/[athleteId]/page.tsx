'use client'

/**
 * Licensee Athlete Detail Page
 *
 * View and edit athlete profiles for athletes in the licensee's territory.
 * - Read-only mode by default
 * - Edit mode toggled via button
 * - Profile photo upload support
 * - No access to internal notes (admin only)
 */

import { useState, useEffect, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { STORAGE_FOLDERS } from '@/lib/storage/s3'
import {
  User,
  Calendar,
  GraduationCap,
  MapPin,
  Phone,
  Mail,
  Heart,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  Save,
  ArrowLeft,
  Archive,
  RefreshCcw,
  Trophy,
  Shirt,
  Hash,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  X,
  Camera,
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
  payment_status: string
  total_price_cents: number
}

interface PageProps {
  params: Promise<{ athleteId: string }>
}

export default function LicenseeAthleteDetailPage({ params }: PageProps) {
  const { athleteId } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Edit mode toggle
  const [isEditMode, setIsEditMode] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Form state
  const [formData, setFormData] = useState<Partial<Athlete>>({})
  const [activeTab, setActiveTab] = useState<'profile' | 'safety' | 'sports' | 'history'>('profile')

  useEffect(() => {
    loadAthlete()
  }, [athleteId])

  const loadAthlete = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/licensee/athletes/${athleteId}?includeRegistrations=true`, {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load athlete')
      }

      setAthlete(data.athlete)
      setFormData(data.athlete)
      setRegistrations(data.registrations || [])
    } catch (err) {
      console.error('Failed to load athlete:', err)
      setError((err as Error).message)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`/api/licensee/athletes/${athleteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save changes')
      }

      setAthlete(data.athlete)
      setFormData(data.athlete)
      setIsEditMode(false)
      setSuccessMessage('Changes saved successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Failed to save:', err)
      setError((err as Error).message)
    }
    setSaving(false)
  }

  const handleCancelEdit = () => {
    setFormData(athlete || {})
    setIsEditMode(false)
  }

  const handleArchive = async () => {
    if (!athlete) return
    if (!confirm(`Are you sure you want to ${athlete.is_active ? 'archive' : 'reactivate'} this athlete?`)) return

    setSaving(true)
    try {
      const action = athlete.is_active ? '' : '?action=reactivate'
      const response = await fetch(`/api/licensee/athletes/${athleteId}${action}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update athlete')
      }

      await loadAthlete()
      setSuccessMessage(athlete.is_active ? 'Athlete archived' : 'Athlete reactivated')
    } catch (err) {
      setError((err as Error).message)
    }
    setSaving(false)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setUploadingPhoto(true)
    setError(null)

    try {
      const urlResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          folder: STORAGE_FOLDERS.ATHLETE_PHOTOS,
        }),
      })

      if (!urlResponse.ok) throw new Error('Failed to get upload URL')

      const { uploadUrl, fileUrl } = await urlResponse.json()

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })

      if (!uploadResponse.ok) throw new Error('Failed to upload image')

      const updateResponse = await fetch(`/api/licensee/athletes/${athleteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_url: fileUrl }),
      })

      if (!updateResponse.ok) throw new Error('Failed to update athlete photo')

      const data = await updateResponse.json()
      setAthlete(data.athlete)
      setFormData(data.athlete)
      setSuccessMessage('Photo uploaded successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photo')
    }
    setUploadingPhoto(false)
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

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  if (loading) {
    return (
      <LmsGate featureName="athlete management">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-neon" />
        </div>
      </LmsGate>
    )
  }

  if (!athlete) {
    return (
      <LmsGate featureName="athlete management">
        <div className="text-center py-20">
          <User className="h-12 w-12 text-white/20 mx-auto mb-3" />
          <p className="text-lg font-bold text-white/60">Athlete not found</p>
          <Button
            variant="dark"
            className="mt-4"
            onClick={() => router.push('/licensee/athletes')}
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

  const renderField = (
    label: string,
    value: string | null | undefined,
    field: keyof Athlete,
    icon?: React.ReactNode,
    type: 'text' | 'date' | 'textarea' | 'select' = 'text',
    options?: { value: string; label: string }[]
  ) => {
    const displayValue = value || '—'

    return (
      <div>
        <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
          {icon}
          {label}
        </label>
        {isEditMode ? (
          type === 'textarea' ? (
            <textarea
              value={(formData[field] as string) || ''}
              onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
              className="w-full bg-white/5 border border-white/20 text-white px-4 py-3 focus:border-neon focus:outline-none min-h-[100px]"
            />
          ) : type === 'select' && options ? (
            <select
              value={(formData[field] as string) || ''}
              onChange={(e) => setFormData({ ...formData, [field]: e.target.value || null })}
              className="w-full bg-white/5 border border-white/20 text-white px-4 py-3 focus:border-neon focus:outline-none"
            >
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <Input
              type={type}
              value={(formData[field] as string) || ''}
              onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
              className="bg-white/5 border-white/20"
            />
          )
        ) : (
          <p className="text-white py-2">{displayValue}</p>
        )}
      </div>
    )
  }

  return (
    <LmsGate featureName="athlete management">
      <div>
        <PortalPageHeader
          title={`${athlete.first_name} ${athlete.last_name}`}
          description={`Age ${age} • ${athlete.grade || 'Grade not set'}`}
          actions={
            <div className="flex items-center gap-3">
              <Button
                variant="dark"
                size="sm"
                onClick={() => router.push('/licensee/athletes')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              {isEditMode ? (
                <>
                  <Button
                    variant="dark"
                    size="sm"
                    onClick={handleCancelEdit}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-neon text-black hover:bg-neon/90"
                  >
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline-neon"
                    size="sm"
                    onClick={() => setIsEditMode(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="dark"
                    size="sm"
                    onClick={handleArchive}
                    disabled={saving}
                  >
                    {athlete.is_active ? (
                      <>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </>
                    ) : (
                      <>
                        <RefreshCcw className="h-4 w-4 mr-2" />
                        Reactivate
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          }
        />

        {/* Status Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-6 p-4 bg-neon/10 border border-neon/30 text-neon flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {successMessage}
          </div>
        )}

        {!athlete.is_active && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 flex items-center gap-2">
            <Archive className="h-4 w-4 text-amber-400" />
            <span className="text-amber-400 font-medium">This athlete is archived</span>
          </div>
        )}

        {/* Profile Header with Photo */}
        <PortalCard className="mb-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Photo */}
            <div className="relative group">
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
              {isEditMode && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {uploadingPhoto ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <div className="text-center">
                      <Camera className="h-6 w-6 text-white mx-auto" />
                      <span className="text-xs text-white mt-1">Upload</span>
                    </div>
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
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
            { id: 'safety', label: 'Contact & Safety', icon: Heart },
            { id: 'sports', label: 'Sports & Preferences', icon: Trophy },
            { id: 'history', label: 'Enrollment History', icon: Clock },
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
                  {renderField('First Name', athlete.first_name, 'first_name')}
                  {renderField('Last Name', athlete.last_name, 'last_name')}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {renderField('Date of Birth', athlete.date_of_birth, 'date_of_birth', <Calendar className="h-3 w-3 inline mr-1" />, 'date')}
                  {renderField('Gender', athlete.gender, 'gender', undefined, 'select', [
                    { value: '', label: 'Select...' },
                    { value: 'female', label: 'Female' },
                    { value: 'male', label: 'Male' },
                  ])}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {renderField('Grade Level', athlete.grade, 'grade', <GraduationCap className="h-3 w-3 inline mr-1" />, 'select', [
                    { value: '', label: 'Select...' },
                    { value: 'Pre-K', label: 'Pre-K' },
                    { value: 'Kindergarten', label: 'Kindergarten' },
                    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => ({
                      value: `${g}${g === 1 ? 'st' : g === 2 ? 'nd' : g === 3 ? 'rd' : 'th'} Grade`,
                      label: `${g}${g === 1 ? 'st' : g === 2 ? 'nd' : g === 3 ? 'rd' : 'th'} Grade`,
                    })),
                  ])}
                  {renderField('School', athlete.school, 'school')}
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
                  Parent information is read-only.
                </p>
              </div>
            </PortalCard>
          </div>
        )}

        {activeTab === 'safety' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <PortalCard title="Emergency Contact">
              <div className="space-y-4">
                {renderField('Contact Name', athlete.emergency_contact_name, 'emergency_contact_name')}
                {renderField('Phone Number', athlete.emergency_contact_phone, 'emergency_contact_phone')}
                {renderField('Relationship', athlete.emergency_contact_relationship, 'emergency_contact_relationship')}
              </div>
            </PortalCard>

            <PortalCard title="Medical Information">
              <div className="space-y-4">
                {renderField('Allergies', athlete.allergies, 'allergies', <AlertTriangle className="h-3 w-3 inline mr-1" />, 'textarea')}
                {renderField('Medical Notes', athlete.medical_notes, 'medical_notes', <Heart className="h-3 w-3 inline mr-1" />, 'textarea')}
                {renderField('Pickup Notes', athlete.pickup_notes, 'pickup_notes', <Users className="h-3 w-3 inline mr-1" />, 'textarea')}
              </div>
            </PortalCard>
          </div>
        )}

        {activeTab === 'sports' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <PortalCard title="Sport Interests">
              <div className="space-y-4">
                {renderField('Primary Sport Interest', athlete.primary_sport_interest, 'primary_sport_interest', <Trophy className="h-3 w-3 inline mr-1" />)}
                {renderField('Secondary Sport Interest', athlete.secondary_sport_interest, 'secondary_sport_interest')}
              </div>
            </PortalCard>

            <PortalCard title="Preferences">
              <div className="space-y-4">
                {renderField('T-Shirt Size', athlete.t_shirt_size, 't_shirt_size', <Shirt className="h-3 w-3 inline mr-1" />, 'select', [
                  { value: '', label: 'Select...' },
                  { value: 'YXS', label: 'Youth XS' },
                  { value: 'YS', label: 'Youth S' },
                  { value: 'YM', label: 'Youth M' },
                  { value: 'YL', label: 'Youth L' },
                  { value: 'YXL', label: 'Youth XL' },
                  { value: 'AS', label: 'Adult S' },
                  { value: 'AM', label: 'Adult M' },
                  { value: 'AL', label: 'Adult L' },
                  { value: 'AXL', label: 'Adult XL' },
                ])}
                {renderField('Jersey Number Preference', athlete.jersey_number_preference, 'jersey_number_preference', <Hash className="h-3 w-3 inline mr-1" />)}
              </div>
            </PortalCard>
          </div>
        )}

        {activeTab === 'history' && (
          <PortalCard title="Enrollment History">
            {registrations.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-10 w-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/40">No registrations found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Camp</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Dates</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Payment</th>
                      <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Amount</th>
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
                            "px-2 py-1 text-xs font-bold uppercase",
                            reg.status === 'confirmed' && "bg-neon/10 text-neon",
                            reg.status === 'pending' && "bg-amber-500/10 text-amber-400",
                            reg.status === 'cancelled' && "bg-red-500/10 text-red-400",
                          )}>
                            {reg.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "flex items-center gap-1 text-sm",
                            reg.payment_status === 'paid' && "text-neon",
                            reg.payment_status === 'pending' && "text-amber-400",
                          )}>
                            {reg.payment_status === 'paid' && <CheckCircle className="h-3 w-3" />}
                            {reg.payment_status === 'pending' && <Clock className="h-3 w-3" />}
                            {reg.payment_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-white">
                          {formatCurrency(reg.total_price_cents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PortalCard>
        )}
      </div>
    </LmsGate>
  )
}
