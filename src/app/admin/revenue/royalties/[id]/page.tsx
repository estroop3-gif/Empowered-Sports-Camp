'use client'

/**
 * Admin Royalty Invoice Detail Page
 *
 * Full detail view of a royalty invoice with status management,
 * revenue breakdown, and adjustment capabilities.
 */

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Mail,
  Phone,
  MapPin,
  AlertTriangle,
  XCircle,
  Loader2,
  Save,
  Plus,
  Minus,
  Users,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { RoyaltyInvoiceStatus } from '@/generated/prisma'

// Types
interface RoyaltyInvoiceDetail {
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
  merchandiseRevenue: number
  refundsTotal: number
  netRevenue: number
  royaltyRate: number
  royaltyAmount: number
  adjustments: number
  totalDue: number
  status: RoyaltyInvoiceStatus
  dueDate: string
  issuedAt: string
  paidAt: string | null
  paidAmount: number | null
  paymentMethod: string | null
  paymentReference: string | null
  notes: string | null
  adjustmentNotes: string | null
  disputeReason: string | null
  disputedAt: string | null
  resolvedAt: string | null
  generatedBy: string | null
  paidBy: string | null
  createdAt: string
  updatedAt: string
  licensee: {
    id: string
    name: string
    slug: string
    contactEmail: string | null
    contactPhone: string | null
    royaltyRate: number
  }
  camp: {
    id: string
    name: string
    slug: string
    programType: string
    startDate: string
    endDate: string
    locationName: string | null
    capacity: number | null
    registrationCount: number
  } | null
  lineItems: {
    id: string
    description: string
    category: string
    quantity: number
    unitAmount: number
    totalAmount: number
    royaltyApplies: boolean
  }[]
}

const STATUS_CONFIG: Record<
  RoyaltyInvoiceStatus,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  pending: { label: 'Pending', color: 'text-white/60', bgColor: 'bg-white/10 border-white/20', icon: Clock },
  invoiced: { label: 'Invoiced', color: 'text-blue-400', bgColor: 'bg-blue-400/10 border-blue-400/30', icon: FileText },
  paid: { label: 'Paid', color: 'text-neon', bgColor: 'bg-neon/10 border-neon/30', icon: CheckCircle },
  overdue: { label: 'Overdue', color: 'text-red-400', bgColor: 'bg-red-400/10 border-red-400/30', icon: AlertTriangle },
  disputed: { label: 'Disputed', color: 'text-orange-400', bgColor: 'bg-orange-400/10 border-orange-400/30', icon: AlertTriangle },
  waived: { label: 'Waived', color: 'text-white/40', bgColor: 'bg-white/5 border-white/10', icon: XCircle },
}

const PROGRAM_TYPE_LABELS: Record<string, string> = {
  all_girls_sports_camp: 'All Girls Sports Camp',
  cit_program: 'CIT Program',
  soccer_and_strength: 'Soccer & Strength',
  basketball_intensive: 'Basketball Intensive',
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// Status Badge Component
function StatusBadge({ status, size = 'md' }: { status: RoyaltyInvoiceStatus; size?: 'sm' | 'md' | 'lg' }) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1.5 text-xs gap-1.5',
    lg: 'px-4 py-2 text-sm gap-2',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-bold uppercase tracking-wider border',
        config.bgColor,
        config.color,
        sizeClasses[size]
      )}
    >
      <Icon className={size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'} />
      {config.label}
    </span>
  )
}

