'use client'

import { useState, useEffect } from 'react'
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
  Plus,
  X,
  Globe,
  Building2,
  FileText,
  Save,
  CheckCircle,
} from 'lucide-react'

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
  city: string | null
  state: string | null
  tenant_id: string | null
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

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
]

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
  { value: 'indoor', label: 'Indoor Only' },
  { value: 'outdoor', label: 'Outdoor Only' },
  { value: 'both', label: 'Mixed (Both)' },
]

// ─── Territory Modal ────────────────────────────────────────────────────────

interface TerritoryModalProps {
  open: boolean
  onClose: () => void
  onCreated: (territory: { id: string; name: string; tenant_id?: string }) => void
  tenants: Tenant[]
}

function CreateTerritoryModal({ open, onClose, onCreated, tenants }: TerritoryModalProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    country: 'USA',
    state_region: '',
    city: '',
    postal_codes: '',
    tenant_id: '',
    status: 'open' as string,
    notes: '',
  })

  const update = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.name.trim()) { setError('Territory name is required'); return }
    if (!form.state_region) { setError('State/Region is required'); return }

    setSaving(true)
    try {
      const response = await fetch('/api/admin/territories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          country: form.country.trim(),
          state_region: form.state_region.trim(),
          city: form.city.trim() || undefined,
          postal_codes: form.postal_codes.trim() || undefined,
          tenant_id: form.tenant_id || undefined,
          status: form.tenant_id ? 'assigned' : form.status,
          notes: form.notes.trim() || undefined,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        setError(result.error || 'Failed to create territory')
        setSaving(false)
        return
      }

      const newId = result.territory?.id || result.data?.id || result.id
      onCreated({ id: newId, name: form.name.trim(), tenant_id: form.tenant_id || undefined })
    } catch {
      setError('Failed to create territory')
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-10 pb-10 overflow-y-auto">
      <div className="fixed inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-dark-100 border border-white/10 w-full max-w-2xl mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-black uppercase tracking-wider text-white">Create New Territory</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 transition-colors">
            <X className="h-5 w-5 text-white/50" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-magenta/10 border border-magenta/30 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-magenta flex-shrink-0" />
            <p className="text-sm text-magenta">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
              Territory Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g., Sarasota Metro, Chicago North"
              className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Brief description of this territory..."
              rows={2}
              className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                Country *
              </label>
              <select
                value={form.country}
                onChange={(e) => update('country', e.target.value)}
                className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
              >
                <option value="USA">United States</option>
                <option value="CAN">Canada</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                State / Region *
              </label>
              <select
                value={form.state_region}
                onChange={(e) => update('state_region', e.target.value)}
                className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
              >
                <option value="">Select state...</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                City
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                placeholder="e.g., Chicago"
                className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
              Postal Codes
            </label>
            <input
              type="text"
              value={form.postal_codes}
              onChange={(e) => update('postal_codes', e.target.value)}
              placeholder="e.g., 34230, 34231, 34232"
              className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
              Assign Licensee (Optional)
            </label>
            <select
              value={form.tenant_id}
              onChange={(e) => update('tenant_id', e.target.value)}
              className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
            >
              <option value="">Leave unassigned</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-white/20 text-white/60 font-bold uppercase tracking-wider hover:border-white/40 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Create Territory
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Venue Modal ────────────────────────────────────────────────────────────

interface VenueModalProps {
  open: boolean
  onClose: () => void
  onCreated: (venue: { id: string; name: string; city?: string; state?: string; tenant_id?: string }) => void
  preselectedTenantId?: string
}

function CreateVenueModal({ open, onClose, onCreated, preselectedTenantId }: VenueModalProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [territories, setTerritories] = useState<Array<{
    id: string; name: string; state_region: string; city: string | null; tenant_id: string | null; tenant_name: string | null
  }>>([])
  const [selectedTerritoryId, setSelectedTerritoryId] = useState('')
  const [form, setForm] = useState({
    tenant_id: preselectedTenantId || '',
    name: '',
    short_name: '',
    address_line_1: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    facility_type: 'other',
    indoor_outdoor: 'both',
    max_daily_capacity: '',
    primary_contact_name: '',
    primary_contact_email: '',
    primary_contact_phone: '',
    notes: '',
  })

  useEffect(() => {
    if (!open) return
    // Reset form when opening
    setError(null)
    setSaving(false)
    setForm(prev => ({ ...prev, tenant_id: preselectedTenantId || '' }))

    // Fetch territories for dropdown
    fetch('/api/admin/camps/territories', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.territories) setTerritories(data.territories)
      })
      .catch(() => {})
  }, [open, preselectedTenantId])

  const update = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleTerritoryChange = (territoryId: string) => {
    setSelectedTerritoryId(territoryId)
    if (territoryId) {
      const t = territories.find(t => t.id === territoryId)
      if (t?.tenant_id) {
        setForm(prev => ({ ...prev, tenant_id: t.tenant_id! }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.name.trim()) { setError('Venue name is required'); return }
    if (!form.address_line_1.trim()) { setError('Address is required'); return }
    if (!form.city.trim()) { setError('City is required'); return }
    if (!form.state) { setError('State is required'); return }
    if (!form.postal_code.trim()) { setError('Postal code is required'); return }

    setSaving(true)
    try {
      const response = await fetch('/api/admin/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          tenant_id: form.tenant_id || null,
          max_daily_capacity: form.max_daily_capacity ? parseInt(form.max_daily_capacity) : null,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        setError(result.error || 'Failed to create venue')
        setSaving(false)
        return
      }

      const newVenue = result.data
      onCreated({
        id: newVenue.id,
        name: form.name.trim(),
        city: form.city.trim() || undefined,
        state: form.state || undefined,
        tenant_id: form.tenant_id || undefined,
      })
    } catch {
      setError('Failed to create venue')
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-10 pb-10 overflow-y-auto">
      <div className="fixed inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-dark-100 border border-white/10 w-full max-w-2xl mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-black uppercase tracking-wider text-white">Create New Venue</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 transition-colors">
            <X className="h-5 w-5 text-white/50" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-magenta/10 border border-magenta/30 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-magenta flex-shrink-0" />
            <p className="text-sm text-magenta">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Territory */}
          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
              Territory
            </label>
            <select
              value={selectedTerritoryId}
              onChange={(e) => handleTerritoryChange(e.target.value)}
              className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
            >
              <option value="">Global (All territories)</option>
              {territories.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} - {t.city ? `${t.city}, ` : ''}{t.state_region}
                  {t.tenant_name ? ` (${t.tenant_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Name row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                Venue Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
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
                value={form.short_name}
                onChange={(e) => update('short_name', e.target.value)}
                placeholder="e.g., Northside"
                className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
              />
            </div>
          </div>

          {/* Type row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                Facility Type
              </label>
              <select
                value={form.facility_type}
                onChange={(e) => update('facility_type', e.target.value)}
                className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
              >
                {FACILITY_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                Indoor / Outdoor
              </label>
              <select
                value={form.indoor_outdoor}
                onChange={(e) => update('indoor_outdoor', e.target.value)}
                className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
              >
                {INDOOR_OUTDOOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
              Address *
            </label>
            <input
              type="text"
              value={form.address_line_1}
              onChange={(e) => update('address_line_1', e.target.value)}
              placeholder="Street address"
              className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                City *
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                placeholder="City"
                className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                State *
              </label>
              <select
                value={form.state}
                onChange={(e) => update('state', e.target.value)}
                className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
              >
                <option value="">Select...</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                ZIP Code *
              </label>
              <input
                type="text"
                value={form.postal_code}
                onChange={(e) => update('postal_code', e.target.value)}
                placeholder="ZIP"
                className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
              />
            </div>
          </div>

          {/* Capacity */}
          <div className="max-w-xs">
            <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
              Max Daily Capacity
            </label>
            <input
              type="number"
              value={form.max_daily_capacity}
              onChange={(e) => update('max_daily_capacity', e.target.value)}
              placeholder="e.g., 100"
              min="0"
              className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
            />
          </div>

          {/* Contact */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                Contact Name
              </label>
              <input
                type="text"
                value={form.primary_contact_name}
                onChange={(e) => update('primary_contact_name', e.target.value)}
                placeholder="Name"
                className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                Contact Email
              </label>
              <input
                type="email"
                value={form.primary_contact_email}
                onChange={(e) => update('primary_contact_email', e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                Contact Phone
              </label>
              <input
                type="tel"
                value={form.primary_contact_phone}
                onChange={(e) => update('primary_contact_phone', e.target.value)}
                placeholder="Phone"
                className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-white/20 text-white/60 font-bold uppercase tracking-wider hover:border-white/40 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors disabled:opacity-50"
            >
              {saving ? (
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
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function CreateCampPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [userRole, setUserRole] = useState<string | null>(null)
  const [userTenantId, setUserTenantId] = useState<string | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [venues, setVenues] = useState<Venue[]>([])

  // Modal state
  const [showTerritoryModal, setShowTerritoryModal] = useState(false)
  const [showVenueModal, setShowVenueModal] = useState(false)

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

  // Auto-save draft to database whenever the user leaves the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      const fd = formData
      const tenantId = fd.tenant_id || userTenantId || ''
      if (!tenantId) return

      const today = new Date().toISOString().split('T')[0]
      const draftData = {
        ...fd,
        name: fd.name.trim() || 'Untitled Draft',
        tenant_id: tenantId,
        start_date: fd.start_date || today,
        end_date: fd.end_date || today,
        status: 'draft',
      }

      const blob = new Blob([JSON.stringify(draftData)], { type: 'application/json' })
      navigator.sendBeacon('/api/admin/camps?action=create', blob)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [formData, userTenantId])

  useEffect(() => {
    if (user) {
      loadInitialData()
    }
  }, [user])

  useEffect(() => {
    if (formData.tenant_id) {
      loadLocations(formData.tenant_id)
      loadVenues(formData.tenant_id)
    }
  }, [formData.tenant_id])

  async function loadInitialData() {
    if (!user) {
      setError('Not authenticated')
      return
    }
    try {
      const roleResponse = await fetch('/api/admin/camps/user-role')
      if (!roleResponse.ok) {
        const errorData = await roleResponse.json()
        setError(errorData.error || 'Not authenticated')
        setLoading(false)
        return
      }
      const roleData = await roleResponse.json()

      setUserRole(roleData.role)
      setUserTenantId(roleData.tenant_id)

      if (roleData.role === 'hq_admin') {
        const tenantsResponse = await fetch('/api/admin/camps/tenants')
        if (tenantsResponse.ok) {
          const tenantsData = await tenantsResponse.json()
          setTenants(tenantsData.tenants || [])
        }
      } else if (roleData.tenant_id) {
        setFormData(prev => ({ ...prev, tenant_id: roleData.tenant_id! }))
        await loadLocations(roleData.tenant_id)
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
      const response = await fetch(`/api/admin/camps/locations?tenantId=${tenantId}`)
      if (response.ok) {
        const data = await response.json()
        setLocations(data.locations || [])
      }
    } catch (err) {
      console.error('Failed to load locations:', err)
    }
  }

  async function loadVenues(tenantId: string) {
    try {
      const response = await fetch(`/api/admin/venues?tenantId=${tenantId}`)
      if (response.ok) {
        const json = await response.json()
        const venueList: Record<string, unknown>[] = Array.isArray(json.data) ? json.data : []
        setVenues(venueList.map((v) => ({
          id: v.id as string,
          name: v.name as string,
          short_name: (v.short_name ?? null) as string | null,
          city: v.city as string | null,
          state: v.state as string | null,
          tenant_id: (v.tenant_id ?? null) as string | null,
        })))
      }
    } catch (err) {
      console.error('Failed to load venues:', err)
    }
  }

  const handleTerritoryCreated = (territory: { id: string; name: string; tenant_id?: string }) => {
    setShowTerritoryModal(false)
    // Refresh tenants list and auto-select if tenant was assigned
    fetch('/api/admin/camps/tenants')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.tenants) {
          setTenants(data.tenants)
          // If the new territory had a tenant assigned, select it
          if (territory.tenant_id) {
            setFormData(prev => ({ ...prev, tenant_id: territory.tenant_id! }))
          }
        }
      })
      .catch(() => {})
  }

  const handleVenueCreated = (venue: { id: string; name: string; city?: string; state?: string; tenant_id?: string }) => {
    setShowVenueModal(false)
    // Add the new venue to the list and auto-select it
    setVenues(prev => [...prev, {
      id: venue.id,
      name: venue.name,
      short_name: null,
      city: venue.city || null,
      state: venue.state || null,
      tenant_id: venue.tenant_id || null,
    }])
    setFormData(prev => ({ ...prev, venue_id: venue.id, location_id: null }))
  }

  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    setFormData(prev => ({ ...prev, name, slug }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    if (!formData.tenant_id) {
      setError('Please select a territory')
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

    try {
      const response = await fetch('/api/admin/camps?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create camp')
      }

      const data = await response.json()
      router.replace(`/portal/camps/${data.camp.id}/schedule`)
    } catch (err) {
      console.error('Failed to create camp:', err)
      setError(err instanceof Error ? err.message : 'Failed to create camp')
      setSaving(false)
    }
  }

  const isHqAdmin = userRole === 'hq_admin'

  if (loading) {
    return (
      <AdminLayout userRole="licensee_owner" userName="Admin">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-neon" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      userRole={userRole as 'hq_admin' | 'licensee_owner' || 'licensee_owner'}
      userName="Admin"
      tenantName={isHqAdmin ? undefined : 'Your Territory'}
    >
      {/* Modals */}
      <CreateTerritoryModal
        open={showTerritoryModal}
        onClose={() => setShowTerritoryModal(false)}
        onCreated={handleTerritoryCreated}
        tenants={tenants}
      />
      <CreateVenueModal
        open={showVenueModal}
        onClose={() => setShowVenueModal(false)}
        onCreated={handleVenueCreated}
        preselectedTenantId={formData.tenant_id}
      />

      <div className="mb-6">
        <Link
          href="/portal/camps"
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
                      value={formData.tenant_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, tenant_id: e.target.value, location_id: null, venue_id: null }))}
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                    >
                      <option value="">Select a territory...</option>
                      {tenants.map(tenant => (
                        <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowTerritoryModal(true)}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm text-neon hover:text-neon/80 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Create New Territory
                    </button>
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

            <ContentCard title="Location" accent="magenta">
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                  <MapPin className="h-4 w-4 inline mr-2" />
                  Venue
                </label>
                <select
                  value={formData.venue_id ? `venue:${formData.venue_id}` : formData.location_id ? `location:${formData.location_id}` : ''}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val.startsWith('venue:')) {
                      setFormData(prev => ({ ...prev, venue_id: val.replace('venue:', ''), location_id: null }))
                    } else if (val.startsWith('location:')) {
                      setFormData(prev => ({ ...prev, location_id: val.replace('location:', ''), venue_id: null }))
                    } else {
                      setFormData(prev => ({ ...prev, venue_id: null, location_id: null }))
                    }
                  }}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-magenta focus:outline-none"
                  disabled={!formData.tenant_id}
                >
                  <option value="">Select a venue...</option>
                  {venues.length > 0 && (
                    <optgroup label="Venues">
                      {venues.map(venue => (
                        <option key={venue.id} value={`venue:${venue.id}`}>
                          {venue.name}{venue.city ? ` - ${venue.city}, ${venue.state}` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {locations.length > 0 && (
                    <optgroup label="Locations (Legacy)">
                      {locations.map(loc => (
                        <option key={loc.id} value={`location:${loc.id}`}>
                          {loc.name} - {loc.city}, {loc.state}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {!formData.tenant_id && (
                  <p className="mt-2 text-sm text-white/40">Select a territory first to see venues</p>
                )}
                {formData.tenant_id && venues.length === 0 && locations.length === 0 && (
                  <p className="mt-2 text-sm text-white/40">
                    No venues found for this territory.{' '}
                    <button
                      type="button"
                      onClick={() => setShowVenueModal(true)}
                      className="text-neon hover:underline"
                    >
                      Create one now
                    </button>
                  </p>
                )}
                {formData.tenant_id && (
                  <button
                    type="button"
                    onClick={() => setShowVenueModal(true)}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm text-neon hover:text-neon/80 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Create New Venue
                  </button>
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
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Save & Continue
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>

                <Link
                  href="/portal/camps"
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
