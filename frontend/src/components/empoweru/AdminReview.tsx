'use client'

/**
 * AdminReview
 *
 * Admin panel for reviewing user-submitted contributions.
 */

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  FileText,
  User,
  Building2,
  Video,
  ExternalLink,
  MessageSquare,
} from 'lucide-react'
import type { EmpowerUContributionDetail, ContributionStatus } from '@/lib/services/empoweru'

const STATUS_CONFIG: Record<
  ContributionStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  PENDING: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  },
  APPROVED: {
    label: 'Approved',
    icon: CheckCircle,
    className: 'bg-neon/10 text-neon border-neon/30',
  },
  REJECTED: {
    label: 'Rejected',
    icon: XCircle,
    className: 'bg-magenta/10 text-magenta border-magenta/30',
  },
  REVISION_REQUESTED: {
    label: 'Revision Requested',
    icon: AlertCircle,
    className: 'bg-purple/10 text-purple border-purple/30',
  },
}

interface AdminReviewProps {
  userRole: string
}

export function AdminReview({ userRole }: AdminReviewProps) {
  const [contributions, setContributions] = useState<EmpowerUContributionDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedContribution, setSelectedContribution] =
    useState<EmpowerUContributionDetail | null>(null)
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT' | 'REQUEST_REVISION' | null>(
    null
  )
  const [adminNotes, setAdminNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadContributions()
  }, [])

  async function loadContributions() {
    try {
      const res = await fetch('/api/empoweru/contributions?view=review')
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load contributions')
      }

      setContributions(json.data || [])
    } catch (err) {
      console.error('Failed to load contributions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load contributions')
    } finally {
      setLoading(false)
    }
  }

  async function handleReview() {
    if (!selectedContribution || !reviewAction) return

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/empoweru/contributions/${selectedContribution.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: reviewAction,
          adminNotes: adminNotes || undefined,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to review contribution')
      }

      const actionLabels = {
        APPROVE: 'approved',
        REJECT: 'rejected',
        REQUEST_REVISION: 'revision requested',
      }

      setSuccess(`Contribution ${actionLabels[reviewAction]} successfully!`)
      setSelectedContribution(null)
      setReviewAction(null)
      setAdminNotes('')
      loadContributions()
    } catch (err) {
      console.error('Failed to review contribution:', err)
      setError(err instanceof Error ? err.message : 'Failed to review contribution')
    } finally {
      setSubmitting(false)
    }
  }

  if (!['hq_admin', 'licensee_owner'].includes(userRole)) {
    return (
      <div className="p-6 bg-magenta/10 border border-magenta/30 text-center">
        <AlertCircle className="h-8 w-8 text-magenta mx-auto mb-2" />
        <p className="text-magenta font-bold">Not authorized to review contributions</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-neon animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {success && (
        <div className="p-4 bg-neon/10 border border-neon/30 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-neon" />
          <span className="text-neon">{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-magenta/10 border border-magenta/30 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-magenta" />
          <span className="text-magenta">{error}</span>
        </div>
      )}

      {/* Contributions List */}
      <div className="bg-black border border-white/10">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-lg font-bold text-white uppercase tracking-wider">
            Submissions to Review
          </h3>
          <p className="text-white/50 text-sm">
            {contributions.length} pending submissions
          </p>
        </div>

        {contributions.length > 0 ? (
          <div className="divide-y divide-white/10">
            {contributions.map((contribution) => {
              const config = STATUS_CONFIG[contribution.status]
              const StatusIcon = config.icon
              const isSelected = selectedContribution?.id === contribution.id

              return (
                <div
                  key={contribution.id}
                  className={cn(
                    'p-4 transition-colors cursor-pointer',
                    isSelected ? 'bg-white/5' : 'hover:bg-white/5'
                  )}
                  onClick={() =>
                    setSelectedContribution(isSelected ? null : contribution)
                  }
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="h-5 w-5 text-white/40" />
                        <h4 className="font-bold text-white">{contribution.title}</h4>
                      </div>

                      {contribution.description && (
                        <p className="text-white/50 text-sm mb-3 line-clamp-2">
                          {contribution.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-xs text-white/40">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {contribution.submitter?.name || 'Unknown'}
                        </span>
                        <span>{contribution.submitted_by_role}</span>
                        {contribution.tenant_name && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {contribution.tenant_name}
                          </span>
                        )}
                        <span>{contribution.portal_type.replace('_', ' ')}</span>
                        <span>{new Date(contribution.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div
                      className={cn(
                        'flex items-center gap-2 px-3 py-1 border text-sm',
                        config.className
                      )}
                    >
                      <StatusIcon className="h-4 w-4" />
                      <span className="font-bold uppercase tracking-wider text-xs">
                        {config.label}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                      {/* Video Link */}
                      {contribution.video_url && (
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4 text-white/40" />
                          <a
                            href={contribution.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neon hover:underline flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Video
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}

                      {/* Review Actions */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                            <MessageSquare className="h-3 w-3 inline mr-1" />
                            Feedback Notes (optional)
                          </label>
                          <textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="Add notes for the submitter..."
                            rows={3}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
                          />
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setReviewAction('APPROVE')
                              handleReview()
                            }}
                            disabled={submitting}
                            className={cn(
                              'flex items-center gap-2 px-4 py-2 font-bold uppercase tracking-wider text-sm transition-colors',
                              submitting
                                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                                : 'bg-neon text-black hover:bg-neon/90'
                            )}
                          >
                            {submitting && reviewAction === 'APPROVE' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            Approve
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setReviewAction('REQUEST_REVISION')
                              handleReview()
                            }}
                            disabled={submitting}
                            className={cn(
                              'flex items-center gap-2 px-4 py-2 font-bold uppercase tracking-wider text-sm transition-colors',
                              submitting
                                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                                : 'bg-purple text-white hover:bg-purple/90'
                            )}
                          >
                            {submitting && reviewAction === 'REQUEST_REVISION' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <AlertCircle className="h-4 w-4" />
                            )}
                            Request Revision
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setReviewAction('REJECT')
                              handleReview()
                            }}
                            disabled={submitting}
                            className={cn(
                              'flex items-center gap-2 px-4 py-2 font-bold uppercase tracking-wider text-sm transition-colors',
                              submitting
                                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                                : 'bg-magenta text-white hover:bg-magenta/90'
                            )}
                          >
                            {submitting && reviewAction === 'REJECT' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <CheckCircle className="h-12 w-12 text-neon/20 mx-auto mb-4" />
            <h4 className="text-white font-bold mb-2">All Caught Up!</h4>
            <p className="text-white/50 text-sm">No pending submissions to review.</p>
          </div>
        )}
      </div>
    </div>
  )
}
