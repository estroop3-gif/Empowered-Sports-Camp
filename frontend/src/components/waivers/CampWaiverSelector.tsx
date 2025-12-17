'use client'

import { useState, useEffect } from 'react'
import { Shield, Plus, X, Loader2, Globe, Building2, GripVertical, Check } from 'lucide-react'

interface WaiverTemplate {
  id: string
  title: string
  description: string | null
  isMandatorySiteWide: boolean
  isActive: boolean
  currentVersion: number
  tenant: { id: string; name: string } | null
}

interface WaiverRequirement {
  id?: string
  waiverTemplateId: string
  displayOrder: number
  isRequired: boolean
  isSiteWide?: boolean
  waiverTemplate: {
    id: string
    title: string
    description?: string | null
    isMandatorySiteWide?: boolean
  }
}

interface CampWaiverSelectorProps {
  campId: string
  className?: string
  onRequirementsChange?: (requirements: WaiverRequirement[]) => void
}

export function CampWaiverSelector({ campId, className = '', onRequirementsChange }: CampWaiverSelectorProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableWaivers, setAvailableWaivers] = useState<WaiverTemplate[]>([])
  const [requirements, setRequirements] = useState<WaiverRequirement[]>([])
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [campId])

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      // Load available waiver templates
      const waiversRes = await fetch('/api/admin/waivers')
      const waiversData = await waiversRes.json()

      if (!waiversRes.ok) {
        throw new Error(waiversData.error || 'Failed to load waivers')
      }

      setAvailableWaivers((waiversData.waivers || []).filter((w: WaiverTemplate) => w.isActive))

      // Load current camp requirements
      const reqRes = await fetch(`/api/camps/${campId}/waivers`)
      const reqData = await reqRes.json()

      if (!reqRes.ok) {
        throw new Error(reqData.error || 'Failed to load requirements')
      }

      setRequirements(reqData.data?.requirements || [])
    } catch (err) {
      console.error('Failed to load waiver data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load waiver data')
    } finally {
      setLoading(false)
    }
  }

  async function saveRequirements(newRequirements: Array<{ waiverTemplateId: string; displayOrder: number; isRequired: boolean }>) {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/camps/${campId}/waivers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirements: newRequirements.filter(r => {
            // Don't save site-wide waivers as they're automatic
            const template = availableWaivers.find(w => w.id === r.waiverTemplateId)
            return template && !template.isMandatorySiteWide
          }),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save requirements')
      }

      setRequirements(data.data?.requirements || [])
      onRequirementsChange?.(data.data?.requirements || [])
    } catch (err) {
      console.error('Failed to save requirements:', err)
      setError(err instanceof Error ? err.message : 'Failed to save requirements')
    } finally {
      setSaving(false)
    }
  }

  function handleAddWaiver(waiverId: string) {
    const waiver = availableWaivers.find(w => w.id === waiverId)
    if (!waiver) return

    const maxOrder = Math.max(0, ...requirements.map(r => r.displayOrder))
    const newReq: WaiverRequirement = {
      waiverTemplateId: waiverId,
      displayOrder: maxOrder + 1,
      isRequired: true,
      waiverTemplate: {
        id: waiver.id,
        title: waiver.title,
        description: waiver.description,
        isMandatorySiteWide: waiver.isMandatorySiteWide,
      },
    }

    const updatedRequirements = [...requirements, newReq]
    setRequirements(updatedRequirements)
    setShowAddModal(false)

    // Save to server
    saveRequirements(
      updatedRequirements.map(r => ({
        waiverTemplateId: r.waiverTemplateId,
        displayOrder: r.displayOrder,
        isRequired: r.isRequired,
      }))
    )
  }

  function handleRemoveWaiver(waiverTemplateId: string) {
    const updatedRequirements = requirements.filter(r => r.waiverTemplateId !== waiverTemplateId)
    setRequirements(updatedRequirements)

    // Save to server
    saveRequirements(
      updatedRequirements.map(r => ({
        waiverTemplateId: r.waiverTemplateId,
        displayOrder: r.displayOrder,
        isRequired: r.isRequired,
      }))
    )
  }

  function handleToggleRequired(waiverTemplateId: string) {
    const updatedRequirements = requirements.map(r =>
      r.waiverTemplateId === waiverTemplateId
        ? { ...r, isRequired: !r.isRequired }
        : r
    )
    setRequirements(updatedRequirements)

    // Save to server
    saveRequirements(
      updatedRequirements.map(r => ({
        waiverTemplateId: r.waiverTemplateId,
        displayOrder: r.displayOrder,
        isRequired: r.isRequired,
      }))
    )
  }

  // Get waivers that aren't already added (excluding site-wide which are automatic)
  const availableToAdd = availableWaivers.filter(w =>
    !w.isMandatorySiteWide &&
    !requirements.some(r => r.waiverTemplateId === w.id)
  )

  // Separate site-wide from camp-specific
  const siteWideWaivers = requirements.filter(r => r.isSiteWide)
  const campWaivers = requirements.filter(r => !r.isSiteWide)

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-neon" />
      </div>
    )
  }

  return (
    <div className={className}>
      {error && (
        <div className="mb-4 p-3 bg-magenta/10 border border-magenta/30 text-magenta text-sm">
          {error}
        </div>
      )}

      {/* Site-Wide Mandatory Waivers */}
      {siteWideWaivers.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-magenta" />
            <h4 className="text-sm font-bold uppercase tracking-wider text-white/70">
              Mandatory Site-Wide Waivers
            </h4>
          </div>
          <div className="space-y-2">
            {siteWideWaivers.map(req => (
              <div
                key={req.waiverTemplateId}
                className="flex items-center gap-3 px-4 py-3 bg-magenta/5 border border-magenta/20"
              >
                <Shield className="h-4 w-4 text-magenta" />
                <div className="flex-1">
                  <div className="text-white font-medium">{req.waiverTemplate.title}</div>
                  <div className="text-xs text-magenta/70">Applied to all camps automatically</div>
                </div>
                <span className="px-2 py-0.5 text-xs bg-magenta/10 text-magenta border border-magenta/30">
                  REQUIRED
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Camp-Specific Waivers */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-purple" />
            <h4 className="text-sm font-bold uppercase tracking-wider text-white/70">
              Camp-Specific Waivers
            </h4>
          </div>
          {availableToAdd.length > 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              disabled={saving}
              className="flex items-center gap-1 text-sm text-neon hover:text-neon/80 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Waiver
            </button>
          )}
        </div>

        {campWaivers.length === 0 ? (
          <div className="py-6 text-center text-white/40 border border-white/10 border-dashed">
            <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No camp-specific waivers assigned</p>
            {availableToAdd.length > 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-3 text-sm text-neon hover:text-neon/80"
              >
                Add a waiver
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {campWaivers.map(req => (
              <div
                key={req.waiverTemplateId}
                className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
              >
                <GripVertical className="h-4 w-4 text-white/30 cursor-move" />
                <div className="flex-1">
                  <div className="text-white font-medium">{req.waiverTemplate.title}</div>
                  {req.waiverTemplate.description && (
                    <div className="text-xs text-white/50">{req.waiverTemplate.description}</div>
                  )}
                </div>
                <button
                  onClick={() => handleToggleRequired(req.waiverTemplateId)}
                  disabled={saving}
                  className={`px-2 py-0.5 text-xs border transition-colors ${
                    req.isRequired
                      ? 'bg-neon/10 text-neon border-neon/30'
                      : 'bg-white/5 text-white/50 border-white/20'
                  }`}
                >
                  {req.isRequired ? 'REQUIRED' : 'OPTIONAL'}
                </button>
                <button
                  onClick={() => handleRemoveWaiver(req.waiverTemplateId)}
                  disabled={saving}
                  className="p-1 text-white/40 hover:text-magenta transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Waiver Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4">
          <div className="bg-dark-100 border border-white/20 w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="text-lg font-bold uppercase tracking-wider text-white">
                Add Waiver
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {availableToAdd.length === 0 ? (
                <p className="text-center text-white/50 py-4">
                  All available waivers have been added
                </p>
              ) : (
                <div className="space-y-2">
                  {availableToAdd.map(waiver => (
                    <button
                      key={waiver.id}
                      onClick={() => handleAddWaiver(waiver.id)}
                      className="flex items-center gap-3 w-full px-4 py-3 text-left bg-white/5 border border-white/10 hover:border-neon/50 hover:bg-neon/5 transition-colors"
                    >
                      <Shield className="h-4 w-4 text-purple" />
                      <div className="flex-1">
                        <div className="text-white font-medium">{waiver.title}</div>
                        {waiver.description && (
                          <div className="text-xs text-white/50">{waiver.description}</div>
                        )}
                        {waiver.tenant && (
                          <div className="text-xs text-purple/70 mt-1">
                            {waiver.tenant.name}
                          </div>
                        )}
                      </div>
                      <Plus className="h-4 w-4 text-neon" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Saving indicator */}
      {saving && (
        <div className="mt-4 flex items-center gap-2 text-sm text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving...
        </div>
      )}
    </div>
  )
}
