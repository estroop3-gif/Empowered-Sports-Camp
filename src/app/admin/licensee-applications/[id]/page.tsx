'use client'

/**
 * Licensee Application Detail Page
 *
 * Admin view for reviewing and managing a single licensee application.
 */

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Calendar,
  Briefcase,
  Trophy,
  DollarSign,
  MessageSquare,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  CalendarCheck,
  AlertCircle,
  Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LicenseeApplication {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  company_name: string | null
  website: string | null
  city: string | null
  state: string | null
  territory_interest: string | null
  business_experience: string | null
  sports_background: string | null
  why_interested: string | null
  investment_capacity: string | null
  how_heard: string | null
  status: string
  internal_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  submitted: { label: 'Submitted', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30', icon: FileText },
  under_review: { label: 'Under Review', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', icon: Clock },
  contacted: { label: 'Contacted', color: 'text-purple bg-purple/10 border-purple/30', icon: Phone },
  interview_scheduled: { label: 'Interview Scheduled', color: 'text-orange-400 bg-orange-400/10 border-orange-400/30', icon: CalendarCheck },
  interview_completed: { label: 'Interview Completed', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30', icon: CheckCircle },
  approved: { label: 'Approved', color: 'text-neon bg-neon/10 border-neon/30', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-400 bg-red-400/10 border-red-400/30', icon: XCircle },
  withdrawn: { label: 'Withdrawn', color: 'text-white/40 bg-white/5 border-white/10', icon: XCircle },
}

const STATUS_OPTIONS = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'interview_scheduled', label: 'Interview Scheduled' },
  { value: 'interview_completed', label: 'Interview Completed' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
]

export default function LicenseeApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  const [application, setApplication] = useState<LicenseeApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [internalNotes, setInternalNotes] = useState<string>('')

  useEffect(() => {
    loadApplication()
  }, [id])

  const loadApplication = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/licensee-applications/${id}`)
      const { data, error: apiError } = await res.json()

      if (apiError || !data) {
        setError(apiError || 'Application not found')
        setLoading(false)
        return
      }

      setApplication(data)
      setSelectedStatus(data.status)
      setInternalNotes(data.internal_notes || '')
    } catch (err) {
      console.error('Error loading application:', err)
      setError('Failed to load application')
    }

    setLoading(false)
  }

  const handleSave = async () => {
    if (!application) return

    const previousStatus = application.status
    const previousNotes = application.internal_notes
    setSaving(true)
    setError(null)

    // Optimistically update the UI
    setApplication(prev => prev ? {
      ...prev,
      status: selectedStatus,
      internal_notes: internalNotes
    } : null)

    try {
      const res = await fetch(`/api/admin/licensee-applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: selectedStatus,
          internal_notes: internalNotes,
        }),
      })

      const { error: apiError } = await res.json()

      if (apiError) {
        // Revert on error
        setApplication(prev => prev ? {
          ...prev,
          status: previousStatus,
          internal_notes: previousNotes
        } : null)
        setSelectedStatus(previousStatus)
        setError(apiError)
        setSaving(false)
        return
      }

      // Reload to get updated timestamps
      loadApplication()
    } catch (err) {
      // Revert on error
      setApplication(prev => prev ? {
        ...prev,
        status: previousStatus,
        internal_notes: previousNotes
      } : null)
      setSelectedStatus(previousStatus)
      console.error('Error saving application:', err)
      setError('Failed to save changes')
    }

    setSaving(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
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

  if (error || !application) {
    return (
      <AdminLayout userRole="hq_admin" userName={userName}>
        <div className="text-center py-20">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">
            {error || 'Application not found'}
          </h2>
          <Link href="/admin/licensee-applications">
            <Button variant="outline-neon" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Applications
            </Button>
          </Link>
        </div>
      </AdminLayout>
    )
  }

  // Use application.status for display since we update it optimistically
  const statusConfig = STATUS_CONFIG[application.status] || STATUS_CONFIG.submitted
  const StatusIcon = statusConfig.icon
  const fullName = `${application.first_name} ${application.last_name}`
  const location = [application.city, application.state].filter(Boolean).join(', ')

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <PageHeader
          title={fullName}
          description="Licensee Application"
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Licensee Applications', href: '/admin/licensee-applications' },
            { label: fullName },
          ]}
        />
        <Link href="/admin/licensee-applications">
          <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <ContentCard>
            <h3 className="text-sm font-bold uppercase tracking-wider text-neon mb-4">
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-white/40 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider">Email</p>
                  <a
                    href={`mailto:${application.email}`}
                    className="text-white hover:text-neon transition-colors"
                  >
                    {application.email}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-white/40 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider">Phone</p>
                  <p className="text-white">
                    {application.phone || <span className="text-white/40">Not provided</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-white/40 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider">Location</p>
                  <p className="text-white">
                    {location || <span className="text-white/40">Not provided</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-white/40 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider">Company</p>
                  <p className="text-white">
                    {application.company_name || <span className="text-white/40">Not provided</span>}
                  </p>
                </div>
              </div>
              {application.website && (
                <div className="flex items-start gap-3 md:col-span-2">
                  <Globe className="h-5 w-5 text-white/40 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Website</p>
                    <a
                      href={application.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neon hover:text-neon/80 transition-colors"
                    >
                      {application.website}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </ContentCard>

          {/* Territory Interest */}
          <ContentCard>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-neon" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-neon">
                Territory Interest
              </h3>
            </div>
            <p className="text-white/80 leading-relaxed">
              {application.territory_interest || <span className="text-white/40">Not provided</span>}
            </p>
          </ContentCard>

          {/* Background */}
          <ContentCard>
            <h3 className="text-sm font-bold uppercase tracking-wider text-neon mb-4">
              Background
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="h-4 w-4 text-white/40" />
                  <p className="text-xs text-white/40 uppercase tracking-wider">
                    Business Experience
                  </p>
                </div>
                <p className="text-white/80 leading-relaxed">
                  {application.business_experience || <span className="text-white/40">Not provided</span>}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-4 w-4 text-white/40" />
                  <p className="text-xs text-white/40 uppercase tracking-wider">
                    Sports Background
                  </p>
                </div>
                <p className="text-white/80 leading-relaxed">
                  {application.sports_background || <span className="text-white/40">Not provided</span>}
                </p>
              </div>
            </div>
          </ContentCard>

          {/* Why Interested */}
          <ContentCard>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-neon" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-neon">
                Why They're Interested
              </h3>
            </div>
            <p className="text-white/80 leading-relaxed">
              {application.why_interested || <span className="text-white/40">Not provided</span>}
            </p>
          </ContentCard>

          {/* Additional Info */}
          {(application.investment_capacity || application.how_heard) && (
            <ContentCard>
              <h3 className="text-sm font-bold uppercase tracking-wider text-neon mb-4">
                Additional Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {application.investment_capacity && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-white/40 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider">
                        Investment Capacity
                      </p>
                      <p className="text-white">{application.investment_capacity}</p>
                    </div>
                  </div>
                )}
                {application.how_heard && (
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-white/40 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider">
                        How They Heard About Us
                      </p>
                      <p className="text-white">{application.how_heard}</p>
                    </div>
                  </div>
                )}
              </div>
            </ContentCard>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <ContentCard>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-4">
              Application Status
            </h3>
            <div className="space-y-4">
              <div
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-2 text-sm font-bold uppercase tracking-wider border',
                  statusConfig.color
                )}
              >
                <StatusIcon className="h-4 w-4" />
                {statusConfig.label}
              </div>

              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Update Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full h-10 px-3 bg-dark-100 border border-white/20 text-white focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon transition-colors"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-dark-100">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </ContentCard>

          {/* Internal Notes */}
          <ContentCard>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-4">
              Internal Notes
            </h3>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Add notes about this application..."
              rows={5}
              className="w-full px-3 py-2 bg-dark-100 border border-white/20 text-white placeholder:text-white/40 focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon transition-colors resize-none text-sm"
            />
          </ContentCard>

          {/* Save Button */}
          <Button
            variant="neon"
            className="w-full"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>

          {/* Timestamps */}
          <ContentCard>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-4">
              Timeline
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-white/40 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider">Submitted</p>
                  <p className="text-sm text-white">{formatDate(application.created_at)}</p>
                </div>
              </div>
              {application.reviewed_at && (
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 text-white/40 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Last Reviewed</p>
                    <p className="text-sm text-white">{formatDate(application.reviewed_at)}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-white/40 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider">Last Updated</p>
                  <p className="text-sm text-white">{formatDate(application.updated_at)}</p>
                </div>
              </div>
            </div>
          </ContentCard>

          {/* Quick Actions */}
          <ContentCard>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <a
                href={`mailto:${application.email}?subject=Your Empowered Athletes Licensee Application`}
                className="block"
              >
                <Button variant="outline-white" size="sm" className="w-full justify-start">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
              </a>
              {application.phone && (
                <a href={`tel:${application.phone}`} className="block">
                  <Button variant="outline-white" size="sm" className="w-full justify-start">
                    <Phone className="h-4 w-4 mr-2" />
                    Call Applicant
                  </Button>
                </a>
              )}
            </div>
          </ContentCard>
        </div>
      </div>
    </AdminLayout>
  )
}
