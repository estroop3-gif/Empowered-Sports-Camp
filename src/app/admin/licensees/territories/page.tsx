'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'

// Types (matching the service types)
type TerritoryStatus = 'open' | 'reserved' | 'assigned' | 'closed'

interface Territory {
  id: string
  name: string
  description: string | null
  country: string
  state_region: string
  city: string | null
  postal_codes: string | null
  tenant_id: string | null
  status: TerritoryStatus
  notes: string | null
  created_at: string
  updated_at: string
  tenant_name?: string | null
}

interface TerritoryStats {
  total: number
  open: number
  reserved: number
  assigned: number
  closed: number
}
import { cn } from '@/lib/utils'
import {
  MapPin,
  Plus,
  Search,
  Globe,
  Filter,
  MoreVertical,
  Edit,
  Eye,
  UserPlus,
  UserMinus,
  Archive,
  RotateCcw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Building2,
  ChevronDown,
} from 'lucide-react'
import { TerritoryEditModal } from '@/components/admin/TerritoryEditModal'

/**
 * Territories Page
 *
 * Central hub for HQ to define, manage, and inspect territories.
 * Territories are geographic regions that can be licensed to operators.
 */

type StatusFilter = TerritoryStatus | 'all'

const STATUS_CONFIG: Record<TerritoryStatus, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ElementType }> = {
  open: {
    label: 'Open',
    color: 'text-neon',
    bgColor: 'bg-neon/10',
    borderColor: 'border-neon/30',
    icon: CheckCircle,
  },
  reserved: {
    label: 'Reserved',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    borderColor: 'border-yellow-400/30',
    icon: Clock,
  },
  assigned: {
    label: 'Assigned',
    color: 'text-magenta',
    bgColor: 'bg-magenta/10',
    borderColor: 'border-magenta/30',
    icon: Building2,
  },
  closed: {
    label: 'Closed',
    color: 'text-white/40',
    bgColor: 'bg-white/5',
    borderColor: 'border-white/10',
    icon: XCircle,
  },
}

