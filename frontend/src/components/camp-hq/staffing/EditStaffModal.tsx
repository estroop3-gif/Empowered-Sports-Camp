'use client'

/**
 * Edit Staff Modal Component
 *
 * Modal for editing an existing staff assignment or removing staff from a camp.
 */

import { useState } from 'react'
import { X, Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CampHqStaffMember } from '@/lib/services/campHq'

interface EditStaffModalProps {
  campId: string
  assignment: CampHqStaffMember
  onClose: () => void
  onSuccess: () => void
}

const STAFF_ROLES = [
  { value: 'director', label: 'Director' },
  { value: 'coach', label: 'Coach' },
  { value: 'assistant', label: 'Assistant' },
  { value: 'cit', label: 'CIT' },
  { value: 'volunteer', label: 'Volunteer' },
]

export function EditStaffModal({ campId, assignment, onClose, onSuccess }: EditStaffModalProps) {
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [role, setRole] = useState(assignment.role)
  const [isLead, setIsLead] = useState(assignment.is_lead)
  const [callTime, setCallTime] = useState(assignment.call_time || '')
  const [endTime, setEndTime] = useState(assignment.end_time || '')
  const [notes, setNotes] = useState(assignment.notes || '')
  const [stationName, setStationName] = useState(assignment.station_name || '')

  // Ad-hoc fields (only editable for ad-hoc staff)
  const [adHocFirstName, setAdHocFirstName] = useState(assignment.first_name)
  const [adHocLastName, setAdHocLastName] = useState(assignment.last_name)
  const [adHocEmail, setAdHocEmail] = useState(assignment.email)
  const [adHocPhone, setAdHocPhone] = useState(assignment.phone || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const payload = {
      role,
      isLead,
      callTime: callTime || null,
      endTime: endTime || null,
      notes: notes || null,
      stationName: stationName || null,
      ...(assignment.is_ad_hoc && {
        adHocFirstName,
        adHocLastName,
        adHocEmail: adHocEmail || null,
        adHocPhone: adHocPhone || null,
      }),
    }

    try {
      const res = await fetch(`/api/camps/${campId}/hq/staff/${assignment.assignment_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Failed to update staff')
        setSaving(false)
        return
      }

      onSuccess()
    } catch (err) {
      setError('Failed to update staff')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setError(null)
    setDeleting(true)

    try {
      const res = await fetch(`/api/camps/${campId}/hq/staff/${assignment.assignment_id}`, {
        method: 'DELETE',
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Failed to remove staff')
        setDeleting(false)
        setShowDeleteConfirm(false)
        return
      }

      onSuccess()
    } catch (err) {
      setError('Failed to remove staff')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-dark-100 border border-white/20 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Edit Staff Assignment</h2>
            <div className="text-sm text-white/50">
              {assignment.first_name} {assignment.last_name}
              {assignment.is_ad_hoc && (
                <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-purple/20 text-purple font-bold uppercase">
                  Ad-hoc
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm ? (
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-red-400 shrink-0" />
              <div>
                <h3 className="font-bold text-white">Remove Staff Member?</h3>
                <p className="text-white/50 text-sm mt-1">
                  Are you sure you want to remove <strong>{assignment.first_name} {assignment.last_name}</strong> from this camp?
                  This action cannot be undone.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-6 py-2 text-white/70 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-6 py-2 bg-red-500 text-white font-bold uppercase tracking-wider hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Remove'
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Ad-hoc Staff Name Fields */}
              {assignment.is_ad_hoc && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={adHocFirstName}
                        onChange={(e) => setAdHocFirstName(e.target.value)}
                        className="w-full bg-black border border-white/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={adHocLastName}
                        onChange={(e) => setAdHocLastName(e.target.value)}
                        className="w-full bg-black border border-white/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={adHocEmail}
                      onChange={(e) => setAdHocEmail(e.target.value)}
                      className="w-full bg-black border border-white/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={adHocPhone}
                      onChange={(e) => setAdHocPhone(e.target.value)}
                      className="w-full bg-black border border-white/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                    />
                  </div>

                  <div className="border-t border-white/10 pt-4" />
                </>
              )}

              {/* Assignment Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    Role *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as typeof role)}
                    className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-neon focus:outline-none"
                  >
                    {STAFF_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    Station
                  </label>
                  <input
                    type="text"
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    placeholder="e.g., Field A"
                    className="w-full bg-black border border-white/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    Call Time
                  </label>
                  <input
                    type="time"
                    value={callTime}
                    onChange={(e) => setCallTime(e.target.value)}
                    className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-neon focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-neon focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLead}
                    onChange={(e) => setIsLead(e.target.checked)}
                    className="h-5 w-5 bg-black border border-white/20 checked:bg-neon checked:border-neon focus:outline-none"
                  />
                  <span className="text-white">Lead Staff</span>
                </label>
              </div>

              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-black border border-white/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-white/10 bg-black/50 shrink-0">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 text-white/70 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={cn(
                    'px-6 py-2 font-bold uppercase tracking-wider transition-colors',
                    !saving
                      ? 'bg-neon text-black hover:bg-neon/90'
                      : 'bg-white/10 text-white/30 cursor-not-allowed'
                  )}
                >
                  {saving ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
