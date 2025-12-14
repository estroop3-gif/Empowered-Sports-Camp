'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
} from 'lucide-react'
import {
  fetchAdminCamps,
  getCurrentUserRole,
  duplicateCamp,
  deleteCamp,
  type AdminCamp,
} from '@/lib/services/admin-camps'

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

  useEffect(() => {
    loadCamps()
  }, [statusFilter])

  async function loadCamps() {
    setLoading(true)
    setError(null)

    try {
      const options: { status?: string } = {}
      if (statusFilter) {
        options.status = statusFilter
      }

      const { camps: campData } = await fetchAdminCamps(options)
      setCamps(campData)
    } catch (err) {
      console.error('Failed to load camps:', err)
      setError('Failed to load camps')
    } finally {
      setLoading(false)
    }
  }

  async function handleDuplicate(id: string) {
    try {
      await duplicateCamp(id)
      loadCamps()
      setActionMenuOpen(null)
    } catch (err) {
      console.error('Failed to duplicate:', err)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this camp? This cannot be undone.')) return

    try {
      await deleteCamp(id)
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
    const startDate = new Date(start)
    const endDate = new Date(end)
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}, ${startDate.getFullYear()}`
  }

  const filteredCamps = camps.filter(camp => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      camp.name.toLowerCase().includes(q) ||
      camp.location?.city?.toLowerCase().includes(q) ||
      camp.tenant?.name?.toLowerCase().includes(q)
    )
  })

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

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
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
              {searchQuery || statusFilter
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Camp</th>
                  <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Territory</th>
                  <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Dates</th>
                  <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Location</th>
                  <th className="text-right py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Price</th>
                  <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Capacity</th>
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
                      <span className="text-white/70">{camp.tenant?.name || '-'}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-white/70">{formatDateRange(camp.start_date, camp.end_date)}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-white/70">
                        <MapPin className="h-4 w-4 text-white/40" />
                        {camp.location ? `${camp.location.city}, ${camp.location.state}` : 'No location'}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-bold text-neon">{formatPrice(camp.price)}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-white/70">{camp.capacity}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <TableBadge variant={STATUS_COLORS[camp.status] || 'default'}>
                        {camp.status}
                      </TableBadge>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActionMenuOpen(actionMenuOpen === camp.id ? null : camp.id)}
                          className="p-2 hover:bg-white/10 transition-colors"
                        >
                          <MoreHorizontal className="h-5 w-5 text-white/50" />
                        </button>
                        {actionMenuOpen === camp.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActionMenuOpen(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-dark-100 border border-white/10 shadow-xl">
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
