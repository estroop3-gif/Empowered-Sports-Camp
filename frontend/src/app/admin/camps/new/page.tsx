'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { CampCreateStepper, getStepsForCurrentStep } from '@/components/admin/camps/CampCreateStepper'
import { useAuth } from '@/lib/auth/context'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Clock,
  Zap,
  AlertCircle,
  Loader2,
  Search,
  ChevronDown,
  X,
  Building2,
  Check,
  ImagePlus,
  Trash2,
} from 'lucide-react'
import { useUpload, STORAGE_FOLDERS } from '@/lib/storage/use-upload'
import Image from 'next/image'

// Types (defined locally to avoid Prisma imports in client component)
interface CampFormData {
  name: string
  slug: string
  description: string
  sport: string
  location_id: string | null
  venue_id: string | null
  tenant_id: string
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

interface Tenant {
  id: string
  name: string
  slug: string
  city: string | null
  state: string | null
}

interface Territory {
  id: string
  name: string
  country: string
  state_region: string
  city: string | null
  status: string
  tenant_id: string | null
  tenant_name: string | null
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
]

export default function AdminCreateCampPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [userRole, setUserRole] = useState<string | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>('')

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
    location_id: null,
    venue_id: null,
    tenant_id: '',
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

  useEffect(() => {
    if (user) {
      loadInitialData()
    }
  }, [user])

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

  // Debug: log venues state
  console.log('[render] venues:', venues.length, 'filteredVenues:', filteredVenues.length)

  // Get selected venue for display
  const selectedVenue = venues.find(v => v.id === formData.venue_id)

  useEffect(() => {
    console.log('[useEffect] tenant_id:', formData.tenant_id, 'userRole:', userRole)
    if (formData.tenant_id) {
      console.log('[useEffect] Loading venues for tenant:', formData.tenant_id)
      loadLocations(formData.tenant_id)
      loadVenues(formData.tenant_id)
    } else if (userRole === 'hq_admin') {
      // HQ admins can see all venues even without selecting a territory
      console.log('[useEffect] HQ admin - loading all venues')
      loadVenues()
    }
  }, [formData.tenant_id, userRole])

  async function loadVenues(tenantId?: string) {
    try {
      const url = tenantId
        ? `/api/admin/camps/venues?tenantId=${tenantId}`
        : '/api/admin/camps/venues'
      console.log('[loadVenues] Fetching from:', url)
      const response = await fetch(url, { credentials: 'include' })
      console.log('[loadVenues] Response status:', response.status)
      if (response.ok) {
        const data = await response.json()
        console.log('[loadVenues] Data received:', data)
        console.log('[loadVenues] Venues count:', data.venues?.length || 0)
        setVenues(data.venues || [])
      } else {
        const errorData = await response.json()
        console.error('[loadVenues] Error response:', errorData)
      }
    } catch (err) {
      console.error('Failed to load venues:', err)
    }
  }

