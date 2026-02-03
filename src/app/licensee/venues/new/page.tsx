'use client'

/**
 * Licensee New Venue Page
 *
 * Create a new venue for the licensee's tenant.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PortalPageHeader, PortalCard } from '@/components/portal'
import { COUNTRIES, getRegionLabelForCountry, countryHasRegions } from '@/lib/constants/locations'
import { RegionInput } from '@/components/ui/RegionInput'
import {
  ArrowLeft,
  Save,
  Loader2,
  MapPin,
  Building2,
  Phone,
  Users,
  Image as ImageIcon,
  X,
  Globe,
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

export default function LicenseeNewVenuePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    gallery_image_urls: [] as string[],
  })

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
    setLoading(true)
    setError(null)

    try {
      const payload = {
        ...formData,
        max_daily_capacity: formData.max_daily_capacity
          ? parseInt(formData.max_daily_capacity, 10)
          : null,
      }

      const res = await fetch('/api/licensee/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to create venue')
      }

      router.push('/licensee/venues')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create venue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PortalPageHeader
        title="Add New Venue"
        description="Create a new venue for your camps"
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

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400">
          {error}
        </div>
      )}

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
                placeholder="e.g., Lincoln High School"
                className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
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
                placeholder="e.g., Lincoln HS"
                className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
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
                placeholder="Street address"
                className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
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
                placeholder="Suite, building, etc."
                className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                <Globe className="h-3 w-3 inline mr-1" />
                Country *
              </label>
              <select
                name="country"
                value={formData.country}
                onChange={(e) => {
                  handleChange(e)
                  setFormData((prev) => ({ ...prev, country: e.target.value, state: '' }))
                }}
                required
                className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white focus:border-neon focus:outline-none"
              >
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
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
                placeholder="City"
                className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                {getRegionLabelForCountry(formData.country)} {countryHasRegions(formData.country) ? '*' : ''}
              </label>
              <RegionInput
                countryCode={formData.country}
                value={formData.state}
                onChange={(value) => setFormData((prev) => ({ ...prev, state: value }))}
                name="state"
                required={countryHasRegions(formData.country)}
                className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white focus:border-neon focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                {formData.country === 'US' ? 'ZIP Code' : 'Postal Code'} *
              </label>
              <input
                type="text"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                required
                placeholder={formData.country === 'US' ? 'ZIP' : 'Postal Code'}
                className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
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
                placeholder="e.g., North Dallas, South Bay"
                className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
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
                className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white focus:border-neon focus:outline-none"
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
                className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white focus:border-neon focus:outline-none"
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
                  placeholder="e.g., 150"
                  className="w-full h-10 bg-dark-100 border border-white/10 pl-10 pr-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
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
                  onClick={() => toggleSport(sport)}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
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
                placeholder="Full name"
                className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
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
                placeholder="email@example.com"
                className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
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
                placeholder="(555) 555-5555"
                className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
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
              placeholder="Additional notes about this venue..."
              className="w-full bg-dark-100 border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
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
              placeholder="https://example.com/image.jpg"
              className="w-full h-10 bg-dark-100 border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
            />
            <p className="mt-1 text-xs text-white/30">
              Enter a URL for the main venue image
            </p>
          </div>
        </PortalCard>

        {/* Submit */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/licensee/venues"
            className="px-6 py-3 border border-white/10 text-white/70 text-sm font-bold uppercase tracking-wider hover:text-white hover:border-white/30"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-neon text-black text-sm font-bold uppercase tracking-wider hover:bg-neon/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Create Venue
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
