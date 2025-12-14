'use client'

/**
 * Contact Messages Admin Page
 *
 * Admin view for viewing and managing contact form submissions.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  MessageSquare,
  Search,
  Mail,
  Clock,
  CheckCircle,
  Archive,
  ChevronRight,
  Loader2,
  Eye,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ContactSubmission {
  id: string
  name: string
  email: string
  phone: string | null
  inquiry_type: string
  message: string
  status: string
  created_at: string
}

interface ContactCounts {
  new: number
  read: number
  replied: number
  archived: number
  total: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  new: { label: 'New', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30', icon: Mail },
  read: { label: 'Read', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', icon: Eye },
  replied: { label: 'Replied', color: 'text-neon bg-neon/10 border-neon/30', icon: CheckCircle },
  archived: { label: 'Archived', color: 'text-white/40 bg-white/5 border-white/10', icon: Archive },
}

const INQUIRY_LABELS: Record<string, string> = {
  parent: 'Parent Inquiry',
  athlete: 'Athlete Inquiry',
  coach: 'Coaching Opportunity',
  partnership: 'Partnership',
  franchise: 'Franchise Inquiry',
  volunteer: 'Volunteer Interest',
  other: 'General Inquiry',
}

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'replied', label: 'Replied' },
  { value: 'archived', label: 'Archived' },
]

export default function ContactMessagesPage() {
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([])
  const [counts, setCounts] = useState<ContactCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  useEffect(() => {
    loadSubmissions()
    loadCounts()
  }, [statusFilter])

  const loadSubmissions = async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      params.append('limit', '100')

      const res = await fetch(`/api/admin/contact?${params.toString()}`)
      const { data, error } = await res.json()

      if (error) {
        console.error('Error loading submissions:', error)
        setLoading(false)
        return
      }

      if (data) {
        setSubmissions(data.submissions || [])
      }
    } catch (err) {
      console.error('Error loading submissions:', err)
    }

    setLoading(false)
  }

  const loadCounts = async () => {
    try {
      const res = await fetch('/api/admin/contact?counts=true')
      const { data } = await res.json()
      if (data) {
        setCounts(data)
      }
    } catch (err) {
      console.error('Error loading counts:', err)
    }
  }

  const filteredSubmissions = submissions.filter(sub => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      sub.name?.toLowerCase().includes(query) ||
      sub.email?.toLowerCase().includes(query) ||
      sub.message?.toLowerCase().includes(query)
    )
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const truncateMessage = (message: string, maxLength: number = 60) => {
    if (message.length <= maxLength) return message
    return message.slice(0, maxLength) + '...'
  }

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <PageHeader
        title="Contact Messages"
        description="View and manage contact form submissions"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Inbox', href: '/admin/cit' },
          { label: 'Contact Messages' },
        ]}
      />

      {/* Stats Cards */}
      {counts && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-dark-100/50 border border-white/10 p-4">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total</p>
            <p className="text-2xl font-black text-white">{counts.total}</p>
          </div>
          <div className="bg-dark-100/50 border border-blue-400/30 p-4">
            <p className="text-xs text-blue-400 uppercase tracking-wider mb-1">New</p>
            <p className="text-2xl font-black text-white">{counts.new}</p>
          </div>
          <div className="bg-dark-100/50 border border-yellow-400/30 p-4">
            <p className="text-xs text-yellow-400 uppercase tracking-wider mb-1">Read</p>
            <p className="text-2xl font-black text-white">{counts.read}</p>
          </div>
          <div className="bg-dark-100/50 border border-neon/30 p-4">
            <p className="text-xs text-neon uppercase tracking-wider mb-1">Replied</p>
            <p className="text-2xl font-black text-white">{counts.replied}</p>
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
                {counts[tab.value as keyof ContactCounts] || 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
          <Input
            type="text"
            placeholder="Search by name, email, or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12"
          />
        </div>
      </div>

      {/* Submissions Table */}
      <ContentCard>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple" />
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-white/20 mx-auto mb-3" />
            <p className="text-lg font-bold text-white/60">No Messages Found</p>
            <p className="text-sm text-white/40 mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Contact form submissions will appear here'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">From</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Message</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Received</th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40"></th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((sub) => {
                  const statusConfig = STATUS_CONFIG[sub.status] || STATUS_CONFIG.new
                  const StatusIcon = statusConfig.icon

                  return (
                    <tr key={sub.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-purple/10 border border-purple/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-purple font-black">
                              {sub.name?.[0]?.toUpperCase() || 'C'}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-white">{sub.name}</p>
                            <p className="text-xs text-white/40">{sub.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-white/60">
                          {INQUIRY_LABELS[sub.inquiry_type] || sub.inquiry_type}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-white/80 max-w-xs">
                          {truncateMessage(sub.message)}
                        </p>
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
                        {formatDate(sub.created_at)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/admin/contact/${sub.id}`}
                          className="inline-flex items-center gap-1 text-sm text-purple hover:text-purple/80 transition-colors"
                        >
                          View
                          <ChevronRight className="h-4 w-4" />
                        </Link>
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
        <p>Showing {filteredSubmissions.length} of {submissions.length} messages</p>
        <p>Last updated: just now</p>
      </div>
    </AdminLayout>
  )
}
