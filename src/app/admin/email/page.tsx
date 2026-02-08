'use client'

/**
 * Automated Email Admin Page - Email Logs Tab
 *
 * Admin view for monitoring sent emails with filtering, search, and preview.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  Mail,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send,
  Loader2,
  RefreshCw,
  FileText,
  History,
  X,
  RotateCcw,
  Plus,
  Calendar,
  Filter,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const SECTION_TABS = [
  { value: 'logs', label: 'Email Logs', href: '/admin/email', icon: History },
  { value: 'templates', label: 'Templates', href: '/admin/email/templates', icon: FileText },
]

interface EmailLog {
  id: string
  toEmail: string
  fromEmail: string | null
  subject: string
  emailType: string
  status: string
  errorMessage: string | null
  createdAt: string
  tenantName: string | null
  userName: string | null
  htmlBody?: string | null
}

interface EmailCounts {
  sent: number
  failed: number
  bounced: number
  delivered: number
  total: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  sent: { label: 'Sent', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30', icon: Send },
  delivered: { label: 'Delivered', color: 'text-neon bg-neon/10 border-neon/30', icon: CheckCircle },
  failed: { label: 'Failed', color: 'text-red-400 bg-red-400/10 border-red-400/30', icon: XCircle },
  bounced: { label: 'Bounced', color: 'text-orange-400 bg-orange-400/10 border-orange-400/30', icon: AlertTriangle },
}

const EMAIL_TYPE_LABELS: Record<string, string> = {
  registration_confirmation: 'Registration Confirmation',
  camp_two_weeks_out: '2 Weeks Out Reminder',
  camp_two_days_before: '2 Days Before Reminder',
  camp_daily_recap: 'Daily Recap',
  camp_session_recap: 'Session Recap',
  season_followup_jan: 'January Follow-up',
  season_followup_feb: 'February Follow-up',
  season_followup_mar: 'March Follow-up',
  season_followup_apr: 'April Follow-up',
  season_followup_may: 'May Follow-up',
  camp_confirmation: 'Camp Confirmation',
  camp_reminder: 'Camp Reminder',
  daily_recap: 'Daily Recap',
  post_camp: 'Post Camp',
  staff_message: 'Staff Message',
  password_reset: 'Password Reset',
  welcome: 'Welcome Email',
  payment_receipt: 'Payment Receipt',
  payment_failed: 'Payment Failed',
  licensee_application: 'Licensee Application',
  licensee_status_update: 'Licensee Status Update',
  cit_application: 'CIT Application',
  cit_status_update: 'CIT Status Update',
  royalty_invoice: 'Royalty Invoice',
  royalty_status_update: 'Royalty Status Update',
  system_alert: 'System Alert',
  broadcast: 'Broadcast',
}

const EMAIL_TYPE_OPTIONS = Object.entries(EMAIL_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'sent', label: 'Sent' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed', label: 'Failed' },
  { value: 'bounced', label: 'Bounced' },
]

export default function EmailLogsPage() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [counts, setCounts] = useState<EmailCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [total, setTotal] = useState(0)
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null)
  const [resending, setResending] = useState(false)

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  useEffect(() => {
    loadLogs()
    loadCounts()
  }, [statusFilter, typeFilter, dateFrom, dateTo])

  const loadLogs = async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (typeFilter) {
        params.append('type', typeFilter)
      }
      if (searchQuery) {
        params.append('search', searchQuery)
      }
      if (dateFrom) {
        params.append('from', dateFrom)
      }
      if (dateTo) {
        params.append('to', dateTo)
      }
      params.append('limit', '100')

      const res = await fetch(`/api/admin/email-logs?${params.toString()}`)
      const { data, error } = await res.json()

      if (error) {
        console.error('Error loading email logs:', error)
        setLoading(false)
        return
      }

      if (data) {
        setLogs(data.logs || [])
        setTotal(data.total || 0)
      }
    } catch (err) {
      console.error('Error loading email logs:', err)
    }

    setLoading(false)
  }

  const loadCounts = async () => {
    try {
      const res = await fetch('/api/admin/email-logs?counts=true')
      const { data } = await res.json()
      if (data) {
        setCounts(data)
      }
    } catch (err) {
      console.error('Error loading counts:', err)
    }
  }

  const handleSearch = () => {
    loadLogs()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleResend = async (logId: string) => {
    setResending(true)
    try {
      const res = await fetch(`/api/admin/email-logs/${logId}/resend`, {
        method: 'POST',
      })
      const json = await res.json()

      if (!res.ok) {
        alert(`Resend failed: ${json.error}`)
      } else {
        alert('Email resent successfully!')
        setSelectedLog(null)
        loadLogs()
        loadCounts()
      }
    } catch {
      alert('Failed to resend email')
    } finally {
      setResending(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const truncateEmail = (email: string, maxLength: number = 30) => {
    if (email.length <= maxLength) return email
    return email.slice(0, maxLength) + '...'
  }

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <PageHeader
        title="Automated Email"
        description="Monitor sent emails and manage email templates"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Automated Email' },
        ]}
      />

      {/* Section Tabs + Compose Button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-dark-100 border border-white/10 p-1 w-fit">
          {SECTION_TABS.map(tab => {
            const Icon = tab.icon
            const isActive = tab.value === 'logs'
            return (
              <Link
                key={tab.value}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors',
                  isActive
                    ? 'bg-purple text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            )
          })}
        </div>

        <Link
          href="/admin/email/compose"
          className="flex items-center gap-2 px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider text-sm hover:bg-neon/80 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Compose
        </Link>
      </div>

      {/* Stats Cards */}
      {counts && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-dark-100/50 border border-white/10 p-4">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total</p>
            <p className="text-2xl font-black text-white">{counts.total}</p>
          </div>
          <div className="bg-dark-100/50 border border-blue-400/30 p-4">
            <p className="text-xs text-blue-400 uppercase tracking-wider mb-1">Sent</p>
            <p className="text-2xl font-black text-white">{counts.sent}</p>
          </div>
          <div className="bg-dark-100/50 border border-neon/30 p-4">
            <p className="text-xs text-neon uppercase tracking-wider mb-1">Delivered</p>
            <p className="text-2xl font-black text-white">{counts.delivered}</p>
          </div>
          <div className="bg-dark-100/50 border border-red-400/30 p-4">
            <p className="text-xs text-red-400 uppercase tracking-wider mb-1">Failed</p>
            <p className="text-2xl font-black text-white">{counts.failed}</p>
          </div>
          <div className="bg-dark-100/50 border border-orange-400/30 p-4">
            <p className="text-xs text-orange-400 uppercase tracking-wider mb-1">Bounced</p>
            <p className="text-2xl font-black text-white">{counts.bounced}</p>
          </div>
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-white/10">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              statusFilter === tab.value
                ? 'bg-purple text-white'
                : 'bg-dark-100 text-white/60 hover:text-white hover:bg-dark-100/80'
            )}
          >
            {tab.label}
            {counts && tab.value !== 'all' && (
              <span className="ml-2 text-xs opacity-60">
                {counts[tab.value as keyof EmailCounts] || 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters Row */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
          <Input
            type="text"
            placeholder="Search by email or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-12"
          />
        </div>

        {/* Type Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="pl-9 pr-8 py-2 bg-dark-100 border border-white/10 text-white text-sm appearance-none cursor-pointer focus:outline-none focus:border-purple/50 min-w-[180px]"
          >
            <option value="">All Types</option>
            {EMAIL_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            placeholder="From"
            className="pl-9 pr-3 py-2 bg-dark-100 border border-white/10 text-white text-sm focus:outline-none focus:border-purple/50"
          />
        </div>

        {/* Date To */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            placeholder="To"
            className="pl-9 pr-3 py-2 bg-dark-100 border border-white/10 text-white text-sm focus:outline-none focus:border-purple/50"
          />
        </div>

        {/* Action Buttons */}
        <button
          onClick={handleSearch}
          className="flex items-center gap-2 px-4 py-2 bg-purple hover:bg-purple/80 text-white font-medium transition-colors"
        >
          <Search className="h-4 w-4" />
          Search
        </button>
        <button
          onClick={() => { loadLogs(); loadCounts(); }}
          className="flex items-center gap-2 px-4 py-2 bg-dark-100 hover:bg-dark-100/80 text-white/60 hover:text-white font-medium transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Logs Table */}
      <ContentCard>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="h-12 w-12 text-white/20 mx-auto mb-3" />
            <p className="text-lg font-bold text-white/60">No Email Logs Found</p>
            <p className="text-sm text-white/40 mt-1">
              {searchQuery || statusFilter !== 'all' || typeFilter || dateFrom || dateTo
                ? 'Try adjusting your search or filters'
                : 'Email logs will appear here as emails are sent'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">To</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Subject</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Tenant</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Sent</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const statusConfig = STATUS_CONFIG[log.status] || STATUS_CONFIG.sent
                  const StatusIcon = statusConfig.icon

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-purple/10 border border-purple/30 flex items-center justify-center flex-shrink-0">
                            <Mail className="h-4 w-4 text-purple" />
                          </div>
                          <div>
                            <p className="font-medium text-white text-sm">{truncateEmail(log.toEmail)}</p>
                            {log.userName && (
                              <p className="text-xs text-white/40">{log.userName}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-white/80 max-w-xs truncate">
                          {log.subject}
                        </p>
                        {log.errorMessage && (
                          <p className="text-xs text-red-400 mt-1 truncate max-w-xs">
                            {log.errorMessage}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-white/60">
                          {EMAIL_TYPE_LABELS[log.emailType] || log.emailType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-2 py-1 text-xs font-bold uppercase tracking-wider border',
                          statusConfig.color
                        )}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-white/40">
                        {log.tenantName || 'HQ'}
                      </td>
                      <td className="px-4 py-4 text-sm text-white/40">
                        {formatDate(log.createdAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </ContentCard>

      {/* Stats Footer */}
      <div className="mt-6 flex items-center justify-between text-xs text-white/40">
        <p>Showing {logs.length} of {total} emails</p>
        <p>Last updated: just now</p>
      </div>

      {/* Preview Drawer */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSelectedLog(null)}
          />

          {/* Panel */}
          <div className="relative w-full max-w-2xl bg-dark-100 border-l border-white/10 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-dark-100 border-b border-white/10 p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Email Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5 text-white/60" />
              </button>
            </div>

            {/* Metadata */}
            <div className="p-4 space-y-3 border-b border-white/10">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-white/40 text-xs uppercase">To</span>
                  <p className="text-white">{selectedLog.toEmail}</p>
                </div>
                <div>
                  <span className="text-white/40 text-xs uppercase">From</span>
                  <p className="text-white">{selectedLog.fromEmail || 'Default'}</p>
                </div>
                <div>
                  <span className="text-white/40 text-xs uppercase">Subject</span>
                  <p className="text-white">{selectedLog.subject}</p>
                </div>
                <div>
                  <span className="text-white/40 text-xs uppercase">Type</span>
                  <p className="text-white">
                    {EMAIL_TYPE_LABELS[selectedLog.emailType] || selectedLog.emailType}
                  </p>
                </div>
                <div>
                  <span className="text-white/40 text-xs uppercase">Status</span>
                  <p className={cn(
                    'font-bold uppercase text-sm',
                    selectedLog.status === 'sent' ? 'text-blue-400' :
                    selectedLog.status === 'delivered' ? 'text-neon' :
                    selectedLog.status === 'failed' ? 'text-red-400' :
                    'text-orange-400'
                  )}>
                    {selectedLog.status}
                  </p>
                </div>
                <div>
                  <span className="text-white/40 text-xs uppercase">Sent At</span>
                  <p className="text-white">{formatDate(selectedLog.createdAt)}</p>
                </div>
                {selectedLog.userName && (
                  <div>
                    <span className="text-white/40 text-xs uppercase">Recipient Name</span>
                    <p className="text-white">{selectedLog.userName}</p>
                  </div>
                )}
                {selectedLog.tenantName && (
                  <div>
                    <span className="text-white/40 text-xs uppercase">Tenant</span>
                    <p className="text-white">{selectedLog.tenantName}</p>
                  </div>
                )}
              </div>
              {selectedLog.errorMessage && (
                <div className="p-3 bg-red-400/10 border border-red-400/30">
                  <span className="text-red-400 text-xs uppercase font-bold">Error</span>
                  <p className="text-red-300 text-sm mt-1">{selectedLog.errorMessage}</p>
                </div>
              )}

              {/* Resend button for failed emails */}
              {(selectedLog.status === 'failed' || selectedLog.status === 'bounced') && (
                <button
                  onClick={() => handleResend(selectedLog.id)}
                  disabled={resending}
                  className="flex items-center gap-2 px-4 py-2 bg-purple hover:bg-purple/80 text-white font-bold text-sm uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {resending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  {resending ? 'Resending...' : 'Resend Email'}
                </button>
              )}
            </div>

            {/* HTML Preview */}
            <div className="p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">
                Email Preview
              </h4>
              {selectedLog.htmlBody ? (
                <div className="bg-white rounded overflow-hidden">
                  <iframe
                    srcDoc={selectedLog.htmlBody}
                    className="w-full min-h-[500px] border-0"
                    sandbox="allow-same-origin"
                    title="Email Preview"
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-white/30 text-sm">
                  No HTML preview available for this email
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
