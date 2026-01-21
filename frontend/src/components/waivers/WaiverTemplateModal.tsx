'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Globe, Building2, AlertTriangle } from 'lucide-react'

interface WaiverTemplate {
  id: string
  title: string
  description: string | null
  contentHtml: string
  isMandatorySiteWide: boolean
  isActive: boolean
  currentVersion: number
  tenant: { id: string; name: string } | null
}

interface WaiverTemplateModalProps {
  waiver: WaiverTemplate | null
  onClose: () => void
  onSave: () => void
}

export function WaiverTemplateModal({ waiver, onClose, onSave }: WaiverTemplateModalProps) {
  const [title, setTitle] = useState(waiver?.title || '')
  const [description, setDescription] = useState(waiver?.description || '')
  const [contentHtml, setContentHtml] = useState(waiver?.contentHtml || '')
  const [isMandatorySiteWide, setIsMandatorySiteWide] = useState(waiver?.isMandatorySiteWide || false)
  const [isActive, setIsActive] = useState(waiver?.isActive ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!waiver

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (!contentHtml.trim()) {
      setError('Waiver content is required')
      return
    }

    setSaving(true)

    try {
      const url = isEditing ? `/api/admin/waivers/${waiver.id}` : '/api/admin/waivers'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          contentHtml,
          isMandatorySiteWide,
          isActive,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save waiver')
      }

      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save waiver')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4">
      <div className="bg-dark-100 border border-white/20 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-xl font-bold uppercase tracking-wider text-white">
            {isEditing ? 'Edit Waiver Template' : 'Create Waiver Template'}
          </h2>
          <button
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

          {isEditing && waiver.currentVersion > 1 && (
            <div className="p-4 bg-purple/10 border border-purple/30 text-purple">
              <p className="font-bold mb-1">Version {waiver.currentVersion}</p>
              <p className="text-sm text-purple/80">
                Editing the content will create a new version. Existing signatures will remain linked to the version they signed.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Liability Waiver & Release of Claims"
              className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this waiver"
              className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
              Waiver Content (HTML) *
            </label>
            <textarea
              value={contentHtml}
              onChange={(e) => setContentHtml(e.target.value)}
              rows={15}
              placeholder="<h2>Liability Waiver & Release of Claims</h2>&#10;&#10;<p>By signing this waiver, I acknowledge...</p>"
              className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none font-mono text-sm"
            />
            <p className="text-xs text-white/40 mt-2">
              Use HTML formatting. Supported tags: h1, h2, h3, p, ul, ol, li, strong, em, br
            </p>
          </div>

          {/* Mandatory Site-Wide Section - Highlighted */}
          <div className={`p-4 border ${isMandatorySiteWide ? 'border-magenta/50 bg-magenta/5' : 'border-white/10 bg-black/20'}`}>
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() => setIsMandatorySiteWide(!isMandatorySiteWide)}
                className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors ${
                  isMandatorySiteWide ? 'bg-magenta' : 'bg-white/20'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                    isMandatorySiteWide ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-5 w-5 text-magenta" />
                  <span className="text-white font-bold uppercase tracking-wider">Required for All Camps</span>
                  {isMandatorySiteWide && (
                    <span className="px-2 py-0.5 text-xs bg-magenta/20 text-magenta border border-magenta/30">
                      ENABLED
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/60">
                  When enabled, this waiver will be <strong className="text-white">automatically required</strong> for
                  every camp registration across all territories. Parents must sign this waiver before completing
                  any camp registration, regardless of which camp they're signing up for.
                </p>
                {isMandatorySiteWide && (
                  <p className="mt-2 text-xs text-magenta">
                    This waiver will appear as "MANDATORY" in the registration flow and cannot be skipped.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`w-12 h-6 rounded-full transition-colors ${
                isActive ? 'bg-neon' : 'bg-white/20'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                  isActive ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
            <span className="text-white font-medium">Active</span>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2 text-white/60 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              isEditing ? 'Update Waiver' : 'Create Waiver'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
