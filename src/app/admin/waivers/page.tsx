'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { DataTable, TableBadge } from '@/components/ui/data-table'
import {
  FileText,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Shield,
  Globe,
  Building2,
  Clock,
  CheckCircle,
  Copy,
  Info,
} from 'lucide-react'
import { WaiverTemplateModal } from '@/components/waivers/WaiverTemplateModal'
import { WaiverPreviewModal } from '@/components/waivers/WaiverPreviewModal'

interface WaiverTemplate {
  id: string
  title: string
  description: string | null
  contentHtml: string
  isMandatorySiteWide: boolean
  isActive: boolean
  currentVersion: number
  createdAt: string
  updatedAt: string
  tenant: { id: string; name: string } | null
  createdByUser: { id: string; firstName: string | null; lastName: string | null } | null
  _count: {
    campRequirements: number
    athleteSignings: number
  }
}

export default function AdminWaiversPage() {
  const [waivers, setWaivers] = useState<WaiverTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const menuButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingWaiver, setEditingWaiver] = useState<WaiverTemplate | null>(null)
  const [previewingWaiver, setPreviewingWaiver] = useState<WaiverTemplate | null>(null)

  useEffect(() => {
    loadWaivers()
  }, [])

  async function loadWaivers() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/waivers')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch waivers')
      }

      setWaivers(result.waivers || [])
    } catch (err) {
      console.error('Failed to load waivers:', err)
      setError(`Failed to load waivers: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this waiver template? If it has been signed by anyone, it will be deactivated instead.')) return

    try {
      const response = await fetch(`/api/admin/waivers/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete waiver')
      }
      loadWaivers()
      setActionMenuOpen(null)
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const handleOpenMenu = (waiverId: string) => {
    if (actionMenuOpen === waiverId) {
      setActionMenuOpen(null)
      setMenuPosition(null)
      return
    }

    const button = menuButtonRefs.current.get(waiverId)
    if (button) {
      const rect = button.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 192, // 192px = w-48 menu width
      })
      setActionMenuOpen(waiverId)
    }
  }

  const closeMenu = () => {
    setActionMenuOpen(null)
    setMenuPosition(null)
  }

  const filteredWaivers = waivers.filter((waiver) => {
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        waiver.title.toLowerCase().includes(q) ||
        waiver.description?.toLowerCase().includes(q) ||
        waiver.tenant?.name?.toLowerCase().includes(q)
      if (!matchesSearch) return false
    }

    // Status filter
    if (statusFilter === 'active' && !waiver.isActive) return false
    if (statusFilter === 'inactive' && waiver.isActive) return false
    if (statusFilter === 'site-wide' && !waiver.isMandatorySiteWide) return false

    return true
  })

  return (
    <AdminLayout userRole="hq_admin" userName="Admin">
      <PageHeader
        title="Waiver Management"
        description="Create and manage waiver templates"
      >
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-neon text-black text-sm font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Create Waiver
        </button>
      </PageHeader>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          <input
            type="text"
            placeholder="Search waivers..."
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
            <option value="">All Waivers</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="site-wide">Site-Wide Only</option>
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
      ) : filteredWaivers.length === 0 ? (
        <ContentCard>
          <div className="py-12 text-center">
            <FileText className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Waivers Found</h3>
            <p className="text-white/50 mb-6">
              {searchQuery || statusFilter
                ? 'Try adjusting your filters'
                : 'Get started by creating your first waiver template'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Waiver
            </button>
          </div>
        </ContentCard>
      ) : (
        <ContentCard>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">
                    Waiver
                  </th>
                  <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">
                    Scope
                  </th>
                  <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">
                    Version
                  </th>
                  <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">
                    Camps
                  </th>
                  <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">
                    Signatures
                  </th>
                  <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">
                    Status
                  </th>
                  <th className="text-right py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredWaivers.map((waiver) => (
                  <tr
                    key={waiver.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          {waiver.title}
                          {waiver.isMandatorySiteWide && (
                            <span className="px-2 py-0.5 text-xs bg-magenta/10 text-magenta border border-magenta/30">
                              MANDATORY
                            </span>
                          )}
                        </div>
                        {waiver.description && (
                          <div className="text-sm text-white/40 line-clamp-1 mt-1">
                            {waiver.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {waiver.isMandatorySiteWide ? (
                        <div className="group relative">
                          <div className="flex items-center gap-2 text-magenta">
                            <Globe className="h-4 w-4" />
                            <span className="text-sm font-bold">All Camps</span>
                            <Info className="h-3 w-3 text-magenta/60" />
                          </div>
                          <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-50 w-64 p-2 bg-dark-100 border border-magenta/30 text-xs text-white/70 shadow-lg">
                            Required for every camp registration. Automatically included in all registration flows.
                          </div>
                        </div>
                      ) : waiver.tenant ? (
                        <div className="flex items-center gap-2 text-white/70">
                          <Building2 className="h-4 w-4 text-white/40" />
                          <span className="text-sm">{waiver.tenant.name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-purple">
                          <Shield className="h-4 w-4" />
                          <span className="text-sm">HQ Only</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-white/70">v{waiver.currentVersion}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-white/70">
                        {waiver._count.campRequirements}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="font-bold text-neon">
                        {waiver._count.athleteSignings}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <TableBadge variant={waiver.isActive ? 'success' : 'danger'}>
                        {waiver.isActive ? 'Active' : 'Inactive'}
                      </TableBadge>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        ref={(el) => {
                          if (el) menuButtonRefs.current.set(waiver.id, el)
                        }}
                        onClick={() => handleOpenMenu(waiver.id)}
                        className="p-2 hover:bg-white/10 transition-colors"
                      >
                        <MoreHorizontal className="h-5 w-5 text-white/50" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ContentCard>
      )}

      {/* Action Menu Portal - Rendered outside of table to avoid overflow clipping */}
      {actionMenuOpen && menuPosition && typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[60]"
              onClick={closeMenu}
            />
            <div
              className="fixed w-48 bg-dark-100 border border-white/10 shadow-xl z-[70]"
              style={{
                top: menuPosition.top,
                left: menuPosition.left,
              }}
            >
              {(() => {
                const waiver = waivers.find((w) => w.id === actionMenuOpen)
                if (!waiver) return null
                return (
                  <>
                    <button
                      onClick={() => {
                        setPreviewingWaiver(waiver)
                        closeMenu()
                      }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </button>
                    <button
                      onClick={() => {
                        setEditingWaiver(waiver)
                        closeMenu()
                      }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        handleDelete(waiver.id)
                        closeMenu()
                      }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-magenta hover:bg-magenta/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </>
                )
              })()}
            </div>
          </>,
          document.body
        )
      }

      {/* Create/Edit Modal */}
      {(showCreateModal || editingWaiver) && (
        <WaiverTemplateModal
          waiver={editingWaiver}
          onClose={() => {
            setShowCreateModal(false)
            setEditingWaiver(null)
          }}
          onSave={() => {
            loadWaivers()
            setShowCreateModal(false)
            setEditingWaiver(null)
          }}
        />
      )}

      {/* Preview Modal */}
      {previewingWaiver && (
        <WaiverPreviewModal
          waiver={previewingWaiver}
          onClose={() => setPreviewingWaiver(null)}
        />
      )}
    </AdminLayout>
  )
}
