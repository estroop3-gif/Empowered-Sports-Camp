'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  Settings,
  Building2,
  CreditCard,
  Mail,
  Bell,
  Shield,
  Users,
  Save,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
  Code,
  FlaskConical,
  Upload,
  FileText,
  Heart,
  Globe,
  Palette,
  ChevronDown,
  RotateCcw,
  Receipt,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Admin Settings Page
 *
 * Fully functional settings management for HQ admins.
 * Supports global settings and tenant-specific overrides.
 */

interface SettingSchema {
  key: string
  category: string
  label: string
  description: string
  valueType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON'
  default: unknown
  tenantOverridable: boolean
}

interface Tenant {
  id: string
  name: string
  slug: string
}

const SETTINGS_SECTIONS = [
  { id: 'platform', label: 'Platform', icon: Globe, accent: 'neon' },
  { id: 'camps', label: 'Camps & Registration', icon: Users, accent: 'magenta' },
  { id: 'friendPairing', label: 'Friend Pairing', icon: Heart, accent: 'purple' },
  { id: 'notifications', label: 'Notifications', icon: Bell, accent: 'neon' },
  { id: 'storage', label: 'Storage & Media', icon: Upload, accent: 'magenta' },
  { id: 'payments', label: 'Payments', icon: CreditCard, accent: 'purple' },
  { id: 'taxes', label: 'Tax Settings', icon: Receipt, accent: 'neon' },
  { id: 'developer', label: 'Developer Mode', icon: Code, accent: 'amber' },
]

