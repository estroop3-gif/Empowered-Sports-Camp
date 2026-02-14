'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { parseDateSafe } from '@/lib/utils'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { DataTable, TableBadge } from '@/components/ui/data-table'
import {
  Calendar,
  MapPin,
  Users,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  Eye,
  Loader2,
  ClipboardList,
  UsersRound,
  LayoutDashboard,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'

// Type definition (avoid importing from Prisma-based service in client component)
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
  venue?: {
    id: string
    name: string
    short_name: string | null
    city: string | null
    state: string | null
  } | null
  tenant?: {
    id: string
    name: string
    slug: string
  } | null
  program_type?: string
  venue_id?: string | null
  registration_count?: number
  territory_name?: string | null
}

/**
 * Admin Camps Page
 *
 * HQ Admin view of all camps across all territories.
 * Links stay within /admin/* routes.
 */

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  open: 'success',
  published: 'default',
  draft: 'warning',
  closed: 'danger',
}

export default function AdminCampsPage() {
  const [camps, setCamps] = useState<AdminCamp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})

  // Additional filters
  const [programTypeFilter, setProgramTypeFilter] = useState<string>('')
  const [venueFilter, setVenueFilter] = useState<string>('')
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('')
  const [capacityFilter, setCapacityFilter] = useState<string>('')

  // Sort state
  const [sortColumn, setSortColumn] = useState<'start_date' | 'capacity' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Compute unique filter options from data
  const programTypes = useMemo(() => {
    const types = new Set<string>()
    camps.forEach(c => { if (c.program_type) types.add(c.program_type) })
    return Array.from(types).sort()
  }, [camps])

  const venueOptions = useMemo(() => {
    const map = new Map<string, string>()
    camps.forEach(c => {
      if (c.venue?.id && c.venue?.name) map.set(c.venue.id, c.venue.name)
    })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [camps])

  function handleSort(column: 'start_date' | 'capacity') {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const hasActiveFilters = programTypeFilter || venueFilter || dateRangeFilter || capacityFilter

  useEffect(() => {
    loadCamps()
  }, [statusFilter])

  async function loadCamps() {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (statusFilter) {
        params.set('status', statusFilter)
      }

      const response = await fetch(`/api/admin/camps?${params.toString()}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch camps')
      }

      setCamps(result.camps || [])
    } catch (err) {
      console.error('Failed to load camps:', err)
      setError(`Failed to load camps: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleDuplicate(id: string) {
    try {
      const response = await fetch(`/api/admin/camps?action=duplicate&id=${id}`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('Failed to duplicate camp')
      }
      loadCamps()
      setActionMenuOpen(null)
    } catch (err) {
      console.error('Failed to duplicate:', err)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this camp? This cannot be undone.')) return

    try {
      const response = await fetch(`/api/admin/camps?id=${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete camp')
      }
      loadCamps()
      setActionMenuOpen(null)
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  const formatDateRange = (start: string, end: string) => {
    const startDate = parseDateSafe(start)
    const endDate = parseDateSafe(end)
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}, ${startDate.getFullYear()}`
  }

  const filteredCamps = useMemo(() => {
    const filtered = camps.filter(camp => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchesSearch = (
          camp.name.toLowerCase().includes(q) ||
          camp.venue?.name?.toLowerCase().includes(q) ||
          camp.venue?.city?.toLowerCase().includes(q) ||
          camp.tenant?.name?.toLowerCase().includes(q)
        )
        if (!matchesSearch) return false
      }

      // Program type filter
      if (programTypeFilter && camp.program_type !== programTypeFilter) return false

      // Venue filter
      if (venueFilter && camp.venue?.id !== venueFilter) return false

      // Date range filter
      if (dateRangeFilter) {
        const now = new Date()
        const startDate = new Date(camp.start_date.includes('T') ? camp.start_date : `${camp.start_date}T12:00:00`)
        if (dateRangeFilter === 'upcoming') {
          if (startDate <= now) return false
        } else if (dateRangeFilter === 'this_month') {
          if (startDate.getMonth() !== now.getMonth() || startDate.getFullYear() !== now.getFullYear()) return false
        } else if (dateRangeFilter === 'past') {
          const endDate = new Date(camp.end_date.includes('T') ? camp.end_date : `${camp.end_date}T12:00:00`)
          if (endDate >= now) return false
        }
      }

      // Capacity filter
      if (capacityFilter) {
        const regCount = camp.registration_count || 0
        if (capacityFilter === 'has_spots') {
          if (regCount >= camp.capacity) return false
        } else if (capacityFilter === 'full') {
          if (regCount < camp.capacity) return false
        }
      }

      return true
    })

    if (sortColumn) {
      const dir = sortDirection === 'asc' ? 1 : -1
      filtered.sort((a, b) => {
        if (sortColumn === 'start_date') {
          return a.start_date.localeCompare(b.start_date) * dir
        }
        return (a.capacity - b.capacity) * dir
      })
    }

    return filtered
  }, [camps, searchQuery, programTypeFilter, venueFilter, dateRangeFilter, capacityFilter, sortColumn, sortDirection])

  return (
    <AdminLayout
      userRole="hq_admin"
      userName="Admin"
    >
      <PageHeader
        title="Camp Management"
        description="Manage camps across all territories"
      >
        <Link
          href="/admin/camps/new"
          className="flex items-center gap-2 px-6 py-3 bg-neon text-black text-sm font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Create Camp
        </Link>
      </PageHeader>

      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
            <input
              type="text"
              placeholder="Search camps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/40 focus:border-neon focus:outline-none"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-12 pr-8 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none appearance-none min-w-[160px]"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={programTypeFilter}
            onChange={(e) => setProgramTypeFilter(e.target.value)}
            className="px-4 py-2 bg-black border border-white/20 text-white text-sm focus:border-neon focus:outline-none appearance-none min-w-[160px]"
          >
            <option value="">All Program Types</option>
            {programTypes.map(pt => (
              <option key={pt} value={pt}>{pt.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
            ))}
          </select>

          <select
            value={venueFilter}
            onChange={(e) => setVenueFilter(e.target.value)}
            className="px-4 py-2 bg-black border border-white/20 text-white text-sm focus:border-neon focus:outline-none appearance-none min-w-[160px]"
          >
            <option value="">All Venues</option>
            {venueOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>

          <select
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value)}
            className="px-4 py-2 bg-black border border-white/20 text-white text-sm focus:border-neon focus:outline-none appearance-none min-w-[140px]"
          >
            <option value="">All Dates</option>
            <option value="upcoming">Upcoming</option>
            <option value="this_month">This Month</option>
            <option value="past">Past</option>
          </select>

          <select
            value={capacityFilter}
            onChange={(e) => setCapacityFilter(e.target.value)}
            className="px-4 py-2 bg-black border border-white/20 text-white text-sm focus:border-neon focus:outline-none appearance-none min-w-[140px]"
          >
            <option value="">All Capacity</option>
            <option value="has_spots">Has Spots</option>
            <option value="full">Full</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setProgramTypeFilter('')
                setVenueFilter('')
                setDateRangeFilter('')
                setCapacityFilter('')
              }}
              className="px-4 py-2 text-sm text-magenta border border-magenta/30 hover:bg-magenta/10 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-magenta/10 border border-magenta/30 text-magenta">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-neon" />
        </div>
      ) : filteredCamps.length === 0 ? (
        <ContentCard>
          <div className="py-12 text-center">
            <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Camps Found</h3>
            <p className="text-white/50 mb-6">
              {searchQuery || statusFilter || hasActiveFilters
                ? 'Try adjusting your filters'
                : 'Get started by creating your first camp'}
            </p>
            <Link
              href="/admin/camps/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Camp
            </Link>
          </div>
        </ContentCard>
      ) : (
        <ContentCard>
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Camp</th>
                  <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Territory</th>
                  <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">
                    <button
                      onClick={() => handleSort('start_date')}
                      className={`inline-flex items-center gap-1 cursor-pointer hover:text-white transition-colors ${sortColumn === 'start_date' ? 'text-neon' : ''}`}
                    >
                      Dates
                      {sortColumn === 'start_date' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3" />
                      )}
                    </button>
                  </th>
                  <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Venue</th>
                  <th className="text-right py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Price</th>
                  <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">
                    <button
                      onClick={() => handleSort('capacity')}
                      className={`inline-flex items-center gap-1 cursor-pointer hover:text-white transition-colors ${sortColumn === 'capacity' ? 'text-neon' : ''}`}
                    >
                      Capacity
                      {sortColumn === 'capacity' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3" />
                      )}
                    </button>
                  </th>
                  <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Status</th>
                  <th className="text-right py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCamps.map((camp) => (
                  <tr key={camp.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-bold text-white">{camp.name}</div>
                        <div className="text-sm text-white/40">Ages {camp.age_min}-{camp.age_max}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-white/70">{camp.territory_name || camp.tenant?.name || '-'}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-white/70">{formatDateRange(camp.start_date, camp.end_date)}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-white/70">
                        <MapPin className="h-4 w-4 text-white/40" />
                        {camp.venue
                          ? [camp.venue.name, camp.venue.city, camp.venue.state].filter(Boolean).join(', ')
                          : 'No venue'}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-bold text-neon">{formatPrice(camp.price)}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-white/70">
                        <span className="font-bold text-white">{camp.registration_count ?? 0}</span>
                        {' / '}
                        {camp.capacity}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <TableBadge variant={STATUS_COLORS[camp.status] || 'default'}>
                        {camp.status}
                      </TableBadge>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="relative inline-block">
                        <button
                          ref={(el) => { buttonRefs.current[camp.id] = el }}
                          onClick={() => {
                            if (actionMenuOpen === camp.id) {
                              setActionMenuOpen(null)
                              setMenuPosition(null)
                            } else {
                              const button = buttonRefs.current[camp.id]
                              if (button) {
                                const rect = button.getBoundingClientRect()
                                const menuHeight = 384 // approx 8 items × 48px
                                const spaceBelow = window.innerHeight - rect.bottom - 16
                                const top = spaceBelow < menuHeight
                                  ? Math.max(16, rect.top - Math.min(menuHeight, rect.top - 16))
                                  : rect.bottom + 4
                                setMenuPosition({
                                  top,
                                  left: rect.right - 192, // 192px = w-48
                                })
                              }
                              setActionMenuOpen(camp.id)
                            }
                          }}
                          className="p-2 hover:bg-white/10 transition-colors"
                        >
                          <MoreHorizontal className="h-5 w-5 text-white/50" />
                        </button>
                        {actionMenuOpen === camp.id && menuPosition && (
                          <>
                            <div
                              className="fixed inset-0 z-[70]"
                              onClick={() => {
                                setActionMenuOpen(null)
                                setMenuPosition(null)
                              }}
                            />
                            <div
                              className="fixed w-48 max-h-[calc(100vh-2rem)] overflow-y-auto bg-dark-100 border border-white/10 shadow-xl z-[80]"
                              style={{ top: menuPosition.top, left: menuPosition.left }}
                            >
                              <Link
                                href={`/admin/camps/${camp.id}/hq`}
                                className="flex items-center gap-3 px-4 py-3 text-sm text-neon font-bold hover:bg-neon/10 transition-colors"
                              >
                                <LayoutDashboard className="h-4 w-4" />
                                Camp HQ
                              </Link>
                              <Link
                                href={`/admin/camps/${camp.id}`}
                                className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                <Edit className="h-4 w-4" />
                                Edit Camp
                              </Link>
                              <Link
                                href={`/admin/camps/${camp.id}/roster`}
                                className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                <ClipboardList className="h-4 w-4" />
                                The Roster
                              </Link>
                              <Link
                                href={`/admin/camps/${camp.id}/grouping`}
                                className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                <UsersRound className="h-4 w-4" />
                                Grouping
                              </Link>
                              <Link
                                href={`/admin/camps/${camp.id}/addons`}
                                className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                <Plus className="h-4 w-4" />
                                Manage Add-Ons
                              </Link>
                              <Link
                                href={`/camps/${camp.slug}`}
                                target="_blank"
                                className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                                View Public Page
                              </Link>
                              <button
                                onClick={() => handleDuplicate(camp.id)}
                                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                <Copy className="h-4 w-4" />
                                Duplicate
                              </button>
                              <button
                                onClick={() => handleDelete(camp.id)}
                                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-magenta hover:bg-magenta/10 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ContentCard>
      )}
    </AdminLayout>
  )
}
