'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { getAllLicensees, deactivateLicensee, Licensee } from '@/lib/supabase/licensees'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

  // Fetch licensees on mount
  useEffect(() => {
    async function fetchLicensees() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await getAllLicensees()

      if (fetchError) {
        setError(fetchError.message || 'Failed to load licensees')
        setLicensees([])
      } else {
        setLicensees(data || [])
      }

      setLoading(false)
    }

    fetchLicensees()
  }, [])

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
    const { success, error: deactivateError } = await deactivateLicensee(id)

    if (success) {
      // Update local state
      setLicensees((prev) =>
        prev.map((l) => (l.id === id ? { ...l, is_active: false } : l))
      )
    } else {
      alert(deactivateError?.message || 'Failed to deactivate licensee')
    }

    setDeactivating(null)
    setActiveDropdown(null)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

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
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveDropdown(
                                activeDropdown === licensee.id
                                  ? null
                                  : licensee.id
                              )
                            }}
                            className="p-2 text-white/40 hover:text-white transition-colors"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {activeDropdown === licensee.id && (
                            <div
                              className="absolute right-0 top-full mt-1 w-48 bg-black border border-white/10 shadow-xl z-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link
                                href={`/admin/licensees/${licensee.id}`}
                                className="flex items-center gap-2 px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                                View Details
                              </Link>
                              <Link
                                href={`/admin/licensees/${licensee.id}/edit`}
                                className="flex items-center gap-2 px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                <Edit className="h-4 w-4" />
                                Edit Licensee
                              </Link>
                              <button
                                onClick={() => handleDeactivate(licensee.id)}
                                disabled={deactivating === licensee.id || !licensee.is_active}
                                className={cn(
                                  'flex items-center gap-2 w-full px-4 py-3 text-sm transition-colors',
                                  licensee.is_active
                                    ? 'text-red-400 hover:bg-red-500/10'
                                    : 'text-white/30 cursor-not-allowed'
                                )}
                              >
                                {deactivating === licensee.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <UserMinus className="h-4 w-4" />
                                )}
                                {licensee.is_active ? 'Deactivate' : 'Already Inactive'}
                              </button>
                            </div>
                          )}
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
    </AdminLayout>
  )
}
