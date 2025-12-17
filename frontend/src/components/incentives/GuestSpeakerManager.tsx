'use client'

/**
 * Guest Speaker Manager Component
 *
 * Allows camp staff to manage guest speakers for incentive bonus tracking.
 * Guest speakers are tracked per camp and count towards the $100/session bonus
 * if minimum 3 unique high-profile speakers are secured.
 */

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  Mic,
  Plus,
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  AlertTriangle,
  X,
  Save,
  User,
  Building,
  MessageSquare,
  Calendar,
} from 'lucide-react'
import { PortalCard } from '@/components/portal'

// =============================================================================
// TYPES
// =============================================================================

interface GuestSpeaker {
  id: string
  campId: string
  tenantId: string
  name: string
  title: string | null
  organization: string | null
  topic: string | null
  speakerDate: string | null
  isHighProfile: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface GuestSpeakerManagerProps {
  campId: string
  canEdit?: boolean
  minSpeakersForBonus?: number
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function GuestSpeakerManager({
  campId,
  canEdit = false,
  minSpeakersForBonus = 3,
}: GuestSpeakerManagerProps) {
  const [loading, setLoading] = useState(true)
  const [speakers, setSpeakers] = useState<GuestSpeaker[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    organization: '',
    topic: '',
    speakerDate: '',
    isHighProfile: true,
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Load speakers
  const loadSpeakers = useCallback(async () => {
    try {
      const res = await fetch(`/api/camps/${campId}/guest-speakers`)
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load guest speakers')
      }

      setSpeakers(json.data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load speakers')
    } finally {
      setLoading(false)
    }
  }, [campId])

  useEffect(() => {
    loadSpeakers()
  }, [loadSpeakers])

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      title: '',
      organization: '',
      topic: '',
      speakerDate: '',
      isHighProfile: true,
      notes: '',
    })
    setIsAddingNew(false)
    setEditingSpeakerId(null)
  }

  // Start editing
  const startEditing = (speaker: GuestSpeaker) => {
    setEditingSpeakerId(speaker.id)
    setIsAddingNew(false)
    setFormData({
      name: speaker.name,
      title: speaker.title || '',
      organization: speaker.organization || '',
      topic: speaker.topic || '',
      speakerDate: speaker.speakerDate ? speaker.speakerDate.split('T')[0] : '',
      isHighProfile: speaker.isHighProfile,
      notes: speaker.notes || '',
    })
  }

  // Submit form (add or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError('Name is required')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const url = editingSpeakerId
        ? `/api/camps/${campId}/guest-speakers/${editingSpeakerId}`
        : `/api/camps/${campId}/guest-speakers`

