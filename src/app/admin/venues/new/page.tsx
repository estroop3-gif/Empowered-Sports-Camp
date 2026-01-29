'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  MapPin,
  Building2,
  Phone,
  Mail,
  User,
  FileText,
  Save,
  Loader2,
  AlertCircle,
  Home,
  TreePine,
  Dumbbell,
  Users,
  Sun,
  Layers,
  Globe,
  Image,
  Plus,
} from 'lucide-react'

// Types
type FacilityType = 'school' | 'park' | 'sports_complex' | 'private_gym' | 'community_center' | 'recreation_center' | 'other'
type IndoorOutdoor = 'indoor' | 'outdoor' | 'both'

interface Tenant {
  id: string
  name: string
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

interface FormData {
  tenant_id: string
  name: string
  short_name: string
  address_line_1: string
  address_line_2: string
  city: string
  state: string
  postal_code: string
  country: string
  region_label: string
  facility_type: FacilityType
  indoor_outdoor: IndoorOutdoor
  sports_supported: string[]
  max_daily_capacity: string
  primary_contact_name: string
  primary_contact_email: string
  primary_contact_phone: string
  notes: string
  hero_image_url: string
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
]

const SPORTS = [
  'Multi-Sport',
  'Basketball',
  'Soccer',
  'Volleyball',
  'Flag Football',
  'Softball',
  'Tennis',
  'Track & Field',
  'Swimming',
  'Lacrosse',
  'Gymnastics',
  'Dance',
  'Cheerleading',
]

const FACILITY_TYPES: { value: FacilityType; label: string; icon: React.ElementType }[] = [
  { value: 'school', label: 'School', icon: Building2 },
  { value: 'park', label: 'Park', icon: TreePine },
  { value: 'sports_complex', label: 'Sports Complex', icon: Dumbbell },
  { value: 'private_gym', label: 'Private Gym', icon: Dumbbell },
  { value: 'community_center', label: 'Community Center', icon: Users },
  { value: 'recreation_center', label: 'Recreation Center', icon: Users },
  { value: 'other', label: 'Other', icon: Home },
]

const INDOOR_OUTDOOR_OPTIONS: { value: IndoorOutdoor; label: string; icon: React.ElementType }[] = [
  { value: 'indoor', label: 'Indoor Only', icon: Home },
  { value: 'outdoor', label: 'Outdoor Only', icon: Sun },
  { value: 'both', label: 'Mixed (Both)', icon: Layers },
]

const VENUE_DRAFT_KEY = 'venue-draft'

export default function NewVenuePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Read return-to info on mount (useEffect guarantees client-side execution)
  const [returnInfo, setReturnInfo] = useState<{
    returnTo: string | null
    tenantId: string | null
  }>({ returnTo: null, tenantId: null })

  useEffect(() => {
    const url = new URL(window.location.href)
    let returnTo = url.searchParams.get('returnTo')
    const tenantId = url.searchParams.get('tenantId')

    // Fallback: check sessionStorage for return route
    if (!returnTo) {
      const stored = sessionStorage.getItem('venue-return-to')
      if (stored) {
        returnTo = stored
        sessionStorage.removeItem('venue-return-to')
      }
    }

    if (returnTo || tenantId) {
      setReturnInfo({ returnTo, tenantId })
    }
  }, [])

  const returnInfoRef = useRef(returnInfo)
  returnInfoRef.current = returnInfo

  const returnTo = returnInfo.returnTo
  const returnTenantId = returnInfo.tenantId
  const isReturnToCampCreate = returnTo === 'camp-create'
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [createdVenueName, setCreatedVenueName] = useState('')
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState<FormData>({
    tenant_id: '',
    name: '',
    short_name: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    region_label: '',
    facility_type: 'other',
    indoor_outdoor: 'both',
    sports_supported: [],
    max_daily_capacity: '',
    primary_contact_name: '',
    primary_contact_email: '',
    primary_contact_phone: '',
    notes: '',
    hero_image_url: '',
  })

