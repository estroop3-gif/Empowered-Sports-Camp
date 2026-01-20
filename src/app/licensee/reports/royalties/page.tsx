'use client'

/**
 * Licensee Royalty Reports Page
 *
 * Shows royalty summary and allows licensees to manage closeout workflow.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import { cn } from '@/lib/utils'
import {
  DollarSign,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar,
  Users,
  ChevronRight,
  FileText,
  TrendingUp,
  Percent,
  LayoutDashboard,
} from 'lucide-react'
import type { LicenseeRoyaltyReport, CampRoyaltySummary } from '@/lib/services/licensee-royalties'

export default function LicenseeRoyaltiesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<LicenseeRoyaltyReport | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadReport()
  }, [])

  async function loadReport() {
    try {
      setLoading(true)
      const res = await fetch('/api/licensee/royalties')
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load report')
      }

      setReport(json.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

  if (loading) {
    return (
      <LmsGate featureName="royalty reports">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 text-neon animate-spin" />
        </div>
      </LmsGate>
    )
  }

  if (error || !report) {
    return (
      <LmsGate featureName="royalty reports">
        <PortalPageHeader
          title="Royalty Reports"
          description="Track royalties and manage closeouts"
        />
        <PortalCard>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Error Loading Report</h3>
            <p className="text-white/50 mb-4">{error}</p>
            <button
              onClick={loadReport}
              className="px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </PortalCard>
      </LmsGate>
    )
  }

  const filteredCamps = report.camps.filter((camp) => {
    if (filter === 'all') return true
    return camp.royalty_status === filter
  })

  return (
    <LmsGate featureName="royalty reports">
      <div>
        <PortalPageHeader
          title="Royalty Reports"
          description="Track royalties owed and manage session closeouts"
          actions={
            <Link
              href="/licensee/dashboard"
              className="px-4 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/20 transition-colors"
            >
              Back to Dashboard
            </Link>
          }
        />

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <PortalCard accent="neon">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-neon/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-neon" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(report.totals.total_gross_revenue)}
                </div>
                <div className="text-sm text-white/50 uppercase">Gross Revenue</div>
              </div>
            </div>
          </PortalCard>

          <PortalCard>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-purple/20 flex items-center justify-center">
                <Percent className="h-6 w-6 text-purple" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(report.totals.total_royalty_due)}
                </div>
                <div className="text-sm text-white/50 uppercase">Total Royalty Due</div>
              </div>
            </div>
          </PortalCard>

          <PortalCard>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-yellow-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(report.totals.total_outstanding)}
                </div>
                <div className="text-sm text-white/50 uppercase">Outstanding</div>
              </div>
            </div>
          </PortalCard>

          <PortalCard>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-magenta/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-magenta" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {report.totals.compliance_rate.toFixed(0)}%
                </div>
                <div className="text-sm text-white/50 uppercase">Compliance Rate</div>
              </div>
            </div>
          </PortalCard>
        </div>

        {/* Sessions Needing Attention */}
        {report.totals.sessions_count - report.totals.sessions_paid > 0 && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-4">
            <Clock className="h-5 w-5 text-yellow-400" />
            <div className="flex-1">
              <div className="font-bold text-white">
                {report.totals.sessions_count - report.totals.sessions_paid} Session{report.totals.sessions_count - report.totals.sessions_paid !== 1 ? 's' : ''} Need Closeout
              </div>
              <div className="text-sm text-white/50">
                Complete closeout to maintain compliance
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { value: 'all', label: 'All Sessions' },
            { value: 'not_generated', label: 'Needs Closeout' },
            { value: 'invoiced', label: 'Invoiced' },
            { value: 'paid', label: 'Paid' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={cn(
                'px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors',
                filter === opt.value
                  ? 'bg-neon text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Camp List */}
        <PortalCard title="Session Royalties">
          {filteredCamps.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/50">No sessions match this filter</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCamps.map((camp) => (
                <RoyaltyRow key={camp.camp_id} camp={camp} onUpdate={loadReport} />
              ))}
            </div>
          )}
        </PortalCard>

        {/* Info Footer */}
        <div className="mt-8 p-4 bg-white/5 border border-white/10">
          <p className="text-sm text-white/50">
            <span className="font-bold text-white">Royalty Rate:</span> 10% of gross revenue.
            Royalties are calculated automatically based on confirmed registrations and upsells.
            Complete the closeout process after each camp session to maintain compliance.
          </p>
        </div>
      </div>
    </LmsGate>
  )
}