      const method = editingSpeakerId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          title: formData.title.trim() || null,
          organization: formData.organization.trim() || null,
          topic: formData.topic.trim() || null,
          speakerDate: formData.speakerDate || null,
          isHighProfile: formData.isHighProfile,
          notes: formData.notes.trim() || null,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to save guest speaker')
      }

      setSuccess(editingSpeakerId ? 'Speaker updated!' : 'Speaker added!')
      setTimeout(() => setSuccess(null), 3000)
      resetForm()
      loadSpeakers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save speaker')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete speaker
  const handleDelete = async (speakerId: string) => {
    if (!confirm('Are you sure you want to remove this guest speaker?')) {
      return
    }

    setDeletingId(speakerId)
    setError(null)

    try {
      const res = await fetch(`/api/camps/${campId}/guest-speakers/${speakerId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to delete guest speaker')
      }

      setSuccess('Speaker removed!')
      setTimeout(() => setSuccess(null), 3000)
      loadSpeakers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete speaker')
    } finally {
      setDeletingId(null)
    }
  }

  // Count high-profile speakers
  const highProfileCount = speakers.filter((s) => s.isHighProfile).length
  const bonusEligible = highProfileCount >= minSpeakersForBonus

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
          <CheckCircle className="h-5 w-5 text-neon flex-shrink-0" />
          <span className="text-neon">{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-magenta/10 border border-magenta/30 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-magenta flex-shrink-0" />
          <span className="text-magenta">{error}</span>
        </div>
      )}

      {/* Header with Status */}
      <PortalCard
        title="Guest Speakers"
        accent={bonusEligible ? 'neon' : undefined}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-2',
                bonusEligible
                  ? 'bg-neon/10 border border-neon/30'
                  : 'bg-white/5 border border-white/10'
              )}
            >
              <Mic className={cn('h-5 w-5', bonusEligible ? 'text-neon' : 'text-white/50')} />
              <span
                className={cn(
                  'font-bold text-lg',
                  bonusEligible ? 'text-neon' : 'text-white'
                )}
              >
                {highProfileCount}
              </span>
              <span className="text-white/50 text-sm">/ {minSpeakersForBonus} min</span>
            </div>

            <div
              className={cn(
                'px-3 py-1 text-xs font-bold uppercase tracking-wider',
                bonusEligible
                  ? 'bg-neon/20 text-neon'
                  : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
              )}
            >
              {bonusEligible ? 'Bonus Eligible' : `${minSpeakersForBonus - highProfileCount} more needed`}
            </div>
          </div>

          {canEdit && !isAddingNew && !editingSpeakerId && (
            <button
              onClick={() => setIsAddingNew(true)}
              className="flex items-center gap-2 px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Speaker
            </button>
          )}
        </div>

        {/* Add/Edit Form */}
        {(isAddingNew || editingSpeakerId) && canEdit && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-white/5 border border-white/10">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white/50 mb-4">
              {editingSpeakerId ? 'Edit Speaker' : 'Add New Speaker'}
            </h4>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                  Name <span className="text-magenta">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Speaker name"
                    className="w-full pl-10 pr-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                  Title / Profession
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Professional Athlete, Coach"
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                  Organization
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input
                    type="text"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    placeholder="e.g., Team, Company, School"
                    className="w-full pl-10 pr-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                  Topic / Session
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    placeholder="What did they speak about?"
                    className="w-full pl-10 pr-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                  Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input
                    type="date"
                    value={formData.speakerDate}
                    onChange={(e) => setFormData({ ...formData, speakerDate: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isHighProfile}
                    onChange={(e) => setFormData({ ...formData, isHighProfile: e.target.checked })}
                    className="w-5 h-5 accent-neon"
                  />
                  <span className="text-white">High-Profile / Relevant</span>
                </label>
                <span className="text-xs text-white/40">(Counts toward bonus)</span>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
                className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
              />
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  'flex items-center gap-2 px-6 py-2 font-bold uppercase tracking-wider transition-colors',
                  submitting
                    ? 'bg-white/10 text-white/30 cursor-not-allowed'
                    : 'bg-neon text-black hover:bg-neon/90'
                )}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {editingSpeakerId ? 'Update' : 'Save'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center gap-2 px-6 py-2 bg-white/10 text-white font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Speakers List */}
        {speakers.length === 0 ? (
          <div className="text-center py-8">
            <Mic className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/50 mb-2">No guest speakers added yet</p>
            <p className="text-white/30 text-sm">
              Add at least {minSpeakersForBonus} high-profile speakers to earn the bonus.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {speakers.map((speaker) => (
              <div
                key={speaker.id}
                className={cn(
                  'flex items-start gap-4 p-4 border transition-colors',
                  speaker.isHighProfile
                    ? 'bg-neon/5 border-neon/20'
                    : 'bg-white/5 border-white/10'
                )}
              >
                <div
                  className={cn(
                    'h-10 w-10 flex items-center justify-center flex-shrink-0',
                    speaker.isHighProfile ? 'bg-neon/20 text-neon' : 'bg-white/10 text-white/50'
                  )}
                >
                  <Mic className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white">{speaker.name}</span>
                    {speaker.isHighProfile && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-neon/20 text-neon">
                        High-Profile
                      </span>
                    )}
                  </div>

                  {(speaker.title || speaker.organization) && (
                    <div className="text-sm text-white/60">
                      {speaker.title}
                      {speaker.title && speaker.organization && ' at '}
                      {speaker.organization}
                    </div>
                  )}

                  {speaker.topic && (
                    <div className="text-sm text-white/40 mt-1">
                      Topic: {speaker.topic}
                    </div>
                  )}

                  {speaker.speakerDate && (
                    <div className="text-xs text-white/30 mt-1">
                      {new Date(speaker.speakerDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  )}
                </div>

                {canEdit && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => startEditing(speaker)}
                      className="p-2 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(speaker.id)}
                      disabled={deletingId === speaker.id}
                      className="p-2 text-white/50 hover:text-magenta hover:bg-magenta/10 transition-colors"
                      title="Delete"
                    >
                      {deletingId === speaker.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Bonus Info */}
        <div className="mt-6 p-4 bg-white/5 border border-white/10 text-sm text-white/50">
          <strong className="text-white">Guest Speaker Bonus:</strong> Secure a minimum of{' '}
          {minSpeakersForBonus} unique high-profile/relevant guest speakers to earn a $100/session
          bonus. Speakers must be marked as "High-Profile" to count toward the bonus.
        </div>
      </PortalCard>
    </div>
  )
}

export default GuestSpeakerManager
