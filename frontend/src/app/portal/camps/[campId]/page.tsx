'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  Eye,
  Trash2,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react'

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
  created_at: string
  updated_at: string
  location?: {
    id: string
    name: string
    city: string | null
    state: string | null
  } | null
  tenant?: {
    id: string
    name: string
    slug: string
  } | null
}

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

interface PageProps {
  params: Promise<{ campId: string }>
}

export default function EditCampPage({ params }: PageProps) {
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

  const [formData, setFormData] = useState<Partial<CampFormData>>({})

  useEffect(() => {
    if (user) {
      loadCamp()
    }
  }, [campId, user])

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

      setCamp(campData)
      setFormData({
        name: campData.name,
        slug: campData.slug,
        description: campData.description || '',
        sport: campData.sport || 'Multi-Sport',
        location_id: campData.location_id,
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

      // Fetch locations from API
      const locationsResponse = await fetch(`/api/admin/camps/locations?tenantId=${campData.tenant_id}`)
      if (locationsResponse.ok) {
        const locationsData = await locationsResponse.json()
        setLocations(locationsData.locations || [])
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

      router.push('/portal/camps')
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

      router.push('/portal/camps')
    } catch (err) {
      console.error('Failed to delete camp:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete camp')
    } finally {
      setDeleting(false)
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

  if (!camp) {
    return (
      <AdminLayout userRole="licensee_owner" userName="Admin">
        <div className="text-center py-20">
          <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Camp Not Found</h2>
          <Link href="/portal/camps" className="text-neon hover:text-neon/80">
            Back to Camps
          </Link>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      userRole={userRole as 'hq_admin' | 'licensee_owner' || 'licensee_owner'}
      userName="Admin"
      tenantName={isHqAdmin ? camp.tenant?.name : undefined}
    >
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/portal/camps"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-neon transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Camps
        </Link>
        <Link
          href={`/camps/${camp.slug}`}
          target="_blank"
          className="inline-flex items-center gap-2 text-sm text-neon hover:text-neon/80 transition-colors"
        >
          <Eye className="h-4 w-4" />
          View Public Page
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <PageHeader title="Edit Camp" description={camp.name} />

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
                    value={formData.name || ''}
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
                      value={formData.slug || ''}
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
                    value={formData.sport || ''}
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
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none resize-none"
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
                >
                  <option value="">Select a location...</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} - {loc.city}, {loc.state}
                    </option>
                  ))}
                </select>
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
                    value={formData.start_date || ''}
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
                    value={formData.end_date || ''}
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
                    value={formData.start_time || ''}
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
                    value={formData.end_time || ''}
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
                    value={formData.age_min || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, age_min: parseInt(e.target.value) }))}
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
                    value={formData.age_max || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, age_max: parseInt(e.target.value) }))}
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
                    value={formData.capacity || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
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
                      value={formData.price || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
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
                      className="w-full pl-8 pr-4 py-3 bg-black border border-white/20 text-white focus:border-magenta focus:outline-none"
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
                      checked={formData.featured || false}
                      onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                      className="w-5 h-5"
                    />
                    <div>
                      <div className="font-bold text-white">Featured Camp</div>
                      <div className="text-sm text-white/50">Show prominently on Find Camps</div>
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
                  href="/portal/camps"
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
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
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
