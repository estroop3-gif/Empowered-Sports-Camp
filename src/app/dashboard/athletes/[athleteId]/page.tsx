'use client'

/**
 * Parent Athlete Detail Page
 *
 * View and edit individual athlete profiles from the parent dashboard.
 * - Profile photo upload
 * - Edit mode for modifying athlete information
 * - Registration/enrollment history
 * - Emergency contact management
 */

import { useState, useEffect, use, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/context'
import { STORAGE_FOLDERS } from '@/lib/storage/s3'
import {
  User,
  Calendar,
  GraduationCap,
  Heart,
  AlertTriangle,
  Phone,
  Crown,
  ArrowLeft,
  Loader2,
  Save,
  Edit,
  X,
  Camera,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  Shirt,
  Trophy,
  Users,
  Shield,
} from 'lucide-react'
import { AuthorizedPickupManager } from '@/components/athletes/AuthorizedPickupManager'

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
  emergency_contact_relationship: string | null
  photo_url: string | null
  primary_sport_interest: string | null
  secondary_sport_interest: string | null
  pickup_notes: string | null
  created_at: string
  updated_at: string
}

interface Registration {
  id: string
  athlete_id: string
  camp_id: string
  status: string
  payment_status: string
  notes: string | null
  created_at: string
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

const GRADE_OPTIONS = [
  'Pre-K',
  'Kindergarten',
  '1st Grade',
  '2nd Grade',
  '3rd Grade',
  '4th Grade',
  '5th Grade',
  '6th Grade',
  '7th Grade',
  '8th Grade',
  '9th Grade (Freshman)',
  '10th Grade (Sophomore)',
  '11th Grade (Junior)',
  '12th Grade (Senior)',
]

const TSHIRT_SIZES = [
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

const SPORTS_OPTIONS = [
  'Soccer',
  'Basketball',
  'Volleyball',
  'Flag Football',
  'Lacrosse',
  'Tennis',
  'Softball',
  'Track & Field',
  'Swimming',
  'Gymnastics',
  'Dance',
  'Martial Arts',
  'Other',
]

interface PageProps {
  params: Promise<{ athleteId: string }>
}

export default function ParentAthleteDetailPage({ params }: PageProps) {
  const { athleteId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get initial tab from URL query param
  const tabParam = searchParams.get('tab')
  const initialTab = tabParam === 'safety' ? 'safety' : tabParam === 'history' ? 'history' : 'profile'

  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Edit mode
  const [isEditMode, setIsEditMode] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Form state
  const [formData, setFormData] = useState<Partial<Athlete>>({})
  const [activeTab, setActiveTab] = useState<'profile' | 'safety' | 'history'>(initialTab)

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login')
      } else {
        loadAthlete()
      }
    }
  }, [user, authLoading, athleteId])

  const loadAthlete = async () => {
    if (!user?.id) return

    setLoading(true)
    setError(null)

    try {
      // Load athlete data
      const athleteRes = await fetch(`/api/athletes?action=byId&athleteId=${athleteId}`)
      const athleteData = await athleteRes.json()

      if (!athleteRes.ok || athleteData.error) {
        throw new Error(athleteData.error || 'Failed to load athlete')
      }

      // Verify this athlete belongs to the current user
      if (athleteData.data.parent_id !== user.id) {
        throw new Error('You do not have permission to view this athlete')
      }

      setAthlete(athleteData.data)
      setFormData(athleteData.data)

      // Load registrations by parent and filter to this athlete
      const regsRes = await fetch(`/api/registrations?action=byParent&parentId=${user.id}`)
      const regsData = await regsRes.json()

      if (regsRes.ok && regsData.data) {
        // Filter registrations for this specific athlete
        const athleteRegistrations = regsData.data.filter(
          (r: Registration) => r.athlete_id === athleteId
        )
        setRegistrations(athleteRegistrations)
      }
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
      const response = await fetch('/api/athletes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          athleteId,
          ...formData,
        }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to save changes')
      }

      setAthlete(data.data)
      setFormData(data.data)
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
      const updateResponse = await fetch('/api/athletes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          athleteId,
          photo_url: fileUrl,
        }),
      })

      if (!updateResponse.ok) {
        throw new Error('Failed to update athlete photo')
      }

      const data = await updateResponse.json()
      setAthlete(data.data)
      setFormData(data.data)
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

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neon" />
      </div>
    )
  }

  if (!athlete) {
    return (
      <div className="min-h-screen bg-black">
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center py-20">
            <User className="h-12 w-12 text-white/20 mx-auto mb-3" />
            <p className="text-lg font-bold text-white/60">{error || 'Athlete not found'}</p>
            <Button variant="outline-neon" className="mt-4" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const age = calculateAge(athlete.date_of_birth)

  // Split registrations into upcoming and past
  const today = new Date()
  const upcomingRegistrations = registrations.filter(
    (r) => r.camps && new Date(r.camps.start_date) >= today && r.status !== 'cancelled'
  )
  const pastRegistrations = registrations.filter(
    (r) => r.camps && (new Date(r.camps.end_date) < today || r.status === 'completed')
  )

  return (
    <div className="min-h-screen bg-black">
      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-neon transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Status Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-6 p-4 bg-neon/10 border border-neon/30 text-neon flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {successMessage}
          </div>
        )}

        {/* Profile Header with Photo */}
        <div className="bg-dark-100 border border-white/10 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Photo */}
            <div className="relative group">
              <div className="h-28 w-28 bg-neon/10 border-2 border-neon/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                {athlete.photo_url ? (
                  <Image
                    src={athlete.photo_url}
                    alt={`${athlete.first_name} ${athlete.last_name}`}
                    width={112}
                    height={112}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="font-black text-4xl text-neon">
                    {athlete.first_name[0]?.toUpperCase()}
                  </span>
                )}
              </div>
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
                    <span className="text-xs text-white mt-1">Change Photo</span>
                  </div>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            {/* Basic Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-wider text-white">
                    {athlete.first_name} {athlete.last_name}
                  </h1>
                  <p className="text-white/50 mt-1">
                    Age {age} {athlete.grade && `• ${athlete.grade}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {isEditMode ? (
                    <>
                      <Button variant="outline-white" size="sm" onClick={handleCancelEdit}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button variant="neon" size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline-neon" size="sm" onClick={() => setIsEditMode(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                <div>
                  <span className="text-white/40 text-xs uppercase tracking-wider">Registrations</span>
                  <p className="text-neon font-bold">{registrations.length} camps</p>
                </div>
                <div>
                  <span className="text-white/40 text-xs uppercase tracking-wider">Upcoming</span>
                  <p className="text-white font-bold">{upcomingRegistrations.length}</p>
                </div>
                <div>
                  <span className="text-white/40 text-xs uppercase tracking-wider">Completed</span>
                  <p className="text-white font-bold">{pastRegistrations.length}</p>
                </div>
                {athlete.tshirt_size && (
                  <div>
                    <span className="text-white/40 text-xs uppercase tracking-wider">Size</span>
                    <p className="text-white font-bold">{athlete.tshirt_size}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-white/10">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'safety', label: 'Medical & Emergency', icon: Heart },
            { id: 'history', label: 'Camp History', icon: Clock },
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
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-dark-100 border border-white/10">
              <div className="px-6 py-4 border-b border-neon/30">
                <h2 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                  <User className="h-4 w-4 text-neon" />
                  Basic Information
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">First Name</label>
                    {isEditMode ? (
                      <Input
                        value={formData.first_name || ''}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      />
                    ) : (
                      <p className="text-white py-2">{athlete.first_name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Last Name</label>
                    {isEditMode ? (
                      <Input
                        value={formData.last_name || ''}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      />
                    ) : (
                      <p className="text-white py-2">{athlete.last_name}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      Date of Birth
                    </label>
                    {isEditMode ? (
                      <Input
                        type="date"
                        value={formData.date_of_birth || ''}
                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      />
                    ) : (
                      <p className="text-white py-2">{formatDate(athlete.date_of_birth)}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Gender</label>
                    {isEditMode ? (
                      <select
                        value={formData.gender || ''}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value || null })}
                        className="w-full bg-black border border-white/20 text-white px-4 py-3 focus:border-neon focus:outline-none"
                      >
                        <option value="">Select...</option>
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="other">Other</option>
                      </select>
                    ) : (
                      <p className="text-white py-2">{athlete.gender || '—'}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                      <GraduationCap className="h-3 w-3 inline mr-1" />
                      Grade
                    </label>
                    {isEditMode ? (
                      <select
                        value={formData.grade || ''}
                        onChange={(e) => setFormData({ ...formData, grade: e.target.value || null })}
                        className="w-full bg-black border border-white/20 text-white px-4 py-3 focus:border-neon focus:outline-none"
                      >
                        <option value="">Select grade...</option>
                        {GRADE_OPTIONS.map((grade) => (
                          <option key={grade} value={grade}>
                            {grade}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-white py-2">{athlete.grade || '—'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">School</label>
                    {isEditMode ? (
                      <Input
                        value={formData.school || ''}
                        onChange={(e) => setFormData({ ...formData, school: e.target.value || null })}
                      />
                    ) : (
                      <p className="text-white py-2">{athlete.school || '—'}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    <Shirt className="h-3 w-3 inline mr-1" />
                    T-Shirt Size
                  </label>
                  {isEditMode ? (
                    <select
                      value={formData.tshirt_size || ''}
                      onChange={(e) => setFormData({ ...formData, tshirt_size: e.target.value || null })}
                      className="w-full bg-black border border-white/20 text-white px-4 py-3 focus:border-neon focus:outline-none"
                    >
                      <option value="">Select size...</option>
                      {TSHIRT_SIZES.map((size) => (
                        <option key={size.value} value={size.value}>
                          {size.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-white py-2">{athlete.tshirt_size || '—'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sports Interests */}
            <div className="bg-dark-100 border border-white/10">
              <div className="px-6 py-4 border-b border-purple/30">
                <h2 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-purple" />
                  Sports Interests
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Primary Sport</label>
                  {isEditMode ? (
                    <select
                      value={formData.primary_sport_interest || ''}
                      onChange={(e) => setFormData({ ...formData, primary_sport_interest: e.target.value || null })}
                      className="w-full bg-black border border-white/20 text-white px-4 py-3 focus:border-neon focus:outline-none"
                    >
                      <option value="">Select sport...</option>
                      {SPORTS_OPTIONS.map((sport) => (
                        <option key={sport} value={sport}>
                          {sport}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-white py-2">{athlete.primary_sport_interest || '—'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Secondary Sport</label>
                  {isEditMode ? (
                    <select
                      value={formData.secondary_sport_interest || ''}
                      onChange={(e) => setFormData({ ...formData, secondary_sport_interest: e.target.value || null })}
                      className="w-full bg-black border border-white/20 text-white px-4 py-3 focus:border-neon focus:outline-none"
                    >
                      <option value="">Select sport...</option>
                      {SPORTS_OPTIONS.map((sport) => (
                        <option key={sport} value={sport}>
                          {sport}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-white py-2">{athlete.secondary_sport_interest || '—'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'safety' && (
          <div className="space-y-6">
            {/* Emergency Contact */}
            <div className="bg-dark-100 border border-white/10">
              <div className="px-6 py-4 border-b border-magenta/30">
                <h2 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                  <Phone className="h-4 w-4 text-magenta" />
                  Emergency Contact
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Contact Name</label>
                  {isEditMode ? (
                    <Input
                      value={formData.emergency_contact_name || ''}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value || null })}
                      placeholder="Emergency contact name"
                    />
                  ) : (
                    <p className="text-white py-2">{athlete.emergency_contact_name || '—'}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Phone Number</label>
                    {isEditMode ? (
                      <Input
                        type="tel"
                        value={formData.emergency_contact_phone || ''}
                        onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value || null })}
                        placeholder="(555) 123-4567"
                      />
                    ) : (
                      <p className="text-white py-2">{athlete.emergency_contact_phone || '—'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Relationship</label>
                    {isEditMode ? (
                      <Input
                        value={formData.emergency_contact_relationship || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, emergency_contact_relationship: e.target.value || null })
                        }
                        placeholder="e.g. Grandmother, Uncle"
                      />
                    ) : (
                      <p className="text-white py-2">{athlete.emergency_contact_relationship || '—'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div className="bg-dark-100 border border-white/10">
              <div className="px-6 py-4 border-b border-magenta/30">
                <h2 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                  <Heart className="h-4 w-4 text-magenta" />
                  Medical Information
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    Allergies
                  </label>
                  {isEditMode ? (
                    <textarea
                      value={formData.allergies || ''}
                      onChange={(e) => setFormData({ ...formData, allergies: e.target.value || null })}
                      className="w-full bg-black border border-white/20 text-white px-4 py-3 focus:border-neon focus:outline-none min-h-[100px]"
                      placeholder="List any food, environmental, or medication allergies..."
                    />
                  ) : (
                    <p className="text-white py-2 whitespace-pre-wrap">{athlete.allergies || 'None listed'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Medical Notes</label>
                  {isEditMode ? (
                    <textarea
                      value={formData.medical_notes || ''}
                      onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value || null })}
                      className="w-full bg-black border border-white/20 text-white px-4 py-3 focus:border-neon focus:outline-none min-h-[100px]"
                      placeholder="Medical conditions, medications, special needs..."
                    />
                  ) : (
                    <p className="text-white py-2 whitespace-pre-wrap">{athlete.medical_notes || 'None listed'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Authorized Pickup List */}
            <div className="bg-dark-100 border border-white/10">
              <div className="px-6 py-4 border-b border-purple/30">
                <h2 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple" />
                  Authorized Pickup
                </h2>
              </div>
              <div className="p-6">
                <AuthorizedPickupManager
                  athleteId={athleteId}
                  athleteName={athlete.first_name}
                />
              </div>
            </div>

            {/* Additional Pickup Notes */}
            <div className="bg-dark-100 border border-white/10">
              <div className="px-6 py-4 border-b border-white/10">
                <h2 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-white/50" />
                  Additional Pickup Notes
                </h2>
              </div>
              <div className="p-6">
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    Special instructions or notes for pickup
                  </label>
                  {isEditMode ? (
                    <textarea
                      value={formData.pickup_notes || ''}
                      onChange={(e) => setFormData({ ...formData, pickup_notes: e.target.value || null })}
                      className="w-full bg-black border border-white/20 text-white px-4 py-3 focus:border-neon focus:outline-none min-h-[100px]"
                      placeholder="Any special pickup instructions or notes..."
                    />
                  ) : (
                    <p className="text-white py-2 whitespace-pre-wrap">{athlete.pickup_notes || 'None listed'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-dark-100 border border-white/10">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-white/50" />
                Camp History
              </h2>
            </div>
            <div className="p-6">
              {registrations.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-10 w-10 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40 mb-4">No camp registrations yet</p>
                  <Link href="/camps">
                    <Button variant="outline-neon">Browse Camps</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {registrations.map((reg) => {
                    if (!reg.camps) return null
                    const isPast = new Date(reg.camps.end_date) < today
                    return (
                      <div
                        key={reg.id}
                        className={cn(
                          'p-4 border transition-all',
                          isPast ? 'bg-black/30 border-white/5' : 'bg-black/50 border-white/10'
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={cn('font-bold', isPast ? 'text-white/70' : 'text-white')}>
                                {reg.camps.name}
                              </h4>
                              {reg.status === 'confirmed' || reg.status === 'registered' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-neon/10 text-neon text-xs font-bold uppercase tracking-wider border border-neon/30">
                                  <CheckCircle className="h-3 w-3" />
                                  Confirmed
                                </span>
                              ) : reg.status === 'pending_payment' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-magenta/10 text-magenta text-xs font-bold uppercase tracking-wider border border-magenta/30">
                                  <AlertTriangle className="h-3 w-3" />
                                  Payment Due
                                </span>
                              ) : reg.status === 'cancelled' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-400 text-xs font-bold uppercase tracking-wider border border-red-500/30">
                                  <XCircle className="h-3 w-3" />
                                  Cancelled
                                </span>
                              ) : isPast ? (
                                <span className="text-xs font-bold uppercase tracking-wider text-white/30">
                                  Completed
                                </span>
                              ) : null}
                            </div>
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
                            <p className={cn('font-black', isPast ? 'text-white/40' : 'text-neon')}>
                              {formatCurrency(reg.camps.price_cents)}
                            </p>
                            {reg.status === 'pending_payment' && !isPast && (
                              <Button variant="neon" size="sm" className="mt-2">
                                Pay Now
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Register for Camp CTA */}
        <div className="mt-8 bg-gradient-to-r from-neon/10 via-magenta/10 to-purple/10 border border-white/10 p-6 text-center">
          <Crown className="h-8 w-8 text-neon mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">Ready for More?</h3>
          <p className="text-sm text-white/50 mb-4">
            Register {athlete.first_name} for an upcoming camp and keep the momentum going!
          </p>
          <Link href="/camps">
            <Button variant="neon">Browse Camps</Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
