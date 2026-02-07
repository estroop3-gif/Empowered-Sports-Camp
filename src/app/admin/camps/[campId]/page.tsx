'use client'

import { useState, useEffect, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Clock,
  Save,
  Trash2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Shield,
  ImagePlus,
  Search,
  ChevronDown,
  X,
  Building2,
  Check,
  Plus,
} from 'lucide-react'
import { CampWaiverSelector } from '@/components/waivers/CampWaiverSelector'
import { AddProgramTypeModal } from '@/components/admin/camps/AddProgramTypeModal'
import { useUpload, STORAGE_FOLDERS } from '@/lib/storage/use-upload'

// Types (defined locally to avoid Prisma imports in client component)
interface AdminCamp {
  id: string
  name: string
  slug: string
  description: string | null
  sport: string | null
  start_date: string
  end_date: string
  start_time: string | null
  end_time: string | null
  age_min: number
  age_max: number
  capacity: number
  price: number
  early_bird_price: number | null
  early_bird_deadline: string | null
  status: string
  featured: boolean
  image_url: string | null
  tenant_id: string
  location_id: string | null
}

interface CampFormData {
  name: string
  slug: string
  description: string
  sport: string
  program_type: string
  location_id: string | null
  venue_id: string | null
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  age_min: number
  age_max: number
  capacity: number
  price: number
  early_bird_price: number | null
  early_bird_deadline: string | null
  status: 'draft' | 'published' | 'open' | 'closed'
  featured: boolean
  image_url: string | null
}

interface ProgramTagOption {
  slug: string
  name: string
}

interface Venue {
  id: string
  name: string
  short_name: string | null
  city: string
  state: string
  facility_type: string | null
  indoor_outdoor: string | null
  tenant_id: string | null
  is_global: boolean
}

interface Location {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  tenant_id: string
}

const SPORTS = [
  'Multi-Sport',
  'Basketball',
  'Soccer',
  'Volleyball',
  'Flag Football',
  'Lacrosse',
  'Tennis',
  'Softball',
  'Track & Field',
  'Swimming',
]

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', description: 'Not visible to public' },
  { value: 'published', label: 'Published', description: 'Visible but registration closed' },
  { value: 'open', label: 'Open', description: 'Accepting registrations' },
  { value: 'closed', label: 'Closed', description: 'Registration ended' },
]

