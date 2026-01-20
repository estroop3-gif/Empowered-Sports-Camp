'use client'

/**
 * Admin Royalty Invoices Page
 *
 * HQ Admin view for managing all royalty invoices across licensees.
 * Features: filtering, sorting, status management, invoice generation.
 */

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import { KpiGrid } from '@/components/analytics'
import {
  DollarSign,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Plus,
  Calendar,
  Building2,
  Loader2,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { RoyaltyInvoiceStatus } from '@/generated/prisma'

// Types
interface RoyaltyInvoiceListItem {
  id: string
  invoiceNumber: string
  tenantId: string
  licenseeName: string
  territoryName: string | null
  campId: string | null
  campName: string | null
  periodStart: string
  periodEnd: string
  grossRevenue: number
  baseRevenue: number
  addonRevenue: number
  royaltyRate: number
  royaltyAmount: number
  adjustments: number
  totalDue: number
  status: RoyaltyInvoiceStatus
  dueDate: string
  issuedAt: string
  paidAt: string | null
  paidAmount: number | null
}

interface RoyaltySummary {
  totalGrossRevenue: number
  totalRoyaltyDue: number
  totalRoyaltyPaid: number
  totalOutstanding: number
  invoicesCount: number
  invoicesPending: number
  invoicesInvoiced: number
  invoicesPaid: number
  invoicesOverdue: number
  complianceRate: number
}

interface Licensee {
  id: string
  name: string
  slug: string
}

type TimeRange = '30d' | '90d' | 'ytd' | 'all'
type SortField = 'dueDate' | 'generatedAt' | 'grossRevenue' | 'royaltyAmount' | 'status'

const STATUS_CONFIG: Record<
  RoyaltyInvoiceStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  pending: { label: 'Pending', color: 'text-white/60 bg-white/10 border-white/20', icon: Clock },
  invoiced: { label: 'Invoiced', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30', icon: FileText },
  paid: { label: 'Paid', color: 'text-neon bg-neon/10 border-neon/30', icon: CheckCircle },
  overdue: { label: 'Overdue', color: 'text-red-400 bg-red-400/10 border-red-400/30', icon: AlertTriangle },
  disputed: { label: 'Disputed', color: 'text-orange-400 bg-orange-400/10 border-orange-400/30', icon: AlertTriangle },
  waived: { label: 'Waived', color: 'text-white/40 bg-white/5 border-white/10', icon: XCircle },
}

function getDateRange(timeRange: TimeRange): { from: Date | null; to: Date } {
  const to = new Date()
  let from: Date | null

  switch (timeRange) {
    case '30d':
      from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case '90d':
      from = new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case 'ytd':
      from = new Date(to.getFullYear(), 0, 1)
      break
    case 'all':
      from = null
      break
    default:
      from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)
  }

  return { from, to }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${startMonth} - ${endMonth}`
}

// Status Badge Component
function StatusBadge({ status }: { status: RoyaltyInvoiceStatus }) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 text-xs font-bold uppercase tracking-wider border',
        config.color
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

// Invoice Table Component
function InvoiceTable({
  invoices,
  sortField,
  sortDir,
  onSort,
}: {
  invoices: RoyaltyInvoiceListItem[]
  sortField: SortField
  sortDir: 'asc' | 'desc'
  onSort: (field: SortField) => void
}) {
  const SortHeader = ({ label, field }: { label: string; field: SortField }) => (
    <th
      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40 cursor-pointer hover:text-white/60 transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field && (
          sortDir === 'desc' ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronUp className="h-3 w-3" />
          )
        )}
      </div>
    </th>
  )

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border border-dashed border-white/10">
        <FileText className="h-12 w-12 text-white/20 mb-4" />
        <p className="text-white/60 font-medium mb-2">No royalty invoices found</p>
        <p className="text-sm text-white/40 text-center max-w-sm">
          Royalty invoices will appear here once camp sessions are completed and invoices are generated.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-white/10">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">
              Invoice
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">
              Licensee / Territory
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">
              Camp / Period
            </th>
            <SortHeader label="Gross Revenue" field="grossRevenue" />
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">
              Rate
            </th>
            <SortHeader label="Royalty Due" field="royaltyAmount" />
            <SortHeader label="Status" field="status" />
            <SortHeader label="Due Date" field="dueDate" />
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {invoices.map((invoice) => (
            <tr
              key={invoice.id}
              className="hover:bg-white/5 transition-colors cursor-pointer"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/admin/revenue/royalties/${invoice.id}`}
                  className="text-sm font-mono text-neon hover:text-neon/80"
                >
                  {invoice.invoiceNumber}
                </Link>
              </td>
              <td className="px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{invoice.licenseeName}</p>
                  {invoice.territoryName && (
                    <p className="text-xs text-white/40">{invoice.territoryName}</p>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <div>
                  <p className="text-sm text-white/80">{invoice.campName || 'N/A'}</p>
                  <p className="text-xs text-white/40">
                    {formatDateRange(invoice.periodStart, invoice.periodEnd)}
                  </p>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-white/80">
                {formatCurrency(invoice.grossRevenue)}
              </td>
              <td className="px-4 py-3 text-sm text-white/60">
                {(invoice.royaltyRate * 100).toFixed(0)}%
              </td>
              <td className="px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-magenta">
                    {formatCurrency(invoice.totalDue)}
                  </p>
                  {invoice.adjustments !== 0 && (
                    <p className="text-xs text-white/40">
                      Base: {formatCurrency(invoice.royaltyAmount)}
                    </p>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={invoice.status} />
              </td>
              <td className="px-4 py-3">
                <div>
                  <p className="text-sm text-white/80">{formatDate(invoice.dueDate)}</p>
                  {invoice.paidAt && (
                    <p className="text-xs text-neon">Paid {formatDate(invoice.paidAt)}</p>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/revenue/royalties/${invoice.id}`}
                  className="text-neon/70 hover:text-neon transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Main Page Component
export default function AdminRoyaltiesPage() {
  const { user } = useAuth()
  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  // State
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<RoyaltyInvoiceListItem[]>([])
  const [summary, setSummary] = useState<RoyaltySummary | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [licensees, setLicensees] = useState<Licensee[]>([])

  // Filters
  const [timeRange, setTimeRange] = useState<TimeRange>('ytd')
  const [statusFilter, setStatusFilter] = useState<RoyaltyInvoiceStatus | ''>('')
  const [licenseeFilter, setLicenseeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('dueDate')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Pagination
  const [page, setPage] = useState(0)
  const pageSize = 25

  const { from, to } = useMemo(() => getDateRange(timeRange), [timeRange])

  // Fetch licensees for filter dropdown
  useEffect(() => {
    async function fetchLicensees() {
      try {
        const res = await fetch('/api/admin/royalties?action=licensees')
        if (res.ok) {
          const data = await res.json()
          setLicensees(data.licensees || [])
        }
      } catch (error) {
        console.error('Failed to fetch licensees:', error)
      }
    }
    fetchLicensees()
  }, [])

  // Fetch invoices
  const fetchInvoices = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from.toISOString())
      params.set('to', to.toISOString())
      if (statusFilter) params.set('status', statusFilter)
      if (licenseeFilter) params.set('tenantId', licenseeFilter)
      if (search) params.set('search', search)
      params.set('sortBy', sortField)
      params.set('sortDir', sortDir)
      params.set('limit', pageSize.toString())
      params.set('offset', (page * pageSize).toString())

      const res = await fetch(`/api/admin/royalties?action=list&${params}`)
      if (res.ok) {
        const data = await res.json()
        setInvoices(data.items || [])
        setSummary(data.summary || null)
        setTotalCount(data.totalCount || 0)
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [timeRange, statusFilter, licenseeFilter, search, sortField, sortDir, page])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <PageHeader
        title="Royalty Invoices"
        description="Track and manage licensee royalty obligations"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Revenue', href: '/admin/revenue' },
          { label: 'Royalty Invoices' },
        ]}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="outline-neon"
            size="sm"
            onClick={fetchInvoices}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Link href="/admin/revenue/royalties/generate">
            <Button variant="neon" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Generate Invoices
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* KPI Summary */}
      {summary && (
        <>
          <KpiGrid
            columns={4}
            items={[
              {
                label: 'Total Gross Revenue',
                value: summary.totalGrossRevenue,
                format: 'currency',
                icon: DollarSign,
                variant: 'default',
                subLabel: `${summary.invoicesCount} invoices`,
              },
              {
                label: 'Royalty Due',
                value: summary.totalRoyaltyDue,
                format: 'currency',
                icon: FileText,
                variant: 'magenta',
                subLabel: `${summary.invoicesInvoiced + summary.invoicesOverdue} outstanding`,
              },
              {
                label: 'Royalty Paid',
                value: summary.totalRoyaltyPaid,
                format: 'currency',
                icon: CheckCircle,
                variant: 'neon',
                subLabel: `${summary.invoicesPaid} invoices`,
              },
              {
                label: 'Outstanding',
                value: summary.totalOutstanding,
                format: 'currency',
                icon: Clock,
                variant: summary.totalOutstanding > 0 ? 'magenta' : 'neon',
                subLabel: `${summary.invoicesOverdue} overdue`,
              },
            ]}
          />
          <div className="mt-4">
            <KpiGrid
              columns={2}
              items={[
                {
                  label: 'Compliance Rate',
                  value: summary.complianceRate,
                  format: 'percentage',
                  icon: CheckCircle,
                  variant: summary.complianceRate >= 90 ? 'neon' : summary.complianceRate >= 70 ? 'default' : 'magenta',
                },
                {
                  label: 'Overdue Invoices',
                  value: summary.invoicesOverdue,
                  format: 'number',
                  icon: AlertTriangle,
                  variant: summary.invoicesOverdue > 0 ? 'magenta' : 'neon',
                  subLabel: summary.invoicesOverdue > 0 ? 'Requires attention' : 'All current',
                },
              ]}
            />
          </div>
        </>
      )}

      {/* Filters */}
      <div className="mt-6 flex flex-col lg:flex-row items-start lg:items-center gap-4">
        {/* Time Range */}
        <div className="inline-flex items-center gap-1 bg-black/50 border border-white/10 p-1">
          {(['30d', '90d', 'ytd', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => {
                setTimeRange(range)
                setPage(0)
              }}
              className={cn(
                'px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors',
                timeRange === range
                  ? 'bg-neon text-black'
                  : 'text-white/50 hover:text-white'
              )}
            >
              {range === 'ytd' ? 'Year to Date' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : 'All Time'}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as RoyaltyInvoiceStatus | '')
            setPage(0)
          }}
          className="h-9 px-3 bg-black border border-white/20 text-sm text-white focus:border-neon focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="invoiced">Invoiced</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="disputed">Disputed</option>
          <option value="waived">Waived</option>
        </select>

        {/* Licensee Filter */}
        <select
          value={licenseeFilter}
          onChange={(e) => {
            setLicenseeFilter(e.target.value)
            setPage(0)
          }}
          className="h-9 px-3 bg-black border border-white/20 text-sm text-white focus:border-neon focus:outline-none"
        >
          <option value="">All Licensees</option>
          {licensees.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            type="text"
            placeholder="Search invoices, camps, licensees..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            className="pl-10"
          />
        </div>
      </div>

      {/* Invoice Table */}
      <div className="mt-6">
        <ContentCard>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-neon" />
            </div>
          ) : (
            <>
              <InvoiceTable
                invoices={invoices}
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-4 border-t border-white/10">
                  <p className="text-sm text-white/40">
                    Showing {page * pageSize + 1} to{' '}
                    {Math.min((page + 1) * pageSize, totalCount)} of {totalCount} invoices
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline-white"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-white/60">
                      Page {page + 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline-white"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </ContentCard>
      </div>

      {/* Quick Links */}
      <div className="mt-6 flex flex-wrap gap-4">
        <Link href="/admin/revenue">
          <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
            <DollarSign className="h-4 w-4 mr-2" />
            Revenue Analytics
          </Button>
        </Link>
        <Link href="/admin/analytics/licensees">
          <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
            <Building2 className="h-4 w-4 mr-2" />
            Licensee Analytics
          </Button>
        </Link>
      </div>
    </AdminLayout>
  )
}
