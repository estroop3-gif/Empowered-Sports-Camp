'use client'

/**
 * Licensee Settings Page
 *
 * Manage tenant-specific settings overrides.
 * Shows only settings that are tenant-overridable.
 */

import { useState, useEffect, useCallback } from 'react'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import { useAuth } from '@/lib/auth/context'
import { cn } from '@/lib/utils'
import {
  Settings,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  RotateCcw,
  Users,
  Bell,
  Upload,
  Heart,
  Globe,
  Info,
} from 'lucide-react'

interface SettingSchema {
  key: string
  category: string
  label: string
  description: string
  valueType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON'
  default: unknown
  tenantOverridable: boolean
}

const SETTINGS_SECTIONS = [
  { id: 'camps', label: 'Camps & Registration', icon: Users, accent: 'magenta' },
  { id: 'friendPairing', label: 'Friend Pairing', icon: Heart, accent: 'purple' },
  { id: 'notifications', label: 'Notifications', icon: Bell, accent: 'neon' },
  { id: 'storage', label: 'Storage & Media', icon: Upload, accent: 'magenta' },
]

export default function LicenseeSettingsPage() {
  const { tenant } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Settings state
  const [settings, setSettings] = useState<Record<string, unknown>>({})
  const [schema, setSchema] = useState<Record<string, SettingSchema>>({})
  const [pendingChanges, setPendingChanges] = useState<Record<string, unknown>>({})
  const [overrides, setOverrides] = useState<Set<string>>(new Set())

  // Load settings
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Load effective settings with schema
      const res = await fetch('/api/licensee/settings?scope=effective&schema=true')
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load settings')
      }

      setSettings(json.data.settings || {})
      if (json.schema) {
        setSchema(json.schema)
      }

      // Load tenant overrides to track which are customized
      const overridesRes = await fetch('/api/licensee/settings?scope=overrides')
      const overridesJson = await overridesRes.json()
      if (overridesRes.ok && overridesJson.data.settings) {
        const overrideKeys = new Set<string>(overridesJson.data.settings.map((s: { key: string }) => s.key))
        setOverrides(overrideKeys)
      }

      setPendingChanges({})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Handle setting change
  const handleSettingChange = (key: string, value: unknown) => {
    setPendingChanges((prev) => ({
      ...prev,
      [key]: value,
    }))
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  // Reset a setting to global default
  const handleResetSetting = async (key: string) => {
    try {
      const res = await fetch(`/api/licensee/settings?key=${key}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to reset setting')
      }

      // Remove from pending changes if present
      setPendingChanges((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })

      // Reload settings
      await loadSettings()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset')
    }
  }

  // Save settings
  const handleSave = async () => {
    if (Object.keys(pendingChanges).length === 0) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const updates = Object.entries(pendingChanges).map(([key, value]) => ({
        key,
        value,
      }))

      const res = await fetch('/api/licensee/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to save settings')
      }

      setPendingChanges({})
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      // Reload to get fresh data
      await loadSettings()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Get effective value for a setting
  const getValue = (key: string) => {
    if (key in pendingChanges) return pendingChanges[key]
    if (key in settings) return settings[key]
    return schema[key]?.default ?? ''
  }

  // Render a setting field based on its type
  const renderSettingField = (key: string, settingSchema: SettingSchema) => {
    const value = getValue(key)
    const isOverridden = overrides.has(key) || key in pendingChanges

    const fieldContent = (() => {
      switch (settingSchema.valueType) {
        case 'BOOLEAN':
          return (
            <button
              onClick={() => handleSettingChange(key, !value)}
              className={cn(
                'relative h-7 w-14 rounded-full transition-colors',
                value ? 'bg-neon' : 'bg-white/20'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 h-5 w-5 bg-white rounded-full transition-transform',
                  value ? 'left-8' : 'left-1'
                )}
              />
            </button>
          )

        case 'NUMBER':
          return (
            <input
              type="number"
              value={value as number}
              onChange={(e) => handleSettingChange(key, parseFloat(e.target.value) || 0)}
              className="w-full max-w-48 px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
            />
          )

        case 'JSON':
          return (
            <textarea
              value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value)
                  handleSettingChange(key, parsed)
                } catch {
                  // Keep as string if invalid JSON
                }
              }}
              className="w-full bg-black border border-white/20 text-white px-4 py-3 focus:border-neon focus:outline-none font-mono text-sm min-h-24"
            />
          )

        default: // STRING
          return (
            <input
              type="text"
              value={value as string}
              onChange={(e) => handleSettingChange(key, e.target.value)}
              className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
            />
          )
      }
    })()

    return (
      <div>
        {isOverridden && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-purple font-bold uppercase">Custom Override</span>
            <button
              onClick={() => handleResetSetting(key)}
              className="text-xs text-white/50 hover:text-white underline flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset to default
            </button>
          </div>
        )}
        {fieldContent}
      </div>
    )
  }

  // Filter settings by category
  const getSettingsForCategory = (category: string) => {
    return Object.entries(schema).filter(([_, s]) => s.category === category)
  }

  if (loading) {
    return (
      <LmsGate featureName="settings">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 text-neon animate-spin" />
        </div>
      </LmsGate>
    )
  }

  return (
    <LmsGate featureName="settings">
      <div>
        <PortalPageHeader
          title="Settings"
          description={`Customize settings for ${tenant?.name || 'your territory'}`}
          actions={
            <button
              onClick={handleSave}
              disabled={saving || Object.keys(pendingChanges).length === 0}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 font-bold uppercase tracking-wider text-sm transition-colors disabled:opacity-50',
                success
                  ? 'bg-neon/20 text-neon border border-neon'
                  : 'bg-neon text-black hover:bg-neon/90'
              )}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Saving...' : success ? 'Saved!' : 'Save Changes'}
              {Object.keys(pendingChanges).length > 0 && !saving && !success && (
                <span className="ml-1 px-1.5 py-0.5 bg-black/30 text-xs rounded">
                  {Object.keys(pendingChanges).length}
                </span>
              )}
            </button>
          }
        />

        {error && (
          <div className="mb-6 p-4 bg-magenta/10 border border-magenta/30 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-magenta" />
            <span className="text-white">{error}</span>
            <button onClick={loadSettings} className="ml-auto text-neon hover:underline text-sm">
              Retry
            </button>
          </div>
        )}

        {/* Info Banner */}
        <div className="mb-6 p-4 bg-white/5 border border-white/10 flex items-start gap-3">
          <Info className="h-5 w-5 text-neon flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-white/80">
              These settings customize your territory's experience. Settings you don't modify will
              use the platform defaults set by HQ.
            </p>
          </div>
        </div>

        {/* Pending Changes Summary */}
        {Object.keys(pendingChanges).length > 0 && (
          <div className="mb-6 p-4 bg-neon/5 border border-neon/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-neon mb-1">
                  Unsaved Changes
                </p>
                <p className="text-xs text-white/60">
                  {Object.keys(pendingChanges).length} setting{Object.keys(pendingChanges).length !== 1 ? 's' : ''} modified
                </p>
              </div>
              <button
                onClick={() => {
                  setPendingChanges({})
                  loadSettings()
                }}
                className="text-xs text-white/50 hover:text-white flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Settings Sections */}
        <div className="grid gap-6 lg:grid-cols-2">
          {SETTINGS_SECTIONS.map((section) => {
            const Icon = section.icon
            const sectionSettings = getSettingsForCategory(section.id)

            if (sectionSettings.length === 0) return null

            return (
              <PortalCard
                key={section.id}
                title={section.label}
                accent={section.accent as 'neon' | 'magenta' | 'purple'}
              >
                <div className="space-y-6">
                  {sectionSettings.map(([key, settingSchema]) => (
                    <div key={key}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <label className="block text-sm font-semibold text-white">
                            {settingSchema.label}
                          </label>
                          <p className="text-xs text-white/40">
                            {settingSchema.description}
                          </p>
                        </div>
                      </div>
                      {renderSettingField(key, settingSchema)}
                    </div>
                  ))}
                </div>
              </PortalCard>
            )
          })}
        </div>

        {/* Info Footer */}
        <div className="mt-8 p-4 bg-white/5 border border-white/10">
          <p className="text-sm text-white/50">
            <span className="font-bold text-white">Note:</span> Platform-wide settings like payments,
            maintenance mode, and developer mode are managed by HQ and cannot be changed here.
            Contact support for any questions about your license agreement.
          </p>
        </div>
      </div>
    </LmsGate>
  )
}
