'use client'

/**
 * RoleRequirementsAdmin
 *
 * Admin component for configuring role-based training requirements.
 * HQ Admins can assign which modules are required for each role.
 */

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Loader2,
  AlertCircle,
  Check,
  Save,
  Users,
  BookOpen,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

interface Module {
  id: string
  title: string
  slug: string
  portalType: string
}

interface RoleRequirement {
  role: string
  modules: Module[]
}

interface RoleConfig {
  key: string
  label: string
  description: string
}

const CONFIGURABLE_ROLES: RoleConfig[] = [
  {
    key: 'coach',
    label: 'Coach',
    description: 'Coaches who run camp sessions',
  },
  {
    key: 'director',
    label: 'Director',
    description: 'Camp Directors who manage operations',
  },
  {
    key: 'licensee_owner',
    label: 'Licensee Owner',
    description: 'Territory licensee owners',
  },
  {
    key: 'cit_volunteer',
    label: 'CIT Volunteer',
    description: 'Counselors in Training volunteers',
  },
]

export function RoleRequirementsAdmin() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [allModules, setAllModules] = useState<Module[]>([])
  const [requirements, setRequirements] = useState<Map<string, Set<string>>>(new Map())
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set(['coach']))

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)

      // Fetch all modules and current requirements
      const [modulesRes, requirementsRes] = await Promise.all([
        fetch('/api/empoweru/library', { credentials: 'include' }),
        fetch('/api/empoweru/role-requirements', { credentials: 'include' }),
      ])

      if (!modulesRes.ok) {
        throw new Error('Failed to load modules')
      }

      const modulesJson = await modulesRes.json()
      const modules: Module[] = (modulesJson.data || []).map((m: any) => ({
        id: m.id,
        title: m.title,
        slug: m.slug,
        portalType: m.portal_type,
      }))
      setAllModules(modules)

      // Build requirements map
      const reqMap = new Map<string, Set<string>>()
      CONFIGURABLE_ROLES.forEach((role) => {
        reqMap.set(role.key, new Set())
      })

      if (requirementsRes.ok) {
        const reqJson = await requirementsRes.json()
        const reqs: RoleRequirement[] = reqJson.data || []
        reqs.forEach((req) => {
          const moduleIds = req.modules.map((m) => m.id)
          reqMap.set(req.role, new Set(moduleIds))
        })
      }

      setRequirements(reqMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  function toggleRole(roleKey: string) {
    setExpandedRoles((prev) => {
      const next = new Set(prev)
      if (next.has(roleKey)) {
        next.delete(roleKey)
      } else {
        next.add(roleKey)
      }
      return next
    })
  }

  function toggleModule(roleKey: string, moduleId: string) {
    setRequirements((prev) => {
      const next = new Map(prev)
      const roleSet = new Set(prev.get(roleKey) || [])

      if (roleSet.has(moduleId)) {
        roleSet.delete(moduleId)
      } else {
        roleSet.add(moduleId)
      }

      next.set(roleKey, roleSet)
      return next
    })
    setSuccess(null)
  }

  async function handleSave(roleKey: string) {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const moduleIds = Array.from(requirements.get(roleKey) || [])

      const response = await fetch('/api/empoweru/role-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: roleKey, moduleIds }),
      })

      if (!response.ok) {
        const json = await response.json()
        throw new Error(json.error || 'Failed to save requirements')
      }

      setSuccess(`Requirements for ${CONFIGURABLE_ROLES.find((r) => r.key === roleKey)?.label} saved successfully!`)

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-12 w-12 text-neon animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-white/10">
        <div className="h-12 w-12 bg-purple/20 flex items-center justify-center">
          <Users className="h-6 w-6 text-purple" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">
            Training Requirements by Role
          </h2>
          <p className="text-white/50 text-sm">
            Configure which modules are required for each role to become certified
          </p>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 bg-magenta/10 border border-magenta/30 flex items-center gap-3 text-magenta">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-neon/10 border border-neon/30 flex items-center gap-3 text-neon">
          <Check className="h-5 w-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Role Cards */}
      <div className="space-y-4">
        {CONFIGURABLE_ROLES.map((role) => {
          const isExpanded = expandedRoles.has(role.key)
          const selectedModules = requirements.get(role.key) || new Set()
          const selectedCount = selectedModules.size

          return (
            <div
              key={role.key}
              className="bg-black border border-white/10 overflow-hidden"
            >
              {/* Role Header */}
              <button
                onClick={() => toggleRole(role.key)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-white/50" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-white/50" />
                  )}
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-white">{role.label}</h3>
                    <p className="text-white/50 text-sm">{role.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'px-3 py-1 text-sm font-bold',
                      selectedCount > 0
                        ? 'bg-neon/20 text-neon'
                        : 'bg-white/10 text-white/50'
                    )}
                  >
                    {selectedCount} module{selectedCount !== 1 ? 's' : ''} required
                  </span>
                </div>
              </button>

              {/* Module Selection */}
              {isExpanded && (
                <div className="border-t border-white/10">
                  <div className="p-4">
                    <div className="text-sm text-white/50 uppercase tracking-wider mb-3">
                      Select Required Modules
                    </div>

                    {allModules.length === 0 ? (
                      <div className="text-center py-8 text-white/50">
                        <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No modules available yet</p>
                      </div>
                    ) : (
                      <div className="grid gap-2 md:grid-cols-2">
                        {allModules.map((module) => {
                          const isSelected = selectedModules.has(module.id)

                          return (
                            <button
                              key={module.id}
                              onClick={() => toggleModule(role.key, module.id)}
                              className={cn(
                                'flex items-center gap-3 p-3 border text-left transition-all',
                                isSelected
                                  ? 'border-neon bg-neon/5 text-white'
                                  : 'border-white/10 hover:border-white/30 text-white/70 hover:text-white'
                              )}
                            >
                              <div
                                className={cn(
                                  'h-5 w-5 border flex items-center justify-center flex-shrink-0',
                                  isSelected
                                    ? 'border-neon bg-neon'
                                    : 'border-white/30'
                                )}
                              >
                                {isSelected && (
                                  <Check className="h-3 w-3 text-black" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">
                                  {module.title}
                                </div>
                                <div className="text-xs text-white/40">
                                  {module.portalType}
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Save Button */}
                  <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end">
                    <button
                      onClick={() => handleSave(role.key)}
                      disabled={saving}
                      className={cn(
                        'flex items-center gap-2 px-6 py-2 font-bold uppercase tracking-wider text-sm transition-colors',
                        saving
                          ? 'bg-white/10 text-white/30 cursor-not-allowed'
                          : 'bg-neon text-black hover:bg-neon/90'
                      )}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save {role.label} Requirements
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Info Footer */}
      <div className="p-4 bg-white/5 border border-white/10">
        <p className="text-sm text-white/50">
          <span className="font-bold text-white">Note:</span> Users must complete
          all required modules with a 100% quiz score to become certified. Once
          certified, they can access their dashboard. HQ Admins and Parents are
          exempt from training requirements.
        </p>
      </div>
    </div>
  )
}
