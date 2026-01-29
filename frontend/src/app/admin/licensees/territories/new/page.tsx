'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'

// Types
type TerritoryStatus = 'open' | 'reserved' | 'assigned' | 'closed'

interface CreateTerritoryInput {
  name: string
  description?: string
  country: string
  state_region: string
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
} from 'lucide-react'

/**
 * Add New Territory Page
 *
 * Form to create a new territory that can be assigned to licensees.
 */

// US States for dropdown
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
  tenant_id?: string
}

export default function NewTerritoryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Read return-to info on mount (useEffect guarantees client-side execution)
  const [returnInfo, setReturnInfo] = useState<{
    returnTo: string | null
    originalReturnTo: string | null
    originalTenantId: string | null
  }>({ returnTo: null, originalReturnTo: null, originalTenantId: null })

  useEffect(() => {
    const url = new URL(window.location.href)
    let returnTo = url.searchParams.get('returnTo')
    const originalReturnTo = url.searchParams.get('originalReturnTo')
    const originalTenantId = url.searchParams.get('originalTenantId')

    // Fallback: check sessionStorage for return route
    if (!returnTo) {
      const stored = sessionStorage.getItem('territory-return-to')
      if (stored) {
        returnTo = stored
        sessionStorage.removeItem('territory-return-to')
      }
    }

    if (returnTo) {
      setReturnInfo({ returnTo, originalReturnTo, originalTenantId })
    }
  }, [])

  const returnInfoRef = useRef(returnInfo)
  returnInfoRef.current = returnInfo

  const isReturnToVenueCreate = returnInfo.returnTo === 'venue-create'
  const isReturnToCampCreate = returnInfo.returnTo === 'camp-create'
  const hasReturnTo = isReturnToVenueCreate || isReturnToCampCreate
  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([])
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)

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

  // Fetch tenants for dropdown
  useEffect(() => {
    async function fetchTenants() {
      try {
        const response = await fetch('/api/admin/territories', {
          credentials: 'include',
        })
        const result = await response.json()
        if (result.data?.tenants) {
          setTenants(result.data.tenants)
        }
      } catch {
        // Ignore error - tenants are optional
      }
    }
    fetchTenants()
  }, [])

  // Check for conflicts (simplified - just clear warning)
  useEffect(() => {
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

    const input: CreateTerritoryInput = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      country: formData.country.trim(),
      state_region: formData.state_region.trim(),
      city: formData.city.trim() || undefined,
      postal_codes: formData.postal_codes.trim() || undefined,
      tenant_id: formData.tenant_id || undefined,
      status: formData.tenant_id ? 'assigned' : formData.status,
      notes: formData.notes.trim() || undefined,
    }

    try {
      const response = await fetch('/api/admin/territories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to create territory')
        setSaving(false)
        return
      }

      setSuccess(true)
      setSaving(false)

      // Redirect after short delay - use hard navigation for reliability
      setTimeout(() => {
        const info = returnInfoRef.current
        if (info.returnTo === 'venue-create') {
          const newTerritoryId = result.territory?.id || result.data?.id || result.id
          const params = new URLSearchParams({ territoryCreated: 'true' })
          if (newTerritoryId) params.set('territoryId', newTerritoryId)
          if (info.originalReturnTo) params.set('returnTo', info.originalReturnTo)
          if (info.originalTenantId) params.set('tenantId', info.originalTenantId)
          window.location.href = `/admin/venues/new?${params.toString()}`
        } else if (info.returnTo === 'camp-create') {
          window.location.href = '/portal/camps/new?territoryCreated=true'
        } else {
          window.location.href = '/admin/licensees/territories'
        }
      }, 1500)
    } catch {
      setError('Failed to create territory')
      setSaving(false)
    }
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
              Territory Created!
            </h2>
            <p className="text-white/50 mb-4">
              {formData.tenant_id
                ? 'The territory has been created and assigned to the selected licensee.'
                : 'The territory is now available for assignment.'}
            </p>
            <p className="text-sm text-white/30">
              {isReturnToVenueCreate
                ? 'Redirecting to venue form...'
                : isReturnToCampCreate
                  ? 'Redirecting to camp form...'
                  : 'Redirecting to territories list...'}
            </p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout userRole="hq_admin" userName="Admin">
      <div className="mb-6">
        <Link
          href={hasReturnTo ? (isReturnToCampCreate ? '/portal/camps/new' : '/admin/venues/new') : '/admin/licensees/territories'}
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-neon transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {isReturnToVenueCreate ? 'Back to Venue Form' : isReturnToCampCreate ? 'Back to Camp Form' : 'Back to Territories'}
        </Link>
      </div>

      <PageHeader
        title="Add New Territory"
        description="Define a new geographic region for licensing."
      />

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-400">Error creating territory</p>
            <p className="text-sm text-red-400/70">{error}</p>
          </div>
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
                    placeholder="e.g., Sarasota Metro, Chicago North"
                    className={cn(
                      'w-full px-4 py-3 bg-black border text-white placeholder:text-white/30 focus:outline-none',
                      formErrors.name
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-white/20 focus:border-neon'
                    )}
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.name}</p>
                  )}
                  <p className="mt-2 text-xs text-white/40">
                    A descriptive name for this territory region
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Brief description of this territory coverage area..."
                    rows={3}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
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
                      className={cn(
                        'w-full px-4 py-3 bg-black border text-white focus:outline-none appearance-none',
                        formErrors.country
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-white/20 focus:border-purple'
                      )}
                    >
                      <option value="USA">United States</option>
                      <option value="CAN">Canada</option>
                    </select>
                    {formErrors.country && (
                      <p className="mt-1 text-xs text-red-400">{formErrors.country}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      State / Region *
                    </label>
                    <select
                      value={formData.state_region}
                      onChange={(e) => updateField('state_region', e.target.value)}
                      className={cn(
                        'w-full px-4 py-3 bg-black border text-white focus:outline-none appearance-none',
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
                    {formErrors.state_region && (
                      <p className="mt-1 text-xs text-red-400">{formErrors.state_region}</p>
                    )}
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
                    placeholder="e.g., Chicago, Sarasota"
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-purple focus:outline-none"
                  />
                  <p className="mt-2 text-xs text-white/40">
                    Primary city or leave blank for state-wide territories
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Postal Codes
                  </label>
                  <input
                    type="text"
                    value={formData.postal_codes}
                    onChange={(e) => updateField('postal_codes', e.target.value)}
                    placeholder="e.g., 34230, 34231, 34232 or 34230-34250"
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-purple focus:outline-none"
                  />
                  <p className="mt-2 text-xs text-white/40">
                    Comma-separated list or range of zip codes covered
                  </p>
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
                  placeholder="Internal notes about this territory, negotiations, history..."
                  rows={4}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-magenta focus:outline-none resize-none"
                />
                <p className="mt-2 text-xs text-white/40">
                  These notes are only visible to HQ administrators
                </p>
              </div>
            </ContentCard>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-44 space-y-6">
              {/* Status */}
              <ContentCard title="Territory Status" accent="neon">
                <div className="space-y-4">
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Initial Status
                  </label>
                  <div className="space-y-2">
                    <label
                      className={cn(
                        'flex items-start gap-3 p-4 cursor-pointer border transition-colors',
                        formData.status === 'open' && !formData.tenant_id
                          ? 'border-neon bg-neon/10'
                          : 'border-white/10 hover:border-white/30'
                      )}
                    >
                      <input
                        type="radio"
                        name="status"
                        value="open"
                        checked={formData.status === 'open' && !formData.tenant_id}
                        onChange={() => updateField('status', 'open')}
                        disabled={!!formData.tenant_id}
                        className="mt-1"
                      />
                      <div>
                        <div className={cn(
                          'font-bold',
                          formData.status === 'open' && !formData.tenant_id ? 'text-neon' : 'text-white'
                        )}>
                          Open
                        </div>
                        <div className="text-sm text-white/50">Available for licensing</div>
                      </div>
                    </label>
                    <label
                      className={cn(
                        'flex items-start gap-3 p-4 cursor-pointer border transition-colors',
                        formData.status === 'reserved' && !formData.tenant_id
                          ? 'border-yellow-400 bg-yellow-400/10'
                          : 'border-white/10 hover:border-white/30'
                      )}
                    >
                      <input
                        type="radio"
                        name="status"
                        value="reserved"
                        checked={formData.status === 'reserved' && !formData.tenant_id}
                        onChange={() => updateField('status', 'reserved')}
                        disabled={!!formData.tenant_id}
                        className="mt-1"
                      />
                      <div>
                        <div className={cn(
                          'font-bold',
                          formData.status === 'reserved' && !formData.tenant_id ? 'text-yellow-400' : 'text-white'
                        )}>
                          Reserved
                        </div>
                        <div className="text-sm text-white/50">In negotiation</div>
                      </div>
                    </label>
                  </div>
                  {formData.tenant_id && (
                    <p className="text-xs text-magenta">
                      Status will be set to &quot;Assigned&quot; when a licensee is selected.
                    </p>
                  )}
                </div>
              </ContentCard>

              {/* Assign Licensee */}
              <ContentCard title="Assign Licensee" accent="magenta">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    <Building2 className="h-4 w-4 inline mr-2" />
                    Licensee (Optional)
                  </label>
                  <select
                    value={formData.tenant_id}
                    onChange={(e) => updateField('tenant_id', e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-magenta focus:outline-none appearance-none"
                  >
                    <option value="">Leave unassigned</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-white/40">
                    Optionally assign to an existing licensee now
                  </p>
                </div>
              </ContentCard>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      Create Territory
                    </>
                  )}
                </button>

                <Link
                  href={hasReturnTo ? (isReturnToCampCreate ? '/portal/camps/new' : '/admin/venues/new') : '/admin/licensees/territories'}
                  className="flex items-center justify-center gap-2 w-full py-3 border border-white/20 text-white/60 font-bold uppercase tracking-wider hover:border-white/40 hover:text-white transition-colors"
                >
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        </div>
      </form>
    </AdminLayout>
  )
}
