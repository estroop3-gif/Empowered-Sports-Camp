'use client'

/**
 * Admin Incentive Scorecards Page
 *
 * HQ admin view of all staff compensation across all licensees.
 * Allows drilling into specific licensees and staff members.
 */

import { useState, useEffect } from 'react'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import { PortalCard } from '@/components/portal'
import { cn } from '@/lib/utils'
import {
  DollarSign,
  Users,
  Building2,
  TrendingUp,
  Calendar,
  Search,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react'

interface LicenseeOverview {
  id: string
  name: string
  total_staff: number
  total_camps: number
  total_compensation: number
  pending_compensation: number
  finalized_compensation: number
}

interface StaffSummary {
  id: string
  name: string
  email: string
  camp_count: number
  total_earned: number
  pending_amount: number
}

export default function AdminScorecardsPage() {
  const { user, isHqAdmin } = useAuth()
  const [loading, setLoading] = useState(true)
  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<{
    total_compensation: number
    pending_compensation: number
    finalized_compensation: number
    total_staff: number
    total_camps: number
    licensees: LicenseeOverview[]
  } | null>(null)
  const [selectedLicensee, setSelectedLicensee] = useState<string | null>(null)
  const [staffList, setStaffList] = useState<StaffSummary[]>([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Load global overview
  useEffect(() => {
    async function loadOverview() {
      try {
        const res = await fetch('/api/incentives/overview')
        const json = await res.json()

        if (res.ok && json.data) {
          setOverview(json.data)
        } else {
          setError(json.error || 'Failed to load data')
        }
      } catch (err) {
        setError('Failed to load incentive data')
      } finally {
        setLoading(false)
      }
    }
    loadOverview()
  }, [])

  // Load staff for selected licensee
  useEffect(() => {
    if (!selectedLicensee) {
      setStaffList([])
      return
    }

    async function loadStaff() {
      setStaffLoading(true)
      try {
        const res = await fetch(`/api/incentives/overview?tenantId=${selectedLicensee}`)
        const json = await res.json()

        if (res.ok && json.data?.staff) {
          setStaffList(json.data.staff)
        }
      } catch (err) {
        console.error('Failed to load staff:', err)
      } finally {
        setStaffLoading(false)
      }
    }
    loadStaff()
  }, [selectedLicensee])

  const formatCurrency = (val: number) => `$${val.toFixed(2)}`

  const filteredLicensees =
    overview?.licensees.filter((l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || []

  if (!isHqAdmin) {
    return (
      <AdminLayout userRole="hq_admin" userName={userName}>
        <PageHeader
          title="Incentive Scorecards"
          description="Compensation tracking and reporting"
        />
        <ContentCard>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Access Denied</h3>
            <p className="text-white/50">
              This page is only accessible to HQ administrators.
            </p>
          </div>
        </ContentCard>
      </AdminLayout>
    )
  }

  if (loading) {
    return (
      <AdminLayout userRole="hq_admin" userName={userName}>
        <PageHeader
          title="Incentive Scorecards"
          description="Compensation tracking and reporting"
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-12 w-12 text-neon animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout userRole="hq_admin" userName={userName}>
        <PageHeader
          title="Incentive Scorecards"
          description="Compensation tracking and reporting"
        />
        <ContentCard>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Error</h3>
            <p className="text-white/50">{error}</p>
          </div>
        </ContentCard>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <PageHeader
        title="Incentive Scorecards"
        description="Global compensation tracking across all licensees"
      />

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <ContentCard>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-neon/20 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-neon" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(overview?.total_compensation || 0)}
              </div>
              <div className="text-xs text-white/50 uppercase">Total Compensation</div>
            </div>
          </div>
        </ContentCard>

        <ContentCard>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-yellow-500/20 flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(overview?.pending_compensation || 0)}
              </div>
              <div className="text-xs text-white/50 uppercase">Pending</div>
            </div>
          </div>
        </ContentCard>

        <ContentCard>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-neon/20 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-neon" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(overview?.finalized_compensation || 0)}
              </div>
              <div className="text-xs text-white/50 uppercase">Finalized</div>
            </div>
          </div>
        </ContentCard>

        <ContentCard>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-purple/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-purple" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {overview?.total_staff || 0}
              </div>
              <div className="text-xs text-white/50 uppercase">Staff with Plans</div>
            </div>
          </div>
        </ContentCard>
      </div>

      {/* Licensee List */}
      <ContentCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">
            By Licensee
          </h2>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search licensees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-black border border-white/20 text-white text-sm focus:border-neon focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          {filteredLicensees.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              No licensees found
            </div>
          ) : (
            filteredLicensees.map((licensee) => (
              <button
                key={licensee.id}
                onClick={() =>
                  setSelectedLicensee(
                    selectedLicensee === licensee.id ? null : licensee.id
                  )
                }
                className={cn(
                  'w-full p-4 text-left transition-colors border',
                  selectedLicensee === licensee.id
                    ? 'bg-neon/10 border-neon'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-white/40" />
                    <div>
                      <div className="font-bold text-white">{licensee.name}</div>
                      <div className="text-sm text-white/50">
                        {licensee.total_staff} staff &bull; {licensee.total_camps}{' '}
                        camps
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-lg font-bold text-neon">
                        {formatCurrency(licensee.total_compensation)}
                      </div>
                      <div className="text-xs text-white/50">Total</div>
                    </div>
                    <ChevronRight
                      className={cn(
                        'h-5 w-5 text-white/40 transition-transform',
                        selectedLicensee === licensee.id && 'rotate-90'
                      )}
                    />
                  </div>
                </div>

                {/* Expanded Staff List */}
                {selectedLicensee === licensee.id && (
                  <div
                    className="mt-4 pt-4 border-t border-white/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {staffLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 text-neon animate-spin" />
                      </div>
                    ) : staffList.length === 0 ? (
                      <div className="text-center py-4 text-white/50">
                        No staff compensation records
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {staffList.map((staff) => (
                          <div
                            key={staff.id}
                            className="flex items-center justify-between p-3 bg-black/50"
                          >
                            <div>
                              <div className="font-medium text-white">
                                {staff.name}
                              </div>
                              <div className="text-xs text-white/50">
                                {staff.email} &bull; {staff.camp_count} camps
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-white">
                                {formatCurrency(staff.total_earned)}
                              </div>
                              {staff.pending_amount > 0 && (
                                <div className="text-xs text-yellow-400">
                                  {formatCurrency(staff.pending_amount)} pending
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </ContentCard>
    </AdminLayout>
  )
}
