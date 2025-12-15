'use client'

import { useState, useEffect, useMemo } from 'react'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import { LicenseePerformanceTable } from '@/components/analytics'
import {
  Building2,
  Download,
  RefreshCw,
  Filter,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface LicenseeBreakdownItem {
  licenseeId: string
  licenseeName: string
  territoryName: string | null
  tsgr: number
  sessionsHeld: number
  totalCampers: number
  averageEnrollmentPerSession: number
  totalRoyaltyPaid: number
  royaltyComplianceRate: number
  arpc: number
  csat: number | null
  complaintRatio: number
  curriculumAdherenceScore: number | null
}

type TimeRange = '7d' | '30d' | '90d' | 'ytd'

function getDateRange(timeRange: TimeRange): { from: Date; to: Date } {
  const to = new Date()
  let from: Date

  switch (timeRange) {
    case '7d':
      from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '30d':
      from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case '90d':
      from = new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case 'ytd':
      from = new Date(to.getFullYear(), 0, 1)
      break
    default:
      from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)
  }

  return { from, to }
}

export default function LicenseesComparisonPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [loading, setLoading] = useState(true)
  const [licenseeBreakdown, setLicenseeBreakdown] = useState<LicenseeBreakdownItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  const { from, to } = useMemo(() => getDateRange(timeRange), [timeRange])

  const fetchData = async () => {
    setLoading(true)
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    })

    try {
      const res = await fetch(`/api/analytics/global?type=licensee-breakdown&${params}`)
      if (res.ok) {
        const data = await res.json()
        setLicenseeBreakdown(data)
      }
    } catch (error) {
      console.error('Failed to fetch licensee breakdown:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [timeRange])

  const handleLicenseeClick = (tenantId: string) => {
    router.push(`/admin/analytics/licensees/${tenantId}`)
  }

  const filteredData = useMemo(() => {
    if (!searchQuery) return licenseeBreakdown

    const query = searchQuery.toLowerCase()
    return licenseeBreakdown.filter(
      item =>
        item.licenseeName.toLowerCase().includes(query) ||
        (item.territoryName && item.territoryName.toLowerCase().includes(query))
    )
  }, [licenseeBreakdown, searchQuery])

  const tableData = filteredData.map(item => ({
    tenantId: item.licenseeId,
    tenantName: item.licenseeName,
    sessionsHeld: item.sessionsHeld,
    totalCampers: item.totalCampers,
    tsgr: item.tsgr,
    royaltyIncome: item.totalRoyaltyPaid,
    arpc: item.arpc,
    avgCsat: item.csat,
    complaintsCount: Math.round(item.complaintRatio * item.totalCampers / 100),
    avgCurriculumAdherence: item.curriculumAdherenceScore,
  }))

  // Summary stats
  const totalRevenue = licenseeBreakdown.reduce((sum, l) => sum + l.tsgr, 0)
  const totalCampers = licenseeBreakdown.reduce((sum, l) => sum + l.totalCampers, 0)
  const totalSessions = licenseeBreakdown.reduce((sum, l) => sum + l.sessionsHeld, 0)
  const avgCsat = licenseeBreakdown.filter(l => l.csat).length > 0
    ? licenseeBreakdown.filter(l => l.csat).reduce((sum, l) => sum + (l.csat || 0), 0) / licenseeBreakdown.filter(l => l.csat).length
    : null

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <PageHeader
        title="Licensee Comparison"
        description="Compare performance across all licensees"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Analytics', href: '/admin/analytics' },
          { label: 'Licensees' },
        ]}
      >
        <Button
          variant="outline-neon"
          size="sm"
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </PageHeader>

      {/* Time Range and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="inline-flex items-center gap-1 bg-black/50 border border-white/10 p-1">
          {(['7d', '30d', '90d', 'ytd'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                'px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors',
                timeRange === range
                  ? 'bg-neon text-black'
                  : 'text-white/50 hover:text-white'
              )}
            >
              {range === 'ytd' ? 'YTD' : range}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            type="text"
            placeholder="Search licensees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 h-10 bg-dark-100 border border-white/10 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon/30"
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-dark-100 border border-white/10 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">Total Licensees</p>
          <p className="mt-1 text-2xl font-black text-white">{licenseeBreakdown.length}</p>
        </div>
        <div className="bg-dark-100 border border-neon/30 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">Combined Revenue</p>
          <p className="mt-1 text-2xl font-black text-neon">
            ${totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-dark-100 border border-magenta/30 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">Total Campers</p>
          <p className="mt-1 text-2xl font-black text-magenta">
            {totalCampers.toLocaleString()}
          </p>
        </div>
        <div className="bg-dark-100 border border-purple/30 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">Avg CSAT</p>
          <p className="mt-1 text-2xl font-black text-purple">
            {avgCsat ? avgCsat.toFixed(1) : 'N/A'}
          </p>
        </div>
      </div>

      {/* Full Licensee Table */}
      <ContentCard title={`All Licensees (${filteredData.length})`} accent="neon">
        <LicenseePerformanceTable
          data={tableData}
          onLicenseeClick={handleLicenseeClick}
        />
      </ContentCard>
    </AdminLayout>
  )
}