// Revenue Breakdown Card
function RevenueBreakdownCard({ invoice }: { invoice: RoyaltyInvoiceDetail }) {
  return (
    <ContentCard title="Revenue Breakdown" accent="neon">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider">Gross Revenue</p>
            <p className="text-2xl font-bold text-neon">{formatCurrency(invoice.grossRevenue)}</p>
          </div>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider">Net Revenue</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(invoice.netRevenue)}</p>
          </div>
        </div>

        <div className="border-t border-white/10 pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-white/60">Base Registrations</span>
            <span className="text-sm text-white">{formatCurrency(invoice.baseRevenue)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-white/60">Add-ons / Upsells</span>
            <span className="text-sm text-white">{formatCurrency(invoice.addonRevenue)}</span>
          </div>
          {invoice.merchandiseRevenue > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/60">Merchandise</span>
              <span className="text-sm text-white">{formatCurrency(invoice.merchandiseRevenue)}</span>
            </div>
          )}
          {invoice.refundsTotal > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/60">Refunds</span>
              <span className="text-sm text-red-400">-{formatCurrency(invoice.refundsTotal)}</span>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-white/60">Royalty Rate</span>
            <span className="text-sm text-white">{(invoice.royaltyRate * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-white/60">Base Royalty</span>
            <span className="text-sm text-white">{formatCurrency(invoice.royaltyAmount)}</span>
          </div>
          {invoice.adjustments !== 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/60">Adjustments</span>
              <span className={cn('text-sm', invoice.adjustments >= 0 ? 'text-neon' : 'text-red-400')}>
                {invoice.adjustments >= 0 ? '+' : ''}{formatCurrency(invoice.adjustments)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-white/10">
            <span className="text-sm font-bold text-white">Total Due</span>
            <span className="text-lg font-bold text-magenta">{formatCurrency(invoice.totalDue)}</span>
          </div>
          {invoice.paidAmount !== null && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-white">Amount Paid</span>
              <span className="text-lg font-bold text-neon">{formatCurrency(invoice.paidAmount)}</span>
            </div>
          )}
        </div>
      </div>
    </ContentCard>
  )
}

// Line Items Table
function LineItemsTable({ lineItems }: { lineItems: RoyaltyInvoiceDetail['lineItems'] }) {
  const categoryTotals = lineItems.reduce(
    (acc, item) => {
      const key = item.category
      if (!acc[key]) acc[key] = { count: 0, total: 0 }
      acc[key].count += item.quantity
      acc[key].total += item.totalAmount
      return acc
    },
    {} as Record<string, { count: number; total: number }>
  )

  return (
    <ContentCard title="Revenue Detail" accent="purple">
      {/* Summary by Category */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 pb-6 border-b border-white/10">
        {Object.entries(categoryTotals).map(([category, data]) => (
          <div key={category}>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">
              {category === 'registration' ? 'Registrations' : category === 'addon' ? 'Add-ons' : category}
            </p>
            <p className="text-lg font-bold text-white">{formatCurrency(data.total)}</p>
            <p className="text-xs text-white/40">{data.count} items</p>
          </div>
        ))}
      </div>

      {/* Full Line Items */}
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full">
          <thead className="border-b border-white/10 sticky top-0 bg-dark-100">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-white/40">
                Description
              </th>
              <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-white/40">
                Category
              </th>
              <th className="px-4 py-2 text-right text-xs font-bold uppercase tracking-wider text-white/40">
                Qty
              </th>
              <th className="px-4 py-2 text-right text-xs font-bold uppercase tracking-wider text-white/40">
                Unit
              </th>
              <th className="px-4 py-2 text-right text-xs font-bold uppercase tracking-wider text-white/40">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {lineItems.map((item) => (
              <tr key={item.id} className="hover:bg-white/5">
                <td className="px-4 py-2 text-sm text-white/80">{item.description}</td>
                <td className="px-4 py-2">
                  <span
                    className={cn(
                      'px-2 py-0.5 text-xs uppercase tracking-wider',
                      item.category === 'registration'
                        ? 'text-neon bg-neon/10'
                        : item.category === 'addon'
                        ? 'text-purple bg-purple/10'
                        : 'text-white/60 bg-white/10'
                    )}
                  >
                    {item.category}
                  </span>
                </td>
                <td className="px-4 py-2 text-sm text-white/60 text-right">{item.quantity}</td>
                <td className="px-4 py-2 text-sm text-white/60 text-right">
                  {formatCurrency(item.unitAmount)}
                </td>
                <td className="px-4 py-2 text-sm text-white text-right font-medium">
                  {formatCurrency(item.totalAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ContentCard>
  )
}

// Main Page Component
export default function RoyaltyInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  const [invoice, setInvoice] = useState<RoyaltyInvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Status update modal
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState<RoyaltyInvoiceStatus | ''>('')
  const [statusNotes, setStatusNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentReference, setPaymentReference] = useState('')

  // Adjustment modal
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false)
  const [adjustmentAmount, setAdjustmentAmount] = useState('')
  const [adjustmentNotes, setAdjustmentNotes] = useState('')

  useEffect(() => {
    loadInvoice()
  }, [id])

  const loadInvoice = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/royalties/${id}`)
      const { data, error: apiError } = await res.json()

      if (apiError || !data) {
        setError(apiError || 'Invoice not found')
        setLoading(false)
        return
      }

      setInvoice(data)
    } catch (err) {
      console.error('Error loading invoice:', err)
      setError('Failed to load invoice')
    }

    setLoading(false)
  }

  const handleStatusUpdate = async () => {
    if (!invoice || !newStatus) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/royalties/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-status',
          status: newStatus,
          notes: statusNotes || undefined,
          paymentMethod: paymentMethod || undefined,
          paymentReference: paymentReference || undefined,
          updatedBy: user?.id,
        }),
      })

      const { error: apiError } = await res.json()

      if (apiError) {
        setError(apiError)
        setSaving(false)
        return
      }

      setShowStatusModal(false)
      setNewStatus('')
      setStatusNotes('')
      setPaymentMethod('')
      setPaymentReference('')
      await loadInvoice()
    } catch (err) {
      console.error('Error updating status:', err)
      setError('Failed to update status')
    }

    setSaving(false)
  }

  const handleAddAdjustment = async () => {
    if (!invoice || !adjustmentAmount || !adjustmentNotes) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/royalties/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-adjustment',
          adjustmentAmountDollars: adjustmentAmount,
          notes: adjustmentNotes,
          updatedBy: user?.id,
        }),
      })

      const { error: apiError } = await res.json()

      if (apiError) {
        setError(apiError)
        setSaving(false)
        return
      }

      setShowAdjustmentModal(false)
      setAdjustmentAmount('')
      setAdjustmentNotes('')
      await loadInvoice()
    } catch (err) {
      console.error('Error adding adjustment:', err)
      setError('Failed to add adjustment')
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <AdminLayout userRole="hq_admin" userName={userName}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-neon" />
        </div>
      </AdminLayout>
    )
  }

  if (error || !invoice) {
    return (
      <AdminLayout userRole="hq_admin" userName={userName}>
        <div className="text-center py-20">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">
            {error || 'Invoice not found'}
          </h2>
          <Link href="/admin/revenue/royalties">
            <Button variant="outline-neon" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Invoices
            </Button>
          </Link>
        </div>
      </AdminLayout>
    )
  }

  const statusConfig = STATUS_CONFIG[invoice.status]

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <PageHeader
          title={invoice.invoiceNumber}
          description="Royalty Invoice"
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Revenue', href: '/admin/revenue' },
            { label: 'Royalty Invoices', href: '/admin/revenue/royalties' },
            { label: invoice.invoiceNumber },
          ]}
        />
        <div className="flex items-center gap-3">
          <Link href="/admin/revenue/royalties">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 text-red-400">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Header Card with Status */}
      <ContentCard className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={cn('p-3 border', statusConfig.bgColor)}>
              <statusConfig.icon className={cn('h-6 w-6', statusConfig.color)} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-bold text-white">{invoice.invoiceNumber}</h2>
                <StatusBadge status={invoice.status} size="lg" />
              </div>
              <p className="text-white/60">
                {invoice.licenseeName}
                {invoice.territoryName && ` • ${invoice.territoryName}`}
              </p>
              <p className="text-sm text-white/40 mt-1">
                Period: {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {invoice.status !== 'paid' && invoice.status !== 'waived' && (
              <>
                <Button
                  variant="neon"
                  size="sm"
                  onClick={() => {
                    setNewStatus('paid')
                    setShowStatusModal(true)
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Paid
                </Button>
                <Button
                  variant="outline-white"
                  size="sm"
                  onClick={() => setShowAdjustmentModal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Adjustment
                </Button>
              </>
            )}
            <Button
              variant="outline-white"
              size="sm"
              onClick={() => {
                setNewStatus('')
                setShowStatusModal(true)
              }}
            >
              Update Status
            </Button>
          </div>
        </div>
      </ContentCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue Breakdown */}
          <RevenueBreakdownCard invoice={invoice} />

          {/* Line Items */}
          {invoice.lineItems.length > 0 && (
            <LineItemsTable lineItems={invoice.lineItems} />
          )}

          {/* Notes Section */}
          {(invoice.notes || invoice.adjustmentNotes || invoice.disputeReason) && (
            <ContentCard title="Notes & History">
              <div className="space-y-4">
                {invoice.disputeReason && (
                  <div className="p-3 bg-orange-400/10 border border-orange-400/30">
                    <p className="text-xs text-orange-400 uppercase tracking-wider font-bold mb-1">
                      Dispute Reason
                    </p>
                    <p className="text-sm text-white/80 whitespace-pre-wrap">
                      {invoice.disputeReason}
                    </p>
                    {invoice.disputedAt && (
                      <p className="text-xs text-white/40 mt-2">
                        Disputed on {formatDateTime(invoice.disputedAt)}
                      </p>
                    )}
                  </div>
                )}
                {invoice.adjustmentNotes && (
                  <div className="p-3 bg-white/5 border border-white/10">
                    <p className="text-xs text-white/40 uppercase tracking-wider font-bold mb-1">
                      Adjustment History
                    </p>
                    <p className="text-sm text-white/80 whitespace-pre-wrap font-mono">
                      {invoice.adjustmentNotes}
                    </p>
                  </div>
                )}
                {invoice.notes && (
                  <div className="p-3 bg-white/5 border border-white/10">
                    <p className="text-xs text-white/40 uppercase tracking-wider font-bold mb-1">
                      Internal Notes
                    </p>
                    <p className="text-sm text-white/80 whitespace-pre-wrap">
                      {invoice.notes}
                    </p>
                  </div>
                )}
              </div>
            </ContentCard>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Licensee Info */}
          <ContentCard title="Licensee">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-white/40 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">{invoice.licensee.name}</p>
                  <p className="text-xs text-white/40">{invoice.licensee.slug}</p>
                </div>
              </div>
              {invoice.licensee.contactEmail && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-white/40 flex-shrink-0 mt-0.5" />
                  <a
                    href={`mailto:${invoice.licensee.contactEmail}`}
                    className="text-sm text-neon hover:text-neon/80"
                  >
                    {invoice.licensee.contactEmail}
                  </a>
                </div>
              )}
              {invoice.licensee.contactPhone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-white/40 flex-shrink-0 mt-0.5" />
                  <a
                    href={`tel:${invoice.licensee.contactPhone}`}
                    className="text-sm text-white/80 hover:text-white"
                  >
                    {invoice.licensee.contactPhone}
                  </a>
                </div>
              )}
              <div className="pt-3 border-t border-white/10">
                <p className="text-xs text-white/40 uppercase tracking-wider">Royalty Rate</p>
                <p className="text-lg font-bold text-magenta">
                  {(invoice.licensee.royaltyRate * 100).toFixed(1)}%
                </p>
              </div>
              <Link href={`/admin/analytics/licensees/${invoice.licensee.id}`}>
                <Button variant="outline-white" size="sm" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Licensee Analytics
                </Button>
              </Link>
            </div>
          </ContentCard>

          {/* Camp Info */}
          {invoice.camp && (
            <ContentCard title="Camp Session">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-white">{invoice.camp.name}</p>
                  <p className="text-xs text-white/40">
                    {PROGRAM_TYPE_LABELS[invoice.camp.programType] || invoice.camp.programType}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-white/40 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-white/80">
                      {formatDate(invoice.camp.startDate)} - {formatDate(invoice.camp.endDate)}
                    </p>
                  </div>
                </div>
                {invoice.camp.locationName && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-white/40 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-white/80">{invoice.camp.locationName}</p>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-white/40 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-white/80">
                    {invoice.camp.registrationCount} registrations
                    {invoice.camp.capacity && ` / ${invoice.camp.capacity} capacity`}
                  </p>
                </div>
                <Link href={`/admin/camps/${invoice.camp.id}/hq`}>
                  <Button variant="outline-white" size="sm" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Camp HQ
                  </Button>
                </Link>
              </div>
            </ContentCard>
          )}

          {/* Timeline */}
          <ContentCard title="Timeline">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-white/40 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider">Generated</p>
                  <p className="text-sm text-white">{formatDateTime(invoice.issuedAt)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-white/40 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider">Due Date</p>
                  <p className="text-sm text-white">{formatDate(invoice.dueDate)}</p>
                </div>
              </div>
              {invoice.paidAt && (
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 text-neon flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Paid</p>
                    <p className="text-sm text-neon">{formatDateTime(invoice.paidAt)}</p>
                    {invoice.paymentMethod && (
                      <p className="text-xs text-white/40">
                        via {invoice.paymentMethod}
                        {invoice.paymentReference && ` (${invoice.paymentReference})`}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-white/40 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider">Last Updated</p>
                  <p className="text-sm text-white">{formatDateTime(invoice.updatedAt)}</p>
                </div>
              </div>
            </div>
          </ContentCard>

          {/* Quick Actions */}
          <ContentCard title="Actions">
            <div className="space-y-2">
              {invoice.licensee.contactEmail && (
                <a
                  href={`mailto:${invoice.licensee.contactEmail}?subject=Royalty Invoice ${invoice.invoiceNumber}`}
                  className="block"
                >
                  <Button variant="outline-white" size="sm" className="w-full justify-start">
                    <Mail className="h-4 w-4 mr-2" />
                    Email Licensee
                  </Button>
                </a>
              )}
              {invoice.licensee.contactPhone && (
                <a href={`tel:${invoice.licensee.contactPhone}`} className="block">
                  <Button variant="outline-white" size="sm" className="w-full justify-start">
                    <Phone className="h-4 w-4 mr-2" />
                    Call Licensee
                  </Button>
                </a>
              )}
            </div>
          </ContentCard>
        </div>
      </div>

      {/* Status Update Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Update Invoice Status"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              New Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as RoyaltyInvoiceStatus)}
              className="w-full h-10 px-3 bg-dark-100 border border-white/20 text-white focus:border-neon focus:outline-none"
            >
              <option value="">Select status...</option>
              <option value="pending">Pending</option>
              <option value="invoiced">Invoiced</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="disputed">Disputed</option>
              <option value="waived">Waived</option>
            </select>
          </div>

          {newStatus === 'paid' && (
            <>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Payment Method
                </label>
                <Input
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  placeholder="e.g., Bank Transfer, Check, ACH"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Payment Reference
                </label>
                <Input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g., Check #1234, Transaction ID"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Notes {newStatus === 'disputed' && <span className="text-magenta">*</span>}
            </label>
            <textarea
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              placeholder={newStatus === 'disputed' ? 'Describe the dispute reason...' : 'Optional notes...'}
              rows={3}
              className="w-full px-3 py-2 bg-dark-100 border border-white/20 text-white placeholder:text-white/40 focus:border-neon focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowStatusModal(false)}>
              Cancel
            </Button>
            <Button
              variant="neon"
              onClick={handleStatusUpdate}
              disabled={!newStatus || saving || (newStatus === 'disputed' && !statusNotes)}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Update Status
            </Button>
          </div>
        </div>
      </Modal>

      {/* Adjustment Modal */}
      <Modal
        isOpen={showAdjustmentModal}
        onClose={() => setShowAdjustmentModal(false)}
        title="Add Adjustment"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Adjustment Amount ($)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                type="number"
                step="0.01"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
                placeholder="Enter amount (negative for credits)"
                className="pl-10"
              />
            </div>
            <p className="text-xs text-white/40 mt-1">
              Use negative values for credits/reductions
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Reason <span className="text-magenta">*</span>
            </label>
            <textarea
              value={adjustmentNotes}
              onChange={(e) => setAdjustmentNotes(e.target.value)}
              placeholder="Describe the reason for this adjustment..."
              rows={3}
              className="w-full px-3 py-2 bg-dark-100 border border-white/20 text-white placeholder:text-white/40 focus:border-neon focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowAdjustmentModal(false)}>
              Cancel
            </Button>
            <Button
              variant="neon"
              onClick={handleAddAdjustment}
              disabled={!adjustmentAmount || !adjustmentNotes || saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : parseFloat(adjustmentAmount || '0') >= 0 ? (
                <Plus className="h-4 w-4 mr-2" />
              ) : (
                <Minus className="h-4 w-4 mr-2" />
              )}
              Add Adjustment
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}
