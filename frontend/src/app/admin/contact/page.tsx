'use client'

/**
 * Admin Inbox Page
 *
 * Unified inbox for Contact Messages and Testimonies.
 * Includes category tabs and status filters for each type.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  MessageSquare,
  Search,
  Mail,
  CheckCircle,
  Archive,
  Loader2,
  Eye,
  Heart,
  Star,
  Clock,
  XCircle,
  Camera,
  Video,
  ChevronRight,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

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

interface Testimony {
  id: string
  author_name: string
  author_email: string | null
  author_role: string
  headline: string | null
  body: string
  photo_url: string | null
  video_url: string | null
  camp_name: string | null
  status: string
  is_featured: boolean
  created_at: string
}

interface TestimonyCounts {
  pending_review: number
  approved: number
  rejected: number
  archived: number
  total: number
  featured: number
}

// ============================================================================
// Config
// ============================================================================

const CATEGORY_TABS = [
  { value: 'messages', label: 'Contact Messages', icon: MessageSquare },
  { value: 'testimonies', label: 'Testimonies', icon: Heart },
]

const CONTACT_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  new: { label: 'New', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30', icon: Mail },
  read: { label: 'Read', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', icon: Eye },
  replied: { label: 'Replied', color: 'text-neon bg-neon/10 border-neon/30', icon: CheckCircle },
  archived: { label: 'Archived', color: 'text-white/40 bg-white/5 border-white/10', icon: Archive },
}

const TESTIMONY_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending_review: { label: 'Pending', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', icon: Clock },
  approved: { label: 'Approved', color: 'text-neon bg-neon/10 border-neon/30', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-400 bg-red-400/10 border-red-400/30', icon: XCircle },
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

const ROLE_LABELS: Record<string, string> = {
  parent: 'Parent',
  athlete: 'Athlete',
  coach: 'Coach',
  licensee: 'Licensee',
  cit: 'CIT',
  volunteer: 'Volunteer',
  other: 'Other',
}

const CONTACT_STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'replied', label: 'Replied' },
  { value: 'archived', label: 'Archived' },
]

const TESTIMONY_STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending_review', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
]

// ============================================================================
// Component
// ============================================================================

export default function AdminInboxPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()

  // Get initial tab from URL
  const initialTab = searchParams.get('tab') || 'messages'

  const [category, setCategory] = useState<'messages' | 'testimonies'>(
    initialTab === 'testimonies' ? 'testimonies' : 'messages'
  )
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  // Contact state
  const [contacts, setContacts] = useState<ContactSubmission[]>([])
  const [contactCounts, setContactCounts] = useState<ContactCounts | null>(null)

  // Testimony state
  const [testimonies, setTestimonies] = useState<Testimony[]>([])
  const [testimonyCounts, setTestimonyCounts] = useState<TestimonyCounts | null>(null)

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  // Load data when category or status filter changes
  useEffect(() => {
    setStatusFilter('all') // Reset filter when switching categories
  }, [category])

  useEffect(() => {
    if (category === 'messages') {
      loadContacts()
      loadContactCounts()
    } else {
      loadTestimonies()
      loadTestimonyCounts()
    }
  }, [category, statusFilter])

  const loadContacts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      params.append('limit', '100')

      const res = await fetch(`/api/admin/contact?${params.toString()}`)
      const { data, error } = await res.json()

      if (!error && data) {
        setContacts(data.submissions || [])
      }
    } catch (err) {
      console.error('Error loading contacts:', err)
    }
    setLoading(false)
  }

  const loadContactCounts = async () => {
    try {
      const res = await fetch('/api/admin/contact?counts=true')
      const { data } = await res.json()
      if (data) {
        setContactCounts(data)
      }
    } catch (err) {
      console.error('Error loading contact counts:', err)
    }
  }

  const loadTestimonies = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      params.append('limit', '100')

      const res = await fetch(`/api/admin/testimonies?${params.toString()}`)
      const { data, error } = await res.json()

      if (!error && data) {
        setTestimonies(data.testimonies || [])
      }
    } catch (err) {
      console.error('Error loading testimonies:', err)
    }
    setLoading(false)
  }

  const loadTestimonyCounts = async () => {
    try {
      const res = await fetch('/api/admin/testimonies?counts=true')
      const { data } = await res.json()
      if (data) {
        setTestimonyCounts(data)
      }
    } catch (err) {
      console.error('Error loading testimony counts:', err)
    }
  }

  // Filter data by search query
  const filteredContacts = contacts.filter((sub) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      sub.name?.toLowerCase().includes(query) ||
      sub.email?.toLowerCase().includes(query) ||
      sub.message?.toLowerCase().includes(query)
    )
  })

  const filteredTestimonies = testimonies.filter((t) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      t.author_name?.toLowerCase().includes(query) ||
      t.headline?.toLowerCase().includes(query) ||
      t.body?.toLowerCase().includes(query)
    )
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const truncate = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  const currentStatusTabs = category === 'messages' ? CONTACT_STATUS_TABS : TESTIMONY_STATUS_TABS
  const currentCounts = category === 'messages' ? contactCounts : testimonyCounts

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <PageHeader
        title="Inbox"
        description="Manage contact messages and testimony submissions"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Inbox' },
        ]}
      />

      {/* Category Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {CATEGORY_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = category === tab.value
          const count =
            tab.value === 'messages'
              ? contactCounts?.new || 0
              : testimonyCounts?.pending_review || 0

          return (
            <button
              key={tab.value}
              onClick={() => setCategory(tab.value as 'messages' | 'testimonies')}
              className={cn(
                'flex items-center gap-2 px-5 py-3 font-bold uppercase tracking-wider text-sm transition-all border',
                isActive
                  ? 'bg-purple text-white border-purple'
                  : 'bg-dark-100 text-white/60 border-white/10 hover:border-white/30 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {count > 0 && (
                <span
                  className={cn(
                    'ml-1 px-2 py-0.5 text-xs rounded-full',
                    isActive ? 'bg-white/20' : 'bg-magenta/20 text-magenta'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Stats Cards */}
      {category === 'messages' && contactCounts && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-dark-100/50 border border-white/10 p-4">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total</p>
            <p className="text-2xl font-black text-white">{contactCounts.total}</p>
          </div>
          <div className="bg-dark-100/50 border border-blue-400/30 p-4">
            <p className="text-xs text-blue-400 uppercase tracking-wider mb-1">New</p>
            <p className="text-2xl font-black text-white">{contactCounts.new}</p>
          </div>
          <div className="bg-dark-100/50 border border-yellow-400/30 p-4">
            <p className="text-xs text-yellow-400 uppercase tracking-wider mb-1">Read</p>
            <p className="text-2xl font-black text-white">{contactCounts.read}</p>
          </div>
          <div className="bg-dark-100/50 border border-neon/30 p-4">
            <p className="text-xs text-neon uppercase tracking-wider mb-1">Replied</p>
            <p className="text-2xl font-black text-white">{contactCounts.replied}</p>
          </div>
        </div>
      )}

      {category === 'testimonies' && testimonyCounts && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-dark-100/50 border border-white/10 p-4">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total</p>
            <p className="text-2xl font-black text-white">{testimonyCounts.total}</p>
          </div>
          <div className="bg-dark-100/50 border border-yellow-400/30 p-4">
            <p className="text-xs text-yellow-400 uppercase tracking-wider mb-1">Pending</p>
            <p className="text-2xl font-black text-white">{testimonyCounts.pending_review}</p>
          </div>
          <div className="bg-dark-100/50 border border-neon/30 p-4">
            <p className="text-xs text-neon uppercase tracking-wider mb-1">Approved</p>
            <p className="text-2xl font-black text-white">{testimonyCounts.approved}</p>
          </div>
          <div className="bg-dark-100/50 border border-red-400/30 p-4">
            <p className="text-xs text-red-400 uppercase tracking-wider mb-1">Rejected</p>
            <p className="text-2xl font-black text-white">{testimonyCounts.rejected}</p>
          </div>
          <div className="bg-dark-100/50 border border-magenta/30 p-4">
            <div className="flex items-center gap-1 mb-1">
              <Star className="h-3 w-3 text-magenta" />
              <p className="text-xs text-magenta uppercase tracking-wider">Featured</p>
            </div>
            <p className="text-2xl font-black text-white">{testimonyCounts.featured}</p>
          </div>
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-white/10">
        {currentStatusTabs.map((tab) => (
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
            {currentCounts && tab.value !== 'all' && (
              <span className="ml-2 text-xs opacity-60">
                {(currentCounts as unknown as Record<string, number>)[tab.value] || 0}
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
            placeholder={
              category === 'messages'
                ? 'Search by name, email, or message...'
                : 'Search by author, headline, or content...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12"
          />
        </div>
      </div>

      {/* Content */}
      <ContentCard>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple" />
          </div>
        ) : category === 'messages' ? (
          // Contact Messages Table
          filteredContacts.length === 0 ? (
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
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">
                      From
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">
                      Type
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">
                      Message
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">
                      Received
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((sub) => {
                    const statusConfig = CONTACT_STATUS_CONFIG[sub.status] || CONTACT_STATUS_CONFIG.new
                    const StatusIcon = statusConfig.icon

                    return (
                      <tr
                        key={sub.id}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
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
                          <p className="text-sm text-white/80 max-w-xs">{truncate(sub.message)}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2 py-1 text-xs font-bold uppercase tracking-wider border',
                              statusConfig.color
                            )}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-white/40">{formatDate(sub.created_at)}</td>
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
          )
        ) : // Testimonies Table
        filteredTestimonies.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-12 w-12 text-white/20 mx-auto mb-3" />
            <p className="text-lg font-bold text-white/60">No Testimonies Found</p>
            <p className="text-sm text-white/40 mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Testimony submissions will appear here'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">
                    Author
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">
                    Role
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">
                    Headline
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">
                    Media
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">
                    Submitted
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40"></th>
                </tr>
              </thead>
              <tbody>
                {filteredTestimonies.map((t) => {
                  const statusConfig =
                    TESTIMONY_STATUS_CONFIG[t.status] || TESTIMONY_STATUS_CONFIG.pending_review
                  const StatusIcon = statusConfig.icon

                  return (
                    <tr
                      key={t.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-magenta/10 border border-magenta/30 flex items-center justify-center flex-shrink-0 relative">
                            <span className="text-magenta font-black">
                              {t.author_name?.[0]?.toUpperCase() || 'T'}
                            </span>
                            {t.is_featured && (
                              <div className="absolute -top-1 -right-1 p-0.5 bg-neon">
                                <Star className="h-2 w-2 text-black fill-current" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{t.author_name}</p>
                            {t.camp_name && (
                              <p className="text-xs text-white/40">{t.camp_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-white/60">
                          {ROLE_LABELS[t.author_role] || t.author_role}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-white/80 max-w-xs">
                          {t.headline ? truncate(t.headline, 50) : truncate(t.body, 50)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {t.photo_url && (
                            <span title="Has photo"><Camera className="h-4 w-4 text-white/40" /></span>
                          )}
                          {t.video_url && (
                            <span title="Has video"><Video className="h-4 w-4 text-white/40" /></span>
                          )}
                          {!t.photo_url && !t.video_url && (
                            <span className="text-xs text-white/30">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2 py-1 text-xs font-bold uppercase tracking-wider border',
                            statusConfig.color
                          )}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-white/40">{formatDate(t.created_at)}</td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/admin/contact/testimonies/${t.id}`}
                          className="inline-flex items-center gap-1 text-sm text-magenta hover:text-magenta/80 transition-colors"
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
        <p>
          Showing{' '}
          {category === 'messages' ? filteredContacts.length : filteredTestimonies.length} of{' '}
          {category === 'messages' ? contacts.length : testimonies.length}{' '}
          {category === 'messages' ? 'messages' : 'testimonies'}
        </p>
        <p>Last updated: just now</p>
      </div>
    </AdminLayout>
  )
}
