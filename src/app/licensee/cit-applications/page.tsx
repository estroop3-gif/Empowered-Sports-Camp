'use client'

/**
 * Licensee CIT Applications Page
 *
 * Manage CIT (Counselor-in-Training) applications for the territory.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import { cn } from '@/lib/utils'
import {
  UserPlus,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Calendar,
  ChevronRight,
  GraduationCap,
  MessageSquare,
} from 'lucide-react'

interface CITApplication {
  id: string
  applicant_name: string
  email: string
  phone: string | null
  age: number
  school: string | null
  status: 'pending' | 'in_review' | 'accepted' | 'rejected' | 'training' | 'active'
  applied_at: string
  notes: string | null
  assigned_camp: string | null
}

export default function LicenseeCITApplicationsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applications, setApplications] = useState<CITApplication[]>([])
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadApplications()
  }, [])

  async function loadApplications() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/cit')
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load applications')
      }

      // Transform API response to match our interface
      const apps = (json.data || []).map((app: any) => ({
        id: app.id,
        applicant_name: `${app.firstName} ${app.lastName}`,
        email: app.email,
        phone: app.phone,
        age: app.age || 16,
        school: app.school,
        status: app.status?.toLowerCase() || 'pending',
        applied_at: app.createdAt,
        notes: app.adminNotes,
        assigned_camp: null,
      }))

      setApplications(apps)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // Optimistically update application status in local state
  function handleStatusChange(id: string, newStatus: string) {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === id
          ? { ...app, status: newStatus as CITApplication['status'] }
          : app
      )
    )
  }

  const filteredApps = applications.filter((app) => {
    if (filter === 'all') return true
    if (filter === 'pending') return ['pending', 'in_review'].includes(app.status)
    return app.status === filter
  })

  const statusCounts = {
    all: applications.length,
    pending: applications.filter((a) => ['pending', 'in_review'].includes(a.status)).length,
    accepted: applications.filter((a) => a.status === 'accepted').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
    training: applications.filter((a) => a.status === 'training').length,
    active: applications.filter((a) => a.status === 'active').length,
  }

  return (
    <LmsGate featureName="CIT applications">
      <div>
        <PortalPageHeader
          title="CIT Applications"
          description={`${statusCounts.pending} pending, ${statusCounts.active} active CITs`}
          actions={
            <Link
              href="/licensee/dashboard"
              className="px-4 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/20 transition-colors"
            >
              Back to Dashboard
            </Link>
          }
        />

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <PortalCard accent="orange">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-yellow-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{statusCounts.pending}</div>
                <div className="text-sm text-white/50 uppercase">Pending</div>
              </div>
            </div>
          </PortalCard>

          <PortalCard accent="neon">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-neon/20 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-neon" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{statusCounts.accepted}</div>
                <div className="text-sm text-white/50 uppercase">Accepted</div>
              </div>
            </div>
          </PortalCard>

          <PortalCard accent="purple">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-purple/20 flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-purple" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{statusCounts.training}</div>
                <div className="text-sm text-white/50 uppercase">In Training</div>
              </div>
            </div>
          </PortalCard>

          <PortalCard>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-magenta/20 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-magenta" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{statusCounts.active}</div>
                <div className="text-sm text-white/50 uppercase">Active CITs</div>
              </div>
            </div>
          </PortalCard>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { value: 'all', label: 'All' },
            { value: 'pending', label: 'Pending Review' },
            { value: 'accepted', label: 'Accepted' },
            { value: 'training', label: 'In Training' },
            { value: 'active', label: 'Active' },
            { value: 'rejected', label: 'Rejected' },
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
              <h3 className="text-lg font-bold text-white mb-2">Error Loading Applications</h3>
              <p className="text-white/50 mb-4">{error}</p>
              <button
                onClick={loadApplications}
                className="px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
              >
                Try Again
              </button>
            </div>
          </PortalCard>
        ) : filteredApps.length === 0 ? (
          <PortalCard>
            <div className="text-center py-12">
              <UserPlus className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">No Applications Found</h2>
              <p className="text-white/50">
                {filter === 'all'
                  ? 'No CIT applications have been submitted yet.'
                  : `No applications match this filter.`}
              </p>
            </div>
          </PortalCard>
        ) : (
          <PortalCard title="Applications">
            <div className="space-y-4">
              {filteredApps.map((app) => (
                <ApplicationRow
                  key={app.id}
                  application={app}
                  onUpdate={loadApplications}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </PortalCard>
        )}

        {/* CIT Program Info */}
        <div className="mt-8 p-4 bg-white/5 border border-white/10">
          <p className="text-sm text-white/50">
            <span className="font-bold text-white">CIT Program:</span> Counselors-in-Training are
            high school students who assist with camp operations while learning leadership skills.
            Review applications, conduct interviews, and assign accepted CITs to upcoming camp sessions.
          </p>
        </div>
      </div>
    </LmsGate>
  )
}

