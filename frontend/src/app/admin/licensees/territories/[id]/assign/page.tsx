'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import {
  getTerritoryById,
  assignTerritory,
  getTenantsForAssignment,
  Territory,
} from '@/lib/supabase/territories'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  MapPin,
  Building2,
  Loader2,
  CheckCircle,
  AlertCircle,
  UserPlus,
} from 'lucide-react'

/**
 * Assign Licensee Page
 *
 * Quick form to assign a licensee to a territory.
 */

export default function AssignLicenseePage() {
  const router = useRouter()
  const params = useParams()
  const territoryId = params.id as string

  const [territory, setTerritory] = useState<Territory | null>(null)
  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([])
  const [selectedTenant, setSelectedTenant] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const [territoryResult, tenantsResult] = await Promise.all([
        getTerritoryById(territoryId),
        getTenantsForAssignment(),
      ])

      if (territoryResult.error || !territoryResult.data) {
        setError(territoryResult.error?.message || 'Territory not found')
        setLoading(false)
        return
      }

      const t = territoryResult.data

      if (t.status === 'closed') {
        setError('This territory is closed. Reopen it before assigning a licensee.')
        setLoading(false)
        return
      }

      if (t.tenant_id) {
        setError(`This territory is already assigned to ${t.tenant_name || 'a licensee'}. Remove the current licensee first.`)
        setLoading(false)
        return
      }

      setTerritory(t)

      if (tenantsResult.data) {
        setTenants(tenantsResult.data)
      }

      setLoading(false)
    }

    if (territoryId) {
      fetchData()
    }
  }, [territoryId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedTenant) {
      setError('Please select a licensee')
      return
    }

    setSaving(true)

    const { success: assignSuccess, error: assignError } = await assignTerritory(
      territoryId,
      selectedTenant
    )

    if (assignError) {
      setError(assignError.message || 'Failed to assign licensee')
      setSaving(false)
      return
    }

    setSuccess(true)
    setSaving(false)

    setTimeout(() => {
      router.push('/admin/licensees/territories')
    }, 1500)
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
              Cannot Assign Licensee
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
              Licensee Assigned!
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

  const selectedTenantName = tenants.find((t) => t.id === selectedTenant)?.name

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

      <div className="max-w-2xl mx-auto">
        <PageHeader
          title="Assign Licensee"
          description={`Assign a licensee to operate in ${territory.name}`}
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

        {/* Assignment Form */}
        <form onSubmit={handleSubmit}>
          <ContentCard title="Select Licensee" accent="magenta">
            {tenants.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/50 mb-4">No licensees available</p>
                <Link
                  href="/admin/licensees/new"
                  className="text-neon hover:underline"
                >
                  Add a licensee first
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-3">
                    <Building2 className="h-4 w-4 inline mr-2" />
                    Choose a Licensee
                  </label>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {tenants.map((tenant) => (
                      <label
                        key={tenant.id}
                        className={cn(
                          'flex items-center gap-4 p-4 cursor-pointer border transition-colors',
                          selectedTenant === tenant.id
                            ? 'border-magenta bg-magenta/10'
                            : 'border-white/10 hover:border-white/30'
                        )}
                      >
                        <input
                          type="radio"
                          name="tenant"
                          value={tenant.id}
                          checked={selectedTenant === tenant.id}
                          onChange={(e) => setSelectedTenant(e.target.value)}
                          className="sr-only"
                        />
                        <div
                          className={cn(
                            'h-5 w-5 border-2 rounded-full flex items-center justify-center transition-colors',
                            selectedTenant === tenant.id
                              ? 'border-magenta'
                              : 'border-white/30'
                          )}
                        >
                          {selectedTenant === tenant.id && (
                            <div className="h-2.5 w-2.5 bg-magenta rounded-full" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={cn(
                            'font-semibold',
                            selectedTenant === tenant.id ? 'text-magenta' : 'text-white'
                          )}>
                            {tenant.name}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                {selectedTenantName && (
                  <div className="p-4 bg-neon/5 border border-neon/20">
                    <p className="text-sm text-white/60 mb-1">Preview:</p>
                    <p className="text-white">
                      <span className="font-bold text-magenta">{selectedTenantName}</span>
                      {' '}will be assigned to operate{' '}
                      <span className="font-bold text-purple">{territory.name}</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </ContentCard>

          {/* Actions */}
          {tenants.length > 0 && (
            <div className="mt-6 flex gap-4">
              <button
                type="submit"
                disabled={saving || !selectedTenant}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5" />
                    Assign Licensee
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
          )}
        </form>
      </div>
    </AdminLayout>
  )
}