export default function TerritoriesPage() {
  const router = useRouter()
  const [territories, setTerritories] = useState<Territory[]>([])
  const [stats, setStats] = useState<TerritoryStats | null>(null)
  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [tenantFilter, setTenantFilter] = useState<string>('')

  // UI state
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [editModalTerritory, setEditModalTerritory] = useState<Territory | null>(null)
  const [mounted, setMounted] = useState(false)

  // Track mount state for portal
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/admin/territories', { credentials: 'include' })
        const result = await response.json()

        if (!response.ok) {
          setError(result.error || 'Failed to load territories')
        } else {
          setTerritories(result.data?.territories || [])
          setStats(result.data?.stats || null)
          setTenants(result.data?.tenants || [])
        }
      } catch (err) {
        setError('Failed to load territories')
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  // Filter territories
  const filteredTerritories = useMemo(() => {
    return territories.filter((territory) => {
      // Status filter
      if (statusFilter !== 'all' && territory.status !== statusFilter) {
        return false
      }

      // Tenant filter
      if (tenantFilter && territory.tenant_id !== tenantFilter) {
        return false
      }

      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        return (
          territory.name.toLowerCase().includes(searchLower) ||
          territory.city?.toLowerCase().includes(searchLower) ||
          territory.state_region.toLowerCase().includes(searchLower) ||
          territory.tenant_name?.toLowerCase().includes(searchLower)
        )
      }

      return true
    })
  }, [territories, statusFilter, tenantFilter, searchQuery])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-dropdown]')) return
      setActiveDropdown(null)
      setDropdownPosition(null)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Handle edit modal save
  const handleEditSave = (updatedTerritory: Territory) => {
    setTerritories((prev) =>
      prev.map((t) => (t.id === updatedTerritory.id ? updatedTerritory : t))
    )
    setEditModalTerritory(null)
  }

  // Action handlers
  const handleClose = async (id: string) => {
    if (!confirm('Are you sure you want to close this territory? It will be archived and no longer available for assignment.')) {
      return
    }

    setProcessingId(id)
    try {
      const response = await fetch(`/api/admin/territories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' }),
      })

      if (response.ok) {
        setTerritories((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: 'closed' as TerritoryStatus, tenant_id: null, tenant_name: null } : t))
        )
        // Update stats
        if (stats) {
          const oldStatus = territories.find((t) => t.id === id)?.status
          setStats({
            ...stats,
            closed: stats.closed + 1,
            [oldStatus as string]: stats[oldStatus as keyof TerritoryStats] as number - 1,
          })
        }
      } else {
        const result = await response.json()
        alert(result.error || 'Failed to close territory')
      }
    } catch {
      alert('Failed to close territory')
    }

    setProcessingId(null)
    setActiveDropdown(null)
    setDropdownPosition(null)
  }

  const handleReopen = async (id: string) => {
    setProcessingId(id)
    try {
      const response = await fetch(`/api/admin/territories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reopen' }),
      })

      if (response.ok) {
        setTerritories((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: 'open' as TerritoryStatus } : t))
        )
        if (stats) {
          setStats({
            ...stats,
            closed: stats.closed - 1,
            open: stats.open + 1,
          })
        }
      } else {
        const result = await response.json()
        alert(result.error || 'Failed to reopen territory')
      }
    } catch {
      alert('Failed to reopen territory')
    }

    setProcessingId(null)
    setActiveDropdown(null)
    setDropdownPosition(null)
  }

  const handleUnassign = async (id: string) => {
    if (!confirm('Remove the licensee from this territory? The territory will become open again.')) {
      return
    }

    setProcessingId(id)
    try {
      const response = await fetch(`/api/admin/territories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unassign' }),
      })

      if (response.ok) {
        setTerritories((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: 'open' as TerritoryStatus, tenant_id: null, tenant_name: null } : t))
        )
        if (stats) {
          setStats({
            ...stats,
            assigned: stats.assigned - 1,
            open: stats.open + 1,
          })
        }
      } else {
        const result = await response.json()
        alert(result.error || 'Failed to unassign territory')
      }
    } catch {
      alert('Failed to unassign territory')
    }

    setProcessingId(null)
    setActiveDropdown(null)
    setDropdownPosition(null)
  }

  const getLocationString = (territory: Territory) => {
    const parts = []
    if (territory.city) parts.push(territory.city)
    parts.push(territory.state_region)
    if (territory.country !== 'USA') parts.push(territory.country)
    return parts.join(', ')
  }

  const getStatusBadge = (status: TerritoryStatus) => {
    const config = STATUS_CONFIG[status]
    const Icon = config.icon

    return (
      <span className={cn(
        'inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase tracking-wider border',
        config.bgColor,
        config.color,
        config.borderColor
      )}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    )
  }

  return (
    <AdminLayout userRole="hq_admin" userName="Admin">
      <PageHeader
        title="Territories"
        description="Define, assign, and manage license territories for Empowered Sports Camp."
      >
        <Link
          href="/admin/licensees/territories/new"
          className="flex items-center gap-2 px-6 py-3 bg-neon text-black text-sm font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Territory
        </Link>
      </PageHeader>

      {/* Stats Summary */}
      <div className="grid gap-4 sm:grid-cols-4 mb-8">
        <button
          onClick={() => setStatusFilter('all')}
          className={cn(
            'p-6 bg-dark-100 border transition-colors text-left',
            statusFilter === 'all' ? 'border-neon' : 'border-white/10 hover:border-white/20'
          )}
        >
          <div className="flex items-center gap-3 mb-2">
            <Globe className="h-5 w-5 text-neon" />
            <span className="text-sm font-bold uppercase tracking-wider text-white/60">Total</span>
          </div>
          <p className="text-3xl font-black text-white">{stats?.total || 0}</p>
        </button>
        <button
          onClick={() => setStatusFilter('open')}
          className={cn(
            'p-6 bg-dark-100 border transition-colors text-left',
            statusFilter === 'open' ? 'border-neon' : 'border-white/10 hover:border-white/20'
          )}
        >
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="h-5 w-5 text-neon" />
            <span className="text-sm font-bold uppercase tracking-wider text-white/60">Open</span>
          </div>
          <p className="text-3xl font-black text-neon">{stats?.open || 0}</p>
        </button>
        <button
          onClick={() => setStatusFilter('reserved')}
          className={cn(
            'p-6 bg-dark-100 border transition-colors text-left',
            statusFilter === 'reserved' ? 'border-yellow-400' : 'border-white/10 hover:border-white/20'
          )}
        >
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-5 w-5 text-yellow-400" />
            <span className="text-sm font-bold uppercase tracking-wider text-white/60">Reserved</span>
          </div>
          <p className="text-3xl font-black text-yellow-400">{stats?.reserved || 0}</p>
        </button>
        <button
          onClick={() => setStatusFilter('assigned')}
          className={cn(
            'p-6 bg-dark-100 border transition-colors text-left',
            statusFilter === 'assigned' ? 'border-magenta' : 'border-white/10 hover:border-white/20'
          )}
        >
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-5 w-5 text-magenta" />
            <span className="text-sm font-bold uppercase tracking-wider text-white/60">Assigned</span>
          </div>
          <p className="text-3xl font-black text-magenta">{stats?.assigned || 0}</p>
        </button>
      </div>

      {/* Filters Row */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          <input
            type="text"
            placeholder="Search by name, city, state, or licensee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/40 focus:border-neon focus:outline-none"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="pl-12 pr-8 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none appearance-none min-w-[160px]"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="reserved">Reserved</option>
            <option value="assigned">Assigned</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="relative">
          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          <select
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
            className="pl-12 pr-8 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none appearance-none min-w-[180px]"
          >
            <option value="">All Licensees</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <ContentCard>
          <div className="py-16 text-center">
            <Loader2 className="h-12 w-12 text-neon animate-spin mx-auto mb-4" />
            <p className="text-white/50">Loading territories...</p>
          </div>
        </ContentCard>
      )}

      {/* Error State */}
      {error && !loading && (
        <ContentCard>
          <div className="py-16 text-center">
            <div className="mx-auto h-16 w-16 bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-wider text-white mb-2">
              Error Loading Territories
            </h3>
            <p className="text-white/50 max-w-md mx-auto mb-8">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
            >
              Try Again
            </button>
          </div>
        </ContentCard>
      )}

      {/* Empty State */}
      {!loading && !error && territories.length === 0 && (
        <ContentCard>
          <div className="py-16 text-center">
            <div className="mx-auto h-16 w-16 bg-purple/10 border border-purple/30 flex items-center justify-center mb-6">
              <MapPin className="h-8 w-8 text-purple" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-wider text-white mb-2">
              No Territories Defined Yet
            </h3>
            <p className="text-white/50 max-w-md mx-auto mb-8">
              Territories define the geographic regions where licensees can operate.
              Each territory can be assigned to one licensee at a time.
            </p>
            <Link
              href="/admin/licensees/territories/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add First Territory
            </Link>
          </div>
        </ContentCard>
      )}

      {/* No Results State */}
      {!loading && !error && territories.length > 0 && filteredTerritories.length === 0 && (
        <ContentCard>
          <div className="py-16 text-center">
            <div className="mx-auto h-16 w-16 bg-white/5 border border-white/10 flex items-center justify-center mb-6">
              <Search className="h-8 w-8 text-white/30" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-wider text-white mb-2">
              No Results Found
            </h3>
            <p className="text-white/50 max-w-md mx-auto mb-8">
              No territories match your current filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('all')
                setTenantFilter('')
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </ContentCard>
      )}

      {/* Territories Table */}
      {!loading && !error && filteredTerritories.length > 0 && (
        <ContentCard>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">
                    Territory
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">
                    Licensee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-white/40">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTerritories.map((territory) => (
                  <tr
                    key={territory.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'h-10 w-10 flex items-center justify-center flex-shrink-0 border',
                          STATUS_CONFIG[territory.status].bgColor,
                          STATUS_CONFIG[territory.status].borderColor
                        )}>
                          <MapPin className={cn('h-5 w-5', STATUS_CONFIG[territory.status].color)} />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{territory.name}</p>
                          {territory.description && (
                            <p className="text-sm text-white/40 truncate max-w-[200px]">
                              {territory.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-white/60">{getLocationString(territory)}</p>
                      {territory.postal_codes && (
                        <p className="text-xs text-white/30 truncate max-w-[150px]">
                          {territory.postal_codes}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {territory.tenant_id && territory.tenant_name ? (
                        <Link
                          href={`/admin/licensees?tenant=${territory.tenant_id}`}
                          className="text-magenta hover:underline"
                        >
                          {territory.tenant_name}
                        </Link>
                      ) : (
                        <span className="text-white/30">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(territory.status)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Quick Edit Button */}
                        <Link
                          href={`/admin/licensees/territories/${territory.id}`}
                          className="p-2 text-white/40 hover:text-neon transition-colors"
                          title="View / Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>

                        {/* Actions Dropdown */}
                        <div className="relative" data-dropdown>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (activeDropdown === territory.id) {
                                setActiveDropdown(null)
                                setDropdownPosition(null)
                              } else {
                                // Calculate position for the dropdown using document coordinates
                                // This allows scrolling to reveal the dropdown
                                const button = e.currentTarget
                                const rect = button.getBoundingClientRect()
                                const scrollX = window.scrollX
                                const scrollY = window.scrollY
                                const dropdownWidth = 208 // w-52 (13rem)

                                // Position in document space (not viewport)
                                let left = rect.right + scrollX - dropdownWidth
                                if (left < 8) left = 8

                                // Position below the button
                                const top = rect.bottom + scrollY + 4

                                setDropdownPosition({ top, left })
                                setActiveDropdown(territory.id)
                              }
                            }}
                            className="p-2 text-white/40 hover:text-white transition-colors"
                            disabled={processingId === territory.id}
                          >
                            {processingId === territory.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreVertical className="h-4 w-4" />
                            )}
                          </button>

                          {/* Dropdown rendered via portal below */}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-4 py-3 border-t border-white/10">
            <p className="text-sm text-white/40">
              Showing {filteredTerritories.length} of {territories.length} territor
              {territories.length !== 1 ? 'ies' : 'y'}
            </p>
          </div>
        </ContentCard>
      )}

      {/* Actions Dropdown Portal */}
      {mounted && activeDropdown && dropdownPosition && createPortal(
        <div
          style={{
            position: 'absolute',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            zIndex: 99999,
          }}
          className="w-52 bg-black border border-white/10 shadow-xl"
          data-dropdown
        >
          {(() => {
            const territory = filteredTerritories.find(t => t.id === activeDropdown)
            if (!territory) return null
            return (
              <>
                <button
                  onClick={() => {
                    setEditModalTerritory(territory)
                    setActiveDropdown(null)
                    setDropdownPosition(null)
                  }}
                  className="flex items-center gap-2 w-full px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  Edit Territory
                </button>
                <Link
                  href={`/admin/licensees/territories/${territory.id}`}
                  className="flex items-center gap-2 px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  View Details
                </Link>

                {territory.status !== 'closed' && (
                  <>
                    {!territory.tenant_id ? (
                      <Link
                        href={`/admin/licensees/territories/${territory.id}/assign`}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <UserPlus className="h-4 w-4" />
                        Assign Licensee
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleUnassign(territory.id)}
                        className="flex items-center gap-2 w-full px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <UserMinus className="h-4 w-4" />
                        Remove Licensee
                      </button>
                    )}

                    <button
                      onClick={() => handleClose(territory.id)}
                      className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Archive className="h-4 w-4" />
                      Close Territory
                    </button>
                  </>
                )}

                {territory.status === 'closed' && (
                  <button
                    onClick={() => handleReopen(territory.id)}
                    className="flex items-center gap-2 w-full px-4 py-3 text-sm text-neon hover:bg-neon/10 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reopen Territory
                  </button>
                )}
              </>
            )
          })()}
        </div>,
        document.body
      )}

      {/* Edit Modal */}
      {editModalTerritory && (
        <TerritoryEditModal
          territory={editModalTerritory}
          onClose={() => setEditModalTerritory(null)}
          onSave={handleEditSave}
        />
      )}
    </AdminLayout>
  )
}
