'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  MapPin,
  Building2,
  User,
  Loader2,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Check,
} from 'lucide-react'

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

interface Tenant {
  id: string
  name: string
  licenseStatus?: string | null
}

interface Licensee {
  id: string
  name: string
  email: string
  tenantName: string | null
}

interface Assignments {
  tenants: Array<{ id: string; name: string }>
  licensees: Array<{ id: string; name: string; email: string }>
}

export default function AssignLicenseePage() {
  const router = useRouter()
  const params = useParams()
  const territoryId = params.id as string

  const [territory, setTerritory] = useState<Territory | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [licensees, setLicensees] = useState<Licensee[]>([])
  const [selectedTenants, setSelectedTenants] = useState<Set<string>>(new Set())
  const [selectedLicensees, setSelectedLicensees] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      try {
        const [territoryRes, dataRes] = await Promise.all([
          fetch(`/api/admin/territories/${territoryId}`, { credentials: 'include' }),
          fetch('/api/admin/territories', { credentials: 'include' }),
        ])

        const territoryResult = await territoryRes.json()
        const dataResult = await dataRes.json()

        if (!territoryRes.ok || !territoryResult.data) {
          setError(territoryResult.error || 'Territory not found')
          setLoading(false)
          return
        }

        const t = territoryResult.data

        if (t.status === 'closed') {
          setError('This territory is closed. Reopen it before assigning.')
          setLoading(false)
          return
        }

        setTerritory(t)

        // Set current assignments
        if (territoryResult.assignments) {
          const assignments = territoryResult.assignments as Assignments
          setSelectedTenants(new Set(assignments.tenants.map(t => t.id)))
          setSelectedLicensees(new Set(assignments.licensees.map(l => l.id)))
        }

        if (dataResult.data?.tenants) {
          setTenants(dataResult.data.tenants)
        }

        if (dataResult.data?.licensees) {
          setLicensees(dataResult.data.licensees)
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

  const toggleTenant = (id: string) => {
    setSelectedTenants(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleLicensee = (id: string) => {
    setSelectedLicensees(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (selectedTenants.size === 0 && selectedLicensees.size === 0) {
      setError('Please select at least one organization or licensee')
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`/api/admin/territories/${territoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'assign',
          tenantIds: Array.from(selectedTenants),
          licenseeIds: Array.from(selectedLicensees),
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        setError(result.error || 'Failed to save assignments')
        setSaving(false)
        return
      }

      setSuccess(true)
      setSaving(false)

      setTimeout(() => {
        router.push('/admin/licensees/territories')
      }, 1500)
    } catch {
      setError('Failed to save assignments')
      setSaving(false)
    }
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
              Cannot Assign
            </h2>
            <p className="text-white/50 mb-6 max-w-md">{error}</p>
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
              Assignments Saved!
            </h2>
            <p className="text-white/50 mb-4">
              The territory has been assigned successfully.
            </p>
            <p className="text-sm text-white/30">Redirecting...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const totalSelected = selectedTenants.size + selectedLicensees.size

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

      <div className="max-w-3xl mx-auto">
        <PageHeader
          title="Assign to Territory"
          description={`Select organizations and licensees for ${territory.name}`}
        />

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-400">Error</p>
              <p className="text-sm text-red-400/70">{error}</p>
            </div>
          </div>
        )}

        {/* Territory Info Card */}
        <ContentCard title="Territory" accent="purple" className="mb-6">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 bg-purple/10 border border-purple/30 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-7 w-7 text-purple" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{territory.name}</h3>
              <p className="text-white/50">
                {territory.city && `${territory.city}, `}
                {territory.state_region}
                {territory.country !== 'USA' && `, ${territory.country}`}
              </p>
              {territory.description && (
                <p className="text-sm text-white/40 mt-2">{territory.description}</p>
              )}
            </div>
          </div>
        </ContentCard>

        <form onSubmit={handleSubmit}>
          {/* Organizations Section */}
          <ContentCard title="Organizations" accent="magenta" className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-4 w-4 text-white/40" />
              <span className="text-sm text-white/60">
                Select organizations to assign ({selectedTenants.size} selected)
              </span>
            </div>

            {tenants.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/50 mb-4">No organizations available</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                {tenants.map((tenant) => (
                  <label
                    key={tenant.id}
                    className={cn(
                      'flex items-center gap-4 p-4 cursor-pointer border transition-colors',
                      selectedTenants.has(tenant.id)
                        ? 'border-magenta bg-magenta/10'
                        : 'border-white/10 hover:border-white/30'
                    )}
                  >
                    <div
                      className={cn(
                        'h-5 w-5 border-2 flex items-center justify-center transition-colors',
                        selectedTenants.has(tenant.id)
                          ? 'border-magenta bg-magenta'
                          : 'border-white/30'
                      )}
                    >
                      {selectedTenants.has(tenant.id) && (
                        <Check className="h-3 w-3 text-black" />
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedTenants.has(tenant.id)}
                      onChange={() => toggleTenant(tenant.id)}
                      className="sr-only"
                    />
                    <div className="flex-1 flex items-center justify-between">
                      <p className={cn(
                        'font-semibold',
                        selectedTenants.has(tenant.id) ? 'text-magenta' : 'text-white'
                      )}>
                        {tenant.name}
                      </p>
                      {tenant.licenseStatus && (
                        <span className={cn(
                          'text-xs px-2 py-1 uppercase tracking-wider',
                          tenant.licenseStatus === 'active'
                            ? 'bg-neon/10 text-neon border border-neon/30'
                            : 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/30'
                        )}>
                          {tenant.licenseStatus}
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </ContentCard>

          {/* Licensees Section */}
          <ContentCard title="Licensees (People)" accent="neon" className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-4 w-4 text-white/40" />
              <span className="text-sm text-white/60">
                Select individual licensees to assign ({selectedLicensees.size} selected)
              </span>
            </div>

            {licensees.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/50 mb-4">No licensees available</p>
                <Link
                  href="/admin/licensees/new"
                  className="text-neon hover:underline"
                >
                  Add a licensee first
                </Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                {licensees.map((licensee) => (
                  <label
                    key={licensee.id}
                    className={cn(
                      'flex items-center gap-4 p-4 cursor-pointer border transition-colors',
                      selectedLicensees.has(licensee.id)
                        ? 'border-neon bg-neon/10'
                        : 'border-white/10 hover:border-white/30'
                    )}
                  >
                    <div
                      className={cn(
                        'h-5 w-5 border-2 flex items-center justify-center transition-colors',
                        selectedLicensees.has(licensee.id)
                          ? 'border-neon bg-neon'
                          : 'border-white/30'
                      )}
                    >
                      {selectedLicensees.has(licensee.id) && (
                        <Check className="h-3 w-3 text-black" />
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedLicensees.has(licensee.id)}
                      onChange={() => toggleLicensee(licensee.id)}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <p className={cn(
                        'font-semibold',
                        selectedLicensees.has(licensee.id) ? 'text-neon' : 'text-white'
                      )}>
                        {licensee.name}
                      </p>
                      <p className="text-xs text-white/40">
                        {licensee.email}
                        {licensee.tenantName && ` - ${licensee.tenantName}`}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </ContentCard>

          {/* Summary */}
          {totalSelected > 0 && (
            <div className="p-4 bg-neon/5 border border-neon/20 mb-6">
              <p className="text-sm text-white/60 mb-1">Summary:</p>
              <p className="text-white">
                <span className="font-bold text-neon">{totalSelected}</span>
                {' '}assignment{totalSelected !== 1 ? 's' : ''} will be made to{' '}
                <span className="font-bold text-purple">{territory.name}</span>
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving || totalSelected === 0}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  Save Assignments
                </>
              )}
            </button>

            <Link
              href="/admin/licensees/territories"
              className="px-8 flex items-center justify-center border border-white/20 text-white/60 font-bold uppercase tracking-wider hover:border-white/40 hover:text-white transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}
