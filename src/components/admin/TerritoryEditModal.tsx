'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2, AlertTriangle, MapPin, Globe, FileText } from 'lucide-react'

type TerritoryStatus = 'open' | 'reserved' | 'assigned' | 'closed'

interface Territory {
  id: string
  name: string
  description: string | null
  country: string
  state_region: string
  city: string | null
  postal_codes: string | null
  tenant_id: string | null
  status: TerritoryStatus
  notes: string | null
  created_at: string
  updated_at: string
  tenant_name?: string | null
}

interface TerritoryEditModalProps {
  territory: Territory
  onClose: () => void
  onSave: (updatedTerritory: Territory) => void
}

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
]

export function TerritoryEditModal({ territory, onClose, onSave }: TerritoryEditModalProps) {
  const [name, setName] = useState(territory.name)
  const [description, setDescription] = useState(territory.description || '')
  const [city, setCity] = useState(territory.city || '')
  const [stateRegion, setStateRegion] = useState(territory.state_region)
  const [country, setCountry] = useState(territory.country)
  const [postalCodes, setPostalCodes] = useState(territory.postal_codes || '')
  const [notes, setNotes] = useState(territory.notes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Lock body scroll
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Territory name is required')
      return
    }

    if (!stateRegion.trim()) {
      setError('State/Region is required')
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`/api/admin/territories/${territory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          name: name.trim(),
          description: description.trim() || null,
          city: city.trim() || null,
          state_region: stateRegion.trim(),
          country: country.trim(),
          postal_codes: postalCodes.trim() || null,
          notes: notes.trim() || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update territory')
      }

      const updatedTerritory: Territory = {
        ...territory,
        name: name.trim(),
        description: description.trim() || null,
        city: city.trim() || null,
        state_region: stateRegion.trim(),
        country: country.trim(),
        postal_codes: postalCodes.trim() || null,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      }

      onSave(updatedTerritory)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update territory')
    } finally {
      setSaving(false)
    }
  }

  if (!mounted) return null

  const modalContent = (
    <>
      {/* Full-screen scrollable overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          zIndex: 99999,
          overflowY: 'auto',
          display: 'flex',
          justifyContent: 'center',
          padding: '2rem 1rem',
        }}
      >
        {/* Modal container */}
        <div
          style={{
            width: '100%',
            maxWidth: '36rem',
            zIndex: 100000,
            display: 'flex',
            flexDirection: 'column',
            margin: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-purple/10 border border-purple/30 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-purple" />
              </div>
              <div>
                <h2 className="text-xl font-bold uppercase tracking-wider text-white">
                  Edit Territory
                </h2>
                <p className="text-sm text-white/40">
                  {territory.name}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white/40 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="p-4 bg-magenta/10 border border-magenta/30 text-magenta flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                Territory Name *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Chicago North"
                  className="w-full pl-10 pr-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/40 focus:border-neon focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                Description
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this territory..."
                  rows={2}
                  className="w-full pl-10 pr-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/40 focus:border-neon focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/40 focus:border-neon focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                  State/Region *
                </label>
                <select
                  value={stateRegion}
                  onChange={(e) => setStateRegion(e.target.value)}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none appearance-none"
                  required
                >
                  <option value="">Select state</option>
                  {US_STATES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Country & Postal Codes */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                  Country
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="USA"
                    className="w-full pl-10 pr-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/40 focus:border-neon focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                  Postal Codes
                </label>
                <input
                  type="text"
                  value={postalCodes}
                  onChange={(e) => setPostalCodes(e.target.value)}
                  placeholder="60601, 60602, 60603..."
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/40 focus:border-neon focus:outline-none"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                Internal Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes about this territory..."
                rows={3}
                className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/40 focus:border-neon focus:outline-none resize-none"
              />
            </div>

            {/* Status info (read-only) */}
            <div className="p-4 bg-white/5 border border-white/10">
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                Current Status
              </label>
              <p className="text-white font-medium capitalize">{territory.status}</p>
              {territory.tenant_name && (
                <p className="text-sm text-white/40 mt-1">
                  Assigned to: {territory.tenant_name}
                </p>
              )}
              <p className="text-xs text-white/30 mt-2">
                Use the action menu to change status or assignment.
              </p>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-4 px-6 py-4 border-t border-white/10 bg-black/30 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-6 py-3 border border-white/20 text-white font-bold uppercase tracking-wider hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  )

  return createPortal(modalContent, document.body)
}
