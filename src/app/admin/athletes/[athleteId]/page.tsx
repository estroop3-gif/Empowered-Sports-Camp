'use client'

/**
 * Admin Athlete Detail Page
 *
 * View and edit individual athlete profiles.
 * - Read-only mode by default
 * - Edit mode toggled via button
 * - Profile photo upload support
 * - Tabbed interface for different sections
 */

import { useState, useEffect, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { AuthorizedPickupManager } from '@/components/athletes/AuthorizedPickupManager'
import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/dropdown-menu'
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
  FileText,
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
  tenant_id: string | null
  parent_id: string
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
  internal_notes: string | null
  created_at: string
  updated_at: string
  parent?: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    phone: string | null
    city: string | null
    state: string | null
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
    emergency_contact_relationship: string | null
  }
  tenant?: {
    id: string
    name: string
    slug: string
  } | null
}

interface Registration {
  id: string
  camp_id: string
  camp_name: string
  camp_start_date: string
  camp_end_date: string
  venue_name: string | null
  city: string | null
  state: string | null
  status: string
  payment_status: string
  total_price_cents: number
  created_at: string
}

interface SquadMembership {
  squadId: string
  squadLabel: string
  campId: string
  campName: string
  campStartDate: string
  campEndDate: string
  status: string
  createdAt: string
  otherMembers: Array<{
    athleteId: string
    athleteName: string
    status: string
  }>
}

// Risk flag auto-detection and resolution
const computeAutoRisk = (athlete: Athlete): string => {
  if (athlete.medical_notes || athlete.allergies) return 'restricted'
  return 'none'
}

const RISK_LEVELS: Record<string, number> = { none: 0, monitor: 1, restricted: 2 }

const effectiveRisk = (manualFlag: string | null, autoFlag: string): string => {
  const manual = manualFlag || 'none'
  return (RISK_LEVELS[manual] || 0) >= (RISK_LEVELS[autoFlag] || 0) ? manual : autoFlag
}

interface PageProps {
  params: Promise<{ athleteId: string }>
}

