'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'

interface AddSportModalProps {
  open: boolean
  onClose: () => void
  onCreated: (tag: { name: string }) => void
}

export function AddSportModal({ open, onClose, onCreated }: AddSportModalProps) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/sport-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to create sport')
      }

      onCreated({ name: json.data.name })
      setName('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-dark-100 border border-white/10 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Add Sport
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-magenta/10 border border-magenta/30 text-magenta text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">
              Sport Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pickleball"
              className="w-full px-4 py-2.5 bg-black border border-white/20 text-white text-sm focus:border-neon focus:outline-none"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 px-4 py-2.5 bg-neon text-black font-bold text-sm uppercase tracking-wider hover:bg-neon/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Creating...
                </span>
              ) : (
                'Create'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-white/20 text-white/60 text-sm uppercase tracking-wider hover:text-white hover:border-white/40 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
