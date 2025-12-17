'use client'

/**
 * Authorized Pickup Manager Component
 *
 * Allows parents to manage the list of people authorized to pick up their athletes.
 * Used in parent dashboard and athlete profile pages.
 */

import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, Phone, User, Shield, X, Loader2 } from 'lucide-react'

interface AuthorizedPickup {
  id: string
  name: string
  relationship: string
  phone: string | null
  photoIdOnFile: boolean
  createdAt: string
}

interface AuthorizedPickupManagerProps {
  athleteId: string
  athleteName: string
  readOnly?: boolean
}

export function AuthorizedPickupManager({
  athleteId,
  athleteName,
  readOnly = false,
}: AuthorizedPickupManagerProps) {
  const [pickups, setPickups] = useState<AuthorizedPickup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingPickup, setEditingPickup] = useState<AuthorizedPickup | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    phone: '',
    photoIdOnFile: false,
  })

  // Fetch authorized pickups
  const fetchPickups = useCallback(async () => {
    try {
      const res = await fetch(`/api/athletes/${athleteId}/authorized-pickups`)
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load pickups')
      }

      setPickups(json.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [athleteId])

  useEffect(() => {
    fetchPickups()
  }, [fetchPickups])

  const resetForm = () => {
    setFormData({
      name: '',
      relationship: '',
      phone: '',
      photoIdOnFile: false,
    })
    setEditingPickup(null)
    setShowForm(false)
  }

  const handleEdit = (pickup: AuthorizedPickup) => {
    setFormData({
      name: pickup.name,
      relationship: pickup.relationship,
      phone: pickup.phone || '',
      photoIdOnFile: pickup.photoIdOnFile,
    })
    setEditingPickup(pickup)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.relationship) {
      setError('Name and relationship are required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const url = `/api/athletes/${athleteId}/authorized-pickups`
      const method = editingPickup ? 'PUT' : 'POST'
      const body = editingPickup
        ? { id: editingPickup.id, ...formData }
        : formData

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to save')
      }

      await fetchPickups()
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (pickupId: string) => {
    if (!confirm('Remove this person from the authorized pickup list?')) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/athletes/${athleteId}/authorized-pickups?id=${pickupId}`,
        { method: 'DELETE' }
      )
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to delete')
      }

      await fetchPickups()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  const relationshipOptions = [
    'Parent',
    'Guardian',
    'Grandparent',
    'Aunt/Uncle',
    'Sibling (18+)',
    'Family Friend',
    'Nanny/Caregiver',
    'Other',
  ]

  if (loading) {
    return (
      <div className="p-6 text-center">
        <Loader2 className="h-6 w-6 text-neon animate-spin mx-auto" />
        <p className="text-white/50 mt-2 text-sm">Loading authorized pickups...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Authorized Pickup List</h3>
          <p className="text-sm text-white/50">
            People authorized to pick up {athleteName} from camp
          </p>
        </div>
        {!readOnly && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Person
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Pickups List */}
      {pickups.length === 0 ? (
        <div className="p-8 bg-white/5 border border-white/10 text-center">
          <Shield className="h-10 w-10 text-white/30 mx-auto mb-3" />
          <p className="text-white/50 mb-2">No authorized pickups added yet</p>
          {!readOnly && (
            <p className="text-sm text-white/30">
              Add people who are authorized to pick up your athlete from camp
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {pickups.map((pickup) => (
            <div
              key={pickup.id}
              className="flex items-center justify-between p-4 bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-purple/20 flex items-center justify-center">
                  <User className="h-5 w-5 text-purple" />
                </div>
                <div>
                  <p className="font-medium text-white">{pickup.name}</p>
                  <p className="text-sm text-white/50">{pickup.relationship}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {pickup.phone && (
                  <div className="flex items-center gap-1 text-white/50 text-sm">
                    <Phone className="h-3 w-3" />
                    {pickup.phone}
                  </div>
                )}
                {pickup.photoIdOnFile && (
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-medium">
                    ID on File
                  </span>
                )}
                {!readOnly && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(pickup)}
                      className="p-2 text-white/40 hover:text-white transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(pickup.id)}
                      disabled={saving}
                      className="p-2 text-red-400/70 hover:text-red-400 disabled:opacity-50 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={resetForm}
          />
          <div className="relative w-full max-w-md bg-dark-100 border border-white/20">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">
                {editingPickup ? 'Edit Authorized Pickup' : 'Add Authorized Pickup'}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 text-white/50 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Smith"
                  className="w-full bg-black/30 border border-white/20 text-white p-2 text-sm focus:border-neon focus:outline-none"
                />
              </div>

              {/* Relationship */}
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-1">
                  Relationship *
                </label>
                <select
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className="w-full bg-black/30 border border-white/20 text-white p-2 text-sm focus:border-neon focus:outline-none"
                >
                  <option value="">Select relationship...</option>
                  {relationshipOptions.map((rel) => (
                    <option key={rel} value={rel}>{rel}</option>
                  ))}
                </select>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 555-5555"
                  className="w-full bg-black/30 border border-white/20 text-white p-2 text-sm focus:border-neon focus:outline-none"
                />
              </div>

              {/* Photo ID on File */}
              <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10">
                <input
                  type="checkbox"
                  id="photoIdOnFile"
                  checked={formData.photoIdOnFile}
                  onChange={(e) => setFormData({ ...formData, photoIdOnFile: e.target.checked })}
                  className="w-4 h-4 accent-neon"
                />
                <label htmlFor="photoIdOnFile" className="text-sm text-white/70">
                  Photo ID on file with camp
                </label>
              </div>

              {/* Error in form */}
              {error && (
                <div className="p-2 bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-white/60 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.name || !formData.relationship}
                className="flex items-center gap-2 px-6 py-2 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingPickup ? 'Save Changes' : 'Add Person'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