export default function AdminAthleteDetailPage({ params }: PageProps) {
  const { athleteId } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [squadMemberships, setSquadMemberships] = useState<SquadMembership[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Edit mode toggle
  const [isEditMode, setIsEditMode] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Form state
  const [formData, setFormData] = useState<Partial<Athlete>>({})
  const [activeTab, setActiveTab] = useState<'profile' | 'safety' | 'sports' | 'internal' | 'history' | 'squads'>('profile')

  // Internal tab independent state
  const [internalRiskFlag, setInternalRiskFlag] = useState<string>('none')
  const [internalNotes, setInternalNotes] = useState<string>('')
  const [savingInternal, setSavingInternal] = useState(false)

  // Archive modal state
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  useEffect(() => {
    loadAthlete()
  }, [athleteId])

  // Sync internal tab state when athlete data loads/changes
  useEffect(() => {
    if (athlete) {
      setInternalRiskFlag(athlete.risk_flag || 'none')
      setInternalNotes(athlete.internal_notes || '')
    }
  }, [athlete])

  const loadAthlete = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/athletes/${athleteId}?includeRegistrations=true&includeSquads=true`, {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load athlete')
      }

      setAthlete(data.athlete)
      setFormData(data.athlete)
      setRegistrations(data.registrations || [])
      setSquadMemberships(data.squadMemberships || [])
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
      const response = await fetch(`/api/admin/athletes/${athleteId}`, {
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
    setArchiving(true)
    try {
      const response = await fetch(`/api/admin/athletes/${athleteId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to archive athlete')
      }

      if (data.hasUpcomingRegistrations) {
        setError('Warning: Athlete has upcoming camp registrations')
      }

      setShowArchiveModal(false)
      loadAthlete()
      setSuccessMessage('Athlete archived successfully')
    } catch (err) {
      console.error('Failed to archive:', err)
      setError((err as Error).message)
    }
    setArchiving(false)
  }

  const handleReactivate = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/athletes/${athleteId}?action=reactivate`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reactivate athlete')
      }

      loadAthlete()
      setSuccessMessage('Athlete reactivated successfully')
    } catch (err) {
      console.error('Failed to reactivate:', err)
      setError((err as Error).message)
    }
    setSaving(false)
  }

  const handleSaveInternal = async () => {
    setSavingInternal(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/athletes/${athleteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          risk_flag: internalRiskFlag === 'none' ? null : internalRiskFlag,
          internal_notes: internalNotes || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save')
      setAthlete(data.athlete)
      setFormData(data.athlete)
      setSuccessMessage('Internal info saved')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError((err as Error).message)
    }
    setSavingInternal(false)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setUploadingPhoto(true)
    setError(null)

    try {
      // Get presigned URL
      const urlResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          folder: STORAGE_FOLDERS.ATHLETE_PHOTOS,
        }),
      })

      if (!urlResponse.ok) {
        throw new Error('Failed to get upload URL')
      }

      const { uploadUrl, fileUrl } = await urlResponse.json()

      // Upload to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image')
      }

      // Update athlete with new photo URL
      const updateResponse = await fetch(`/api/admin/athletes/${athleteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_url: fileUrl }),
      })

      if (!updateResponse.ok) {
        throw new Error('Failed to update athlete photo')
      }

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
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--
    }
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
      <AdminLayout userRole="hq_admin" userName={userName}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-neon" />
        </div>
      </AdminLayout>
    )
  }

  if (!athlete) {
    return (
      <AdminLayout userRole="hq_admin" userName={userName}>
        <div className="text-center py-20">
          <User className="h-12 w-12 text-white/20 mx-auto mb-3" />
          <p className="text-lg font-bold text-white/60">Athlete not found</p>
          <Button variant="outline-neon" className="mt-4" onClick={() => router.push('/admin/athletes')}>
            Back to Athletes
          </Button>
        </div>
      </AdminLayout>
    )
  }

  const age = calculateAge(athlete.date_of_birth)
  const parentName = [athlete.parent?.first_name, athlete.parent?.last_name].filter(Boolean).join(' ') || 'Unknown'
  const isMale = athlete.gender?.toLowerCase() === 'male'

  // Computed risk
  const autoRisk = computeAutoRisk(athlete)
  const displayRisk = effectiveRisk(athlete.risk_flag, autoRisk)

  // Emergency contact fallback
  const ecName = athlete.emergency_contact_name || athlete.parent?.emergency_contact_name || null
  const ecPhone = athlete.emergency_contact_phone || athlete.parent?.emergency_contact_phone || null
  const ecRelationship = athlete.emergency_contact_relationship || athlete.parent?.emergency_contact_relationship || null
  const ecIsFromParent = !athlete.emergency_contact_name && !!athlete.parent?.emergency_contact_name

  // Render field - shows input in edit mode, text in view mode
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
              className="w-full bg-black border border-white/20 text-white px-4 py-3 focus:border-neon focus:outline-none min-h-[100px]"
            />
          ) : type === 'select' && options ? (
            <select
              value={(formData[field] as string) || ''}
              onChange={(e) => setFormData({ ...formData, [field]: e.target.value || null })}
              className="w-full bg-black border border-white/20 text-white px-4 py-3 focus:border-neon focus:outline-none"
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
            />
          )
        ) : (
          <p className="text-white py-2">{displayValue}</p>
        )}
      </div>
    )
  }

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <PageHeader
        title={`${athlete.first_name} ${athlete.last_name}`}
        description={`Age ${age} • ${athlete.grade || 'Grade not set'} • ${athlete.tenant?.name || 'No territory'}`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Athletes', href: '/admin/athletes' },
          { label: `${athlete.first_name} ${athlete.last_name}` },
        ]}
      >
        <div className="flex items-center gap-3">
          <Button variant="outline-white" size="sm" onClick={() => router.push('/admin/athletes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {isEditMode ? (
            <>
              <Button variant="outline-white" size="sm" onClick={handleCancelEdit}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button variant="neon" size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline-neon" size="sm" onClick={() => setIsEditMode(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              {athlete.is_active ? (
                <Button variant="outline-white" size="sm" onClick={() => setShowArchiveModal(true)}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </Button>
              ) : (
                <Button variant="outline-neon" size="sm" onClick={handleReactivate} disabled={saving}>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Reactivate
                </Button>
              )}
            </>
          )}
        </div>
      </PageHeader>

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

      {/* Status Badge */}
      {!athlete.is_active && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 flex items-center gap-2">
          <Archive className="h-4 w-4 text-amber-400" />
          <span className="text-amber-400 font-medium">This athlete is archived</span>
        </div>
      )}

      {/* Profile Header with Photo */}
      <ContentCard className="mb-6">
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
                    <span className="text-xs text-white mt-1">Upload Photo</span>
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
              {displayRisk && displayRisk !== 'none' && (
                <span className={cn(
                  "px-2 py-1 text-xs font-bold uppercase flex items-center gap-1",
                  displayRisk === 'monitor'
                    ? "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                    : "bg-red-500/10 border border-red-500/30 text-red-400"
                )}>
                  <ShieldAlert className="h-3 w-3" />
                  {displayRisk === 'restricted' ? 'High Risk' : displayRisk}
                </span>
              )}
              {isMale && (
                <span className="px-2 py-1 text-xs font-bold uppercase bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Male Athlete
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

            {athlete.tenant && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <span className="text-white/40 text-xs uppercase tracking-wider">Territory</span>
                <p className="text-white">{athlete.tenant.name}</p>
              </div>
            )}
          </div>
        </div>
      </ContentCard>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-white/10 overflow-x-auto">
        {[
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'safety', label: 'Contact & Safety', icon: Heart },
          { id: 'sports', label: 'Sports & Preferences', icon: Trophy },
          { id: 'squads', label: 'Squad Pairings', icon: Users },
          { id: 'internal', label: 'Internal', icon: ShieldAlert },
          { id: 'history', label: 'Enrollment History', icon: Clock },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-[1px]',
              activeTab === tab.id
                ? 'text-neon border-neon'
                : 'text-white/60 border-transparent hover:text-white hover:border-white/20'
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
          <ContentCard title="Basic Information">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {renderField('First Name', athlete.first_name, 'first_name')}
                {renderField('Last Name', athlete.last_name, 'last_name')}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {renderField(
                  'Date of Birth',
                  athlete.date_of_birth,
                  'date_of_birth',
                  <Calendar className="h-3 w-3 inline mr-1" />,
                  'date'
                )}
                {renderField(
                  'Gender',
                  athlete.gender,
                  'gender',
                  undefined,
                  'select',
                  [
                    { value: '', label: 'Select...' },
                    { value: 'female', label: 'Female' },
                    { value: 'male', label: 'Male' },
                    { value: 'other', label: 'Other' },
                    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
                  ]
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {renderField(
                  'Grade Level',
                  athlete.grade,
                  'grade',
                  <GraduationCap className="h-3 w-3 inline mr-1" />,
                  'select',
                  [
                    { value: '', label: 'Select...' },
                    { value: 'Pre-K', label: 'Pre-K' },
                    { value: 'Kindergarten', label: 'Kindergarten' },
                    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => ({
                      value: `${g}${g === 1 ? 'st' : g === 2 ? 'nd' : g === 3 ? 'rd' : 'th'} Grade`,
                      label: `${g}${g === 1 ? 'st' : g === 2 ? 'nd' : g === 3 ? 'rd' : 'th'} Grade`,
                    })),
                  ]
                )}
                {renderField('School', athlete.school, 'school')}
              </div>
            </div>
          </ContentCard>

          <ContentCard title="Parent/Guardian">
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
                {(athlete.parent?.city || athlete.parent?.state) && (
                  <p className="text-sm text-white/60 flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    {[athlete.parent?.city, athlete.parent?.state].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
              <p className="text-xs text-white/40">
                Parent information is read-only. Parents can update their own profile.
              </p>
            </div>
          </ContentCard>
        </div>
      )}

      {activeTab === 'safety' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ContentCard title="Emergency Contact">
            <div className="space-y-4">
              {isEditMode ? (
                <>
                  {renderField('Contact Name', athlete.emergency_contact_name, 'emergency_contact_name')}
                  {renderField('Phone Number', athlete.emergency_contact_phone, 'emergency_contact_phone')}
                  {renderField('Relationship', athlete.emergency_contact_relationship, 'emergency_contact_relationship')}
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Contact Name</label>
                    <p className="text-white py-2">{ecName || '—'}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Phone Number</label>
                    <p className="text-white py-2">{ecPhone || '—'}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Relationship</label>
                    <p className="text-white py-2">{ecRelationship || '—'}</p>
                  </div>
                  {ecIsFromParent && (
                    <p className="text-xs text-amber-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Using parent profile emergency contact (no athlete-level data)
                    </p>
                  )}
                </>
              )}
            </div>
          </ContentCard>

          <ContentCard title="Medical Information">
            <div className="space-y-4">
              {renderField(
                'Allergies',
                athlete.allergies,
                'allergies',
                <AlertTriangle className="h-3 w-3 inline mr-1" />,
                'textarea'
              )}
              {renderField(
                'Medical Notes',
                athlete.medical_notes,
                'medical_notes',
                <Heart className="h-3 w-3 inline mr-1" />,
                'textarea'
              )}
              {renderField(
                'Pickup Notes',
                athlete.pickup_notes,
                'pickup_notes',
                <Users className="h-3 w-3 inline mr-1" />,
                'textarea'
              )}
            </div>
          </ContentCard>

          <div className="lg:col-span-2">
            <ContentCard title="Authorized Pickups">
              <AuthorizedPickupManager
                athleteId={athleteId}
                athleteName={`${athlete.first_name} ${athlete.last_name}`}
                readOnly={true}
              />
            </ContentCard>
          </div>
        </div>
      )}

      {activeTab === 'sports' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ContentCard title="Sport Interests">
            <div className="space-y-4">
              {renderField(
                'Primary Sport Interest',
                athlete.primary_sport_interest,
                'primary_sport_interest',
                <Trophy className="h-3 w-3 inline mr-1" />
              )}
              {renderField('Secondary Sport Interest', athlete.secondary_sport_interest, 'secondary_sport_interest')}
            </div>
          </ContentCard>

          <ContentCard title="Preferences">
            <div className="space-y-4">
              {renderField(
                'T-Shirt Size',
                athlete.t_shirt_size,
                't_shirt_size',
                <Shirt className="h-3 w-3 inline mr-1" />,
                'select',
                [
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
                ]
              )}
              {renderField(
                'Jersey Number Preference',
                athlete.jersey_number_preference,
                'jersey_number_preference',
                <Hash className="h-3 w-3 inline mr-1" />
              )}
            </div>
          </ContentCard>
        </div>
      )}

      {activeTab === 'internal' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ContentCard title="Risk Assessment" accent="magenta">
            <div className="space-y-4">
              {/* Auto-detected risk banner */}
              {autoRisk !== 'none' && (
                <div className="p-3 bg-red-500/10 border border-red-500/30">
                  <p className="text-xs text-red-400 font-bold uppercase mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Auto-Detected: {autoRisk}
                  </p>
                  <p className="text-xs text-white/60">
                    This athlete has {athlete.medical_notes ? 'medical notes' : ''}{athlete.medical_notes && athlete.allergies ? ' and ' : ''}{athlete.allergies ? 'allergies' : ''} on file. Risk flag auto-set to restricted.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  <ShieldAlert className="h-3 w-3 inline mr-1" />
                  Manual Risk Flag
                </label>
                <select
                  value={internalRiskFlag}
                  onChange={(e) => setInternalRiskFlag(e.target.value)}
                  className="w-full bg-black border border-white/20 text-white px-4 py-3 focus:border-neon focus:outline-none"
                >
                  <option value="none">None</option>
                  <option value="monitor">Monitor</option>
                  <option value="restricted">Restricted</option>
                </select>
                <p className="text-xs text-white/40 mt-2">
                  Risk flags are visible to staff only and help identify athletes requiring additional attention.
                </p>
              </div>

              {/* Effective risk display */}
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Effective Risk Level</label>
                <div className="py-2">
                  {displayRisk !== 'none' ? (
                    <span className={cn(
                      "px-3 py-1 text-sm font-bold uppercase flex items-center gap-2 w-fit",
                      displayRisk === 'monitor'
                        ? "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                        : "bg-red-500/10 border border-red-500/30 text-red-400"
                    )}>
                      <ShieldAlert className="h-4 w-4" />
                      {displayRisk === 'restricted' ? 'High Risk (Restricted)' : 'Monitor'}
                    </span>
                  ) : (
                    <span className="text-white/60">No risk flag</span>
                  )}
                </div>
                <p className="text-xs text-white/40">
                  The higher of auto-detected and manual flag is used.
                </p>
              </div>

              <div className="p-3 bg-magenta/10 border border-magenta/30">
                <p className="text-xs text-magenta font-bold uppercase mb-1">Staff Only</p>
                <p className="text-xs text-white/60">
                  This information is never visible to parents or athletes.
                </p>
              </div>
            </div>
          </ContentCard>

          <ContentCard title="Internal Notes" accent="magenta">
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  <FileText className="h-3 w-3 inline mr-1" />
                  Staff Notes
                </label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Internal notes about this athlete (staff only)..."
                  className="w-full bg-black border border-white/20 text-white px-4 py-3 focus:border-neon focus:outline-none min-h-[200px]"
                />
              </div>

              <Button
                variant="neon"
                size="sm"
                onClick={handleSaveInternal}
                disabled={savingInternal}
                className="w-full"
              >
                {savingInternal ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Internal Info
              </Button>
            </div>
          </ContentCard>
        </div>
      )}

      {activeTab === 'history' && (
        <ContentCard title="Enrollment History">
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
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Location</th>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Payment</th>
                    <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg) => (
                    <tr key={reg.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3">
                        <span className="font-medium text-white">{reg.camp_name}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-white/60">
                        {formatDate(reg.camp_start_date)} - {formatDate(reg.camp_end_date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/60">
                        {reg.venue_name ? (
                          <>
                            {reg.venue_name}
                            {reg.city && `, ${reg.city}`}
                          </>
                        ) : (
                          '—'
                        )}
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
                          reg.payment_status === 'refunded' && "text-white/40",
                        )}>
                          {reg.payment_status === 'paid' && <CheckCircle className="h-3 w-3" />}
                          {reg.payment_status === 'pending' && <Clock className="h-3 w-3" />}
                          {reg.payment_status === 'refunded' && <XCircle className="h-3 w-3" />}
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
        </ContentCard>
      )}

      {activeTab === 'squads' && (
        <ContentCard title="Squad Pairings" accent="purple">
          {squadMemberships.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-10 w-10 text-white/20 mx-auto mb-3" />
              <p className="text-white/40">No squad pairings found</p>
              <p className="text-xs text-white/30 mt-2">
                Squad pairings are created when parents request to group athletes together for camps.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {squadMemberships.map((squad) => (
                <div
                  key={`${squad.squadId}-${squad.campId}`}
                  className="p-4 bg-black/50 border border-white/10"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h4 className="font-bold text-white">{squad.campName}</h4>
                      <p className="text-xs text-white/40 mt-1">
                        {formatDate(squad.campStartDate)} - {formatDate(squad.campEndDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/40">Squad:</span>
                      <span className="text-sm font-semibold text-purple">{squad.squadLabel}</span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div className="mb-3">
                    <span className={cn(
                      "px-2 py-1 text-xs font-bold uppercase",
                      squad.status === 'accepted' && "bg-neon/10 text-neon border border-neon/30",
                      squad.status === 'requested' && "bg-amber-500/10 text-amber-400 border border-amber-500/30",
                      squad.status === 'declined' && "bg-red-500/10 text-red-400 border border-red-500/30",
                    )}>
                      {squad.status === 'accepted' ? 'Accepted' : squad.status === 'requested' ? 'Pending' : 'Declined'}
                    </span>
                  </div>

                  {/* Other members */}
                  {squad.otherMembers.length > 0 && (
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Squad Members</p>
                      <div className="flex flex-wrap gap-2">
                        {squad.otherMembers.map((member) => (
                          <div
                            key={member.athleteId}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10"
                          >
                            <span className="text-sm text-white">{member.athleteName}</span>
                            <span className={cn(
                              "text-xs",
                              member.status === 'accepted' ? "text-neon" : member.status === 'requested' ? "text-amber-400" : "text-red-400"
                            )}>
                              {member.status === 'accepted' && <CheckCircle className="h-3 w-3" />}
                              {member.status === 'requested' && <Clock className="h-3 w-3" />}
                              {member.status === 'declined' && <XCircle className="h-3 w-3" />}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {squad.otherMembers.length === 0 && (
                    <p className="text-xs text-white/40 italic">No other members in this squad yet.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ContentCard>
      )}

      {/* Archive Confirmation Modal */}
      <Modal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        title="Archive Athlete"
      >
        <div className="space-y-4">
          <p className="text-white/60">
            Are you sure you want to archive <strong className="text-white">{athlete.first_name} {athlete.last_name}</strong>?
          </p>
          <p className="text-sm text-amber-400">
            <AlertTriangle className="h-4 w-4 inline mr-1" />
            Archived athletes cannot be registered for new camps. You can reactivate them later.
          </p>
          <div className="flex gap-3 pt-4">
            <Button variant="outline-white" className="flex-1" onClick={() => setShowArchiveModal(false)}>
              Cancel
            </Button>
            <Button
              variant="neon"
              className="flex-1 bg-red-500 hover:bg-red-600 border-red-500"
              onClick={handleArchive}
              disabled={archiving}
            >
              {archiving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Archive'}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}
