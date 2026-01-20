'use client'

/**
 * Licensee Jobs Page
 *
 * Manage job postings for the territory.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import { cn } from '@/lib/utils'
import {
  Briefcase,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  ChevronRight,
  Eye,
  Users,
  ExternalLink,
} from 'lucide-react'

interface JobPosting {
  id: string
  title: string
  type: string
  location: string
  status: 'open' | 'closed' | 'draft'
  posted_at: string
  applications_count: number
  description_preview: string
}

export default function LicenseeJobsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadJobs()
  }, [])

  async function loadJobs() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/jobs')
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load jobs')
      }

      // Transform API response
      const postings = (json.data || []).map((job: any) => ({
        id: job.id,
        title: job.title,
        type: job.employmentType || 'Full-time',
        location: job.location || 'On-site',
        status: job.status?.toLowerCase() || 'open',
        posted_at: job.createdAt,
        applications_count: job._count?.applications || 0,
        description_preview: job.description?.substring(0, 100) + '...' || '',
      }))

      setJobs(postings)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const filteredJobs = jobs.filter((job) => {
    if (filter === 'all') return true
    return job.status === filter
  })

  const statusCounts = {
    all: jobs.length,
    open: jobs.filter((j) => j.status === 'open').length,
    closed: jobs.filter((j) => j.status === 'closed').length,
    draft: jobs.filter((j) => j.status === 'draft').length,
  }

  return (
    <LmsGate featureName="job board">
      <div>
        <PortalPageHeader
          title="Job Board"
          description={`${statusCounts.open} open position${statusCounts.open !== 1 ? 's' : ''}`}
          actions={
            <div className="flex items-center gap-2">
              <Link
                href="/careers"
                target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/20 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                View Public Board
              </Link>
              <Link
                href="/admin/jobs/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider text-sm hover:bg-neon/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Job
              </Link>
            </div>
          }
        />

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <PortalCard accent="neon">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-neon/20 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-neon" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{statusCounts.open}</div>
                <div className="text-sm text-white/50 uppercase">Open Positions</div>
              </div>
            </div>
          </PortalCard>

          <PortalCard>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-purple/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-purple" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {jobs.reduce((sum, j) => sum + j.applications_count, 0)}
                </div>
                <div className="text-sm text-white/50 uppercase">Total Applications</div>
              </div>
            </div>
          </PortalCard>

          <PortalCard>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-white/10 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-white/50" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{statusCounts.closed}</div>
                <div className="text-sm text-white/50 uppercase">Closed</div>
              </div>
            </div>
          </PortalCard>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { value: 'all', label: 'All Jobs' },
            { value: 'open', label: 'Open' },
            { value: 'draft', label: 'Drafts' },
            { value: 'closed', label: 'Closed' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={cn(
                'px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors',
                filter === opt.value
                  ? 'bg-neon text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-12 w-12 text-neon animate-spin" />
          </div>
        ) : error ? (
          <PortalCard>
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Error Loading Jobs</h3>
              <p className="text-white/50 mb-4">{error}</p>
              <button
                onClick={loadJobs}
                className="px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
              >
                Try Again
              </button>
            </div>
          </PortalCard>
        ) : filteredJobs.length === 0 ? (
          <PortalCard>
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">No Job Postings</h2>
              <p className="text-white/50 mb-6">
                {filter === 'all'
                  ? 'Create your first job posting to start recruiting.'
                  : `No ${filter} jobs found.`}
              </p>
              <Link
                href="/admin/jobs/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Job Posting
              </Link>
            </div>
          </PortalCard>
        ) : (
          <PortalCard title="Job Postings">
            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <JobRow key={job.id} job={job} onUpdate={loadJobs} />
              ))}
            </div>
          </PortalCard>
        )}

        {/* Info */}
        <div className="mt-8 p-4 bg-white/5 border border-white/10">
          <p className="text-sm text-white/50">
            <span className="font-bold text-white">Job Board:</span> Open positions appear on the
            public careers page. Applicants can apply directly and their applications will appear
            in your dashboard for review.
          </p>
        </div>
      </div>
    </LmsGate>
  )
}

function JobRow({ job, onUpdate }: { job: JobPosting; onUpdate: () => void }) {
  const [updating, setUpdating] = useState(false)

  const statusConfig: Record<string, { label: string; color: string; icon: typeof Briefcase }> = {
    open: { label: 'Open', color: 'bg-neon/20 text-neon', icon: CheckCircle },
    closed: { label: 'Closed', color: 'bg-white/10 text-white/50', icon: XCircle },
    draft: { label: 'Draft', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  }

  const config = statusConfig[job.status] || statusConfig.open
  const StatusIcon = config.icon

  async function toggleStatus() {
    const newStatus = job.status === 'open' ? 'closed' : 'open'
    try {
      setUpdating(true)
      const res = await fetch(`/api/admin/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        throw new Error('Failed to update status')
      }

      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="p-4 bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-bold text-white">{job.title}</span>
            <span className={cn('px-2 py-0.5 text-xs font-bold uppercase', config.color)}>
              <StatusIcon className="h-3 w-3 inline mr-1" />
              {config.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
            <span className="flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              {job.type}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {job.location}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Posted {new Date(job.posted_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-purple">{job.applications_count}</div>
            <div className="text-xs text-white/40">Applications</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleStatus}
              disabled={updating}
              className={cn(
                'px-3 py-2 font-bold uppercase tracking-wider text-xs transition-colors disabled:opacity-50',
                job.status === 'open'
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-neon text-black hover:bg-neon/90'
              )}
            >
              {job.status === 'open' ? 'Close' : 'Reopen'}
            </button>
            <Link
              href={`/admin/jobs/${job.id}`}
              className="p-2 bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <Eye className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
