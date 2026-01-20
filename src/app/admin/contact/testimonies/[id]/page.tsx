'use client'

/**
 * Admin Testimony Detail Page
 *
 * View and moderate individual testimonies within the Admin Inbox.
 */

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Heart,
  Star,
  Trash2,
  Save,
  Loader2,
  Camera,
  Video,
  Calendar,
  User,
  Mail,
  ExternalLink,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: 'pending_review', label: 'Pending Review', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
  { value: 'approved', label: 'Approved', color: 'text-neon bg-neon/10 border-neon/30' },
  { value: 'rejected', label: 'Rejected', color: 'text-red-400 bg-red-400/10 border-red-400/30' },
  { value: 'archived', label: 'Archived', color: 'text-white/40 bg-white/5 border-white/20' },
]

const ROLE_LABELS: Record<string, string> = {
  parent: 'Parent',
  athlete: 'Athlete',
  coach: 'Coach',
  licensee: 'Licensee',
  cit: 'CIT/Volunteer',
  volunteer: 'Volunteer',
  other: 'Other',
}

interface Testimony {
  id: string
  tenant_id: string | null
  author_name: string
  author_email: string | null
  author_role: string
  author_relationship: string | null
  headline: string | null
  body: string
  photo_url: string | null
  video_url: string | null
  camp_session_id: string | null
  program_type: string | null
  status: string
  source_type: string
  is_featured: boolean
  display_order: number | null
  review_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_by_user_id: string | null
  created_at: string
  updated_at: string
  camp_name?: string | null
}