export default function AdminEditCampPage({ params }: { params: Promise<{ campId: string }> }) {
  const { campId } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [camp, setCamp] = useState<AdminCamp | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [programTagOptions, setProgramTagOptions] = useState<ProgramTagOption[]>([])
  const [showAddProgramTypeModal, setShowAddProgramTypeModal] = useState(false)

  // Venue search dropdown state
  const [venueSearchQuery, setVenueSearchQuery] = useState('')
  const [venueDropdownOpen, setVenueDropdownOpen] = useState(false)
  const venueDropdownRef = useRef<HTMLDivElement>(null)

  // Image upload state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { upload, uploading, progress, error: uploadError } = useUpload()
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const [formData, setFormData] = useState<CampFormData>({
    name: '',
    slug: '',
    description: '',
    sport: 'Multi-Sport',
    program_type: 'all_girls_sports_camp',
    location_id: null,
    venue_id: null,
    start_date: '',
    end_date: '',
    start_time: '09:00',
    end_time: '15:00',
    age_min: 6,
    age_max: 12,
    capacity: 40,
    price: 299,
    early_bird_price: null,
    early_bird_deadline: null,
    status: 'draft',
    featured: false,
    image_url: null,
  })

  // Close venue dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (venueDropdownRef.current && !venueDropdownRef.current.contains(event.target as Node)) {
        setVenueDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter venues based on search query
  const filteredVenues = venues.filter(venue => {
    if (!venueSearchQuery) return true
    const query = venueSearchQuery.toLowerCase()
    return (
      venue.name.toLowerCase().includes(query) ||
      venue.city.toLowerCase().includes(query) ||
      venue.state.toLowerCase().includes(query) ||
      (venue.short_name && venue.short_name.toLowerCase().includes(query))
    )
  })

  const selectedVenue = venues.find(v => v.id === formData.venue_id)

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be less than 5MB'); return }
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
    const result = await upload(file, { folder: STORAGE_FOLDERS.CAMP_IMAGES })
    if (result) {
      setFormData(prev => ({ ...prev, image_url: result.fileUrl }))
    }
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    setFormData(prev => ({ ...prev, image_url: null }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  useEffect(() => {
    if (user) {
      loadCamp()
    }
  }, [user, campId])

  async function loadCamp() {
    if (!user) {
      setError('Not authenticated')
      return
    }
    try {
      // Fetch user role from API
      const roleResponse = await fetch('/api/admin/camps/user-role')
      if (!roleResponse.ok) {
        const errorData = await roleResponse.json()
        setError(errorData.error || 'Not authenticated')
        setLoading(false)
        return
      }
      const roleData = await roleResponse.json()
      setUserRole(roleData.role)

      // Fetch camp data from API
      const campResponse = await fetch(`/api/admin/camps/${campId}`)
      if (!campResponse.ok) {
        const errorData = await campResponse.json()
        setError(errorData.error || 'Camp not found')
        setLoading(false)
        return
      }
      const { camp: campData } = await campResponse.json()

      // Fetch program tag options
      fetch('/api/program-tags')
        .then(r => r.ok ? r.json() : null)
        .then(json => { if (json?.data) setProgramTagOptions(json.data) })
        .catch(() => {})

      setCamp(campData)
      setFormData({
        name: campData.name,
        slug: campData.slug,
        description: campData.description || '',
        sport: campData.sport || 'Multi-Sport',
        program_type: campData.program_type || 'all_girls_sports_camp',
        location_id: campData.location_id,
        venue_id: campData.venue_id || null,
        start_date: campData.start_date,
        end_date: campData.end_date,
        start_time: campData.start_time || '09:00',
        end_time: campData.end_time || '15:00',
        age_min: campData.age_min,
        age_max: campData.age_max,
        capacity: campData.capacity,
        price: campData.price / 100,
        early_bird_price: campData.early_bird_price ? campData.early_bird_price / 100 : null,
        early_bird_deadline: campData.early_bird_deadline,
        status: campData.status as 'draft' | 'published' | 'open' | 'closed',
        featured: campData.featured,
        image_url: campData.image_url,
      })

      // Set image preview if camp has an image
      if (campData.image_url) {
        setImagePreview(campData.image_url)
      }

      // Fetch locations from API
      if (campData.tenant_id) {
        const locationsResponse = await fetch(`/api/admin/camps/locations?tenantId=${campData.tenant_id}`)
        if (locationsResponse.ok) {
          const locationsData = await locationsResponse.json()
          setLocations(locationsData.locations || [])
        }
      }

      // Fetch venues
      const venueUrl = campData.tenant_id
        ? `/api/admin/camps/venues?tenantId=${campData.tenant_id}`
        : '/api/admin/camps/venues'
      const venuesResponse = await fetch(venueUrl)
      if (venuesResponse.ok) {
        const venuesData = await venuesResponse.json()
        setVenues(venuesData.venues || [])
      }
    } catch (err) {
      console.error('Failed to load camp:', err)
      setError('Failed to load camp')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/camps/${campId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update camp')
      }

      router.push('/admin/camps')
    } catch (err) {
      console.error('Failed to update camp:', err)
      setError(err instanceof Error ? err.message : 'Failed to update camp')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this camp? This cannot be undone.')) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/camps/${campId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete camp')
      }

      router.push('/admin/camps')
    } catch (err) {
      console.error('Failed to delete camp:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete camp')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout userRole="hq_admin" userName="Admin">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-neon" />
        </div>
      </AdminLayout>
    )
  }

  if (!camp) {
    return (
      <AdminLayout userRole="hq_admin" userName="Admin">
        <div className="text-center py-20">
          <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Camp Not Found</h2>
          <p className="text-white/50 mb-6">{error || 'The requested camp could not be found.'}</p>
          <Link
            href="/admin/camps"
            className="inline-flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Camps
          </Link>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      userRole={userRole as 'hq_admin' | 'licensee_owner' || 'hq_admin'}
      userName="Admin"
    >
      <AddProgramTypeModal
        open={showAddProgramTypeModal}
        onClose={() => setShowAddProgramTypeModal(false)}
        onCreated={(tag) => {
          setProgramTagOptions(prev => [...prev, tag])
          setFormData(prev => ({ ...prev, program_type: tag.slug }))
        }}
      />
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/admin/camps"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-neon transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Camps
        </Link>
        <a
          href={`/camps/${camp.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-neon hover:text-neon/80 transition-colors"
        >
          View Public Page
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <PageHeader title={`Edit: ${camp.name}`} description="Update camp details and settings" />

      {error && (
        <div className="mb-6 p-4 bg-magenta/10 border border-magenta/30 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-magenta flex-shrink-0" />
          <p className="text-magenta">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <ContentCard title="Basic Information" accent="neon">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Camp Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    URL Slug
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40">/camps/</span>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                      className="flex-1 px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Program Type
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={formData.program_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, program_type: e.target.value }))}
                      className="flex-1 px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                    >
                      {programTagOptions.length > 0 ? (
                        programTagOptions.map(tag => (
                          <option key={tag.slug} value={tag.slug}>{tag.name}</option>
                        ))
                      ) : (
                        <option value="all_girls_sports_camp">All-Girls Sports Camp</option>
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowAddProgramTypeModal(true)}
                      className="px-3 py-3 bg-neon/10 border border-neon/30 text-neon hover:bg-neon/20 transition-colors shrink-0"
                      title="Add new program type"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Sport(s) Offered
                  </label>
                  <select
                    value={formData.sport}
                    onChange={(e) => setFormData(prev => ({ ...prev, sport: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                  >
                    {SPORTS.map(sport => (
                      <option key={sport} value={sport}>{sport}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none resize-none"
                  />
                </div>
              </div>
            </ContentCard>

            {/* Camp Photo */}
            <ContentCard title="Camp Photo" accent="purple">
              <div className="space-y-4">
                <p className="text-sm text-white/60">
                  <ImagePlus className="h-4 w-4 inline mr-2" />
                  Upload a main photo for this camp. This will be displayed on the camp listing page.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />

                {imagePreview || formData.image_url ? (
                  <div className="relative aspect-video w-full max-w-md overflow-hidden border border-white/20">
                    <Image
                      src={imagePreview || formData.image_url || ''}
                      alt="Camp preview"
                      fill
                      className="object-cover"
                    />
                    {uploading && (
                      <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                        <Loader2 className="h-8 w-8 text-neon animate-spin mb-2" />
                        <span className="text-white text-sm">{progress}%</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={uploading}
                      className="absolute top-2 right-2 p-2 bg-black/80 text-white hover:bg-magenta/80 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full max-w-md aspect-video flex flex-col items-center justify-center border-2 border-dashed border-white/20 hover:border-purple/50 transition-colors bg-white/5 cursor-pointer"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-10 w-10 text-purple animate-spin mb-3" />
                        <span className="text-white/50">Uploading... {progress}%</span>
                      </>
                    ) : (
                      <>
                        <ImagePlus className="h-10 w-10 text-white/30 mb-3" />
                        <span className="text-white/50 text-sm font-medium">Click to upload camp photo</span>
                        <span className="text-white/30 text-xs mt-1">PNG, JPG up to 5MB</span>
                      </>
                    )}
                  </button>
                )}

                {uploadError && (
                  <p className="text-sm text-magenta">{uploadError}</p>
                )}
              </div>
            </ContentCard>

            {/* Venue */}
            <ContentCard title="Venue" accent="magenta">
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                  <MapPin className="h-4 w-4 inline mr-2" />
                  Select Venue
                </label>

                <div className="relative" ref={venueDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setVenueDropdownOpen(!venueDropdownOpen)}
                    className={`w-full px-4 py-3 bg-black border text-left flex items-center justify-between transition-colors ${
                      venueDropdownOpen ? 'border-magenta' : 'border-white/20'
                    } hover:border-white/40`}
                  >
                    {selectedVenue ? (
                      <div className="flex items-center gap-3 min-w-0">
                        <Building2 className="h-4 w-4 text-magenta flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="text-white truncate block">{selectedVenue.name}</span>
                          <span className="text-white/50 text-sm">{selectedVenue.city}, {selectedVenue.state}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-white/40">Search and select a venue...</span>
                    )}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {selectedVenue && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation()
                            setFormData(prev => ({ ...prev, venue_id: null }))
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation()
                              setFormData(prev => ({ ...prev, venue_id: null }))
                            }
                          }}
                          className="p-1 hover:bg-white/10 rounded cursor-pointer"
                        >
                          <X className="h-4 w-4 text-white/40 hover:text-white" />
                        </span>
                      )}
                      <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${venueDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {venueDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setVenueDropdownOpen(false)} />
                      <div className="absolute z-[70] w-full mt-1 bg-dark-100 border border-white/20 shadow-2xl">
                        <div className="p-3 border-b border-white/10">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                            <input
                              type="text"
                              value={venueSearchQuery}
                              onChange={(e) => setVenueSearchQuery(e.target.value)}
                              placeholder="Search venues..."
                              className="w-full pl-10 pr-4 py-2 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-magenta focus:outline-none text-sm"
                              autoFocus
                            />
                          </div>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto">
                          {filteredVenues.length === 0 ? (
                            <div className="p-4 text-center text-white/40 text-sm">
                              {venueSearchQuery ? 'No venues match your search' : 'No venues available'}
                            </div>
                          ) : (
                            filteredVenues.map(venue => (
                              <button
                                key={venue.id}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, venue_id: venue.id }))
                                  setVenueDropdownOpen(false)
                                  setVenueSearchQuery('')
                                }}
                                className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-white/5 transition-colors ${
                                  formData.venue_id === venue.id ? 'bg-magenta/10' : ''
                                }`}
                              >
                                <Building2 className={`h-4 w-4 flex-shrink-0 ${formData.venue_id === venue.id ? 'text-magenta' : 'text-white/40'}`} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-medium ${formData.venue_id === venue.id ? 'text-magenta' : 'text-white'}`}>
                                      {venue.name}
                                    </span>
                                    {venue.is_global && (
                                      <span className="px-1.5 py-0.5 text-xs bg-purple/20 text-purple uppercase tracking-wider">Global</span>
                                    )}
                                  </div>
                                  <div className="text-sm text-white/50 flex items-center gap-2">
                                    <span>{venue.city}, {venue.state}</span>
                                    {venue.facility_type && (
                                      <>
                                        <span className="text-white/20">·</span>
                                        <span className="capitalize">{venue.facility_type.replace(/_/g, ' ')}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                {formData.venue_id === venue.id && (
                                  <Check className="h-4 w-4 text-magenta flex-shrink-0" />
                                )}
                              </button>
                            ))
                          )}
                        </div>

                        <div className="p-3 border-t border-white/10">
                          <Link href="/admin/venues/new" className="flex items-center gap-2 text-sm text-neon hover:underline">
                            <MapPin className="h-4 w-4" />
                            Add a new venue
                          </Link>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </ContentCard>

            <ContentCard title="Schedule" accent="purple">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-purple focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-purple focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    <Clock className="h-4 w-4 inline mr-2" />
                    Daily Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-purple focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    <Clock className="h-4 w-4 inline mr-2" />
                    Daily End Time
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-purple focus:outline-none"
                  />
                </div>
              </div>
            </ContentCard>

            <ContentCard title="Eligibility & Capacity" accent="neon">
              <div className="grid gap-6 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    <Users className="h-4 w-4 inline mr-2" />
                    Min Age *
                  </label>
                  <input
                    type="number"
                    required
                    min={4}
                    max={18}
                    value={formData.age_min}
                    onChange={(e) => setFormData(prev => ({ ...prev, age_min: parseInt(e.target.value) || 5 }))}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Max Age *
                  </label>
                  <input
                    type="number"
                    required
                    min={4}
                    max={18}
                    value={formData.age_max}
                    onChange={(e) => setFormData(prev => ({ ...prev, age_max: parseInt(e.target.value) || 14 }))}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Max Capacity *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={500}
                    value={formData.capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 40 }))}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                  />
                </div>
              </div>
            </ContentCard>

            <ContentCard title="Pricing" accent="magenta">
              <div className="grid gap-6 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    <DollarSign className="h-4 w-4 inline mr-2" />
                    Base Price *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">$</span>
                    <input
                      type="number"
                      required
                      min={0}
                      step={1}
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-8 pr-4 py-3 bg-black border border-white/20 text-white focus:border-magenta focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Early Bird Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">$</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={formData.early_bird_price || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        early_bird_price: e.target.value ? parseFloat(e.target.value) : null
                      }))}
                      placeholder="Optional"
                      className="w-full pl-8 pr-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-magenta focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Early Bird Deadline
                  </label>
                  <input
                    type="date"
                    value={formData.early_bird_deadline || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, early_bird_deadline: e.target.value || null }))}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-magenta focus:outline-none"
                  />
                </div>
              </div>
            </ContentCard>

            <ContentCard title="Required Waivers" accent="purple">
              <div className="mb-4">
                <p className="text-sm text-white/60">
                  <Shield className="h-4 w-4 inline mr-2" />
                  Assign waiver templates that must be signed before registration is complete.
                </p>
              </div>
              <CampWaiverSelector campId={campId} />
            </ContentCard>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-44 space-y-6">
              <ContentCard title="Publishing" accent="neon">
                <div className="space-y-4">
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Camp Status
                  </label>
                  <div className="space-y-2">
                    {STATUS_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-start gap-3 p-4 cursor-pointer border transition-all ${
                          formData.status === option.value
                            ? 'border-neon bg-neon/10'
                            : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        <input
                          type="radio"
                          name="status"
                          value={option.value}
                          checked={formData.status === option.value}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            status: e.target.value as 'draft' | 'published' | 'open' | 'closed'
                          }))}
                          className="mt-1"
                        />
                        <div>
                          <div className={`font-bold ${formData.status === option.value ? 'text-neon' : 'text-white'}`}>
                            {option.label}
                          </div>
                          <div className="text-sm text-white/50">{option.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                      className="w-5 h-5"
                    />
                    <div>
                      <div className="font-bold text-white">Featured Camp</div>
                      <div className="text-sm text-white/50">Show prominently on Find Camps page</div>
                    </div>
                  </label>
                </div>
              </ContentCard>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      Save Changes
                    </>
                  )}
                </button>

                <Link
                  href="/admin/camps"
                  className="flex items-center justify-center gap-2 w-full py-3 border border-white/20 text-white/60 font-bold uppercase tracking-wider hover:border-white/40 hover:text-white transition-colors"
                >
                  Cancel
                </Link>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center justify-center gap-2 w-full py-3 border border-magenta/30 text-magenta font-bold uppercase tracking-wider hover:bg-magenta/10 transition-colors disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-5 w-5" />
                      Delete Camp
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </AdminLayout>
  )
}
