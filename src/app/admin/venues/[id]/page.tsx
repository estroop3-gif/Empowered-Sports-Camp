'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import ContractList from '@/components/admin/venues/ContractList'
import { cn } from '@/lib/utils'
import { COUNTRIES, getRegionLabelForCountry, countryHasRegions } from '@/lib/constants/locations'
import { RegionInput } from '@/components/ui/RegionInput'
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
  CheckCircle,
  Home,
  TreePine,
  Dumbbell,
  Users,
  Sun,
  Layers,
  Globe,
  Image,
  Archive,
  RotateCcw,
  Calendar,
  Trash2,
  Plus,
  Lock,
  ImagePlus,
  MoreVertical,
  X,
  Edit2,
  FileSignature,
} from 'lucide-react'

// Types
type FacilityType = 'school' | 'park' | 'sports_complex' | 'private_gym' | 'community_center' | 'recreation_center' | 'other'
type IndoorOutdoor = 'indoor' | 'outdoor' | 'both'

interface Venue {
  id: string
  tenant_id: string | null
  name: string
  short_name: string | null
  address_line_1: string
  address_line_2: string | null
  city: string
  state: string
  postal_code: string
  country: string
  region_label: string | null
  facility_type: FacilityType | null
  indoor_outdoor: IndoorOutdoor | null
  sports_supported: string[]
  max_daily_capacity: number | null
  primary_contact_name: string | null
  primary_contact_email: string | null
  primary_contact_phone: string | null
  notes: string | null
  hero_image_url: string | null
  gallery_image_urls: string[]
  is_active: boolean
  created_at: string
  updated_at: string
  tenant_name?: string | null
  camp_count?: number
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

const FACILITY_TYPES: { value: FacilityType; label: string }[] = [
  { value: 'school', label: 'School' },
  { value: 'park', label: 'Park' },
  { value: 'sports_complex', label: 'Sports Complex' },
  { value: 'private_gym', label: 'Private Gym' },
  { value: 'community_center', label: 'Community Center' },
  { value: 'recreation_center', label: 'Recreation Center' },
  { value: 'other', label: 'Other' },
]

const INDOOR_OUTDOOR_OPTIONS: { value: IndoorOutdoor; label: string }[] = [
  { value: 'indoor', label: 'Indoor Only' },
  { value: 'outdoor', label: 'Outdoor Only' },
  { value: 'both', label: 'Mixed (Both)' },
]

function getFacilityTypeLabel(type: FacilityType | null): string {
  return FACILITY_TYPES.find(t => t.value === type)?.label || 'Other'
}

function getIndoorOutdoorLabel(type: IndoorOutdoor | null): string {
  return INDOOR_OUTDOOR_OPTIONS.find(t => t.value === type)?.label || 'Mixed'
}

export default function VenueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: venueId } = use(params)
  const router = useRouter()
  const [venue, setVenue] = useState<Venue | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [territories, setTerritories] = useState<Territory[]>([])
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>('')
  const [processingAction, setProcessingAction] = useState<string | null>(null)

  // Actions menu
  const [showActionsMenu, setShowActionsMenu] = useState(false)

  // Contracts modal trigger
  const [showAddContractTrigger, setShowAddContractTrigger] = useState(false)

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

  // Fetch venue and tenants
  useEffect(() => {
    async function fetchData() {
      try {
        const [venueRes, territoriesRes] = await Promise.all([
          fetch(`/api/admin/venues/${venueId}`, { credentials: 'include' }),
          fetch('/api/admin/camps/territories', { credentials: 'include' }),
        ])

        const venueData = await venueRes.json()
        const territoriesData = await territoriesRes.json()

        if (!venueRes.ok) {
          setError(venueData.error || 'Failed to load venue')
          setLoading(false)
          return
        }

        const v = venueData.data
        setVenue(v)

        const territoriesList = territoriesData.territories || []
        setTerritories(territoriesList)

        // Find territory that matches the venue's tenant_id
        if (v.tenant_id) {
          const matchingTerritory = territoriesList.find((t: Territory) => t.tenant_id === v.tenant_id)
          if (matchingTerritory) {
            setSelectedTerritoryId(matchingTerritory.id)
          }
        }

        setFormData({
          tenant_id: v.tenant_id || '',
          name: v.name,
          short_name: v.short_name || '',
          address_line_1: v.address_line_1,
          address_line_2: v.address_line_2 || '',
          city: v.city,
          state: v.state,
          postal_code: v.postal_code,
          country: v.country || 'US',
          region_label: v.region_label || '',
          facility_type: v.facility_type || 'other',
          indoor_outdoor: v.indoor_outdoor || 'both',
          sports_supported: v.sports_supported || [],
          max_daily_capacity: v.max_daily_capacity?.toString() || '',
          primary_contact_name: v.primary_contact_name || '',
          primary_contact_email: v.primary_contact_email || '',
          primary_contact_phone: v.primary_contact_phone || '',
          notes: v.notes || '',
          hero_image_url: v.hero_image_url || '',
        })
      } catch {
        setError('Failed to load venue')
      }
      setLoading(false)
    }

    fetchData()
  }, [venueId])

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
    setSuccess(false)

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
    if (countryHasRegions(formData.country) && !formData.state) {
      setError(`${getRegionLabelForCountry(formData.country)} is required`)
      return
    }
    if (!formData.postal_code.trim()) {
      setError('Postal code is required')
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`/api/admin/venues/${venueId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          tenant_id: formData.tenant_id || null,
          max_daily_capacity: formData.max_daily_capacity ? parseInt(formData.max_daily_capacity) : null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to update venue')
        setSaving(false)
        return
      }

      setVenue(result.data)
      setSuccess(true)
      setIsEditing(false)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Failed to update venue')
    }
    setSaving(false)
  }

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this venue?')) return
    setShowActionsMenu(false)

    setProcessingAction('archive')
    try {
      const response = await fetch(`/api/admin/venues/${venueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'archive' }),
      })

      const result = await response.json()

      if (response.ok) {
        setVenue((prev) => prev ? { ...prev, is_active: false } : null)
      } else {
        alert(result.error || 'Failed to archive venue')
      }
    } catch {
      alert('Failed to archive venue')
    }
    setProcessingAction(null)
  }

  const handleReactivate = async () => {
    setShowActionsMenu(false)
    setProcessingAction('reactivate')
    try {
      const response = await fetch(`/api/admin/venues/${venueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'reactivate' }),
      })

      if (response.ok) {
        setVenue((prev) => prev ? { ...prev, is_active: true } : null)
      } else {
        const result = await response.json()
        alert(result.error || 'Failed to reactivate venue')
      }
    } catch {
      alert('Failed to reactivate venue')
    }
    setProcessingAction(null)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently delete this venue? This action cannot be undone.')) return
    if (!confirm('This will remove this venue from all associated camps. Are you absolutely sure?')) return
    setShowActionsMenu(false)

    setProcessingAction('delete')
    try {
      const response = await fetch(`/api/admin/venues/${venueId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const result = await response.json()

      if (response.ok) {
        router.push('/admin/venues?deleted=true')
      } else {
        alert(result.error || 'Failed to delete venue')
      }
    } catch {
      alert('Failed to delete venue')
    }
    setProcessingAction(null)
  }

  const handleAddContract = () => {
    setShowActionsMenu(false)
    setShowAddContractTrigger(true)
    // The ContractList component will pick up this trigger
    setTimeout(() => setShowAddContractTrigger(false), 100)
  }

  const handleStartEditing = () => {
    setShowActionsMenu(false)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    // Reset form data from venue
    if (venue) {
      setFormData({
        tenant_id: venue.tenant_id || '',
        name: venue.name,
        short_name: venue.short_name || '',
        address_line_1: venue.address_line_1,
        address_line_2: venue.address_line_2 || '',
        city: venue.city,
        state: venue.state,
        postal_code: venue.postal_code,
        country: venue.country || 'US',
        region_label: venue.region_label || '',
        facility_type: venue.facility_type || 'other',
        indoor_outdoor: venue.indoor_outdoor || 'both',
        sports_supported: venue.sports_supported || [],
        max_daily_capacity: venue.max_daily_capacity?.toString() || '',
        primary_contact_name: venue.primary_contact_name || '',
        primary_contact_email: venue.primary_contact_email || '',
        primary_contact_phone: venue.primary_contact_phone || '',
        notes: venue.notes || '',
        hero_image_url: venue.hero_image_url || '',
      })
    }
    setIsEditing(false)
    setError(null)
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

  if (!venue) {
    return (
      <AdminLayout userRole="hq_admin" userName="Admin">
        <div className="text-center py-20">
          <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Venue Not Found</h2>
          <p className="text-white/50 mb-6">{error || 'The venue you are looking for does not exist.'}</p>
          <Link href="/admin/venues" className="text-neon hover:underline">
            Back to Venues
          </Link>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout userRole="hq_admin" userName="Admin">
      <div className="mb-6">
        <Link
          href="/admin/venues"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-neon transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Venues
        </Link>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-black uppercase tracking-tight text-white">
              {venue.name}
            </h1>
            {!venue.is_active && (
              <span className="px-3 py-1 bg-white/10 text-white/50 text-sm font-bold uppercase">
                Archived
              </span>
            )}
          </div>
          <p className="text-white/50">
            {venue.city}, {venue.state}
            {venue.region_label ? ` • ${venue.region_label}` : ''}
            {venue.tenant_name ? ` • ${venue.tenant_name}` : ''}
          </p>
        </div>

        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setShowActionsMenu(!showActionsMenu)}
            className="p-3 border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors"
          >
            <MoreVertical className="h-5 w-5" />
          </button>

          {showActionsMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowActionsMenu(false)}
              />

              {/* Menu */}
              <div className="absolute right-0 top-full mt-2 w-56 bg-dark-gray border border-white/20 z-50 shadow-xl">
                <button
                  onClick={handleStartEditing}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left text-white hover:bg-white/5 transition-colors"
                >
                  <Edit2 className="h-4 w-4 text-neon" />
                  Edit Venue
                </button>
                <button
                  onClick={handleAddContract}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left text-white hover:bg-white/5 transition-colors"
                >
                  <FileSignature className="h-4 w-4 text-neon" />
                  Add Contract
                </button>
                <div className="border-t border-white/10" />
                {venue.is_active ? (
                  <button
                    onClick={handleArchive}
                    disabled={processingAction === 'archive'}
                    className="flex items-center gap-3 w-full px-4 py-3 text-left text-magenta hover:bg-magenta/10 transition-colors disabled:opacity-50"
                  >
                    {processingAction === 'archive' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                    Archive Venue
                  </button>
                ) : (
                  <button
                    onClick={handleReactivate}
                    disabled={processingAction === 'reactivate'}
                    className="flex items-center gap-3 w-full px-4 py-3 text-left text-neon hover:bg-neon/10 transition-colors disabled:opacity-50"
                  >
                    {processingAction === 'reactivate' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    Reactivate Venue
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  disabled={processingAction === 'delete'}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
                >
                  {processingAction === 'delete' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete Venue
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Success Banner */}
      {success && (
        <div className="mb-6 p-4 bg-neon/10 border border-neon/30 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-neon flex-shrink-0" />
          <p className="text-neon">Venue updated successfully!</p>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-magenta/10 border border-magenta/30 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-magenta flex-shrink-0" />
          <p className="text-magenta">{error}</p>
        </div>
      )}

      {isEditing ? (
        /* ========== EDIT MODE ========== */
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
                        className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
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
                        className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
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
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-magenta focus:outline-none"
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
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-magenta focus:outline-none"
                    />
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                        <Globe className="h-4 w-4 inline mr-2" />
                        Country *
                      </label>
                      <select
                        value={formData.country}
                        onChange={(e) => {
                          updateField('country', e.target.value)
                          updateField('state', '') // Clear state when country changes
                        }}
                        className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-magenta focus:outline-none"
                      >
                        {COUNTRIES.map((country) => (
                          <option key={country.code} value={country.code}>{country.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => updateField('city', e.target.value)}
                        className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-magenta focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                        {getRegionLabelForCountry(formData.country)} {countryHasRegions(formData.country) ? '*' : ''}
                      </label>
                      <RegionInput
                        countryCode={formData.country}
                        value={formData.state}
                        onChange={(value) => updateField('state', value)}
                        className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-magenta focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                        Postal Code *
                      </label>
                      <input
                        type="text"
                        value={formData.postal_code}
                        onChange={(e) => updateField('postal_code', e.target.value)}
                        placeholder={formData.country === 'US' ? 'ZIP' : 'Postal Code'}
                        className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-magenta focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      Region Label
                    </label>
                    <input
                      type="text"
                      value={formData.region_label}
                      onChange={(e) => updateField('region_label', e.target.value)}
                      placeholder="e.g., Chicago – North, West Suburbs"
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-magenta focus:outline-none"
                    />
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
                      min="0"
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-purple focus:outline-none"
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
                        className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
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
                        className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
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
                        className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
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
                      rows={4}
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none resize-none"
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
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                        <Image className="h-4 w-4 inline mr-2" />
                        Hero Image URL
                      </label>
                      <input
                        type="url"
                        value={formData.hero_image_url}
                        onChange={(e) => updateField('hero_image_url', e.target.value)}
                        className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-magenta focus:outline-none"
                      />
                    </div>
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
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        Save Changes
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex items-center justify-center gap-2 w-full py-3 border border-white/20 text-white/60 font-bold uppercase tracking-wider hover:border-white/40 hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      ) : (
        /* ========== READ-ONLY MODE ========== */
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Basic Information */}
            <ContentCard title="Venue Details" accent="neon">
              <div className="space-y-6">
                {/* Hero Image */}
                {venue.hero_image_url && (
                  <div className="aspect-video bg-white/5 overflow-hidden mb-6">
                    <img
                      src={venue.hero_image_url}
                      alt={venue.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-1">
                      Venue Name
                    </label>
                    <p className="text-white text-lg font-medium">{venue.name}</p>
                    {venue.short_name && (
                      <p className="text-white/50 text-sm">({venue.short_name})</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-1">
                      Territory
                    </label>
                    <p className="text-white">
                      {venue.tenant_name || 'Global (All territories)'}
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-1">
                      Facility Type
                    </label>
                    <p className="text-white">{getFacilityTypeLabel(venue.facility_type)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-1">
                      Indoor / Outdoor
                    </label>
                    <p className="text-white">{getIndoorOutdoorLabel(venue.indoor_outdoor)}</p>
                  </div>
                </div>
              </div>
            </ContentCard>

            {/* Location */}
            <ContentCard title="Location" accent="magenta">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-magenta flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white">{venue.address_line_1}</p>
                    {venue.address_line_2 && (
                      <p className="text-white">{venue.address_line_2}</p>
                    )}
                    <p className="text-white">{venue.city}, {venue.state} {venue.postal_code}</p>
                    {venue.region_label && (
                      <p className="text-white/50 text-sm mt-1">{venue.region_label}</p>
                    )}
                  </div>
                </div>
              </div>
            </ContentCard>

            {/* Sports & Capacity */}
            <ContentCard title="Sports & Capacity" accent="purple">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-3">
                    Sports Supported
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {venue.sports_supported && venue.sports_supported.length > 0 ? (
                      venue.sports_supported.map((sport) => (
                        <span
                          key={sport}
                          className="px-3 py-1.5 border border-purple bg-purple/20 text-white text-sm"
                        >
                          {sport}
                        </span>
                      ))
                    ) : (
                      <span className="text-white/40">No sports specified</span>
                    )}
                  </div>
                </div>

                {venue.max_daily_capacity && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-1">
                      Max Daily Capacity
                    </label>
                    <p className="text-white text-lg font-medium flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple" />
                      {venue.max_daily_capacity} campers
                    </p>
                  </div>
                )}
              </div>
            </ContentCard>

            {/* Contact Information */}
            <ContentCard title="Contact Information" accent="neon">
              <div className="space-y-4">
                {venue.primary_contact_name || venue.primary_contact_email || venue.primary_contact_phone ? (
                  <div className="grid gap-4 sm:grid-cols-3">
                    {venue.primary_contact_name && (
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-neon flex-shrink-0" />
                        <span className="text-white">{venue.primary_contact_name}</span>
                      </div>
                    )}
                    {venue.primary_contact_email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-neon flex-shrink-0" />
                        <a href={`mailto:${venue.primary_contact_email}`} className="text-neon hover:underline">
                          {venue.primary_contact_email}
                        </a>
                      </div>
                    )}
                    {venue.primary_contact_phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-neon flex-shrink-0" />
                        <a href={`tel:${venue.primary_contact_phone}`} className="text-white hover:text-neon">
                          {venue.primary_contact_phone}
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-white/40">No contact information available</p>
                )}
              </div>
            </ContentCard>

            {/* Notes */}
            {venue.notes && (
              <ContentCard title="Notes">
                <p className="text-white/80 whitespace-pre-wrap">{venue.notes}</p>
              </ContentCard>
            )}

            {/* Contracts Section */}
            <ContentCard title="Contracts" accent="magenta">
              <ContractList
                venueId={venueId}
                venueName={venue.name}
                venueContactEmail={venue.primary_contact_email}
                openAddModal={showAddContractTrigger}
              />
            </ContentCard>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-44 space-y-6">
              {/* Quick Stats */}
              <ContentCard title="Stats">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">Status</span>
                    <span className={venue.is_active ? 'text-neon' : 'text-white/40'}>
                      {venue.is_active ? 'Active' : 'Archived'}
                    </span>
                  </div>
                  {venue.camp_count !== undefined && venue.camp_count > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">Camps</span>
                      <span className="text-magenta">{venue.camp_count}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">Created</span>
                    <span className="text-white">{new Date(venue.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">Updated</span>
                    <span className="text-white">{new Date(venue.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </ContentCard>

              {/* Quick Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleStartEditing}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors"
                >
                  <Edit2 className="h-5 w-5" />
                  Edit Venue
                </button>

                <button
                  onClick={handleAddContract}
                  className="flex items-center justify-center gap-2 w-full py-3 border border-neon/30 text-neon font-bold uppercase tracking-wider hover:bg-neon/10 transition-colors"
                >
                  <FileSignature className="h-4 w-4" />
                  Add Contract
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