  // Restore draft from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(VENUE_DRAFT_KEY)
      if (saved) {
        const draft = JSON.parse(saved)
        setFormData(draft.formData)
        if (draft.selectedTerritoryId) {
          setSelectedTerritoryId(draft.selectedTerritoryId)
        }
        const territoryCreated = searchParams.get('territoryCreated')
        const territoryId = searchParams.get('territoryId')
        if (territoryCreated === 'true' && territoryId) {
          setSelectedTerritoryId(territoryId)
          // tenant_id will be resolved after territories load
        }
        sessionStorage.removeItem(VENUE_DRAFT_KEY)
        // Clean URL params (preserve returnTo/tenantId if present)
        const cleanParams = new URLSearchParams()
        if (returnTo) cleanParams.set('returnTo', returnTo)
        if (returnTenantId) cleanParams.set('tenantId', returnTenantId)
        const cleanUrl = cleanParams.toString()
          ? `/admin/venues/new?${cleanParams.toString()}`
          : '/admin/venues/new'
        window.history.replaceState({}, '', cleanUrl)
      }
    } catch {
      // Ignore parse errors
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch tenants and territories
  useEffect(() => {
    async function fetchData() {
      try {
        const [tenantsRes, territoriesRes] = await Promise.all([
          fetch('/api/admin/camps/tenants', { credentials: 'include' }),
          fetch('/api/admin/camps/territories', { credentials: 'include' }),
        ])

        if (tenantsRes.ok) {
          const tenantsData = await tenantsRes.json()
          setTenants(tenantsData.tenants || [])
        }

        if (territoriesRes.ok) {
          const territoriesData = await territoriesRes.json()
          setTerritories(territoriesData.territories || [])
        }
      } catch (err) {
        console.error('Failed to fetch data:', err)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  // Auto-select tenant when coming from camp form with tenantId
  useEffect(() => {
    if (returnTenantId && territories.length > 0) {
      // Find a territory that belongs to this tenant
      const territory = territories.find(t => t.tenant_id === returnTenantId)
      if (territory) {
        setSelectedTerritoryId(territory.id)
        setFormData(prev => ({ ...prev, tenant_id: returnTenantId }))
      }
    }
  }, [returnTenantId, territories])

  // When a restored territory ID matches a loaded territory, set tenant_id
  useEffect(() => {
    if (selectedTerritoryId && territories.length > 0) {
      const territory = territories.find(t => t.id === selectedTerritoryId)
      if (territory?.tenant_id) {
        setFormData(prev => ({ ...prev, tenant_id: territory.tenant_id! }))
      }
    }
  }, [selectedTerritoryId, territories])

  const saveDraftAndNavigateToTerritory = () => {
    sessionStorage.setItem(VENUE_DRAFT_KEY, JSON.stringify({
      formData,
      selectedTerritoryId,
    }))
    const params = new URLSearchParams({ returnTo: 'venue-create' })
    if (returnTo) params.set('originalReturnTo', returnTo)
    if (returnTenantId) params.set('originalTenantId', returnTenantId)
    router.push(`/admin/licensees/territories/new?${params.toString()}`)
  }

  // Handle territory selection - set tenant_id from territory
  const handleTerritoryChange = (territoryId: string) => {
    setSelectedTerritoryId(territoryId)
    if (territoryId) {
      const territory = territories.find(t => t.id === territoryId)
      if (territory?.tenant_id) {
        setFormData(prev => ({ ...prev, tenant_id: territory.tenant_id! }))
      } else {
        setFormData(prev => ({ ...prev, tenant_id: '' }))
      }
    } else {
      setFormData(prev => ({ ...prev, tenant_id: '' }))
    }
  }

  const updateField = (field: keyof FormData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const toggleSport = (sport: string) => {
    setFormData((prev) => ({
      ...prev,
      sports_supported: prev.sports_supported.includes(sport)
        ? prev.sports_supported.filter((s) => s !== sport)
        : [...prev.sports_supported, sport],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.name.trim()) {
      setError('Venue name is required')
      return
    }
    if (!formData.address_line_1.trim()) {
      setError('Address is required')
      return
    }
    if (!formData.city.trim()) {
      setError('City is required')
      return
    }
    if (!formData.state) {
      setError('State is required')
      return
    }
    if (!formData.postal_code.trim()) {
      setError('Postal code is required')
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/admin/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          tenant_id: formData.tenant_id || null, // Empty string = global venue
          max_daily_capacity: formData.max_daily_capacity ? parseInt(formData.max_daily_capacity) : null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to create venue')
        setSaving(false)
        return
      }

      // Show success message
      setCreatedVenueName(formData.name)
      setSuccess(true)
      setSaving(false)
      sessionStorage.removeItem(VENUE_DRAFT_KEY)

      // Redirect after showing success message - use hard navigation for reliability
      setTimeout(() => {
        const info = returnInfoRef.current
        if (info.returnTo === 'camp-create') {
          const newVenueId = result.data?.id || result.data?.venue?.id
          window.location.href = `/portal/camps/new?venueCreated=true&venueId=${newVenueId}`
        } else {
          window.location.href = '/admin/venues?created=true'
        }
      }, 1500)
    } catch {
      setError('Failed to create venue')
      setSaving(false)
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

  // Success overlay
  if (success) {
    return (
      <AdminLayout userRole="hq_admin" userName="Admin">
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-dark-100 border border-neon/30 p-8 max-w-md w-full mx-4 text-center">
            <div className="w-16 h-16 rounded-full bg-neon/20 flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-8 w-8 text-neon" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Venue Created!</h2>
            <p className="text-white/60 mb-4">
              <span className="text-neon font-bold">{createdVenueName}</span> has been successfully added.
            </p>
            <div className="flex items-center justify-center gap-2 text-white/40">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{isReturnToCampCreate ? 'Redirecting to camp form...' : 'Redirecting to venues list...'}</span>
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout userRole="hq_admin" userName="Admin">
      <div className="mb-6">
        <Link
          href={isReturnToCampCreate ? '/portal/camps/new' : '/admin/venues'}
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-neon transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {isReturnToCampCreate ? 'Back to Camp Form' : 'Back to Venues'}
        </Link>
      </div>

      <PageHeader
        title="Add New Venue"
        description="Create a new facility location for camps"
      />

      {error && (
        <div className="mb-6 p-4 bg-magenta/10 border border-magenta/30 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-magenta flex-shrink-0" />
          <p className="text-magenta">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Basic Information */}
            <ContentCard title="Basic Information" accent="neon">
              <div className="space-y-6">
                {/* Territory Selector */}
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    <Globe className="h-4 w-4 inline mr-2" />
                    Territory
                  </label>
                  <select
                    value={selectedTerritoryId}
                    onChange={(e) => handleTerritoryChange(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                  >
                    <option value="">Global (Available to all territories)</option>
                    {territories.map((territory) => (
                      <option key={territory.id} value={territory.id}>
                        {territory.name} - {territory.city ? `${territory.city}, ` : ''}{territory.state_region}
                        {territory.tenant_name ? ` (${territory.tenant_name})` : ' (Unassigned)'}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-white/40">
                    {selectedTerritoryId ? (
                      territories.find(t => t.id === selectedTerritoryId)?.tenant_name
                        ? `This venue will be assigned to ${territories.find(t => t.id === selectedTerritoryId)?.tenant_name}`
                        : 'Warning: This territory has no assigned licensee'
                    ) : (
                      'Leave as "Global" for venues available to all licensees'
                    )}
                  </p>
                  {territories.length === 0 && (
                    <p className="mt-2 text-sm text-white/40">
                      No territories found.{' '}
                      <button
                        type="button"
                        onClick={saveDraftAndNavigateToTerritory}
                        className="text-neon hover:underline"
                      >
                        Create one now
                      </button>
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={saveDraftAndNavigateToTerritory}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm text-neon hover:text-neon/80 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Create New Territory
                  </button>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      <Building2 className="h-4 w-4 inline mr-2" />
                      Venue Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="e.g., Northside Sports Complex"
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      Short Name
                    </label>
                    <input
                      type="text"
                      value={formData.short_name}
                      onChange={(e) => updateField('short_name', e.target.value)}
                      placeholder="e.g., Northside"
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      Facility Type
                    </label>
                    <select
                      value={formData.facility_type}
                      onChange={(e) => updateField('facility_type', e.target.value)}
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                    >
                      {FACILITY_TYPES.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      Indoor / Outdoor
                    </label>
                    <select
                      value={formData.indoor_outdoor}
                      onChange={(e) => updateField('indoor_outdoor', e.target.value)}
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                    >
                      {INDOOR_OUTDOOR_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </ContentCard>

            {/* Location */}
            <ContentCard title="Location" accent="magenta">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    <MapPin className="h-4 w-4 inline mr-2" />
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    value={formData.address_line_1}
                    onChange={(e) => updateField('address_line_1', e.target.value)}
                    placeholder="Street address"
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-magenta focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={formData.address_line_2}
                    onChange={(e) => updateField('address_line_2', e.target.value)}
                    placeholder="Suite, building, etc."
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-magenta focus:outline-none"
                  />
                </div>

                <div className="grid gap-6 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      placeholder="City"
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-magenta focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      State *
                    </label>
                    <select
                      value={formData.state}
                      onChange={(e) => updateField('state', e.target.value)}
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-magenta focus:outline-none"
                    >
                      <option value="">Select...</option>
                      {US_STATES.map((state) => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => updateField('postal_code', e.target.value)}
                      placeholder="ZIP"
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-magenta focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    <Globe className="h-4 w-4 inline mr-2" />
                    Region Label
                  </label>
                  <input
                    type="text"
                    value={formData.region_label}
                    onChange={(e) => updateField('region_label', e.target.value)}
                    placeholder="e.g., Chicago – North, West Suburbs"
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-magenta focus:outline-none"
                  />
                  <p className="mt-2 text-xs text-white/40">
                    Used for filtering on Find Camps page
                  </p>
                </div>
              </div>
            </ContentCard>

            {/* Sports & Capacity */}
            <ContentCard title="Sports & Capacity" accent="purple">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-3">
                    Sports Supported
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SPORTS.map((sport) => (
                      <button
                        key={sport}
                        type="button"
                        onClick={() => toggleSport(sport)}
                        className={cn(
                          'px-3 py-1.5 border text-sm transition-colors',
                          formData.sports_supported.includes(sport)
                            ? 'border-purple bg-purple/20 text-white'
                            : 'border-white/20 text-white/60 hover:border-white/40'
                        )}
                      >
                        {sport}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="max-w-xs">
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    <Users className="h-4 w-4 inline mr-2" />
                    Max Daily Capacity
                  </label>
                  <input
                    type="number"
                    value={formData.max_daily_capacity}
                    onChange={(e) => updateField('max_daily_capacity', e.target.value)}
                    placeholder="e.g., 100"
                    min="0"
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-purple focus:outline-none"
                  />
                </div>
              </div>
            </ContentCard>

            {/* Contact & Notes */}
            <ContentCard title="Contact & Notes" accent="neon">
              <div className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      <User className="h-4 w-4 inline mr-2" />
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={formData.primary_contact_name}
                      onChange={(e) => updateField('primary_contact_name', e.target.value)}
                      placeholder="Name"
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      <Mail className="h-4 w-4 inline mr-2" />
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={formData.primary_contact_email}
                      onChange={(e) => updateField('primary_contact_email', e.target.value)}
                      placeholder="Email"
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      <Phone className="h-4 w-4 inline mr-2" />
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.primary_contact_phone}
                      onChange={(e) => updateField('primary_contact_phone', e.target.value)}
                      placeholder="Phone"
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    <FileText className="h-4 w-4 inline mr-2" />
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="Parking instructions, building access codes, check-in procedures..."
                    rows={4}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
                  />
                </div>
              </div>
            </ContentCard>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-44 space-y-6">
              {/* Media */}
              <ContentCard title="Media" accent="magenta">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    <Image className="h-4 w-4 inline mr-2" />
                    Hero Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.hero_image_url}
                    onChange={(e) => updateField('hero_image_url', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-magenta focus:outline-none"
                  />
                  <p className="mt-2 text-xs text-white/40">
                    Main photo for this venue
                  </p>
                </div>
              </ContentCard>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      Create Venue
                    </>
                  )}
                </button>

                <Link
                  href={isReturnToCampCreate ? '/portal/camps/new' : '/admin/venues'}
                  className="flex items-center justify-center gap-2 w-full py-3 border border-white/20 text-white/60 font-bold uppercase tracking-wider hover:border-white/40 hover:text-white transition-colors"
                >
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        </div>
      </form>
    </AdminLayout>
  )
}
