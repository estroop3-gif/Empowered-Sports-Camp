'use client'

/**
 * ContributionCenter
 *
 * Allows users to submit training content and view their submissions.
 */

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Upload,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Plus,
  FileText,
  Video,
} from 'lucide-react'
import type { EmpowerUContributionDetail, PortalType, ContributionStatus } from '@/lib/services/empoweru'

const STATUS_CONFIG: Record<
  ContributionStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  PENDING: {
    label: 'Pending Review',
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

const PORTAL_OPTIONS: { value: PortalType; label: string }[] = [
  { value: 'OPERATIONAL', label: 'Operational Execution' },
  { value: 'BUSINESS', label: 'Business & Strategy' },
  { value: 'SKILL_STATION', label: 'Skill Station Training' },
]

interface ContributionCenterProps {
  userRole: string
}

export function ContributionCenter({ userRole }: ContributionCenterProps) {
  const [contributions, setContributions] = useState<EmpowerUContributionDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [portalType, setPortalType] = useState<PortalType>('SKILL_STATION')
  const [videoUrl, setVideoUrl] = useState('')

  useEffect(() => {
    loadContributions()
  }, [])

  async function loadContributions() {
    try {
      const res = await fetch('/api/empoweru/contributions?view=my')
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load contributions')
      }

      setContributions(json.data || [])
    } catch (err) {
      console.error('Failed to load contributions:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/empoweru/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          portalType,
          videoUrl: videoUrl || undefined,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to submit contribution')
      }

      setSuccess('Your contribution has been submitted for review!')
      setTitle('')
      setDescription('')
      setVideoUrl('')
      setShowForm(false)
      loadContributions()
    } catch (err) {
      console.error('Failed to submit contribution:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit contribution')
    } finally {
      setSubmitting(false)
    }
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
      {/* Success Message */}
      {success && (
        <div className="p-4 bg-neon/10 border border-neon/30 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-neon" />
          <span className="text-neon">{success}</span>
        </div>
      )}

      {/* Submit New Content Section */}
      <div className="bg-black border border-white/10">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">
              Submit Training Content
            </h3>
            <p className="text-white/50 text-sm">
              Share your expertise with the EmpowerU community
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Submission
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {error && (
              <div className="p-3 bg-magenta/10 border border-magenta/30 flex items-center gap-2 text-magenta">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Ball Handling Station A - Advanced Drills"
                required
                className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this training covers and who it's for..."
                rows={4}
                className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                Portal Type *
              </label>
              <select
                value={portalType}
                onChange={(e) => setPortalType(e.target.value as PortalType)}
                className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
              >
                {PORTAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                Video URL (YouTube or Vimeo)
              </label>
              <div className="relative">
                <Video className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full pl-12 pr-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting || !title}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 font-bold uppercase tracking-wider transition-colors',
                  submitting || !title
                    ? 'bg-white/10 text-white/30 cursor-not-allowed'
                    : 'bg-neon text-black hover:bg-neon/90'
                )}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Submit for Review
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 bg-white/10 text-white font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* My Submissions */}
      <div className="bg-black border border-white/10">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-lg font-bold text-white uppercase tracking-wider">
            My Submissions
          </h3>
          <p className="text-white/50 text-sm">Track the status of your contributions</p>
        </div>

        {contributions.length > 0 ? (
          <div className="divide-y divide-white/10">
            {contributions.map((contribution) => {
              const config = STATUS_CONFIG[contribution.status]
              const StatusIcon = config.icon

              return (
                <div key={contribution.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="h-5 w-5 text-white/40" />
                        <h4 className="font-bold text-white">{contribution.title}</h4>
                      </div>
                      {contribution.description && (
                        <p className="text-white/50 text-sm mb-2 line-clamp-2">
                          {contribution.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-white/40">
                        <span>{contribution.portal_type.replace('_', ' ')}</span>
                        <span>
                          {new Date(contribution.created_at).toLocaleDateString()}
                        </span>
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

                  {contribution.admin_notes && (
                    <div className="mt-3 p-3 bg-white/5 border border-white/10">
                      <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-1">
                        Reviewer Feedback
                      </p>
                      <p className="text-white/70 text-sm">{contribution.admin_notes}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h4 className="text-white font-bold mb-2">No Submissions Yet</h4>
            <p className="text-white/50 text-sm">
              Submit your first training content to share with the community.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
