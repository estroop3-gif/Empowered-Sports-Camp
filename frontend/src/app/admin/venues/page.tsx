'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { cn } from '@/lib/utils'
import {
  MapPin,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Eye,
  Archive,
  RotateCcw,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Building2,
  ChevronDown,
  Home,
  TreePine,
  Dumbbell,
  Users,
  Sun,
  Moon,
  Layers,
  Trash2,
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
  is_active: boolean
  created_at: string
  updated_at: string
  tenant_name?: string | null
  camp_count?: number
}

interface VenueStats {
  total: number
  active: number
  inactive: number
}

const FACILITY_TYPE_CONFIG: Record<FacilityType, { label: string; icon: React.ElementType }> = {
  school: { label: 'School', icon: Building2 },
  park: { label: 'Park', icon: TreePine },
  sports_complex: { label: 'Sports Complex', icon: Dumbbell },
  private_gym: { label: 'Private Gym', icon: Dumbbell },
  community_center: { label: 'Community Center', icon: Users },
  recreation_center: { label: 'Recreation Center', icon: Users },
  other: { label: 'Other', icon: Home },
}

const INDOOR_OUTDOOR_CONFIG: Record<IndoorOutdoor, { label: string; icon: React.ElementType; color: string }> = {
  indoor: { label: 'Indoor', icon: Home, color: 'text-blue-400' },
  outdoor: { label: 'Outdoor', icon: Sun, color: 'text-yellow-400' },
  both: { label: 'Mixed', icon: Layers, color: 'text-purple-400' },
}

type StatusFilter = 'all' | 'active' | 'inactive'

