'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'

// Types
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

interface UpdateTerritoryInput {
  name?: string
  description?: string
  country?: string
  state_region?: string
  city?: string
  postal_codes?: string
  tenant_id?: string | null
  status?: TerritoryStatus
  notes?: string
}
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  MapPin,
  Globe,
  Building2,
  FileText,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Archive,
  RotateCcw,
  Trash2,
} from 'lucide-react'

/**
 * Edit Territory Page
 *
 * View and edit an existing territory.
 */

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
]

interface FormData {
  name: string
  description: string
  country: string
  state_region: string
  city: string
  postal_codes: string
  tenant_id: string
  status: TerritoryStatus
  notes: string
}

interface FormErrors {
  name?: string
  country?: string
  state_region?: string
}

export default function EditTerritoryPage() {
  const router = useRouter()
  const params = useParams()
  const territoryId = params.id as string

  const [territory, setTerritory] = useState<Territory | null>(null)
  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)
  const [processingAction, setProcessingAction] = useState<string | null>(null)

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    country: 'USA',
    state_region: '',
    city: '',
    postal_codes: '',
    tenant_id: '',
    status: 'open',
    notes: '',
  })

  // Fetch territory and tenants on mount
  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      try {
        const [territoryRes, tenantsRes] = await Promise.all([
          fetch(`/api/admin/territories/${territoryId}`, { credentials: 'include' }),
          fetch('/api/admin/territories', { credentials: 'include' }),
        ])

        const territoryResult = await territoryRes.json()
        const tenantsResult = await tenantsRes.json()

        if (!territoryRes.ok || !territoryResult.data) {
          setError(territoryResult.error || 'Territory not found')
          setLoading(false)
          return
        }

        const t = territoryResult.data
        setTerritory(t)
        setFormData({
          name: t.name,
          description: t.description || '',
          country: t.country,
          state_region: t.state_region,
          city: t.city || '',
          postal_codes: t.postal_codes || '',
          tenant_id: t.tenant_id || '',
          status: t.status,
          notes: t.notes || '',
        })

        if (tenantsResult.data?.tenants) {
          setTenants(tenantsResult.data.tenants)
        }
      } catch {
        setError('Failed to load territory')
      }

      setLoading(false)
    }

    if (territoryId) {
      fetchData()
    }
  }, [territoryId])

  // Check for conflicts when name or state changes (simplified - just clear warning for now)
  useEffect(() => {
    // Conflict checking would require a separate API endpoint - skipping for now
    setConflictWarning(null)
  }, [formData.name, formData.state_region])

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const errors: FormErrors = {}

    if (!formData.name.trim()) {
      errors.name = 'Territory name is required'
    }
    if (!formData.country.trim()) {
      errors.country = 'Country is required'
    }
    if (!formData.state_region.trim()) {
      errors.state_region = 'State/Region is required'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      return
    }

    setSaving(true)

    const input: UpdateTerritoryInput = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      country: formData.country.trim(),
      state_region: formData.state_region.trim(),
      city: formData.city.trim() || undefined,
      postal_codes: formData.postal_codes.trim() || undefined,
      tenant_id: formData.tenant_id || null,
      status: formData.status,
      notes: formData.notes.trim() || undefined,
    }

    try {
      const response = await fetch(`/api/admin/territories/${territoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const result = await response.json()
        setError(result.error || 'Failed to update territory')
        setSaving(false)
        return
      }

      setSuccess(true)
      setSaving(false)

      setTimeout(() => {
        router.push('/admin/licensees/territories')
      }, 1500)
    } catch {
      setError('Failed to update territory')
      setSaving(false)
    }
  }

  const handleClose = async () => {
    if (!confirm('Are you sure you want to close this territory? It will be archived.')) {
      return
    }

    setProcessingAction('close')
    try {
      const response = await fetch(`/api/admin/territories/${territoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'close' }),
      })

      if (response.ok) {
        setFormData((prev) => ({ ...prev, status: 'closed', tenant_id: '' }))
        setTerritory((prev) => prev ? { ...prev, status: 'closed', tenant_id: null, tenant_name: null } : null)
      } else {
        const result = await response.json()
        alert(result.error || 'Failed to close territory')
      }
    } catch {
      alert('Failed to close territory')
    }

    setProcessingAction(null)
  }

  const handleReopen = async () => {
    setProcessingAction('reopen')
    try {
      const response = await fetch(`/api/admin/territories/${territoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'reopen' }),
      })

      if (response.ok) {
        setFormData((prev) => ({ ...prev, status: 'open' }))
        setTerritory((prev) => prev ? { ...prev, status: 'open' } : null)
      } else {
        const result = await response.json()
        alert(result.error || 'Failed to reopen territory')
      }
    } catch {
      alert('Failed to reopen territory')
    }

    setProcessingAction(null)
  }

  if (loading) {
    return (
      <AdminLayout userRole="hq_admin" userName="Admin">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 text-neon animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  if (!territory) {
    return (
      <AdminLayout userRole="hq_admin" userName="Admin">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-black uppercase tracking-wider text-white mb-2">
              Territory Not Found
            </h2>
            <p className="text-white/50 mb-6">{error}</p>
            <Link
              href="/admin/licensees/territories"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Territories
            </Link>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (success) {
    return (
      <AdminLayout userRole="hq_admin" userName="Admin">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="mx-auto h-20 w-20 bg-neon/10 border border-neon/30 flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 text-neon" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-wider text-white mb-2">
              Territory Updated!
            </h2>
            <p className="text-white/50 mb-4">Your changes have been saved.</p>
            <p className="text-sm text-white/30">Redirecting...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const isClosed = formData.status === 'closed'

  return (
    <AdminLayout userRole="hq_admin" userName="Admin">
      <div className="mb-6">
        <Link
          href="/admin/licensees/territories"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-neon transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Territories
        </Link>
      </div>

      <PageHeader
        title={`Edit: ${territory.name}`}
        description="Update territory details and assignment."
      />

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-400">Error</p>
            <p className="text-sm text-red-400/70">{error}</p>
          </div>
        </div>
      )}

      {/* Closed Banner */}
      {isClosed && (
        <div className="mb-6 p-4 bg-white/5 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Archive className="h-5 w-5 text-white/40" />
            <div>
              <p className="font-semibold text-white/60">This territory is closed</p>
              <p className="text-sm text-white/40">Reopen it to make changes or assign a licensee.</p>
            </div>
          </div>
          <button
            onClick={handleReopen}
            disabled={processingAction === 'reopen'}
            className="flex items-center gap-2 px-4 py-2 bg-neon text-black text-sm font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors disabled:opacity-50"
          >
            {processingAction === 'reopen' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Reopen
          </button>
        </div>
      )}

      {/* Conflict Warning */}
      {conflictWarning && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-400">Potential Duplicate</p>
            <p className="text-sm text-yellow-400/70">{conflictWarning}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Basic Information */}
            <ContentCard title="Territory Information" accent="neon">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    <MapPin className="h-4 w-4 inline mr-2" />
                    Territory Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    disabled={isClosed}
                    className={cn(
                      'w-full px-4 py-3 bg-black border text-white placeholder:text-white/30 focus:outline-none disabled:opacity-50',
                      formErrors.name
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-white/20 focus:border-neon'
                    )}
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    disabled={isClosed}
                    rows={3}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none disabled:opacity-50"
                  />
                </div>
              </div>
            </ContentCard>

            {/* Location */}
            <ContentCard title="Location Details" accent="purple">
              <div className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      <Globe className="h-4 w-4 inline mr-2" />
                      Country *
                    </label>
                    <select
                      value={formData.country}
                      onChange={(e) => updateField('country', e.target.value)}
                      disabled={isClosed}
                      className={cn(
                        'w-full px-4 py-3 bg-black border text-white focus:outline-none appearance-none disabled:opacity-50',
                        formErrors.country
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-white/20 focus:border-purple'
                      )}
                    >
                      <option value="USA">United States</option>
                      <option value="CAN">Canada</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      State / Region *
                    </label>
                    <select
                      value={formData.state_region}
                      onChange={(e) => updateField('state_region', e.target.value)}
                      disabled={isClosed}
                      className={cn(
                        'w-full px-4 py-3 bg-black border text-white focus:outline-none appearance-none disabled:opacity-50',
                        formErrors.state_region
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-white/20 focus:border-purple'
                      )}
                    >
                      <option value="">Select state...</option>
                      {US_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    disabled={isClosed}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-purple focus:outline-none disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Postal Codes
                  </label>
                  <input
                    type="text"
                    value={formData.postal_codes}
                    onChange={(e) => updateField('postal_codes', e.target.value)}
                    disabled={isClosed}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-purple focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>
            </ContentCard>

            {/* Internal Notes */}
            <ContentCard title="Internal Notes" accent="magenta">
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                  <FileText className="h-4 w-4 inline mr-2" />
                  Notes (HQ Only)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  disabled={isClosed}
                  rows={4}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-magenta focus:outline-none resize-none disabled:opacity-50"
                />
              </div>
            </ContentCard>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-44 space-y-6">
              {/* Status */}
              <ContentCard title="Territory Status" accent="neon">
                <div className="space-y-4">
                  <div className="space-y-2">
                    {['open', 'reserved', 'assigned'].map((status) => (
                      <label
                        key={status}
                        className={cn(
                          'flex items-start gap-3 p-4 cursor-pointer border transition-colors',
                          formData.status === status
                            ? status === 'open' ? 'border-neon bg-neon/10' :
                              status === 'reserved' ? 'border-yellow-400 bg-yellow-400/10' :
                              'border-magenta bg-magenta/10'
                            : 'border-white/10 hover:border-white/30',
                          isClosed && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <input
                          type="radio"
                          name="status"
                          value={status}
                          checked={formData.status === status}
                          onChange={() => updateField('status', status)}
                          disabled={isClosed}
                          className="mt-1"
                        />
                        <div>
                          <div className={cn(
                            'font-bold capitalize',
                            formData.status === status
                              ? status === 'open' ? 'text-neon' :
                                status === 'reserved' ? 'text-yellow-400' :
                                'text-magenta'
                              : 'text-white'
                          )}>
                            {status}
                          </div>
                          <div className="text-sm text-white/50">
                            {status === 'open' && 'Available for licensing'}
                            {status === 'reserved' && 'In negotiation'}
                            {status === 'assigned' && 'Actively licensed'}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </ContentCard>

              {/* Assign Licensee */}
              <ContentCard title="Assigned Licensee" accent="magenta">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    <Building2 className="h-4 w-4 inline mr-2" />
                    Licensee
                  </label>
                  <select
                    value={formData.tenant_id}
                    onChange={(e) => {
                      updateField('tenant_id', e.target.value)
                      if (e.target.value && formData.status !== 'assigned') {
                        updateField('status', 'assigned')
                      }
                    }}
                    disabled={isClosed}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-magenta focus:outline-none appearance-none disabled:opacity-50"
                  >
                    <option value="">Unassigned</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>
              </ContentCard>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={saving || isClosed}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      Save Changes
                    </>
                  )}
                </button>

                {!isClosed && (
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={processingAction === 'close'}
                    className="flex items-center justify-center gap-2 w-full py-3 border border-red-500/30 text-red-400 font-bold uppercase tracking-wider hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    {processingAction === 'close' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                    Close Territory
                  </button>
                )}

                <Link
                  href="/admin/licensees/territories"
                  className="flex items-center justify-center gap-2 w-full py-3 border border-white/20 text-white/60 font-bold uppercase tracking-wider hover:border-white/40 hover:text-white transition-colors"
                >
                  Cancel
                </Link>
              </div>

              {/* Metadata */}
              <div className="p-4 bg-black/30 border border-white/10 text-xs text-white/40 space-y-1">
                <p>Created: {new Date(territory.created_at).toLocaleString()}</p>
                <p>Updated: {new Date(territory.updated_at).toLocaleString()}</p>
                <p className="truncate">ID: {territory.id}</p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </AdminLayout>
  )
}
