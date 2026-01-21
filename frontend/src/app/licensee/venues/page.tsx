'use client'

/**
 * Licensee Venues Page
 *
 * List and manage venues for the licensee's tenant.
 * Shows both tenant-owned venues (editable) and global venues (read-only).
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth/context'
import { PortalPageHeader, PortalCard } from '@/components/portal'
import {
  MapPin,
  Plus,
  Search,
  Building2,
  Loader2,
  MoreVertical,
  Eye,
  Pencil,
  Archive,
  RotateCcw,
  Users,
  Globe,
  Lock,
} from 'lucide-react'

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
  hero_image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface VenueStats {
  total: number
  active: number
  archived: number
}

const FACILITY_TYPE_LABELS: Record<string, string> = {
  school: 'School',
  park: 'Park',
  sports_complex: 'Sports Complex',
  private_gym: 'Private Gym',
  community_center: 'Community Center',
  recreation_center: 'Recreation Center',
  other: 'Other',
}

export default function LicenseeVenuesPage() {
  const { user, tenant } = useAuth()
  const [venues, setVenues] = useState<Venue[]>([])
  const [stats, setStats] = useState<VenueStats>({ total: 0, active: 0, archived: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [facilityTypeFilter, setFacilityTypeFilter] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  // Filter options
  const [states, setStates] = useState<string[]>([])
  const [cities, setCities] = useState<string[]>([])

  // Action menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const fetchVenues = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (stateFilter) params.set('state', stateFilter)
      if (cityFilter) params.set('city', cityFilter)
      if (facilityTypeFilter) params.set('facilityType', facilityTypeFilter)
      if (!showArchived) params.set('activeOnly', 'true')

      const res = await fetch(`/api/licensee/venues?${params.toString()}`, {
        credentials: 'include',
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch venues')
      }

      setVenues(json.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load venues')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, stateFilter, cityFilter, facilityTypeFilter, showArchived])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/licensee/venues?action=stats', {
        credentials: 'include',
      })
      const json = await res.json()
      if (res.ok && json.data) {
        setStats(json.data)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }, [])

  const fetchFilterOptions = useCallback(async () => {
    try {
      // Get unique states and cities from current venues
      const statesSet = new Set<string>()
      const citiesSet = new Set<string>()
      venues.forEach((v) => {
        if (v.state) statesSet.add(v.state)
        if (v.city) citiesSet.add(v.city)
      })
      setStates(Array.from(statesSet).sort())
      setCities(Array.from(citiesSet).sort())
    } catch (err) {
      console.error('Failed to fetch filter options:', err)
    }
  }, [venues])

  useEffect(() => {
    fetchVenues()
    fetchStats()
  }, [fetchVenues, fetchStats])

  useEffect(() => {
    fetchFilterOptions()
  }, [fetchFilterOptions])

  const handleArchive = async (id: string) => {
    try {
      const res = await fetch(`/api/licensee/venues/${id}`, {
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

      fetchVenues()
      fetchStats()
    } catch (err) {
      alert('Failed to archive venue')
    }
    setOpenMenuId(null)
  }

  const handleReactivate = async (id: string) => {
    try {
      const res = await fetch(`/api/licensee/venues/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'reactivate' }),
      })

      if (!res.ok) {
        const json = await res.json()
        alert(json.error || 'Failed to reactivate venue')
        return
      }

      fetchVenues()
      fetchStats()
    } catch (err) {
      alert('Failed to reactivate venue')
    }
    setOpenMenuId(null)
  }

  const isOwnVenue = (venue: Venue) => venue.tenant_id === tenant?.id

  return (
    <div>
      <PortalPageHeader
        title="Venues"
        description="Manage your camp venues and locations"
        actions={
          <Link
            href="/licensee/venues/new"
            className="flex items-center gap-2 px-4 py-2 bg-neon text-black text-sm font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Venue
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <PortalCard accent="neon">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-neon/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-neon" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{stats.total}</p>
              <p className="text-xs text-white/40 uppercase tracking-wider">Total Venues</p>
            </div>
          </div>
        </PortalCard>
        <PortalCard accent="purple">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-purple/10 flex items-center justify-center">
              <MapPin className="h-6 w-6 text-purple" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{stats.active}</p>
              <p className="text-xs text-white/40 uppercase tracking-wider">Active</p>
            </div>
          </div>
        </PortalCard>
        <PortalCard accent="magenta">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-magenta/10 flex items-center justify-center">
              <Archive className="h-6 w-6 text-magenta" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{stats.archived}</p>
              <p className="text-xs text-white/40 uppercase tracking-wider">Archived</p>
            </div>
          </div>
        </PortalCard>
      </div>

      {/* Filters */}
      <PortalCard className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search venues..."
              className="w-full h-10 bg-dark-100 border border-white/10 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
            />
          </div>

          {/* State */}
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="h-10 bg-dark-100 border border-white/10 px-3 text-sm text-white focus:border-neon focus:outline-none"
          >
            <option value="">All States</option>
            {states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>

          {/* City */}
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="h-10 bg-dark-100 border border-white/10 px-3 text-sm text-white focus:border-neon focus:outline-none"
          >
            <option value="">All Cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          {/* Facility Type */}
          <select
            value={facilityTypeFilter}
            onChange={(e) => setFacilityTypeFilter(e.target.value)}
            className="h-10 bg-dark-100 border border-white/10 px-3 text-sm text-white focus:border-neon focus:outline-none"
          >
            <option value="">All Types</option>
            {Object.entries(FACILITY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Show Archived Toggle */}
        <div className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="showArchived"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-4 w-4 border-white/20 bg-dark-100 text-neon focus:ring-neon/30"
          />
          <label htmlFor="showArchived" className="text-sm text-white/60">
            Show archived venues
          </label>
        </div>
      </PortalCard>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-neon animate-spin" />
        </div>
      )}

      {/* Venues Grid */}
      {!loading && venues.length === 0 && (
        <PortalCard>
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Venues Found</h3>
            <p className="text-white/50 mb-6">
              {searchQuery || stateFilter || cityFilter || facilityTypeFilter
                ? 'No venues match your filters.'
                : 'Get started by adding your first venue.'}
            </p>
            <Link
              href="/licensee/venues/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-neon text-black text-sm font-bold uppercase tracking-wider hover:bg-neon/90"
            >
              <Plus className="h-4 w-4" />
              Add Venue
            </Link>
          </div>
        </PortalCard>
      )}

      {!loading && venues.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {venues.map((venue) => (
            <div
              key={venue.id}
              className={`bg-black border ${
                venue.is_active ? 'border-white/10' : 'border-white/5 opacity-60'
              } overflow-hidden group relative`}
            >
              {/* Hero Image */}
              <div className="relative h-40 bg-dark-100">
                {venue.hero_image_url ? (
                  <Image
                    src={venue.hero_image_url}
                    alt={venue.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <Building2 className="h-12 w-12 text-white/10" />
                  </div>
                )}

                {/* Ownership Badge */}
                <div
                  className={`absolute top-2 left-2 px-2 py-1 text-xs font-bold uppercase tracking-wider ${
                    isOwnVenue(venue)
                      ? 'bg-purple/90 text-white'
                      : 'bg-white/10 text-white/70'
                  }`}
                >
                  {isOwnVenue(venue) ? (
                    <span className="flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Your Venue
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      Global
                    </span>
                  )}
                </div>

                {/* Status Badge */}
                {!venue.is_active && (
                  <div className="absolute top-2 right-2 px-2 py-1 bg-red-500/90 text-white text-xs font-bold uppercase tracking-wider">
                    Archived
                  </div>
                )}

                {/* Actions Menu */}
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === venue.id ? null : venue.id)}
                    className="p-2 bg-black/50 text-white hover:bg-black/70 transition-colors"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {openMenuId === venue.id && (
                    <div className="absolute right-0 mt-1 w-48 bg-black border border-white/10 shadow-lg z-10">
                      <Link
                        href={`/licensee/venues/${venue.id}`}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </Link>
                      {isOwnVenue(venue) && (
                        <>
                          <Link
                            href={`/licensee/venues/${venue.id}`}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Link>
                          {venue.is_active ? (
                            <button
                              onClick={() => handleArchive(venue.id)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Archive className="h-4 w-4" />
                              Archive
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(venue.id)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-neon hover:text-neon/80 hover:bg-neon/10"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Reactivate
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="text-lg font-bold text-white truncate">{venue.name}</h3>
                <p className="text-sm text-white/50 truncate">
                  {venue.city}, {venue.state}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {venue.facility_type && (
                    <span className="px-2 py-1 bg-white/5 text-xs text-white/60 uppercase tracking-wider">
                      {FACILITY_TYPE_LABELS[venue.facility_type] || venue.facility_type}
                    </span>
                  )}
                  {venue.indoor_outdoor && (
                    <span className="px-2 py-1 bg-white/5 text-xs text-white/60 uppercase tracking-wider">
                      {venue.indoor_outdoor}
                    </span>
                  )}
                  {venue.max_daily_capacity && (
                    <span className="px-2 py-1 bg-white/5 text-xs text-white/60 uppercase tracking-wider flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {venue.max_daily_capacity}
                    </span>
                  )}
                </div>

                {/* Sports */}
                {venue.sports_supported && venue.sports_supported.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {venue.sports_supported.slice(0, 3).map((sport) => (
                      <span
                        key={sport}
                        className="px-2 py-0.5 bg-purple/10 text-purple text-xs uppercase tracking-wider"
                      >
                        {sport}
                      </span>
                    ))}
                    {venue.sports_supported.length > 3 && (
                      <span className="px-2 py-0.5 bg-white/5 text-white/40 text-xs">
                        +{venue.sports_supported.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