  async function loadInitialData() {
    if (!user) {
      setError('Not authenticated')
      return
    }
    try {
      // Fetch user role from API
      const roleResponse = await fetch('/api/admin/camps/user-role', { credentials: 'include' })
      if (!roleResponse.ok) {
        const errorData = await roleResponse.json()
        setError(errorData.error || 'Not authenticated')
        setLoading(false)
        return
      }
      const roleData = await roleResponse.json()

      setUserRole(roleData.role)

      if (roleData.role === 'hq_admin') {
        // Fetch territories for HQ admin
        const territoriesResponse = await fetch('/api/admin/camps/territories', {
          credentials: 'include',
        })
        if (territoriesResponse.ok) {
          const territoriesData = await territoriesResponse.json()
          setTerritories(territoriesData.territories || [])
        }
        // Also fetch tenants for reference
        const tenantsResponse = await fetch('/api/admin/camps/tenants', {
          credentials: 'include',
        })
        if (tenantsResponse.ok) {
          const tenantsData = await tenantsResponse.json()
          setTenants(tenantsData.tenants || [])
        }
        // Load all venues for HQ admin
        console.log('[loadInitialData] HQ admin detected, loading all venues...')
        await loadVenues()
      } else if (roleData.tenant_id) {
        setFormData(prev => ({ ...prev, tenant_id: roleData.tenant_id! }))
        // Fetch territories for this tenant
        const territoriesResponse = await fetch('/api/admin/camps/territories', {
          credentials: 'include',
        })
        if (territoriesResponse.ok) {
          const territoriesData = await territoriesResponse.json()
          setTerritories(territoriesData.territories || [])
        }
        await loadLocations(roleData.tenant_id)
        await loadVenues(roleData.tenant_id)
      }
    } catch (err) {
      console.error('Failed to load initial data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function loadLocations(tenantId: string) {
    try {
      const response = await fetch(`/api/admin/camps/locations?tenantId=${tenantId}`, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setLocations(data.locations || [])
      }
    } catch (err) {
      console.error('Failed to load locations:', err)
    }
  }

  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    setFormData(prev => ({ ...prev, name, slug }))
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload to S3
    const result = await upload(file, { folder: STORAGE_FOLDERS.CAMP_IMAGES })
    if (result) {
      setFormData(prev => ({ ...prev, image_url: result.fileUrl }))
    }
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    setFormData(prev => ({ ...prev, image_url: null }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    if (!selectedTerritoryId && isHqAdmin) {
      setError('Please select a territory')
      setSaving(false)
      return
    }

    // Non-HQ users must have a tenant_id
    if (!formData.tenant_id && !isHqAdmin) {
      setError('The selected territory is not assigned to a licensee. Please select a territory with an assigned licensee.')
      setSaving(false)
      return
    }

    if (!formData.start_date || !formData.end_date) {
      setError('Please select start and end dates')
      setSaving(false)
      return
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      setError('End date must be after start date')
      setSaving(false)
      return
    }

    // Store form data in sessionStorage and navigate to step 2
    sessionStorage.setItem('campCreateFormData', JSON.stringify({
      ...formData,
      selectedTerritoryId,
    }))
    router.push('/admin/camps/new/schedule')
  }

  const isHqAdmin = userRole === 'hq_admin'

  if (loading) {
    return (
      <AdminLayout userRole="hq_admin" userName="Admin">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-neon" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      userRole={userRole as 'hq_admin' | 'licensee_owner' || 'hq_admin'}
      userName="Admin"
    >
      <div className="mb-6">
        <Link
          href="/admin/camps"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-neon transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Camps
        </Link>
      </div>

      <PageHeader title="Create New Camp" description="Set up a new camp session for registration" />

      {/* Wizard Stepper */}
      <CampCreateStepper steps={getStepsForCurrentStep(1)} currentStep={1} />

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
                {isHqAdmin && (
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      Territory *
                    </label>
                    <select
                      required
                      value={selectedTerritoryId}
                      onChange={(e) => {
                        const territoryId = e.target.value
                        setSelectedTerritoryId(territoryId)
                        // Find the selected territory and get its tenant_id
                        const territory = territories.find(t => t.id === territoryId)
                        if (territory?.tenant_id) {
                          setFormData(prev => ({ ...prev, tenant_id: territory.tenant_id!, location_id: null, venue_id: null }))
                          loadLocations(territory.tenant_id)
                          loadVenues(territory.tenant_id)
                        } else {
                          // Territory has no tenant - for HQ admin, still load all venues (including global)
                          setFormData(prev => ({ ...prev, tenant_id: '', location_id: null, venue_id: null }))
                          setLocations([])
                          // Load all venues without tenant filter - this will include global venues
                          loadVenues()
                        }
                      }}
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                    >
                      <option value="">Select a territory...</option>
                      {territories.map(territory => (
                        <option key={territory.id} value={territory.id}>
                          {territory.name} - {territory.city ? `${territory.city}, ` : ''}{territory.state_region}
                          {territory.tenant_name ? ` (${territory.tenant_name})` : ' (Unassigned)'}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 flex items-center justify-between">
                      {territories.length === 0 ? (
                        <p className="text-sm text-white/40">No territories found.</p>
                      ) : (
                        <span />
                      )}
                      <Link
                        href="/admin/licensees/territories/new"
                        className="flex items-center gap-1.5 text-sm text-neon hover:underline"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        Create new territory
                      </Link>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Camp Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g., Summer Week 1 - Lincoln Park"
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
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
                    Sport / Program Type
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
                    placeholder="Describe what makes this camp special..."
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
                  />
                </div>
              </div>
            </ContentCard>

            {/* Camp Photo Upload */}
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

            <ContentCard title="Venue" accent="magenta">
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                  <MapPin className="h-4 w-4 inline mr-2" />
                  Select Venue
                </label>

                {/* Searchable Venue Dropdown */}
                <div className="relative" ref={venueDropdownRef}>
                  {/* Dropdown Trigger */}
                  <button
                    type="button"
                    onClick={() => {
                      // HQ admins can open dropdown without a territory, others need a territory
                      if (isHqAdmin || formData.tenant_id) {
                        setVenueDropdownOpen(!venueDropdownOpen)
                      }
                    }}
                    disabled={!isHqAdmin && !formData.tenant_id}
                    className={`w-full px-4 py-3 bg-black border text-left flex items-center justify-between transition-colors ${
                      venueDropdownOpen ? 'border-magenta' : 'border-white/20'
                    } ${!isHqAdmin && !formData.tenant_id ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/40'}`}
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

                  {/* Dropdown Panel */}
                  {venueDropdownOpen && (
                    <>
                      {/* Backdrop overlay */}
                      <div
                        className="fixed inset-0 z-[60]"
                        onClick={() => setVenueDropdownOpen(false)}
                      />
                      <div className="absolute z-[70] w-full mt-1 bg-dark-100 border border-white/20 shadow-2xl">
                        {/* Search Input */}
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

                        {/* Venue List */}
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
                                    <span className="px-1.5 py-0.5 text-xs bg-purple/20 text-purple uppercase tracking-wider">
                                      Global
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-white/50 flex items-center gap-2">
                                  <span>{venue.city}, {venue.state}</span>
                                  {venue.facility_type && (
                                    <>
                                      <span className="text-white/20">•</span>
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

                        {/* Add New Venue Link */}
                        <div className="p-3 border-t border-white/10">
                          <Link
                            href="/admin/venues/new"
                            className="flex items-center gap-2 text-sm text-neon hover:underline"
                          >
                            <MapPin className="h-4 w-4" />
                            Add a new venue
                          </Link>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {!isHqAdmin && !formData.tenant_id && (
                  <p className="mt-2 text-sm text-white/40">Select a territory first to see venues</p>
                )}
                {(isHqAdmin || formData.tenant_id) && venues.length === 0 && !venueDropdownOpen && (
                  <p className="mt-2 text-sm text-white/40">
                    No venues found.{' '}
                    <Link href="/admin/venues/new" className="text-neon hover:underline">
                      Add a new venue
                    </Link>
                  </p>
                )}
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
                  Next: Schedule & Waivers
                  <ArrowRight className="h-5 w-5" />
                </button>

                <Link
                  href="/admin/camps"
                  className="flex items-center justify-center gap-2 w-full py-3 border border-white/20 text-white/60 font-bold uppercase tracking-wider hover:border-white/40 hover:text-white transition-colors"
                >
                  Cancel
                </Link>
              </div>

              <div className="p-4 bg-black/30 border border-white/10">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-neon flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-white/60">
                    <p><strong className="text-white">Draft:</strong> Saved but not visible to the public.</p>
                    <p className="mt-2"><strong className="text-white">Published:</strong> Visible on Find Camps but registration closed.</p>
                    <p className="mt-2"><strong className="text-white">Open:</strong> Live and accepting registrations.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </AdminLayout>
  )
}