function ApplicationRow({
  application,
  onUpdate,
  onStatusChange,
}: {
  application: CITApplication
  onUpdate: () => void
  onStatusChange: (id: string, newStatus: string) => void
}) {
  const [updating, setUpdating] = useState(false)

  const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
    in_review: { label: 'In Review', color: 'bg-purple/20 text-purple', icon: MessageSquare },
    accepted: { label: 'Accepted', color: 'bg-neon/20 text-neon', icon: CheckCircle },
    rejected: { label: 'Rejected', color: 'bg-magenta/20 text-magenta', icon: XCircle },
    training: { label: 'In Training', color: 'bg-purple/20 text-purple', icon: GraduationCap },
    active: { label: 'Active', color: 'bg-neon/20 text-neon', icon: UserPlus },
  }

  const config = statusConfig[application.status] || statusConfig.pending
  const StatusIcon = config.icon

  async function updateStatus(newStatus: string) {
    try {
      setUpdating(true)

      // Optimistically update the UI immediately
      onStatusChange(application.id, newStatus)

      const res = await fetch(`/api/admin/cit/${application.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        // Revert on error by refetching
        onUpdate()
        throw new Error('Failed to update status')
      }
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
            <span className="font-bold text-white">{application.applicant_name}</span>
            <span className={cn('px-2 py-0.5 text-xs font-bold uppercase', config.color)}>
              <StatusIcon className="h-3 w-3 inline mr-1" />
              {config.label}
            </span>
            <span className="text-xs text-white/40">Age: {application.age}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {application.email}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Applied {new Date(application.applied_at).toLocaleDateString()}
            </span>
            {application.school && <span>{application.school}</span>}
          </div>
          {application.notes && (
            <p className="text-xs text-white/40 mt-2 line-clamp-1">
              Notes: {application.notes}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {application.status === 'pending' && (
            <>
              <button
                onClick={() => updateStatus('in_review')}
                disabled={updating}
                className="px-3 py-2 bg-purple text-white font-bold uppercase tracking-wider text-xs hover:bg-purple/90 transition-colors disabled:opacity-50"
              >
                Review
              </button>
              <button
                onClick={() => updateStatus('accepted')}
                disabled={updating}
                className="px-3 py-2 bg-neon text-black font-bold uppercase tracking-wider text-xs hover:bg-neon/90 transition-colors disabled:opacity-50"
              >
                Accept
              </button>
              <button
                onClick={() => updateStatus('rejected')}
                disabled={updating}
                className="px-3 py-2 bg-magenta text-white font-bold uppercase tracking-wider text-xs hover:bg-magenta/90 transition-colors disabled:opacity-50"
              >
                Reject
              </button>
            </>
          )}
          {application.status === 'in_review' && (
            <>
              <button
                onClick={() => updateStatus('accepted')}
                disabled={updating}
                className="px-3 py-2 bg-neon text-black font-bold uppercase tracking-wider text-xs hover:bg-neon/90 transition-colors disabled:opacity-50"
              >
                Accept
              </button>
              <button
                onClick={() => updateStatus('rejected')}
                disabled={updating}
                className="px-3 py-2 bg-magenta text-white font-bold uppercase tracking-wider text-xs hover:bg-magenta/90 transition-colors disabled:opacity-50"
              >
                Reject
              </button>
            </>
          )}
          {application.status === 'accepted' && (
            <button
              onClick={() => updateStatus('training')}
              disabled={updating}
              className="px-3 py-2 bg-purple text-white font-bold uppercase tracking-wider text-xs hover:bg-purple/90 transition-colors disabled:opacity-50"
            >
              Start Training
            </button>
          )}
          {application.status === 'training' && (
            <button
              onClick={() => updateStatus('active')}
              disabled={updating}
              className="px-3 py-2 bg-neon text-black font-bold uppercase tracking-wider text-xs hover:bg-neon/90 transition-colors disabled:opacity-50"
            >
              Mark Active
            </button>
          )}
          <Link
            href={`/admin/cit/${application.id}`}
            className="p-2 bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
