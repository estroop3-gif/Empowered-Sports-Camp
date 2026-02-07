'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  Users,
  Search,
  User,
  Calendar,
  Phone,
  Mail,
  MoreVertical,
  Loader2,
  Eye,
  AlertTriangle,
  RefreshCw,
  Filter,
  ShieldAlert,
  Archive,
  CheckCircle,
  XCircle,
  TrendingUp,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface Athlete {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string | null
  gender: string | null
  grade: string | null
  school: string | null
  allergies: string | null
  medical_notes: string | null
  is_active: boolean
  risk_flag: string | null
  t_shirt_size: string | null
  primary_sport_interest: string | null
  created_at: string
  parent: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    phone: string | null
  } | null
  tenant: {
    id: string
    name: string
    city: string | null
    state: string | null
  } | null
  recent_registrations: {
    id: string
    status: string
    camp_name: string
    camp_start_date: string | null
  }[]
  registration_count: number
}

interface Tenant {
  id: string
  name: string
  city: string | null
  state: string | null
}

interface Stats {
  total: number
  active: number
  archived: number
  withRiskFlag: number
  registeredThisMonth: number
}

export default function AdminAthletesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [grades, setGrades] = useState<string[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState<string>('all')
  const [tenantFilter, setTenantFilter] = useState<string>('all')
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [riskFilter, setRiskFilter] = useState<string>('all')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<Athlete | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [actionTarget, setActionTarget] = useState<Athlete | null>(null)
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  const loadInitialData = async () => {
    // Load tenants, grades, and stats in parallel
    try {
      const [tenantsRes, gradesRes, statsRes] = await Promise.all([
        fetch('/api/admin/tenants?limit=100'),
        fetch('/api/admin/athletes?action=grades'),
        fetch('/api/admin/athletes?action=stats'),
      ])

      if (tenantsRes.ok) {
        const tenantsData = await tenantsRes.json()
        setTenants(tenantsData.tenants || [])
      }

      if (gradesRes.ok) {
        const gradesData = await gradesRes.json()
        setGrades(gradesData.grades || [])
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
    } catch (err) {
      console.error('Failed to load initial data:', err)
    }
  }

  const loadAthletes = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('pageSize', '50')
      if (searchQuery) params.set('search', searchQuery)
      if (genderFilter !== 'all') params.set('gender', genderFilter)
      if (tenantFilter !== 'all') params.set('tenantId', tenantFilter)
      if (gradeFilter !== 'all') params.set('grade', gradeFilter)
      if (activeFilter !== 'all') params.set('isActive', activeFilter)
      if (riskFilter !== 'all') params.set('riskFlag', riskFilter)

      const response = await fetch(`/api/admin/athletes?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setAthletes(data.athletes || [])
        setTotal(data.total || 0)
      }
    } catch (err) {
      console.error('Failed to load athletes:', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    loadAthletes()
  }, [page, genderFilter, tenantFilter, gradeFilter, activeFilter, riskFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadAthletes()
  }

  const clearFilters = () => {
    setSearchQuery('')
    setGenderFilter('all')
    setTenantFilter('all')
    setGradeFilter('all')
    setActiveFilter('all')
    setRiskFilter('all')
    setPage(1)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const calculateAge = (dateOfBirth: string | null) => {
    if (!dateOfBirth) return null
    const today = new Date()
    const birth = new Date(dateOfBirth)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const handleViewDetails = (athlete: Athlete) => {
    router.push(`/admin/athletes/${athlete.id}`)
  }

  const handleArchiveToggle = async (athlete: Athlete) => {
    setActionLoading(true)
    try {
      const url = athlete.is_active
        ? `/api/admin/athletes/${athlete.id}`
        : `/api/admin/athletes/${athlete.id}?action=reactivate`
      const res = await fetch(url, { method: 'DELETE' })
      if (res.ok) {
        loadAthletes()
      }
    } catch (err) {
      console.error('Failed to archive/reactivate athlete:', err)
    }
    setActionLoading(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/athletes/${deleteTarget.id}?action=delete`, { method: 'DELETE' })
      if (res.ok) {
        setShowDeleteModal(false)
        setDeleteTarget(null)
        loadAthletes()
      }
    } catch (err) {
      console.error('Failed to delete athlete:', err)
    }
    setActionLoading(false)
  }

  const getRiskBadge = (riskFlag: string | null) => {
    switch (riskFlag) {
      case 'monitor':
        return (
          <span className="px-2 py-0.5 text-xs font-bold uppercase bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" />
            Monitor
          </span>
        )
      case 'restricted':
        return (
          <span className="px-2 py-0.5 text-xs font-bold uppercase bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" />
            Restricted
          </span>
        )
      default:
        return null
    }
  }

  const hasActiveFilters = genderFilter !== 'all' || tenantFilter !== 'all' ||
    gradeFilter !== 'all' || activeFilter !== 'all' || riskFilter !== 'all' || searchQuery

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <PageHeader
        title="Athletes"
        description="View and manage all registered athletes across the platform"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Athletes' },
        ]}
      >
        <Button variant="outline-neon" size="sm" onClick={loadAthletes} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </PageHeader>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-black border border-white/10 p-4">
            <div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-wider mb-1">
              <Users className="h-4 w-4" />
              Total
            </div>
            <p className="text-2xl font-black text-white">{stats.total}</p>
          </div>
          <div className="bg-black border border-white/10 p-4">
            <div className="flex items-center gap-2 text-neon/60 text-xs uppercase tracking-wider mb-1">
              <CheckCircle className="h-4 w-4" />
              Active
            </div>
            <p className="text-2xl font-black text-neon">{stats.active}</p>
          </div>
          <div className="bg-black border border-white/10 p-4">
            <div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-wider mb-1">
              <Archive className="h-4 w-4" />
              Archived
            </div>
            <p className="text-2xl font-black text-white/60">{stats.archived}</p>
          </div>
          <div className="bg-black border border-white/10 p-4">
            <div className="flex items-center gap-2 text-amber-400/60 text-xs uppercase tracking-wider mb-1">
              <ShieldAlert className="h-4 w-4" />
              Risk Flags
            </div>
            <p className="text-2xl font-black text-amber-400">{stats.withRiskFlag}</p>
          </div>
          <div className="bg-black border border-white/10 p-4">
            <div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-wider mb-1">
              <TrendingUp className="h-4 w-4" />
              This Month
            </div>
            <p className="text-2xl font-black text-white">{stats.registeredThisMonth}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
            <Input
              type="text"
              placeholder="Search by name, parent, or school..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12"
            />
          </form>
          {hasActiveFilters && (
            <Button variant="outline-white" size="sm" onClick={clearFilters}>
              <XCircle className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-white/40" />

          <select
            value={tenantFilter}
            onChange={(e) => {
              setTenantFilter(e.target.value)
              setPage(1)
            }}
            className="bg-black border border-white/20 text-white px-3 py-2 text-sm focus:border-neon focus:outline-none"
          >
            <option value="all">All Territories</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}{t.city ? ` (${t.city})` : ''}
              </option>
            ))}
          </select>

          <select
            value={gradeFilter}
            onChange={(e) => {
              setGradeFilter(e.target.value)
              setPage(1)
            }}
            className="bg-black border border-white/20 text-white px-3 py-2 text-sm focus:border-neon focus:outline-none"
          >
            <option value="all">All Grades</option>
            {grades.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <select
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value)
              setPage(1)
            }}
            className="bg-black border border-white/20 text-white px-3 py-2 text-sm focus:border-neon focus:outline-none"
          >
            <option value="all">All Genders</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>

          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value)
              setPage(1)
            }}
            className="bg-black border border-white/20 text-white px-3 py-2 text-sm focus:border-neon focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="true">Active Only</option>
            <option value="false">Archived Only</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => {
              setRiskFilter(e.target.value)
              setPage(1)
            }}
            className="bg-black border border-white/20 text-white px-3 py-2 text-sm focus:border-neon focus:outline-none"
          >
            <option value="all">All Risk Levels</option>
            <option value="none">No Risk Flag</option>
            <option value="monitor">Monitor</option>
            <option value="restricted">Restricted</option>
          </select>
        </div>
      </div>

      {/* Athletes Table */}
      <ContentCard>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-neon" />
          </div>
        ) : athletes.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-white/20 mx-auto mb-3" />
            <p className="text-lg font-bold text-white/60">No Athletes Found</p>
            <p className="text-sm text-white/40 mt-1">
              {hasActiveFilters
                ? 'Try adjusting your search or filters'
                : 'Athletes will appear here once parents add them'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Athlete</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Age/Gender</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Parent</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Territory</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Registrations</th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {athletes.map((athlete) => {
                  const age = calculateAge(athlete.date_of_birth)
                  const isMale = athlete.gender?.toLowerCase() === 'male'

                  return (
                    <tr
                      key={athlete.id}
                      className={cn(
                        "border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer",
                        !athlete.is_active && "opacity-60"
                      )}
                      onClick={() => handleViewDetails(athlete)}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-10 w-10 flex items-center justify-center flex-shrink-0 border",
                            isMale ? "bg-amber-500/10 border-amber-500/30" : "bg-neon/10 border-neon/30"
                          )}>
                            <span className={cn("font-black", isMale ? "text-amber-500" : "text-neon")}>
                              {(athlete.first_name?.[0] || 'A').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-white">
                              {athlete.first_name} {athlete.last_name}
                            </p>
                            {athlete.grade && (
                              <p className="text-xs text-white/40">{athlete.grade}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {age !== null && (
                            <span className="text-white">{age} yrs</span>
                          )}
                          {athlete.gender && (
                            <span className={cn(
                              "px-2 py-0.5 text-xs font-bold uppercase border",
                              isMale
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                : "bg-pink-500/10 border-pink-500/30 text-pink-400"
                            )}>
                              {athlete.gender}
                            </span>
                          )}
                          {isMale && (
                            <span title="Male athlete - cannot register for camps">
                              <AlertTriangle className="h-4 w-4 text-amber-400" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {athlete.parent ? (
                          <div>
                            <p className="text-sm text-white">
                              {athlete.parent.first_name} {athlete.parent.last_name}
                            </p>
                            <p className="text-xs text-white/40">{athlete.parent.email}</p>
                            {athlete.parent.phone && (
                              <a
                                href={`tel:${athlete.parent.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-0.5"
                              >
                                <Phone className="h-3 w-3" />
                                {athlete.parent.phone}
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-white/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {athlete.tenant ? (
                          <div>
                            <p className="text-sm text-white">{athlete.tenant.name}</p>
                            {athlete.tenant.city && (
                              <p className="text-xs text-white/40">
                                {athlete.tenant.city}, {athlete.tenant.state}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-white/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          {!athlete.is_active && (
                            <span className="px-2 py-0.5 text-xs font-bold uppercase bg-white/10 border border-white/20 text-white/60 inline-flex items-center gap-1 w-fit">
                              <Archive className="h-3 w-3" />
                              Archived
                            </span>
                          )}
                          {getRiskBadge(athlete.risk_flag)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn(
                          "px-2 py-1 text-xs font-bold",
                          athlete.registration_count > 0
                            ? "bg-neon/10 text-neon"
                            : "bg-white/5 text-white/40"
                        )}>
                          {athlete.registration_count} camp{athlete.registration_count !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { setActionTarget(athlete); setShowActionModal(true) }}
                          className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </ContentCard>

      {/* Stats / Pagination */}
      <div className="mt-6 flex items-center justify-between text-xs text-white/40">
        <p>Showing {athletes.length} of {total} athletes</p>
        {total > 50 && (
          <div className="flex gap-2">
            <Button
              variant="outline-white"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <span className="flex items-center px-3 text-white/60">
              Page {page} of {Math.ceil(total / 50)}
            </span>
            <Button
              variant="outline-white"
              size="sm"
              disabled={athletes.length < 50}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
      {/* Action Modal */}
      <Modal
        isOpen={showActionModal}
        onClose={() => { setShowActionModal(false); setActionTarget(null) }}
        title={actionTarget ? `${actionTarget.first_name} ${actionTarget.last_name}` : 'Athlete Actions'}
      >
        {actionTarget && (
          <div className="space-y-2">
            <button
              onClick={() => {
                setShowActionModal(false)
                setActionTarget(null)
                handleViewDetails(actionTarget)
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-white hover:bg-white/10 transition-colors"
            >
              <Eye className="h-4 w-4 text-neon" />
              <span className="text-sm font-medium">View Details</span>
            </button>
            <button
              onClick={async () => {
                await handleArchiveToggle(actionTarget)
                setShowActionModal(false)
                setActionTarget(null)
              }}
              disabled={actionLoading}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
              ) : (
                <Archive className="h-4 w-4 text-amber-400" />
              )}
              <span className="text-sm font-medium">
                {actionTarget.is_active ? 'Archive Athlete' : 'Reactivate Athlete'}
              </span>
            </button>
            <div className="border-t border-white/10 my-1" />
            <button
              onClick={() => {
                setShowActionModal(false)
                setDeleteTarget(actionTarget)
                setActionTarget(null)
                setShowDeleteModal(true)
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              <span className="text-sm font-medium">Delete Permanently</span>
            </button>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeleteTarget(null) }}
        title="Delete Athlete Permanently"
        description="This action cannot be undone."
      >
        <div className="space-y-4">
          <p className="text-sm text-white/70">
            This will permanently delete{' '}
            <span className="font-bold text-white">
              {deleteTarget?.first_name} {deleteTarget?.last_name}
            </span>{' '}
            and all associated records including registrations, health records, and incident reports.
          </p>
          <div className="bg-red-500/10 border border-red-500/30 p-3">
            <p className="text-xs text-red-400 font-bold uppercase tracking-wider">
              Warning: This cannot be reversed
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline-white"
              className="flex-1"
              onClick={() => { setShowDeleteModal(false); setDeleteTarget(null) }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="neon"
              className="flex-1 !bg-red-600 hover:!bg-red-700 !text-white"
              onClick={handleDelete}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}
