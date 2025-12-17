'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'

// Type definition (no longer imported from service)
interface Licensee {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  city: string | null
  state: string | null
  created_at: string
  role_id?: string
  tenant_id?: string | null
  is_active?: boolean
  tenant_name?: string | null
  territory_name?: string | null
}
import {
  Building2,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Edit,
  Eye,
  UserMinus,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  UserCheck,
  MapPin,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LicenseeEditModal } from '@/components/admin/LicenseeEditModal'

/**
 * All Licensees Page
 *
 * Lists all profiles with licensee_owner role.
 * Includes search, filter, and actions for each licensee.
 */

type LicenseeStatus = 'active' | 'pending' | 'inactive' | ''

export default function AllLicenseesPage() {
  const router = useRouter()
  const [licensees, setLicensees] = useState<Licensee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<LicenseeStatus>('')
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [deactivating, setDeactivating] = useState<string | null>(null)
  const [activating, setActivating] = useState<string | null>(null)
  const [editModalLicensee, setEditModalLicensee] = useState<Licensee | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null)

  // Territory assignment state
  const [territories, setTerritories] = useState<Array<{ id: string; name: string; state_region: string; status: string; tenant_id: string | null }>>([])
  const [assignTerritoryLicensee, setAssignTerritoryLicensee] = useState<Licensee | null>(null)
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>('')
  const [assigningTerritory, setAssigningTerritory] = useState(false)

  // Fetch licensees on mount
  useEffect(() => {
    async function fetchLicensees() {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/licensees?action=all')
        const { data, error: fetchError } = await res.json()

        if (fetchError) {
          setError(fetchError || 'Failed to load licensees')
          setLicensees([])
        } else {
          setLicensees(data || [])
        }
      } catch (err) {
        setError('Failed to load licensees')
        setLicensees([])
      }

      setLoading(false)
    }

    fetchLicensees()
  }, [])

  // Fetch territories when assign modal opens
  useEffect(() => {
    async function fetchTerritories() {
      if (!assignTerritoryLicensee) return

      try {
        const res = await fetch('/api/admin/territories', { credentials: 'include' })
        const result = await res.json()
        if (result.data?.territories) {
          setTerritories(result.data.territories)
        }
      } catch (err) {
        console.error('Failed to load territories:', err)
      }
    }

    fetchTerritories()
  }, [assignTerritoryLicensee])

  // Handle territory assignment
  const handleAssignTerritory = async () => {
    if (!assignTerritoryLicensee || !selectedTerritoryId) return

    setAssigningTerritory(true)

    try {
      const res = await fetch(`/api/admin/territories/${selectedTerritoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign',
          tenant_id: assignTerritoryLicensee.tenant_id,
        }),
      })

      const result = await res.json()

      if (res.ok) {
        // Get the territory name
        const territory = territories.find(t => t.id === selectedTerritoryId)

        // Update the licensee in the list with the new territory
        setLicensees((prev) =>
          prev.map((l) =>
            l.id === assignTerritoryLicensee.id
              ? { ...l, territory_name: territory?.name || 'Assigned' }
              : l
          )
        )

        // Close modal
        setAssignTerritoryLicensee(null)
        setSelectedTerritoryId('')
      } else {
        alert(result.error || 'Failed to assign territory')
      }
    } catch (err) {
      alert('Failed to assign territory')
    }

    setAssigningTerritory(false)
  }

  // Filter licensees based on search and status
  const filteredLicensees = useMemo(() => {
    return licensees.filter((licensee) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch =
        !searchQuery ||
        licensee.email?.toLowerCase().includes(searchLower) ||
        licensee.first_name?.toLowerCase().includes(searchLower) ||
        licensee.last_name?.toLowerCase().includes(searchLower) ||
        licensee.territory_name?.toLowerCase().includes(searchLower) ||
        licensee.city?.toLowerCase().includes(searchLower) ||
        licensee.state?.toLowerCase().includes(searchLower)

      // Status filter
      const matchesStatus =
        !statusFilter ||
        (statusFilter === 'active' && licensee.is_active) ||
        (statusFilter === 'inactive' && !licensee.is_active) ||
        (statusFilter === 'pending' && licensee.is_active) // For now, treat pending as active

      return matchesSearch && matchesStatus
    })
  }, [licensees, searchQuery, statusFilter])

  // Handle deactivate licensee
  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this licensee?')) return

    setDeactivating(id)

    try {
      const res = await fetch('/api/licensees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deactivate', id }),
      })
      const { success, error: deactivateError } = await res.json()

      if (success) {
        // Update local state
        setLicensees((prev) =>
          prev.map((l) => (l.id === id ? { ...l, is_active: false } : l))
        )
      } else {
        alert(deactivateError || 'Failed to deactivate licensee')
      }
    } catch (err) {
      alert('Failed to deactivate licensee')
    }

    setDeactivating(null)
    setActiveDropdown(null)
  }

  // Handle activate licensee
  const handleActivate = async (id: string) => {
    if (!confirm('Are you sure you want to reactivate this licensee?')) return

    setActivating(id)

    try {
      const res = await fetch('/api/licensees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate', id }),
      })
      const { success, error: activateError } = await res.json()

      if (success) {
        // Update local state
        setLicensees((prev) =>
          prev.map((l) => (l.id === id ? { ...l, is_active: true } : l))
        )
      } else {
        alert(activateError || 'Failed to activate licensee')
      }
    } catch (err) {
      alert('Failed to activate licensee')
    }

    setActivating(null)
    setActiveDropdown(null)
  }

  // Handle edit modal save
  const handleEditSave = (updatedLicensee: Licensee) => {
    setLicensees((prev) =>
      prev.map((l) => (l.id === updatedLicensee.id ? updatedLicensee : l))
    )
    setEditModalLicensee(null)
  }

  // Close dropdown when clicking outside or scrolling
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Don't close if clicking inside a dropdown or on the dropdown trigger
      if (target.closest('[data-dropdown]')) return
      setActiveDropdown(null)
      setDropdownPosition(null)
    }
    const handleScroll = () => {
      setActiveDropdown(null)
      setDropdownPosition(null)
    }
    document.addEventListener('click', handleClickOutside)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('click', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [])

  // Handle dropdown toggle with position calculation
  const handleDropdownToggle = (licenseeId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (activeDropdown === licenseeId) {
      setActiveDropdown(null)
      setDropdownPosition(null)
    } else {
      const button = e.currentTarget
      const rect = button.getBoundingClientRect()
      const dropdownWidth = 192 // w-48 = 12rem = 192px
      const dropdownHeight = 150 // approximate height

      // Calculate position - prefer right-aligned, below the button
      let left = rect.right - dropdownWidth
      let top = rect.bottom + 4

      // If dropdown would go off the right edge, align to left of button
      if (left < 0) {
        left = rect.left
      }

      // If dropdown would go off the bottom, check if we need to scroll
      const viewportHeight = window.innerHeight
      if (top + dropdownHeight > viewportHeight) {
        // Position above if there's more room above
        if (rect.top > dropdownHeight) {
          top = rect.top - dropdownHeight - 4
        }
        // Otherwise keep below and let page scroll
      }

      setDropdownPosition({ top, left })
      setActiveDropdown(licenseeId)
    }
  }

  const getStatusBadge = (licensee: Licensee) => {
    if (!licensee.is_active) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/30">
          <XCircle className="h-3 w-3" />
          Inactive
        </span>
      )
    }
    // Could add more nuanced status based on onboarding completion
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase tracking-wider bg-neon/10 text-neon border border-neon/30">
        <CheckCircle className="h-3 w-3" />
        Active
      </span>
    )
  }

  const formatName = (licensee: Licensee) => {
    if (licensee.first_name || licensee.last_name) {
      return `${licensee.first_name || ''} ${licensee.last_name || ''}`.trim()
    }
    return 'No name'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <AdminLayout userRole="hq_admin" userName="Admin">
      <PageHeader
        title="All Licensees"
        description="Manage every licensed territory and operator from this view."
      >
        <Link
          href="/admin/licensees/new"
          className="flex items-center gap-2 px-6 py-3 bg-neon text-black text-sm font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Licensee
        </Link>
      </PageHeader>

      {/* Search and Filter Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          <input
            type="text"
            placeholder="Search by name, email, territory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/40 focus:border-neon focus:outline-none"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as LicenseeStatus)}
            className="pl-12 pr-8 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none appearance-none min-w-[160px]"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <ContentCard>
          <div className="py-16 text-center">
            <Loader2 className="h-12 w-12 text-neon animate-spin mx-auto mb-4" />
            <p className="text-white/50">Loading licensees...</p>
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
              Error Loading Licensees
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
      {!loading && !error && licensees.length === 0 && (
        <ContentCard>
          <div className="py-16 text-center">
            <div className="mx-auto h-16 w-16 bg-neon/10 border border-neon/30 flex items-center justify-center mb-6">
              <Building2 className="h-8 w-8 text-neon" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-wider text-white mb-2">
              No Licensees Yet
            </h3>
            <p className="text-white/50 max-w-md mx-auto mb-8">
              Licensees are the operators who run Empowered Sports Camps in
              their territories. Add your first licensee to get started.
            </p>
            <Link
              href="/admin/licensees/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create First Licensee
            </Link>
          </div>
        </ContentCard>
      )}

      {/* No Results State */}
      {!loading &&
        !error &&
        licensees.length > 0 &&
        filteredLicensees.length === 0 && (
          <ContentCard>
            <div className="py-16 text-center">
              <div className="mx-auto h-16 w-16 bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                <Search className="h-8 w-8 text-white/30" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-wider text-white mb-2">
                No Results Found
              </h3>
              <p className="text-white/50 max-w-md mx-auto mb-8">
                No licensees match your current search or filter criteria.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('')
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </ContentCard>
        )}

      {/* Licensees Table */}
      {!loading && !error && filteredLicensees.length > 0 && (
        <ContentCard>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">
                    Licensee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">
                    Territory
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-white/40">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLicensees.map((licensee) => (
                  <tr
                    key={licensee.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-magenta/10 border border-magenta/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-magenta font-bold">
                            {(licensee.first_name?.[0] || licensee.email[0] || 'L').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-white">
                            {formatName(licensee)}
                          </p>
                          <p className="text-sm text-white/40">{licensee.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-white">
                        {licensee.territory_name || 'No territory'}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-white/60">
                        {licensee.city && licensee.state
                          ? `${licensee.city}, ${licensee.state}`
                          : licensee.city || licensee.state || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-4">{getStatusBadge(licensee)}</td>
                    <td className="px-4 py-4">
                      <p className="text-white/40 text-sm">
                        {formatDate(licensee.created_at)}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Send Application Email Button */}
                        <button
                          onClick={() => router.push(`/admin/licensees/${licensee.id}/send-invite`)}
                          className="p-2 text-white/40 hover:text-neon transition-colors"
                          title="Send Application Email"
                        >
                          <Mail className="h-4 w-4" />
                        </button>

                        {/* Actions Dropdown */}
                        <div className="relative" data-dropdown>
                          <button
                            onClick={(e) => handleDropdownToggle(licensee.id, e)}
                            className="p-2 text-white/40 hover:text-white transition-colors"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer with count */}
          <div className="px-4 py-3 border-t border-white/10">
            <p className="text-sm text-white/40">
              Showing {filteredLicensees.length} of {licensees.length} licensee
              {licensees.length !== 1 ? 's' : ''}
            </p>
          </div>
        </ContentCard>
      )}

      {/* Fixed position dropdown portal */}
      {activeDropdown && dropdownPosition && (
        <div
          className="fixed w-48 bg-black border border-white/10 shadow-xl z-[9999]"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
          }}
          data-dropdown
        >
          {(() => {
            const licensee = filteredLicensees.find(l => l.id === activeDropdown)
            if (!licensee) return null
            return (
              <>
                <button
                  onClick={() => {
                    setEditModalLicensee(licensee)
                    setActiveDropdown(null)
                    setDropdownPosition(null)
                  }}
                  className="flex items-center gap-2 w-full px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  Edit Licensee
                </button>
                <Link
                  href={`/admin/analytics/licensees/${licensee.id}`}
                  className="flex items-center gap-2 px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                  onClick={() => {
                    setActiveDropdown(null)
                    setDropdownPosition(null)
                  }}
                >
                  <Eye className="h-4 w-4" />
                  View Analytics
                </Link>
                <button
                  onClick={() => {
                    setAssignTerritoryLicensee(licensee)
                    setSelectedTerritoryId('')
                    setActiveDropdown(null)
                    setDropdownPosition(null)
                  }}
                  className="flex items-center gap-2 w-full px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <MapPin className="h-4 w-4" />
                  {licensee.territory_name ? 'Change Territory' : 'Assign Territory'}
                </button>
                {licensee.is_active ? (
                  <button
                    onClick={() => handleDeactivate(licensee.id)}
                    disabled={deactivating === licensee.id}
                    className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    {deactivating === licensee.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserMinus className="h-4 w-4" />
                    )}
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={() => handleActivate(licensee.id)}
                    disabled={activating === licensee.id}
                    className="flex items-center gap-2 w-full px-4 py-3 text-sm text-neon hover:bg-neon/10 transition-colors"
                  >
                    {activating === licensee.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserCheck className="h-4 w-4" />
                    )}
                    Reactivate
                  </button>
                )}
              </>
            )
          })()}
        </div>
      )}

      {/* Edit Modal */}
      {editModalLicensee && (
        <LicenseeEditModal
          licensee={editModalLicensee}
          onClose={() => setEditModalLicensee(null)}
          onSave={handleEditSave}
        />
      )}

      {/* Territory Assignment Modal */}
      {assignTerritoryLicensee && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/80"
            onClick={() => {
              setAssignTerritoryLicensee(null)
              setSelectedTerritoryId('')
            }}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-dark-100 border border-white/10 w-full max-w-lg">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-purple/10 border border-purple/30 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-purple" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold uppercase tracking-wider text-white">
                      Assign Territory
                    </h2>
                    <p className="text-sm text-white/40">
                      {assignTerritoryLicensee.first_name} {assignTerritoryLicensee.last_name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setAssignTerritoryLicensee(null)
                    setSelectedTerritoryId('')
                  }}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {assignTerritoryLicensee.territory_name && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
                    Currently assigned to: <strong>{assignTerritoryLicensee.territory_name}</strong>
                  </div>
                )}

                <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                  Select Territory
                </label>

                {territories.length === 0 ? (
                  <div className="py-8 text-center text-white/40">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading territories...
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {/* Filter to only show open/reserved territories or the one already assigned */}
                    {territories
                      .filter(t => t.status === 'open' || t.status === 'reserved' || t.tenant_id === assignTerritoryLicensee.tenant_id)
                      .map((territory) => (
                        <button
                          key={territory.id}
                          onClick={() => setSelectedTerritoryId(territory.id)}
                          className={cn(
                            'w-full flex items-center justify-between p-3 border transition-all text-left',
                            selectedTerritoryId === territory.id
                              ? 'bg-purple/10 border-purple'
                              : 'bg-black/50 border-white/10 hover:border-white/30'
                          )}
                        >
                          <div>
                            <p className="font-semibold text-white">{territory.name}</p>
                            <p className="text-xs text-white/40">{territory.state_region}</p>
                          </div>
                          <span className={cn(
                            'text-xs uppercase tracking-wider px-2 py-1 border',
                            territory.status === 'open'
                              ? 'bg-neon/10 text-neon border-neon/30'
                              : territory.status === 'reserved'
                              ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30'
                              : 'bg-white/10 text-white/40 border-white/10'
                          )}>
                            {territory.status}
                          </span>
                        </button>
                      ))}

                    {territories.filter(t => t.status === 'open' || t.status === 'reserved').length === 0 && (
                      <div className="py-4 text-center text-white/40 text-sm">
                        No available territories. All territories are assigned or closed.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-4 px-6 py-4 border-t border-white/10">
                <button
                  onClick={() => {
                    setAssignTerritoryLicensee(null)
                    setSelectedTerritoryId('')
                  }}
                  disabled={assigningTerritory}
                  className="px-6 py-3 border border-white/20 text-white font-bold uppercase tracking-wider hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignTerritory}
                  disabled={assigningTerritory || !selectedTerritoryId}
                  className="flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assigningTerritory && <Loader2 className="h-4 w-4 animate-spin" />}
                  Assign Territory
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