export default function AdminVenuesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [venues, setVenues] = useState<Venue[]>([])
  const [stats, setStats] = useState<VenueStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [cityFilter, setCityFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [facilityTypeFilter, setFacilityTypeFilter] = useState<FacilityType | ''>('')

  // Filter options (fetched from API)
  const [cities, setCities] = useState<string[]>([])
  const [states, setStates] = useState<string[]>([])

  // UI state
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Fetch data function
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const timestamp = Date.now() // Cache-busting
      const [venuesRes, statsRes, citiesRes, statesRes] = await Promise.all([
        fetch(`/api/admin/venues?activeOnly=false&_t=${timestamp}`, { credentials: 'include', cache: 'no-store' }),
        fetch(`/api/admin/venues?action=stats&_t=${timestamp}`, { credentials: 'include', cache: 'no-store' }),
        fetch(`/api/admin/venues?action=cities&_t=${timestamp}`, { credentials: 'include', cache: 'no-store' }),
        fetch(`/api/admin/venues?action=states&_t=${timestamp}`, { credentials: 'include', cache: 'no-store' }),
      ])

      const venuesData = await venuesRes.json()
      const statsData = await statsRes.json()
      const citiesData = await citiesRes.json()
      const statesData = await statesRes.json()

      console.log('[Venues] API Response:', { venuesData, statsData })

      if (!venuesRes.ok) {
        setError(venuesData.error || 'Failed to load venues')
      } else {
        console.log('[Venues] Setting venues:', venuesData.data?.length || 0, 'venues')
        setVenues(venuesData.data || [])
        setStats(statsData.data || null)
        setCities(citiesData.data || [])
        setStates(statesData.data || [])
      }
    } catch {
      setError('Failed to load venues')
    }

    setLoading(false)
  }, [])

  // Fetch data on mount
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Check for success message from URL params and refresh data
  useEffect(() => {
    const created = searchParams.get('created')
    const deleted = searchParams.get('deleted')
    const updated = searchParams.get('updated')

    if (created === 'true') {
      setSuccessMessage('Venue created successfully!')
      fetchData()
      router.replace('/admin/venues', { scroll: false })
      setTimeout(() => setSuccessMessage(null), 5000)
    } else if (deleted === 'true') {
      setSuccessMessage('Venue deleted successfully!')
      fetchData()
      router.replace('/admin/venues', { scroll: false })
      setTimeout(() => setSuccessMessage(null), 5000)
    } else if (updated === 'true') {
      setSuccessMessage('Venue updated successfully!')
      fetchData()
      router.replace('/admin/venues', { scroll: false })
      setTimeout(() => setSuccessMessage(null), 5000)
    }
  }, [searchParams, router, fetchData])

  // Filter venues
  const filteredVenues = useMemo(() => {
    return venues.filter((venue) => {
      // Status filter
      if (statusFilter === 'active' && !venue.is_active) return false
      if (statusFilter === 'inactive' && venue.is_active) return false

      // City filter
      if (cityFilter && venue.city !== cityFilter) return false

      // State filter
      if (stateFilter && venue.state !== stateFilter) return false

      // Facility type filter
      if (facilityTypeFilter && venue.facility_type !== facilityTypeFilter) return false

      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        return (
          venue.name.toLowerCase().includes(searchLower) ||
          venue.short_name?.toLowerCase().includes(searchLower) ||
          venue.city.toLowerCase().includes(searchLower) ||
          venue.region_label?.toLowerCase().includes(searchLower) ||
          venue.tenant_name?.toLowerCase().includes(searchLower)
        )
      }

      return true
    })
  }, [venues, statusFilter, cityFilter, stateFilter, facilityTypeFilter, searchQuery])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Action handlers
  const handleArchive = async (id: string) => {
    if (!confirm('Are you sure you want to archive this venue? It will no longer be available for camp assignment.')) {
      return
    }

    setProcessingId(id)
    try {
      const response = await fetch(`/api/admin/venues/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'archive' }),
      })

      const result = await response.json()

      if (response.ok) {
        setVenues((prev) => prev.map((v) => (v.id === id ? { ...v, is_active: false } : v)))
        if (stats) {
          setStats({ ...stats, active: stats.active - 1, inactive: stats.inactive + 1 })
        }
      } else {
        alert(result.error || 'Failed to archive venue')
      }
    } catch {
      alert('Failed to archive venue')
    }
    setProcessingId(null)
  }

  const handleReactivate = async (id: string) => {
    setProcessingId(id)
    try {
      const response = await fetch(`/api/admin/venues/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'reactivate' }),
      })

      if (response.ok) {
        setVenues((prev) => prev.map((v) => (v.id === id ? { ...v, is_active: true } : v)))
        if (stats) {
          setStats({ ...stats, active: stats.active + 1, inactive: stats.inactive - 1 })
        }
      } else {
        const result = await response.json()
        alert(result.error || 'Failed to reactivate venue')
      }
    } catch {
      alert('Failed to reactivate venue')
    }
    setProcessingId(null)
  }

  const handleDelete = async (id: string, venueName: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${venueName}"? This action cannot be undone.`)) {
      return
    }
    if (!confirm('This will remove this venue from all associated camps. Are you absolutely sure?')) {
      return
    }

    setProcessingId(id)
    setActiveDropdown(null)
    try {
      const response = await fetch(`/api/admin/venues/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const result = await response.json()

      if (response.ok) {
        setVenues((prev) => prev.filter((v) => v.id !== id))
        if (stats) {
          setStats({ ...stats, total: stats.total - 1, active: stats.active - 1 })
        }
        setSuccessMessage('Venue deleted successfully!')
        setTimeout(() => setSuccessMessage(null), 5000)
      } else {
        alert(result.error || 'Failed to delete venue')
      }
    } catch {
      alert('Failed to delete venue')
    }
    setProcessingId(null)
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

  return (
    <AdminLayout userRole="hq_admin" userName="Admin">
      <PageHeader
        title="Venues"
        description="Manage facility locations for camps across all territories"
      >
        <Link
          href="/admin/venues/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Venue
        </Link>
      </PageHeader>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-black border border-white/10">
            <div className="text-3xl font-black text-white">{stats.total}</div>
            <div className="text-sm text-white/50 uppercase tracking-wider">Total Venues</div>
          </div>
          <div className="p-4 bg-black border border-neon/30">
            <div className="text-3xl font-black text-neon">{stats.active}</div>
            <div className="text-sm text-white/50 uppercase tracking-wider">Active</div>
          </div>
          <div className="p-4 bg-black border border-white/10">
            <div className="text-3xl font-black text-white/40">{stats.inactive}</div>
            <div className="text-sm text-white/50 uppercase tracking-wider">Archived</div>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {successMessage && (
        <div className="mb-6 p-4 bg-neon/10 border border-neon/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-neon flex-shrink-0" />
            <p className="text-neon font-medium">{successMessage}</p>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-neon/60 hover:text-neon transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-magenta/10 border border-magenta/30 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-magenta flex-shrink-0" />
          <p className="text-magenta">{error}</p>
        </div>
      )}

      {/* Filters */}
      <ContentCard className="mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              type="text"
              placeholder="Search venues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black border border-white/20 text-white placeholder:text-white/40 focus:border-neon focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="appearance-none pl-4 pr-10 py-2 bg-black border border-white/20 text-white focus:border-neon focus:outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Archived Only</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
          </div>

          {/* State Filter */}
          <div className="relative">
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 bg-black border border-white/20 text-white focus:border-neon focus:outline-none cursor-pointer"
            >
              <option value="">All States</option>
              {states.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
          </div>

          {/* City Filter */}
          <div className="relative">
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 bg-black border border-white/20 text-white focus:border-neon focus:outline-none cursor-pointer"
            >
              <option value="">All Cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
          </div>

          {/* Facility Type Filter */}
          <div className="relative">
            <select
              value={facilityTypeFilter}
              onChange={(e) => setFacilityTypeFilter(e.target.value as FacilityType | '')}
              className="appearance-none pl-4 pr-10 py-2 bg-black border border-white/20 text-white focus:border-neon focus:outline-none cursor-pointer"
            >
              <option value="">All Types</option>
              {Object.entries(FACILITY_TYPE_CONFIG).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
          </div>
        </div>
      </ContentCard>

      {/* Venues List */}
      <ContentCard>
        {filteredVenues.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Venues Found</h3>
            <p className="text-white/50 mb-6">
              {searchQuery || statusFilter !== 'all' || cityFilter || stateFilter || facilityTypeFilter
                ? 'Try adjusting your filters'
                : 'Get started by adding your first venue'}
            </p>
            {!searchQuery && statusFilter === 'all' && !cityFilter && !stateFilter && !facilityTypeFilter && (
              <Link
                href="/admin/venues/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Your First Venue
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-white/60">Venue</th>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-white/60">Location</th>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-white/60">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-white/60">Indoor/Outdoor</th>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-white/60">Sports</th>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-white/60">Capacity</th>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-white/60">Status</th>
                  <th className="text-right py-3 px-4 text-xs font-bold uppercase tracking-wider text-white/60">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVenues.map((venue) => {
                  const facilityConfig = venue.facility_type ? FACILITY_TYPE_CONFIG[venue.facility_type] : null
                  const indoorOutdoorConfig = venue.indoor_outdoor ? INDOOR_OUTDOOR_CONFIG[venue.indoor_outdoor] : null
                  const FacilityIcon = facilityConfig?.icon || Building2
                  const IndoorOutdoorIcon = indoorOutdoorConfig?.icon || Layers

                  return (
                    <tr
                      key={venue.id}
                      className={cn(
                        'border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer',
                        !venue.is_active && 'opacity-50'
                      )}
                      onClick={() => router.push(`/admin/venues/${venue.id}`)}
                    >
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-bold text-white">{venue.name}</div>
                          {venue.short_name && (
                            <div className="text-sm text-white/50">{venue.short_name}</div>
                          )}
                          {venue.tenant_name && (
                            <div className="text-xs text-magenta mt-1">{venue.tenant_name}</div>
                          )}
                          {!venue.tenant_id && (
                            <div className="text-xs text-neon mt-1">Global</div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-white">{venue.city}, {venue.state}</div>
                        {venue.region_label && (
                          <div className="text-sm text-white/50">{venue.region_label}</div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <FacilityIcon className="h-4 w-4 text-white/60" />
                          <span className="text-white">{facilityConfig?.label || 'Other'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className={cn('flex items-center gap-2', indoorOutdoorConfig?.color || 'text-white/60')}>
                          <IndoorOutdoorIcon className="h-4 w-4" />
                          <span>{indoorOutdoorConfig?.label || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1">
                          {venue.sports_supported.slice(0, 3).map((sport) => (
                            <span
                              key={sport}
                              className="px-2 py-0.5 text-xs bg-white/10 text-white/80 rounded"
                            >
                              {sport}
                            </span>
                          ))}
                          {venue.sports_supported.length > 3 && (
                            <span className="px-2 py-0.5 text-xs bg-white/10 text-white/50 rounded">
                              +{venue.sports_supported.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-white">{venue.max_daily_capacity || '—'}</span>
                      </td>
                      <td className="py-4 px-4">
                        {venue.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-neon/10 text-neon text-xs font-bold uppercase">
                            <CheckCircle className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/10 text-white/50 text-xs font-bold uppercase">
                            <XCircle className="h-3 w-3" />
                            Archived
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveDropdown(activeDropdown === venue.id ? null : venue.id)
                            }}
                            className="p-2 hover:bg-white/10 transition-colors"
                          >
                            {processingId === venue.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-white/60" />
                            ) : (
                              <MoreVertical className="h-4 w-4 text-white/60" />
                            )}
                          </button>

                          {activeDropdown === venue.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-dark-100 border border-white/10 shadow-lg z-10">
                              <Link
                                href={`/admin/venues/${venue.id}`}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-white/5 transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                                View Details
                              </Link>
                              <Link
                                href={`/admin/venues/${venue.id}`}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-white/5 transition-colors"
                              >
                                <Edit className="h-4 w-4" />
                                Edit Venue
                              </Link>
                              <div className="border-t border-white/10" />
                              {venue.is_active ? (
                                <button
                                  onClick={() => handleArchive(venue.id)}
                                  className="flex items-center gap-2 px-4 py-2 text-sm text-magenta hover:bg-white/5 transition-colors w-full text-left"
                                >
                                  <Archive className="h-4 w-4" />
                                  Archive Venue
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleReactivate(venue.id)}
                                  className="flex items-center gap-2 px-4 py-2 text-sm text-neon hover:bg-white/5 transition-colors w-full text-left"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  Reactivate
                                </button>
                              )}
                              <div className="border-t border-white/10" />
                              <button
                                onClick={() => handleDelete(venue.id, venue.name)}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-white/5 transition-colors w-full text-left"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete Venue
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </ContentCard>
    </AdminLayout>
  )
}
