'use client'

/**
 * Licensee Applications Admin Page
 *
 * Admin view for viewing and managing licensee/franchise applications.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  Building2,
  Search,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Loader2,
  Phone,
  CalendarCheck,
  Users,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LicenseeApplication {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  company_name: string | null
  city: string | null
  state: string | null
  territory_interest: string | null
  status: string
  created_at: string
}

interface LicenseeCounts {
  submitted: number
  under_review: number
  contacted: number
  interview_scheduled: number
  interview_completed: number
  approved: number
  rejected: number
  withdrawn: number
  total: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  submitted: { label: 'Submitted', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30', icon: FileText },
  under_review: { label: 'Under Review', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', icon: Clock },
  contacted: { label: 'Contacted', color: 'text-purple bg-purple/10 border-purple/30', icon: Phone },
  interview_scheduled: { label: 'Interview Scheduled', color: 'text-orange-400 bg-orange-400/10 border-orange-400/30', icon: CalendarCheck },
  interview_completed: { label: 'Interview Done', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30', icon: CheckCircle },
  approved: { label: 'Approved', color: 'text-neon bg-neon/10 border-neon/30', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-400 bg-red-400/10 border-red-400/30', icon: XCircle },
  withdrawn: { label: 'Withdrawn', color: 'text-white/40 bg-white/5 border-white/10', icon: XCircle },
}

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Review' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'interview_scheduled', label: 'Interview' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export default function LicenseeApplicationsPage() {
  const { user } = useAuth()
  const [applications, setApplications] = useState<LicenseeApplication[]>([])
  const [counts, setCounts] = useState<LicenseeCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  useEffect(() => {
    loadApplications()
    loadCounts()
  }, [statusFilter])

  const loadApplications = async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      params.append('limit', '100')

      const res = await fetch(`/api/admin/licensee-applications?${params.toString()}`)
      const { data, error } = await res.json()

      if (error) {
        console.error('Error loading applications:', error)
        setLoading(false)
        return
      }

      if (data) {
        setApplications(data.applications || [])
      }
    } catch (err) {
      console.error('Error loading applications:', err)
    }

    setLoading(false)
  }

  const loadCounts = async () => {
    try {
      const res = await fetch('/api/admin/licensee-applications?counts=true')
      const { data } = await res.json()
      if (data) {
        setCounts(data)
      }
    } catch (err) {
      console.error('Error loading counts:', err)
    }
  }

  // Optimistically update application status in local state
  const handleStatusChange = async (id: string, newStatus: string) => {
    const app = applications.find(a => a.id === id)
    if (!app) return

    const previousStatus = app.status

    // Optimistically update UI immediately
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    )

    try {
      const res = await fetch(`/api/admin/licensee-applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        // Revert on error
        setApplications((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: previousStatus } : a))
        )
      } else {
        // Refresh counts
        loadCounts()
      }
    } catch (err) {
      // Revert on error
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: previousStatus } : a))
      )
      console.error('Error updating status:', err)
    }
  }

  const filteredApplications = applications.filter(app => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      app.first_name?.toLowerCase().includes(query) ||
      app.last_name?.toLowerCase().includes(query) ||
      app.email?.toLowerCase().includes(query) ||
      app.company_name?.toLowerCase().includes(query) ||
      app.territory_interest?.toLowerCase().includes(query)
    )
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <PageHeader
          title="Licensee Applications"
          description="View and manage franchise/licensee applications"
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Inbox', href: '/admin/cit' },
            { label: 'Licensee Applications' },
          ]}
        />
        <Link href="/admin/licensees">
          <Button variant="outline-neon" size="sm">
            <Users className="h-4 w-4 mr-2" />
            View Licensees
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      {counts && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-dark-100/50 border border-white/10 p-4">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total</p>
            <p className="text-2xl font-black text-white">{counts.total}</p>
          </div>
          <div className="bg-dark-100/50 border border-blue-400/30 p-4">
            <p className="text-xs text-blue-400 uppercase tracking-wider mb-1">New</p>
            <p className="text-2xl font-black text-white">{counts.submitted}</p>
          </div>
          <div className="bg-dark-100/50 border border-yellow-400/30 p-4">
            <p className="text-xs text-yellow-400 uppercase tracking-wider mb-1">In Progress</p>
            <p className="text-2xl font-black text-white">
              {counts.under_review + counts.contacted + counts.interview_scheduled + counts.interview_completed}
            </p>
          </div>
          <div className="bg-dark-100/50 border border-neon/30 p-4">
            <p className="text-xs text-neon uppercase tracking-wider mb-1">Approved</p>
            <p className="text-2xl font-black text-white">{counts.approved}</p>
          </div>
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-white/10">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              statusFilter === tab.value
                ? 'bg-neon text-dark'
                : 'bg-dark-100 text-white/60 hover:text-white hover:bg-dark-100/80'
            )}
          >
            {tab.label}
            {counts && tab.value !== 'all' && (
              <span className="ml-2 text-xs opacity-60">
                {counts[tab.value as keyof LicenseeCounts] || 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
          <Input
            type="text"
            placeholder="Search by name, email, company, or territory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12"
          />
        </div>
      </div>

      {/* Applications Table */}
      <ContentCard>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-neon" />
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-white/20 mx-auto mb-3" />
            <p className="text-lg font-bold text-white/60">No Applications Found</p>
            <p className="text-sm text-white/40 mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Licensee applications will appear here'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Applicant</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Location</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Territory Interest</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Applied</th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40"></th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((app) => {
                  const statusConfig = STATUS_CONFIG[app.status] || STATUS_CONFIG.submitted
                  const StatusIcon = statusConfig.icon
                  const fullName = `${app.first_name} ${app.last_name}`
                  const location = [app.city, app.state].filter(Boolean).join(', ') || '—'

                  return (
                    <tr key={app.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-neon/10 border border-neon/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-neon font-black">
                              {app.first_name?.[0]?.toUpperCase() || 'L'}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-white">{fullName}</p>
                            <p className="text-xs text-white/40">{app.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-white/80">
                          {app.company_name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-white/60">
                        {location}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-white/60 max-w-xs truncate">
                          {app.territory_interest || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-2 py-1 text-xs font-bold uppercase tracking-wider border',
                          statusConfig.color
                        )}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-white/40">
                        {formatDate(app.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          {app.status === 'submitted' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(app.id, 'under_review')}
                                className="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 hover:bg-yellow-400/20 transition-colors"
                              >
                                Review
                              </button>
                              <button
                                onClick={() => handleStatusChange(app.id, 'rejected')}
                                className="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-red-400/10 text-red-400 border border-red-400/30 hover:bg-red-400/20 transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {app.status === 'under_review' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(app.id, 'contacted')}
                                className="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-purple/10 text-purple border border-purple/30 hover:bg-purple/20 transition-colors"
                              >
                                Contact
                              </button>
                              <button
                                onClick={() => handleStatusChange(app.id, 'rejected')}
                                className="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-red-400/10 text-red-400 border border-red-400/30 hover:bg-red-400/20 transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <Link
                            href={`/admin/licensee-applications/${app.id}`}
                            className="inline-flex items-center gap-1 text-sm text-neon hover:text-neon/80 transition-colors"
                          >
                            View
                            <ChevronRight className="h-4 w-4" />
                          </Link>
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

      {/* Stats Footer */}
      <div className="mt-6 flex items-center justify-between text-xs text-white/40">
        <p>Showing {filteredApplications.length} of {applications.length} applications</p>
        <p>Last updated: just now</p>
      </div>
    </AdminLayout>
  )
}