export default function AdminSettingsPage() {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState('platform')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Settings state
  const [settings, setSettings] = useState<Record<string, unknown>>({})
  const [schema, setSchema] = useState<Record<string, SettingSchema>>({})
  const [pendingChanges, setPendingChanges] = useState<Record<string, unknown>>({})

  // Tenant override mode
  const [tenantMode, setTenantMode] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [tenantOverrides, setTenantOverrides] = useState<Set<string>>(new Set())

  // Tax settings state
  const [taxRatePercent, setTaxRatePercent] = useState<number>(0)
  const [taxTenantName, setTaxTenantName] = useState<string>('')
  const [taxLoading, setTaxLoading] = useState(false)
  const [taxSaving, setTaxSaving] = useState(false)
  const [taxError, setTaxError] = useState<string | null>(null)
  const [taxSuccess, setTaxSuccess] = useState(false)

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  // Load settings
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const scope = tenantMode && selectedTenant ? 'effective' : 'global'
      const tenantParam = selectedTenant ? `&tenantId=${selectedTenant.id}` : ''

      const res = await fetch(`/api/admin/settings?scope=${scope}${tenantParam}&schema=true`)
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load settings')
      }

      // Transform settings to key-value object
      // Global scope returns array of {key, value, ...}, effective scope returns {key: value, ...}
      const settingsData = json.data.settings
      let settingsObject: Record<string, unknown> = {}

      if (Array.isArray(settingsData)) {
        // Global/tenant scope - transform array to object
        for (const setting of settingsData) {
          settingsObject[setting.key] = setting.value
        }
      } else if (settingsData && typeof settingsData === 'object') {
        // Effective scope - already an object
        settingsObject = settingsData
      }

      setSettings(settingsObject)
      if (json.schema) {
        setSchema(json.schema)
      }

      // Load tenant overrides if in tenant mode
      if (tenantMode && selectedTenant) {
        const overridesRes = await fetch(`/api/admin/settings?scope=tenant&tenantId=${selectedTenant.id}`)
        const overridesJson = await overridesRes.json()
        if (overridesRes.ok && overridesJson.data.settings) {
          const overrideKeys = new Set<string>(overridesJson.data.settings.map((s: { key: string }) => s.key))
          setTenantOverrides(overrideKeys)
        }
      }

      setPendingChanges({})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [tenantMode, selectedTenant])

  // Load tenants for dropdown
  const loadTenants = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tenants')
      if (res.ok) {
        const json = await res.json()
        setTenants(json.data || [])
      }
    } catch {
      // Silently fail, tenants dropdown will be empty
    }
  }, [])

  // Load tax settings for selected tenant
  const loadTaxSettings = useCallback(async (tenantId: string) => {
    try {
      setTaxLoading(true)
      setTaxError(null)
      const res = await fetch(`/api/admin/settings/taxes?tenantId=${tenantId}`)
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load tax settings')
      }

      setTaxRatePercent(json.data.taxRatePercent || 0)
      setTaxTenantName(json.data.tenantName || '')
    } catch (err) {
      setTaxError(err instanceof Error ? err.message : 'Failed to load tax settings')
    } finally {
      setTaxLoading(false)
    }
  }, [])

  // Save tax settings
  const saveTaxSettings = async () => {
    if (!selectedTenant && tenants.length === 0) return

    const targetTenantId = selectedTenant?.id || tenants[0]?.id
    if (!targetTenantId) return

    setTaxSaving(true)
    setTaxError(null)
    setTaxSuccess(false)

    try {
      const res = await fetch('/api/admin/settings/taxes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: targetTenantId,
          taxRatePercent,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to save tax settings')
      }

      setTaxSuccess(true)
      setTimeout(() => setTaxSuccess(false), 3000)
    } catch (err) {
      setTaxError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setTaxSaving(false)
    }
  }

  useEffect(() => {
    loadSettings()
    loadTenants()
  }, [loadSettings, loadTenants])

  // Load tax settings when section is active and tenant is available
  useEffect(() => {
    if (activeSection === 'taxes') {
      const targetTenantId = selectedTenant?.id || tenants[0]?.id
      if (targetTenantId) {
        loadTaxSettings(targetTenantId)
      }
    }
  }, [activeSection, selectedTenant, tenants, loadTaxSettings])

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

      const scope = tenantMode && selectedTenant ? 'tenant' : 'global'
      const tenantParam = selectedTenant ? `&tenantId=${selectedTenant.id}` : ''

      const res = await fetch(`/api/admin/settings?scope=${scope}${tenantParam}`, {
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
    const isOverridden = tenantMode && tenantOverrides.has(key)
    const canOverride = tenantMode && settingSchema.tenantOverridable

    if (tenantMode && !settingSchema.tenantOverridable) {
      return (
        <div className="opacity-50">
          <div className="text-xs text-white/40 mb-1">Global only (cannot be overridden)</div>
          <div className="px-4 py-3 bg-black/30 border border-white/10 text-white/50">
            {String(value)}
          </div>
        </div>
      )
    }

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
            <Input
              type="number"
              value={value as number}
              onChange={(e) => handleSettingChange(key, parseFloat(e.target.value) || 0)}
              className="max-w-48"
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
            <Input
              type="text"
              value={value as string}
              onChange={(e) => handleSettingChange(key, e.target.value)}
            />
          )
      }
    })()

    return (
      <div>
        {isOverridden && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-purple font-bold uppercase">Tenant Override Active</span>
            <button
              onClick={async () => {
                await fetch(`/api/admin/settings?scope=tenant&tenantId=${selectedTenant?.id}&key=${key}`, {
                  method: 'DELETE',
                })
                await loadSettings()
              }}
              className="text-xs text-white/50 hover:text-white underline"
            >
              Reset to global
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
      <AdminLayout userRole="hq_admin" userName={userName}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 text-neon animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <PageHeader
        title="Settings"
        description="Configure global system settings and tenant overrides"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Settings' },
        ]}
      >
        <div className="flex items-center gap-4">
          {/* Tenant Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTenantMode(!tenantMode)
                if (!tenantMode) {
                  setSelectedTenant(null)
                }
              }}
              className={cn(
                'px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors',
                tenantMode
                  ? 'bg-purple/20 border-purple text-purple'
                  : 'border-white/30 text-white/60 hover:border-white/50'
              )}
            >
              {tenantMode ? 'Tenant Mode' : 'Global Mode'}
            </button>

            {tenantMode && (
              <select
                value={selectedTenant?.id || ''}
                onChange={(e) => {
                  const tenant = tenants.find((t) => t.id === e.target.value)
                  setSelectedTenant(tenant || null)
                }}
                className="bg-black border border-white/20 text-white px-3 py-1.5 text-sm focus:border-neon focus:outline-none"
              >
                <option value="">Select Tenant...</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Save Button */}
          <Button
            variant="neon"
            onClick={handleSave}
            disabled={saving || Object.keys(pendingChanges).length === 0}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : success ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Saved!
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
                {Object.keys(pendingChanges).length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-black/30 text-xs rounded">
                    {Object.keys(pendingChanges).length}
                  </span>
                )}
              </>
            )}
          </Button>
        </div>
      </PageHeader>

      {error && (
        <div className="mb-6 p-4 bg-magenta/10 border border-magenta/30 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-magenta" />
          <span className="text-white">{error}</span>
          <button onClick={loadSettings} className="ml-auto text-neon hover:underline text-sm">
            Retry
          </button>
        </div>
      )}

      {tenantMode && !selectedTenant && (
        <div className="mb-6 p-4 bg-purple/10 border border-purple/30 flex items-center gap-3">
          <Users className="h-5 w-5 text-purple" />
          <span className="text-white">Select a tenant to view and edit their settings overrides.</span>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-4">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {SETTINGS_SECTIONS.map((section) => {
              const Icon = section.icon
              const settingsInSection = getSettingsForCategory(section.id)
              const changesInSection = settingsInSection.filter(([key]) => key in pendingChanges)

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'flex items-center justify-between w-full px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider transition-all',
                    activeSection === section.id
                      ? 'bg-neon/10 text-neon border-l-2 border-neon'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    {section.label}
                  </span>
                  {changesInSection.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-neon/20 text-neon text-xs rounded">
                      {changesInSection.length}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Pending Changes Summary */}
          {Object.keys(pendingChanges).length > 0 && (
            <div className="mt-6 p-4 bg-neon/5 border border-neon/30">
              <p className="text-xs font-bold uppercase tracking-wider text-neon mb-2">
                Unsaved Changes
              </p>
              <ul className="text-xs text-white/60 space-y-1">
                {Object.keys(pendingChanges).map((key) => (
                  <li key={key} className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-neon rounded-full" />
                    {schema[key]?.label || key}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  setPendingChanges({})
                  loadSettings()
                }}
                className="mt-3 text-xs text-white/50 hover:text-white flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Discard changes
              </button>
            </div>
          )}
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3 space-y-6">
          {SETTINGS_SECTIONS.map((section) => {
            if (activeSection !== section.id) return null

            const sectionSettings = getSettingsForCategory(section.id)

            return (
              <ContentCard
                key={section.id}
                title={section.label + ' Settings'}
                accent={section.accent as 'neon' | 'magenta' | 'purple'}
              >
                <div className="space-y-8">
                  {sectionSettings.length === 0 ? (
                    <p className="text-white/40 text-sm">No settings in this category.</p>
                  ) : (
                    sectionSettings.map(([key, settingSchema]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <label className="block text-sm font-bold uppercase tracking-wider text-white mb-1">
                              {settingSchema.label}
                            </label>
                            <p className="text-xs text-white/40 mb-2">
                              {settingSchema.description}
                            </p>
                          </div>
                          {settingSchema.tenantOverridable && (
                            <span className="text-xs text-purple/60 uppercase">
                              Tenant Override OK
                            </span>
                          )}
                        </div>
                        {renderSettingField(key, settingSchema)}
                      </div>
                    ))
                  )}
                </div>
              </ContentCard>
            )
          })}

          {/* Tax Settings Section */}
          {activeSection === 'taxes' && (
            <ContentCard title="Tax Settings" accent="neon">
              <div className="p-4 bg-neon/10 border border-neon/30 mb-6">
                <div className="flex items-center gap-3">
                  <Receipt className="h-6 w-6 text-neon" />
                  <div>
                    <p className="font-bold text-neon">Sales Tax Configuration</p>
                    <p className="text-xs text-white/60">
                      Configure sales tax rates for physical products (like t-shirts).
                      Camp registrations (services) are typically not subject to sales tax.
                    </p>
                  </div>
                </div>
              </div>

              {taxLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-neon" />
                </div>
              ) : (
                <div className="space-y-6">
                  {taxError && (
                    <div className="p-3 bg-magenta/10 border border-magenta/30 text-magenta text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {taxError}
                    </div>
                  )}

                  {taxSuccess && (
                    <div className="p-3 bg-neon/10 border border-neon/30 text-neon text-sm flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Tax settings saved successfully!
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-sm font-bold uppercase tracking-wider text-white">
                      Tenant
                    </label>
                    <p className="text-xs text-white/40 mb-2">
                      Select the tenant to configure tax settings for
                    </p>
                    <select
                      value={selectedTenant?.id || tenants[0]?.id || ''}
                      onChange={(e) => {
                        const tenant = tenants.find((t) => t.id === e.target.value)
                        if (tenant) {
                          setSelectedTenant(tenant)
                          loadTaxSettings(tenant.id)
                        }
                      }}
                      className="w-full max-w-xs bg-black border border-white/20 text-white px-4 py-2 focus:border-neon focus:outline-none"
                    >
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold uppercase tracking-wider text-white">
                      Sales Tax Rate (%)
                    </label>
                    <p className="text-xs text-white/40 mb-2">
                      The tax rate applied to taxable items (physical products like merchandise)
                    </p>
                    <div className="flex items-center gap-4">
                      <Input
                        type="number"
                        min="0"
                        max="25"
                        step="0.01"
                        value={taxRatePercent}
                        onChange={(e) => setTaxRatePercent(parseFloat(e.target.value) || 0)}
                        className="max-w-32"
                      />
                      <span className="text-white/60">%</span>
                    </div>
                    <p className="text-xs text-white/40 mt-2">
                      Common rates: Florida 6%, California 7.25%, Texas 6.25%, New York 8%
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <Button
                      variant="neon"
                      onClick={saveTaxSettings}
                      disabled={taxSaving}
                    >
                      {taxSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Tax Settings
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </ContentCard>
          )}

          {/* Developer Mode Special Section */}
          {activeSection === 'developer' && (
            <ContentCard title="Developer Mode" accent="neon">
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 mb-6">
                <div className="flex items-center gap-3">
                  <FlaskConical className="h-6 w-6 text-amber-400" />
                  <div>
                    <p className="font-bold text-amber-200">Warning: Developer Mode</p>
                    <p className="text-xs text-amber-200/60">
                      When enabled, all Stripe payments will be simulated. No real charges will occur.
                      The platform will behave as if payments are processed, but no money will move.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                {getSettingsForCategory('developer').map(([key, settingSchema]) => (
                  <div key={key} className="space-y-2">
                    <div>
                      <label className="block text-sm font-bold uppercase tracking-wider text-white mb-1">
                        {settingSchema.label}
                      </label>
                      <p className="text-xs text-white/40 mb-2">
                        {settingSchema.description}
                      </p>
                    </div>
                    {renderSettingField(key, settingSchema)}
                  </div>
                ))}
              </div>
            </ContentCard>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