function RoyaltyRow({
  camp,
  onUpdate,
}: {
  camp: CampRoyaltySummary
  onUpdate: () => void
}) {
  const [loading, setLoading] = useState(false)

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

  async function handleGenerateInvoice() {
    if (!confirm('Generate royalty invoice for this camp?')) return

    try {
      setLoading(true)
      const res = await fetch(`/api/licensee/royalties/${camp.camp_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_invoice' }),
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to generate invoice')
      }

      alert(json.data?.message || 'Invoice generated')
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkPaid() {
    if (!confirm('Mark royalty as paid?')) return

    try {
      setLoading(true)
      const res = await fetch(`/api/licensee/royalties/${camp.camp_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_paid' }),
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to mark as paid')
      }

      alert(json.data?.message || 'Royalty marked as paid')
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    not_generated: {
      label: 'Needs Closeout',
      color: 'bg-magenta/20 text-magenta',
      icon: Clock,
    },
    pending: {
      label: 'Pending',
      color: 'bg-yellow-500/20 text-yellow-400',
      icon: Clock,
    },
    invoiced: {
      label: 'Invoiced',
      color: 'bg-purple/20 text-purple',
      icon: FileText,
    },
    paid: {
      label: 'Paid',
      color: 'bg-neon/20 text-neon',
      icon: CheckCircle,
    },
    overdue: {
      label: 'Overdue',
      color: 'bg-red-500/20 text-red-400',
      icon: AlertCircle,
    },
    disputed: {
      label: 'Disputed',
      color: 'bg-orange-500/20 text-orange-400',
      icon: AlertCircle,
    },
    waived: {
      label: 'Waived',
      color: 'bg-white/20 text-white/60',
      icon: CheckCircle,
    },
  }

  const config = statusConfig[camp.royalty_status] || statusConfig.not_generated
  const StatusIcon = config.icon

  return (
    <div className="p-4 bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-bold text-white">{camp.camp_name}</span>
            <span className={cn('px-2 py-0.5 text-xs font-bold uppercase', config.color)}>
              <StatusIcon className="h-3 w-3 inline mr-1" />
              {config.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(camp.start_date).toLocaleDateString()} - {new Date(camp.end_date).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {camp.camper_count} campers
            </span>
            {camp.director_name && <span>{camp.director_name}</span>}
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Revenue Breakdown */}
          <div className="text-right hidden sm:block">
            <div className="text-sm text-white/40">
              {formatCurrency(camp.gross_revenue)} gross @ {(camp.royalty_rate * 100).toFixed(0)}%
            </div>
          </div>

          {/* Royalty Amount */}
          <div className="text-right">
            <div className="text-xl font-bold text-purple">
              {formatCurrency(camp.royalty_due)}
            </div>
            <div className="text-xs text-white/40">Royalty</div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {camp.royalty_status === 'not_generated' && (
              <button
                onClick={handleGenerateInvoice}
                disabled={loading}
                className="px-3 py-2 bg-purple text-white font-bold uppercase tracking-wider text-xs hover:bg-purple/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Generate Invoice'}
              </button>
            )}
            {(camp.royalty_status === 'invoiced' || camp.royalty_status === 'pending' || camp.royalty_status === 'overdue') && (
              <button
                onClick={handleMarkPaid}
                disabled={loading}
                className="px-3 py-2 bg-neon text-black font-bold uppercase tracking-wider text-xs hover:bg-neon/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Mark Paid'}
              </button>
            )}
            <Link
              href={`/licensee/camps/${camp.camp_id}/hq?tab=recap`}
              className="p-2 bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <LayoutDashboard className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
