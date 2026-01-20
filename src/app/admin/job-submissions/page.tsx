'use client'

/**
 * Job Submissions Page
 *
 * Admin view for managing job applications through the hiring pipeline.
 * Tenant-aware: hq_admin sees all applications, licensee_owner sees their tenant only.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  Users,
  Search,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Loader2,
  Briefcase,
  Phone,
  Calendar,
  UserCheck,
  Filter,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface JobApplication {
  id: string
  tenant_id: string | null
  job_id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  city: string | null
  state: string | null
  status: string
  created_at: string
  job?: {
    id: string
    title: string
    slug: string
    location_label: string
    employment_type: string
  }
  tenant?: {
    id: string
    name: string
    slug: string
  } | null
}

interface JobApplicationCounts {
  submitted: number
  under_review: number
  phone_screen: number
  interview_scheduled: number
  interview_completed: number
  offer_extended: number
  hired: number
  rejected: number
  withdrawn: number
  total: number
}

interface JobWithCount {
  id: string
  title: string
  slug: string
  application_count: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  submitted: { label: 'Submitted', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30', icon: FileText },
  under_review: { label: 'Under Review', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', icon: Clock },
  phone_screen: { label: 'Phone Screen', color: 'text-purple bg-purple/10 border-purple/30', icon: Phone },
  interview_scheduled: { label: 'Interview', color: 'text-purple bg-purple/10 border-purple/30', icon: Calendar },
  interview_completed: { label: 'Interviewed', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30', icon: CheckCircle },
  offer_extended: { label: 'Offer Extended', color: 'text-neon bg-neon/10 border-neon/30', icon: UserCheck },
  hired: { label: 'Hired', color: 'text-neon bg-neon/10 border-neon/30', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-400 bg-red-400/10 border-red-400/30', icon: XCircle },
  withdrawn: { label: 'Withdrawn', color: 'text-white/40 bg-white/5 border-white/10', icon: XCircle },
}

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'submitted', label: 'New' },
  { value: 'under_review', label: 'Review' },
  { value: 'phone_screen', label: 'Phone' },
  { value: 'interview_scheduled', label: 'Interview' },
  { value: 'offer_extended', label: 'Offer' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
]

export default function JobSubmissionsPage() {
  const { user, role } = useAuth()
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [counts, setCounts] = useState<JobApplicationCounts | null>(null)
  const [jobs, setJobs] = useState<JobWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [jobFilter, setJobFilter] = useState<string>('all')

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'
  const isHqAdmin = role === 'hq_admin'

  useEffect(() => {
    loadApplications()
    loadCounts()
    loadJobs()
  }, [statusFilter, jobFilter])

  const loadApplications = async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (jobFilter !== 'all') {
        params.append('jobId', jobFilter)
      }
      params.append('pageSize', '100')

      const res = await fetch(`/api/admin/job-applications?${params.toString()}`)
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
      const res = await fetch('/api/admin/job-applications?counts=true')
      const { data } = await res.json()
      if (data) {
        setCounts(data)
      }
    } catch (err) {
      console.error('Error loading counts:', err)
    }
  }

  const loadJobs = async () => {
    try {
      const res = await fetch('/api/admin/job-applications?jobs=true')
      const { data } = await res.json()
      if (data?.jobs) {
        setJobs(data.jobs)
      }
    } catch (err) {
      console.error('Error loading jobs:', err)
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
      const res = await fetch(`/api/admin/job-applications/${id}`, {
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
      app.job?.title?.toLowerCase().includes(query)
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
    <AdminLayout
      userRole={isHqAdmin ? 'hq_admin' : 'licensee_owner'}
      userName={userName}
    >
      <PageHeader
        title="Job Submissions"
        description="Review and manage job applications"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Inbox', href: '/admin/contact' },
          { label: 'Job Submissions' },
        ]}
      />

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
              {counts.under_review + counts.phone_screen + counts.interview_scheduled + counts.interview_completed + counts.offer_extended}
            </p>
          </div>
          <div className="bg-dark-100/50 border border-neon/30 p-4">
            <p className="text-xs text-neon uppercase tracking-wider mb-1">Hired</p>
            <p className="text-2xl font-black text-white">{counts.hired}</p>
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
                ? 'bg-magenta text-white'
                : 'bg-dark-100 text-white/60 hover:text-white hover:bg-dark-100/80'
            )}
          >
            {tab.label}
            {counts && tab.value !== 'all' && (
              <span className="ml-2 text-xs opacity-60">
                {counts[tab.value as keyof JobApplicationCounts] || 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
          <Input
            type="text"
            placeholder="Search by name, email, or job title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12"
          />
        </div>
        {jobs.length > 0 && (
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              className="pl-12 pr-4 py-2.5 bg-dark-100 border border-white/10 text-white text-sm focus:outline-none focus:border-magenta min-w-[200px]"
            >
              <option value="all">All Positions</option>
              {jobs.map(job => (
                <option key={job.id} value={job.id}>
                  {job.title} ({job.application_count})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Applications Table */}
      <ContentCard>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-magenta" />
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="h-12 w-12 text-white/20 mx-auto mb-3" />
            <p className="text-lg font-bold text-white/60">No Applications Found</p>
            <p className="text-sm text-white/40 mt-1">
              {searchQuery || statusFilter !== 'all' || jobFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Job applications will appear here'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Applicant</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Position</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Location</th>
                  {isHqAdmin && (
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Tenant</th>
                  )}
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
                          <div className="h-10 w-10 bg-magenta/10 border border-magenta/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-magenta font-black">
                              {app.first_name?.[0]?.toUpperCase() || 'A'}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-white">{fullName}</p>
                            <p className="text-xs text-white/40">{app.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm text-white/80">{app.job?.title || '—'}</p>
                          {app.job?.employment_type && (
                            <p className="text-xs text-white/40 capitalize">{app.job.employment_type.replace('_', ' ')}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-white/60">
                        {location}
                      </td>
                      {isHqAdmin && (
                        <td className="px-4 py-4 text-sm text-white/60">
                          {app.tenant?.name || 'HQ'}
                        </td>
                      )}
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
                                onClick={() => handleStatusChange(app.id, 'phone_screen')}
                                className="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-purple/10 text-purple border border-purple/30 hover:bg-purple/20 transition-colors"
                              >
                                Phone
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
                            href={`/admin/job-submissions/${app.id}`}
                            className="inline-flex items-center gap-1 text-sm text-magenta hover:text-magenta/80 transition-colors"
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
