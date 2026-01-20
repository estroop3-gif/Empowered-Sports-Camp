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
} from 'lucide-react'

// Types (defined locally to avoid Prisma imports in client component)
interface CampFormData {
  name: string
  slug: string
  description: string
  sport: string
  location_id: string | null
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

  const [formData, setFormData] = useState<CampFormData>({
    name: '',
    slug: '',
    description: '',
    sport: 'Multi-Sport',
    location_id: null,
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

  useEffect(() => {
    if (formData.tenant_id) {
      loadLocations(formData.tenant_id)
    }
  }, [formData.tenant_id])

  async function loadInitialData() {
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
      setUserTenantId(roleData.tenant_id)

      if (roleData.role === 'hq_admin') {
        // Fetch tenants for HQ admin
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
      // Create camp via API
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
      // Navigate to Step 2: Curriculum & Schedule
      router.replace(`/portal/camps/${data.camp.id}/schedule`)
    } catch (err) {
      console.error('Failed to create camp:', err)
      setError(err instanceof Error ? err.message : 'Failed to create camp')
      setSaving(false)
    }
    // Don't setSaving(false) on success - let the redirect handle it
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
                      onChange={(e) => setFormData(prev => ({ ...prev, tenant_id: e.target.value, location_id: null }))}
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                    >
                      <option value="">Select a territory...</option>
                      {tenants.map(tenant => (
                        <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                      ))}
                    </select>
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
                  value={formData.location_id || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, location_id: e.target.value || null }))}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-magenta focus:outline-none"
                  disabled={!formData.tenant_id}
                >
                  <option value="">Select a location...</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} - {loc.city}, {loc.state}
                    </option>
                  ))}
                </select>
                {!formData.tenant_id && (
                  <p className="mt-2 text-sm text-white/40">Select a territory first to see locations</p>
                )}
                {formData.tenant_id && locations.length === 0 && (
                  <p className="mt-2 text-sm text-white/40">No locations found for this territory</p>
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
