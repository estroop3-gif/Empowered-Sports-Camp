'use client'

/**
 * Licensee Venue Detail/Edit Page
 *
 * View and edit a venue. Only editable if the venue belongs to the licensee's tenant.
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth/context'
import { PortalPageHeader, PortalCard } from '@/components/portal'
import {
  ArrowLeft,
  Save,
  Loader2,
  MapPin,
  Building2,
  Phone,
  Users,
  Image as ImageIcon,
  Archive,
  RotateCcw,
  Globe,
  Lock,
  AlertTriangle,
} from 'lucide-react'

const FACILITY_TYPES = [
  { value: 'school', label: 'School' },
  { value: 'park', label: 'Park' },
  { value: 'sports_complex', label: 'Sports Complex' },
  { value: 'private_gym', label: 'Private Gym' },
  { value: 'community_center', label: 'Community Center' },
  { value: 'recreation_center', label: 'Recreation Center' },
  { value: 'other', label: 'Other' },
]

const INDOOR_OUTDOOR_OPTIONS = [
  { value: 'indoor', label: 'Indoor' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'both', label: 'Both' },
]

const AVAILABLE_SPORTS = [
  'Soccer',
  'Basketball',
  'Football',
  'Baseball',
  'Softball',
  'Volleyball',
  'Tennis',
  'Swimming',
  'Track & Field',
  'Lacrosse',
  'Field Hockey',
  'Wrestling',
  'Gymnastics',
  'Cheerleading',
  'Multi-Sport',
]

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
]

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
  facility_type: string | null
  indoor_outdoor: string | null
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
}

export default function LicenseeVenueDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { tenant } = useAuth()
  const venueId = params.id as string

  const [venue, setVenue] = useState<Venue | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    region_label: '',
    facility_type: '',
    indoor_outdoor: 'both',
    sports_supported: [] as string[],
    max_daily_capacity: '',
    primary_contact_name: '',
    primary_contact_email: '',
    primary_contact_phone: '',
    notes: '',
    hero_image_url: '',
  })

  const isOwnVenue = venue?.tenant_id === tenant?.id
  const canEdit = isOwnVenue

  useEffect(() => {
    async function fetchVenue() {
      try {
        setLoading(true)
        const res = await fetch(`/api/licensee/venues/${venueId}`, {
          credentials: 'include',
        })
        const json = await res.json()

        if (!res.ok) {
          throw new Error(json.error || 'Failed to fetch venue')
        }

        const v = json.data
        setVenue(v)
        setFormData({
          name: v.name || '',
          short_name: v.short_name || '',
          address_line_1: v.address_line_1 || '',
          address_line_2: v.address_line_2 || '',
          city: v.city || '',
          state: v.state || '',
          postal_code: v.postal_code || '',
          country: v.country || 'US',
          region_label: v.region_label || '',
          facility_type: v.facility_type || '',
          indoor_outdoor: v.indoor_outdoor || 'both',
          sports_supported: v.sports_supported || [],
          max_daily_capacity: v.max_daily_capacity?.toString() || '',
          primary_contact_name: v.primary_contact_name || '',
          primary_contact_email: v.primary_contact_email || '',
          primary_contact_phone: v.primary_contact_phone || '',
          notes: v.notes || '',
          hero_image_url: v.hero_image_url || '',
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load venue')
      } finally {
        setLoading(false)
      }
    }

    if (venueId) {
      fetchVenue()
    }
  }, [venueId])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
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
    if (!canEdit) return

    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const payload = {
        ...formData,
        max_daily_capacity: formData.max_daily_capacity
          ? parseInt(formData.max_daily_capacity, 10)
          : null,
      }

      const res = await fetch(`/api/licensee/venues/${venueId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to update venue')
      }

      setVenue(json.data)
      setSuccessMessage('Venue updated successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update venue')
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async () => {
    if (!canEdit || !venue) return
    if (!confirm('Are you sure you want to archive this venue?')) return

    try {
      const res = await fetch(`/api/licensee/venues/${venueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'archive' }),
      })

      const json = await res.json()

      if (!res.ok) {
        if (json.has_future_camps) {
          alert('Cannot archive venue: It has future camps scheduled.')
        } else {
          alert(json.error || 'Failed to archive venue')
        }
        return
      }

      setVenue({ ...venue, is_active: false })
      setSuccessMessage('Venue archived successfully')
    } catch (err) {
      alert('Failed to archive venue')
    }
  }

  const handleReactivate = async () => {
    if (!canEdit || !venue) return

    try {
      const res = await fetch(`/api/licensee/venues/${venueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'reactivate' }),
      })

      const json = await res.json()

      if (!res.ok) {
        alert(json.error || 'Failed to reactivate venue')
        return
      }

      setVenue({ ...venue, is_active: true })
      setSuccessMessage('Venue reactivated successfully')
    } catch (err) {
      alert('Failed to reactivate venue')
    }
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-neon animate-spin" />
        </div>
      </div>
    )
  }

  if (!venue) {
    return (
      <div>
        <PortalCard>
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Venue Not Found</h3>
            <p className="text-white/50 mb-6">This venue doesn't exist or you don't have access.</p>
            <Link
              href="/licensee/venues"
              className="inline-flex items-center gap-2 px-4 py-2 bg-neon text-black text-sm font-bold uppercase tracking-wider hover:bg-neon/90"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Venues
            </Link>
          </div>
        </PortalCard>
      </div>
    )
  }

  return (
    <div>
      <PortalPageHeader
        title={canEdit ? 'Edit Venue' : 'View Venue'}
        description={venue.name}
        actions={
          <Link
            href="/licensee/venues"
            className="flex items-center gap-2 px-4 py-2 border border-white/10 text-white/70 text-sm font-bold uppercase tracking-wider hover:text-white hover:border-white/30"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        }
      />

      {/* Read-only warning for global venues */}
      {!canEdit && (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center gap-3">
          <Globe className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-bold">Global Venue - Read Only</p>
            <p className="text-sm text-blue-400/70">
              This is a global venue that can be used for your camps but cannot be edited.
            </p>
          </div>
        </div>
      )}

      {/* Status Banner */}
      {!venue.is_active && canEdit && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" />
            <span>This venue is archived and not visible for camp creation.</span>
          </div>
          <button
            onClick={handleReactivate}
            className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500 text-black text-xs font-bold uppercase tracking-wider hover:bg-yellow-400"
          >
            <RotateCcw className="h-4 w-4" />
            Reactivate
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 text-green-400">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit}>
            {/* Basic Information */}
            <PortalCard title="Basic Information" className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    Venue Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={!canEdit}
                    className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    Short Name
                  </label>
                  <input
                    type="text"
                    name="short_name"
                    value={formData.short_name}
                    onChange={handleChange}
                    disabled={!canEdit}
                    className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>
            </PortalCard>

            {/* Location */}
            <PortalCard title="Location" className="mb-6">
              <div className="flex items-center gap-2 mb-4 text-white/40">
                <MapPin className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">Address Details</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    name="address_line_1"
                    value={formData.address_line_1}
                    onChange={handleChange}
                    required
                    disabled={!canEdit}
                    className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none disabled:opacity-50"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    name="address_line_2"
                    value={formData.address_line_2}
                    onChange={handleChange}
                    disabled={!canEdit}
                    className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    disabled={!canEdit}
                    className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    State *
                  </label>
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    required
                    disabled={!canEdit}
                    className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white focus:border-neon focus:outline-none disabled:opacity-50"
                  >
                    <option value="">Select State</option>
                    {US_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    name="postal_code"
                    value={formData.postal_code}
                    onChange={handleChange}
                    required
                    disabled={!canEdit}
                    className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    Region Label
                  </label>
                  <input
                    type="text"
                    name="region_label"
                    value={formData.region_label}
                    onChange={handleChange}
                    disabled={!canEdit}
                    className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>
            </PortalCard>

            {/* Facility Details */}
            <PortalCard title="Facility Details" className="mb-6">
              <div className="flex items-center gap-2 mb-4 text-white/40">
                <Building2 className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">Facility Information</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    Facility Type
                  </label>
                  <select
                    name="facility_type"
                    value={formData.facility_type}
                    onChange={handleChange}
                    disabled={!canEdit}
                    className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white focus:border-neon focus:outline-none disabled:opacity-50"
                  >
                    <option value="">Select Type</option>
                    {FACILITY_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    Indoor/Outdoor
                  </label>
                  <select
                    name="indoor_outdoor"
                    value={formData.indoor_outdoor}
                    onChange={handleChange}
                    disabled={!canEdit}
                    className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white focus:border-neon focus:outline-none disabled:opacity-50"
                  >
                    {INDOOR_OUTDOOR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    Max Daily Capacity
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <input
                      type="number"
                      name="max_daily_capacity"
                      value={formData.max_daily_capacity}
                      onChange={handleChange}
                      min="0"
                      disabled={!canEdit}
                      className="w-full h-10 bg-dark-100 border border-white/10 pl-10 pr-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Sports Supported */}
              <div className="mt-6">
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-3">
                  Sports Supported
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_SPORTS.map((sport) => (
                    <button
                      key={sport}
                      type="button"
                      onClick={() => canEdit && toggleSport(sport)}
                      disabled={!canEdit}
                      className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors disabled:cursor-not-allowed ${
                        formData.sports_supported.includes(sport)
                          ? 'bg-purple text-white'
                          : 'bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {sport}
                    </button>
                  ))}
                </div>
              </div>
            </PortalCard>

            {/* Contact Information */}
            <PortalCard title="Contact Information" className="mb-6">
              <div className="flex items-center gap-2 mb-4 text-white/40">
                <Phone className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">Primary Contact</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    name="primary_contact_name"
                    value={formData.primary_contact_name}
                    onChange={handleChange}
                    disabled={!canEdit}
                    className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    name="primary_contact_email"
                    value={formData.primary_contact_email}
                    onChange={handleChange}
                    disabled={!canEdit}
                    className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    name="primary_contact_phone"
                    value={formData.primary_contact_phone}
                    onChange={handleChange}
                    disabled={!canEdit}
                    className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  disabled={!canEdit}
                  className="w-full bg-dark-100 border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none disabled:opacity-50"
                />
              </div>
            </PortalCard>

            {/* Media */}
            <PortalCard title="Media" className="mb-6">
              <div className="flex items-center gap-2 mb-4 text-white/40">
                <ImageIcon className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">Venue Images</span>
              </div>

              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Hero Image URL
                </label>
                <input
                  type="url"
                  name="hero_image_url"
                  value={formData.hero_image_url}
                  onChange={handleChange}
                  disabled={!canEdit}
                  placeholder="https://example.com/image.jpg"
                  className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none disabled:opacity-50"
                />
              </div>
            </PortalCard>

            {/* Submit */}
            {canEdit && (
              <div className="flex items-center justify-between">
                <div>
                  {venue.is_active ? (
                    <button
                      type="button"
                      onClick={handleArchive}
                      className="flex items-center gap-2 px-4 py-2 border border-red-500/30 text-red-400 text-sm font-bold uppercase tracking-wider hover:bg-red-500/10"
                    >
                      <Archive className="h-4 w-4" />
                      Archive Venue
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleReactivate}
                      className="flex items-center gap-2 px-4 py-2 border border-neon/30 text-neon text-sm font-bold uppercase tracking-wider hover:bg-neon/10"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reactivate Venue
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <Link
                    href="/licensee/venues"
                    className="px-6 py-3 border border-white/10 text-white/70 text-sm font-bold uppercase tracking-wider hover:text-white hover:border-white/30"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-neon text-black text-sm font-bold uppercase tracking-wider hover:bg-neon/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Preview Card */}
          <PortalCard title="Venue Preview" className="mb-6">
            <div className="relative h-40 bg-dark-100 mb-4">
              {formData.hero_image_url ? (
                <Image
                  src={formData.hero_image_url}
                  alt={formData.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <Building2 className="h-12 w-12 text-white/10" />
                </div>
              )}
            </div>

            <h3 className="text-lg font-bold text-white mb-1">
              {formData.name || 'Venue Name'}
            </h3>
            <p className="text-sm text-white/50">
              {formData.city && formData.state
                ? `${formData.city}, ${formData.state}`
                : 'City, State'}
            </p>
          </PortalCard>

          {/* Ownership Info */}
          <PortalCard title="Ownership" className="mb-6">
            <div
              className={`flex items-center gap-3 p-3 ${
                isOwnVenue ? 'bg-purple/10' : 'bg-white/5'
              }`}
            >
              {isOwnVenue ? (
                <>
                  <Lock className="h-5 w-5 text-purple" />
                  <div>
                    <p className="text-sm font-bold text-white">Your Venue</p>
                    <p className="text-xs text-white/40">Full edit access</p>
                  </div>
                </>
              ) : (
                <>
                  <Globe className="h-5 w-5 text-white/40" />
                  <div>
                    <p className="text-sm font-bold text-white">Global Venue</p>
                    <p className="text-xs text-white/40">Read-only access</p>
                  </div>
                </>
              )}
            </div>
          </PortalCard>

          {/* Metadata */}
          <PortalCard title="Details">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-white/40">Status</dt>
                <dd>
                  <span
                    className={`px-2 py-0.5 text-xs font-bold uppercase ${
                      venue.is_active
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {venue.is_active ? 'Active' : 'Archived'}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-white/40">Created</dt>
                <dd className="text-white">
                  {new Date(venue.created_at).toLocaleDateString()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-white/40">Updated</dt>
                <dd className="text-white">
                  {new Date(venue.updated_at).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </PortalCard>
        </div>
      </div>
    </div>
  )
}
