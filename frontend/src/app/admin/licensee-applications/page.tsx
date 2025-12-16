'use client'

/**
 * Licensee Applications Admin Page
 *
 * Admin view for viewing and managing licensee/franchise applications.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  Building2,
  Search,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Loader2,
  Phone,
  CalendarCheck,
  Users,
  X,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  MessageSquare,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LicenseeApplication {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  company_name: string | null
  city: string | null
  state: string | null
  territory_interest: string | null
  status: string
  created_at: string
}

interface LicenseeCounts {
  submitted: number
  under_review: number
  contacted: number
  interview_scheduled: number
  interview_completed: number
  approved: number
  rejected: number
  withdrawn: number
  total: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  submitted: { label: 'Submitted', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30', icon: FileText },
  under_review: { label: 'Under Review', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', icon: Clock },
  contacted: { label: 'Contacted', color: 'text-purple bg-purple/10 border-purple/30', icon: Phone },
  interview_scheduled: { label: 'Interview Scheduled', color: 'text-orange-400 bg-orange-400/10 border-orange-400/30', icon: CalendarCheck },
  interview_completed: { label: 'Interview Done', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30', icon: CheckCircle },
  approved: { label: 'Approved', color: 'text-neon bg-neon/10 border-neon/30', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-400 bg-red-400/10 border-red-400/30', icon: XCircle },
  withdrawn: { label: 'Withdrawn', color: 'text-white/40 bg-white/5 border-white/10', icon: XCircle },
}

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Review' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'interview_scheduled', label: 'Interview' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export default function LicenseeApplicationsPage() {
  const { user } = useAuth()
  const [applications, setApplications] = useState<LicenseeApplication[]>([])
  const [counts, setCounts] = useState<LicenseeCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedApplication, setSelectedApplication] = useState<LicenseeApplication | null>(null)

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  useEffect(() => {
    loadApplications()
    loadCounts()
  }, [statusFilter])

  const loadApplications = async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      params.append('limit', '100')

      const res = await fetch(`/api/admin/licensee-applications?${params.toString()}`)
      const { data, error } = await res.json()

      if (error) {
        console.error('Error loading applications:', error)
        setLoading(false)
        return
      }

      if (data) {
        setApplications(data.applications || [])
      }
    } catch (err) {
      console.error('Error loading applications:', err)
    }

    setLoading(false)
  }

  const loadCounts = async () => {
    try {
      const res = await fetch('/api/admin/licensee-applications?counts=true')
      const { data } = await res.json()
      if (data) {
        setCounts(data)
      }
    } catch (err) {
      console.error('Error loading counts:', err)
    }
  }

  const filteredApplications = applications.filter(app => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      app.first_name?.toLowerCase().includes(query) ||
      app.last_name?.toLowerCase().includes(query) ||
      app.email?.toLowerCase().includes(query) ||
      app.company_name?.toLowerCase().includes(query) ||
      app.territory_interest?.toLowerCase().includes(query)
    )
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <PageHeader
          title="Licensee Applications"
          description="View and manage franchise/licensee applications"
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Inbox', href: '/admin/cit' },
            { label: 'Licensee Applications' },
          ]}
        />
        <Link href="/admin/licensees">
          <Button variant="outline-neon" size="sm">
            <Users className="h-4 w-4 mr-2" />
            View Licensees
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      {counts && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-dark-100/50 border border-white/10 p-4">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total</p>
            <p className="text-2xl font-black text-white">{counts.total}</p>
          </div>
          <div className="bg-dark-100/50 border border-blue-400/30 p-4">
            <p className="text-xs text-blue-400 uppercase tracking-wider mb-1">New</p>
            <p className="text-2xl font-black text-white">{counts.submitted}</p>
          </div>
          <div className="bg-dark-100/50 border border-yellow-400/30 p-4">
            <p className="text-xs text-yellow-400 uppercase tracking-wider mb-1">In Progress</p>
            <p className="text-2xl font-black text-white">
              {counts.under_review + counts.contacted + counts.interview_scheduled + counts.interview_completed}
            </p>
          </div>
          <div className="bg-dark-100/50 border border-neon/30 p-4">
            <p className="text-xs text-neon uppercase tracking-wider mb-1">Approved</p>
            <p className="text-2xl font-black text-white">{counts.approved}</p>
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
                ? 'bg-neon text-dark'
                : 'bg-dark-100 text-white/60 hover:text-white hover:bg-dark-100/80'
            )}
          >
            {tab.label}
            {counts && tab.value !== 'all' && (
              <span className="ml-2 text-xs opacity-60">
                {counts[tab.value as keyof LicenseeCounts] || 0}
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
            placeholder="Search by name, email, company, or territory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12"
          />
        </div>
      </div>

      {/* Applications Table */}
      <ContentCard>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-neon" />
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-white/20 mx-auto mb-3" />
            <p className="text-lg font-bold text-white/60">No Applications Found</p>
            <p className="text-sm text-white/40 mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Licensee applications will appear here'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Applicant</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Location</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Territory Interest</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Applied</th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40"></th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((app) => {
                  const statusConfig = STATUS_CONFIG[app.status] || STATUS_CONFIG.submitted
                  const StatusIcon = statusConfig.icon
                  const fullName = `${app.first_name} ${app.last_name}`
                  const location = [app.city, app.state].filter(Boolean).join(', ') || '—'

                  return (
                    <tr key={app.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-neon/10 border border-neon/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-neon font-black">
                              {app.first_name?.[0]?.toUpperCase() || 'L'}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-white">{fullName}</p>
                            <p className="text-xs text-white/40">{app.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-white/80">
                          {app.company_name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-white/60">
                        {location}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-white/60 max-w-xs truncate">
                          {app.territory_interest || '—'}
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
                        {formatDate(app.created_at)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => setSelectedApplication(app)}
                          className="inline-flex items-center gap-1 text-sm text-neon hover:text-neon/80 transition-colors"
                        >
                          View
                          <ChevronRight className="h-4 w-4" />
                        </button>
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
        <p>Showing {filteredApplications.length} of {applications.length} applications</p>
        <p>Last updated: just now</p>
      </div>

      {/* Application Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedApplication(null)}
          />
          <div className="relative w-full max-w-2xl bg-dark-100 border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-dark-100 border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-neon/10 border border-neon/30 flex items-center justify-center">
                  <span className="text-neon font-black">
                    {selectedApplication.first_name?.[0]?.toUpperCase() || 'L'}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {selectedApplication.first_name} {selectedApplication.last_name}
                  </h2>
                  <p className="text-xs text-white/50">Licensee Application</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedApplication(null)}
                className="p-2 hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5 text-white/60" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-4 flex-wrap">
                {(() => {
                  const statusConfig = STATUS_CONFIG[selectedApplication.status] || STATUS_CONFIG.submitted
                  const StatusIcon = statusConfig.icon
                  return (
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider border',
                      statusConfig.color
                    )}>
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig.label}
                    </span>
                  )
                })()}
              </div>

              {/* Contact Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/30 border border-white/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-neon" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white/40">Email</span>
                  </div>
                  <p className="text-white">{selectedApplication.email}</p>
                </div>
                <div className="bg-black/30 border border-white/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="h-4 w-4 text-neon" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white/40">Phone</span>
                  </div>
                  <p className="text-white">{selectedApplication.phone || 'Not provided'}</p>
                </div>
              </div>

              {/* Company Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/30 border border-white/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="h-4 w-4 text-neon" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white/40">Company</span>
                  </div>
                  <p className="text-white">{selectedApplication.company_name || 'Not provided'}</p>
                </div>
                <div className="bg-black/30 border border-white/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-neon" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white/40">Location</span>
                  </div>
                  <p className="text-white">
                    {[selectedApplication.city, selectedApplication.state].filter(Boolean).join(', ') || 'Not provided'}
                  </p>
                </div>
              </div>

              {/* Territory Interest */}
              <div className="bg-black/30 border border-white/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-neon" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white/40">Territory Interest</span>
                </div>
                <p className="text-white/80">{selectedApplication.territory_interest || 'Not specified'}</p>
              </div>

              {/* Date */}
              <div className="bg-black/30 border border-white/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-neon" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white/40">Applied</span>
                </div>
                <p className="text-white">{formatDate(selectedApplication.created_at)}</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-white/10 px-6 py-4">
              <button
                onClick={() => setSelectedApplication(null)}
                className="w-full py-3 bg-neon text-dark font-bold uppercase tracking-wider hover:bg-neon/80 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