export default function TestimonyDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [testimony, setTestimony] = useState<Testimony | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Editable fields
  const [status, setStatus] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)
  const [displayOrder, setDisplayOrder] = useState<number | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [editedHeadline, setEditedHeadline] = useState('')
  const [editedBody, setEditedBody] = useState('')

  useEffect(() => {
    async function fetchTestimony() {
      try {
        const res = await fetch(`/api/admin/testimonies/${id}`)
        const { data, error } = await res.json()

        if (error) {
          setError(error)
          setIsLoading(false)
          return
        }

        setTestimony(data)
        setStatus(data.status)
        setIsFeatured(data.is_featured)
        setDisplayOrder(data.display_order)
        setReviewNotes(data.review_notes || '')
        setEditedHeadline(data.headline || '')
        setEditedBody(data.body)
        setIsLoading(false)
      } catch (err) {
        console.error('Error fetching testimony:', err)
        setError('Failed to load testimony')
        setIsLoading(false)
      }
    }

    fetchTestimony()
  }, [id])

  const handleSave = async () => {
    if (!testimony) return

    const previousValues = {
      status: testimony.status,
      is_featured: testimony.is_featured,
      display_order: testimony.display_order,
      review_notes: testimony.review_notes,
      headline: testimony.headline,
      body: testimony.body,
    }

    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    // Optimistically update the UI
    setTestimony(prev => prev ? {
      ...prev,
      status,
      is_featured: isFeatured,
      display_order: displayOrder,
      review_notes: reviewNotes || null,
      headline: editedHeadline || null,
      body: editedBody,
    } : null)

    try {
      const res = await fetch(`/api/admin/testimonies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          is_featured: isFeatured,
          display_order: displayOrder,
          review_notes: reviewNotes || null,
          headline: editedHeadline || null,
          body: editedBody,
        }),
      })

      const { data, error } = await res.json()

      if (error) {
        // Revert on error
        setTestimony(prev => prev ? { ...prev, ...previousValues } : null)
        setStatus(previousValues.status)
        setIsFeatured(previousValues.is_featured)
        setDisplayOrder(previousValues.display_order)
        setError(error)
        setIsSaving(false)
        return
      }

      // Update with full data from server (includes timestamps)
      setTestimony(data)
      setSuccessMessage('Testimony updated successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      // Revert on error
      setTestimony(prev => prev ? { ...prev, ...previousValues } : null)
      setStatus(previousValues.status)
      setIsFeatured(previousValues.is_featured)
      setDisplayOrder(previousValues.display_order)
      console.error('Error saving testimony:', err)
      setError('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this testimony? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/testimonies/${id}`, {
        method: 'DELETE',
      })

      const { error } = await res.json()

      if (error) {
        setError(error)
        setIsDeleting(false)
        return
      }

      router.push('/admin/contact?category=testimonies')
    } catch (err) {
      console.error('Error deleting testimony:', err)
      setError('Failed to delete testimony')
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black pt-20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-magenta" />
      </div>
    )
  }

  if (error && !testimony) {
    return (
      <div className="min-h-screen bg-black pt-20 p-8">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/admin/contact?category=testimonies"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to Inbox</span>
          </Link>
          <div className="p-6 bg-red-500/10 border border-red-500/30 text-red-400">
            {error}
          </div>
        </div>
      </div>
    )
  }

  if (!testimony) return null

  const statusOption = STATUS_OPTIONS.find((s) => s.value === testimony.status)

  return (
    <div className="min-h-screen bg-black pt-20">
      {/* Header */}
      <div className="bg-dark-100/50 border-b border-white/10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
          <Link
            href="/admin/contact?category=testimonies"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to Inbox</span>
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Heart className="h-6 w-6 text-magenta" />
              <div>
                <h1 className="text-xl font-black uppercase tracking-wider text-white">
                  Testimony from {testimony.author_name}
                </h1>
                <p className="text-sm text-white/60">
                  Submitted {new Date(testimony.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <span
              className={cn(
                'px-3 py-1 text-xs font-bold uppercase tracking-wider border',
                statusOption?.color || 'text-white/60'
              )}
            >
              {statusOption?.label || testimony.status}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Author Info */}
            <div className="bg-dark-100/50 border border-white/10 p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-4">
                Author Information
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-white/40 mt-0.5" />
                  <div>
                    <p className="text-sm text-white/60">Name</p>
                    <p className="text-white font-medium">{testimony.author_name}</p>
                  </div>
                </div>
                {testimony.author_email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-white/40 mt-0.5" />
                    <div>
                      <p className="text-sm text-white/60">Email</p>
                      <a
                        href={`mailto:${testimony.author_email}`}
                        className="text-magenta hover:underline"
                      >
                        {testimony.author_email}
                      </a>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Heart className="h-4 w-4 text-white/40 mt-0.5" />
                  <div>
                    <p className="text-sm text-white/60">Role</p>
                    <p className="text-white">
                      {ROLE_LABELS[testimony.author_role] || testimony.author_role}
                    </p>
                  </div>
                </div>
                {testimony.author_relationship && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-white/40 mt-0.5" />
                    <div>
                      <p className="text-sm text-white/60">Relationship</p>
                      <p className="text-white">{testimony.author_relationship}</p>
                    </div>
                  </div>
                )}
              </div>
              {testimony.camp_name && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-sm text-white/60">Camp</p>
                  <p className="text-white">{testimony.camp_name}</p>
                </div>
              )}
            </div>

            {/* Testimony Content */}
            <div className="bg-dark-100/50 border border-white/10 p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-4">
                Testimony Content
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                    Headline (Optional)
                  </label>
                  <Input
                    type="text"
                    value={editedHeadline}
                    onChange={(e) => setEditedHeadline(e.target.value)}
                    placeholder="Add a headline..."
                    maxLength={120}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                    Body
                  </label>
                  <textarea
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    rows={8}
                    className="w-full bg-dark-100 border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:border-magenta/50 focus:outline-none focus:ring-0 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Media */}
            {(testimony.photo_url || testimony.video_url) && (
              <div className="bg-dark-100/50 border border-white/10 p-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-4">
                  Media
                </h2>
                <div className="space-y-4">
                  {testimony.photo_url && (
                    <div className="flex items-center gap-3">
                      <Camera className="h-4 w-4 text-white/40" />
                      <a
                        href={testimony.photo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-magenta hover:underline flex items-center gap-1"
                      >
                        View Photo
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {testimony.video_url && (
                    <div className="flex items-center gap-3">
                      <Video className="h-4 w-4 text-white/40" />
                      <a
                        href={testimony.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-magenta hover:underline flex items-center gap-1"
                      >
                        View Video
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Moderation Controls */}
          <div className="space-y-6">
            {/* Status */}
            <div className="bg-dark-100/50 border border-white/10 p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-4">
                Moderation
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-dark-100 border border-white/10 px-4 py-3 text-white focus:border-magenta/50 focus:outline-none focus:ring-0 transition-colors"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="w-5 h-5 bg-dark-100 border border-white/10 text-neon focus:ring-0 focus:ring-offset-0"
                    />
                    <span className="flex items-center gap-2 text-white">
                      <Star className="h-4 w-4 text-neon" />
                      Featured Testimony
                    </span>
                  </label>
                  <p className="text-xs text-white/40 mt-1 ml-8">
                    Featured testimonies appear prominently on the public page
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                    Display Order
                  </label>
                  <Input
                    type="number"
                    value={displayOrder ?? ''}
                    onChange={(e) =>
                      setDisplayOrder(e.target.value ? parseInt(e.target.value) : null)
                    }
                    placeholder="Auto"
                    min={0}
                  />
                  <p className="text-xs text-white/40 mt-1">
                    Lower numbers appear first
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                    Review Notes (Internal)
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={3}
                    placeholder="Add internal notes..."
                    className="w-full bg-dark-100 border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:border-magenta/50 focus:outline-none focus:ring-0 transition-colors resize-none text-sm"
                  />
                  <p className="text-xs text-white/40 mt-1">
                    Included in rejection notification if provided
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-dark-100/50 border border-white/10 p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-4">
                Actions
              </h2>

              <div className="space-y-3">
                {/* Success/Error feedback */}
                {successMessage && (
                  <div className="flex items-center gap-2 p-3 bg-neon/10 border border-neon/30 text-neon text-sm animate-pulse">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    {successMessage}
                  </div>
                )}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={cn(
                    buttonVariants({ variant: 'neon' }),
                    'w-full justify-center',
                    isSaving && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>

                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className={cn(
                    'w-full px-4 py-2 text-sm font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2',
                    isDeleting && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete Testimony
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-dark-100/50 border border-white/10 p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-4">
                Metadata
              </h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-white/40">Source</dt>
                  <dd className="text-white capitalize">{testimony.source_type}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/40">Created</dt>
                  <dd className="text-white">
                    {new Date(testimony.created_at).toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/40">Updated</dt>
                  <dd className="text-white">
                    {new Date(testimony.updated_at).toLocaleDateString()}
                  </dd>
                </div>
                {testimony.reviewed_at && (
                  <div className="flex justify-between">
                    <dt className="text-white/40">Reviewed</dt>
                    <dd className="text-white">
                      {new Date(testimony.reviewed_at).toLocaleDateString()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
