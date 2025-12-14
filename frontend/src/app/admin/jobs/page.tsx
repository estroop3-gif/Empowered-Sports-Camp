'use client'

/**
 * Admin Jobs Page
 *
 * Manage job postings for the careers page.
 */

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Briefcase,
  Plus,
  Search,
  ExternalLink,
  Edit,
  Trash2,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Archive,
  MoreVertical,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface JobPosting {
  id: string
  title: string
  slug: string
  short_description: string
  location_label: string
  employment_type: string
  status: string
  priority: number
  created_at: string
  updated_at: string
}

interface JobCounts {
  draft: number
  open: number
  closed: number
  archived: number
  total: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'text-white/60 bg-white/5 border-white/20', icon: Clock },
  open: { label: 'Open', color: 'text-neon bg-neon/10 border-neon/30', icon: CheckCircle },
  closed: { label: 'Closed', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', icon: XCircle },
  archived: { label: 'Archived', color: 'text-white/40 bg-white/5 border-white/10', icon: Archive },
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  seasonal: 'Seasonal',
  part_time: 'Part-Time',
  full_time: 'Full-Time',
  internship: 'Internship',
  contract: 'Contract',
}

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'draft', label: 'Draft' },
  { value: 'closed', label: 'Closed' },
  { value: 'archived', label: 'Archived' },
]

export default function AdminJobsPage() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [counts, setCounts] = useState<JobCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  useEffect(() => {
    loadJobs()
    loadCounts()
  }, [statusFilter])

  const loadJobs = async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      params.append('limit', '100')

      const res = await fetch(`/api/admin/jobs?${params.toString()}`)
      const { data, error } = await res.json()

      if (error) {
        console.error('Error loading jobs:', error)
        setLoading(false)
        return
      }

      if (data) {
        setJobs(data.postings || [])
      }
    } catch (err) {
      console.error('Error loading jobs:', err)
    }

    setLoading(false)
  }

  const loadCounts = async () => {
    try {
      const res = await fetch('/api/admin/jobs?counts=true')
      const { data } = await res.json()
      if (data) {
        setCounts(data)
      }
    } catch (err) {
      console.error('Error loading counts:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id)
      return
    }

    setDeletingId(id)

    try {
      const res = await fetch(`/api/admin/jobs/${id}`, { method: 'DELETE' })
      const { error } = await res.json()

      if (error) {
        console.error('Error deleting job:', error)
        return
      }

      // Refresh list
      loadJobs()
      loadCounts()
    } catch (err) {
      console.error('Error deleting job:', err)
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  const filteredJobs = useMemo(() => {
    if (!searchQuery) return jobs
    const query = searchQuery.toLowerCase()
    return jobs.filter(
      (job) =>
        job.title?.toLowerCase().includes(query) ||
        job.location_label?.toLowerCase().includes(query) ||
        job.short_description?.toLowerCase().includes(query)
    )
  }, [jobs, searchQuery])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <PageHeader
        title="Job Postings"
        description="Create and manage open roles for Empowered Sports Camp"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Job Postings' },
        ]}
      />

      {/* Header actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div />
        <Link href="/admin/jobs/new">
          <Button variant="neon">
            <Plus className="h-4 w-4 mr-2" />
            New Job
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
          <div className="bg-dark-100/50 border border-neon/30 p-4">
            <p className="text-xs text-neon uppercase tracking-wider mb-1">Open</p>
            <p className="text-2xl font-black text-white">{counts.open}</p>
          </div>
          <div className="bg-dark-100/50 border border-white/20 p-4">
            <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Draft</p>
            <p className="text-2xl font-black text-white">{counts.draft}</p>
          </div>
          <div className="bg-dark-100/50 border border-yellow-400/30 p-4">
            <p className="text-xs text-yellow-400 uppercase tracking-wider mb-1">Closed</p>
            <p className="text-2xl font-black text-white">{counts.closed}</p>
          </div>
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-white/10">
        {STATUS_TABS.map((tab) => (
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
                {counts[tab.value as keyof JobCounts] || 0}
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
            placeholder="Search by title, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12"
          />
        </div>
      </div>

      {/* Jobs Table */}
      <ContentCard>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-neon" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="h-12 w-12 text-white/20 mx-auto mb-3" />
            <p className="text-lg font-bold text-white/60">No Job Postings Found</p>
            <p className="text-sm text-white/40 mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first job posting to get started'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Link href="/admin/jobs/new" className="inline-block mt-6">
                <Button variant="neon">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Job
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">
                    Job
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">
                    Location
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">
                    Created
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => {
                  const statusConfig = STATUS_CONFIG[job.status] || STATUS_CONFIG.draft
                  const StatusIcon = statusConfig.icon

                  return (
                    <tr
                      key={job.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-neon/10 border border-neon/30 flex items-center justify-center flex-shrink-0">
                            <Briefcase className="h-5 w-5 text-neon" />
                          </div>
                          <div>
                            <p className="font-semibold text-white">{job.title}</p>
                            <p className="text-xs text-white/40">/{job.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-white/60">{job.location_label}</td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-white/60">
                          {EMPLOYMENT_LABELS[job.employment_type] || job.employment_type}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2 py-1 text-xs font-bold uppercase tracking-wider border',
                            statusConfig.color
                          )}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-white/40">
                        {formatDate(job.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {job.status === 'open' && (
                            <a
                              href={`/careers/${job.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-white/40 hover:text-neon transition-colors"
                              title="View public page"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          <Link
                            href={`/admin/jobs/${job.id}`}
                            className="p-2 text-white/40 hover:text-white transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(job.id)}
                            disabled={deletingId === job.id}
                            className={cn(
                              'p-2 transition-colors',
                              confirmDeleteId === job.id
                                ? 'text-red-400 hover:text-red-300'
                                : 'text-white/40 hover:text-red-400'
                            )}
                            title={confirmDeleteId === job.id ? 'Click again to confirm' : 'Archive'}
                          >
                            {deletingId === job.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
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
        <p>
          Showing {filteredJobs.length} of {jobs.length} job{jobs.length !== 1 ? 's' : ''}
        </p>
        <p>Last updated: just now</p>
      </div>
    </AdminLayout>
  )
}
