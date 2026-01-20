'use client'

/**
 * CIT Application Detail Page
 *
 * Admin view for managing an individual CIT application.
 * Includes timeline, status controls, notes, and camp assignment.
 */

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  MapPin,
  School,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  MessageSquare,
  Users,
  AlertCircle,
  GraduationCap,
  CalendarCheck,
  Save,
} from 'lucide-react'

interface CitProgressEvent {
  id: string
  event_type: string
  description: string
  performed_by: string | null
  created_at: string
  metadata: Record<string, unknown> | null
}

interface CitApplication {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  city: string | null
  state: string | null
  school_name: string | null
  grade_level: string | null
  graduation_year: string | null
  sports_played: string | null
  experience_summary: string | null
  why_cit: string | null
  leadership_experience: string | null
  availability_notes: string | null
  parent_name: string | null
  parent_email: string | null
  parent_phone: string | null
  status: string
  notes_internal: string | null
  how_heard: string | null
  created_at: string
  updated_at: string
  progress_events: CitProgressEvent[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  applied: { label: 'Applied', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30', icon: FileText },
  under_review: { label: 'Under Review', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', icon: Clock },
  interview_scheduled: { label: 'Interview Scheduled', color: 'text-purple bg-purple/10 border-purple/30', icon: CalendarCheck },
  interview_completed: { label: 'Interview Done', color: 'text-purple bg-purple/10 border-purple/30', icon: CheckCircle },
  training_pending: { label: 'Training Pending', color: 'text-orange-400 bg-orange-400/10 border-orange-400/30', icon: GraduationCap },
  training_complete: { label: 'Training Complete', color: 'text-neon bg-neon/10 border-neon/30', icon: CheckCircle },
  approved: { label: 'Approved', color: 'text-neon bg-neon/10 border-neon/30', icon: CheckCircle },
  assigned_first_camp: { label: 'Assigned', color: 'text-magenta bg-magenta/10 border-magenta/30', icon: Users },
  rejected: { label: 'Rejected', color: 'text-red-400 bg-red-400/10 border-red-400/30', icon: XCircle },
  on_hold: { label: 'On Hold', color: 'text-white/60 bg-white/5 border-white/20', icon: Clock },
  withdrawn: { label: 'Withdrawn', color: 'text-white/40 bg-white/5 border-white/10', icon: XCircle },
}

const EVENT_ICONS: Record<string, React.ElementType> = {
  status_change: Clock,
  note_added: MessageSquare,
  interview_scheduled: CalendarCheck,
  interview_completed: CheckCircle,
  training_started: GraduationCap,
  training_completed: CheckCircle,
  camp_assigned: Users,
  document_uploaded: FileText,
  application_submitted: FileText,
}

const STATUS_OPTIONS = [
  { value: 'applied', label: 'Applied' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'interview_scheduled', label: 'Interview Scheduled' },
  { value: 'interview_completed', label: 'Interview Completed' },
  { value: 'training_pending', label: 'Training Pending' },
  { value: 'training_complete', label: 'Training Complete' },
  { value: 'approved', label: 'Approved' },
  { value: 'assigned_first_camp', label: 'Assigned to Camp' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
]

export default function CitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const [application, setApplication] = useState<CitApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [notesChanged, setNotesChanged] = useState(false)

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  useEffect(() => {
    loadApplication()
  }, [id])

  const loadApplication = async () => {
    setLoading(true)

    try {
      const res = await fetch(`/api/admin/cit/${id}`)
      const { data, error } = await res.json()

      if (error) {
        console.error('Error loading application:', error)
        setLoading(false)
        return
      }

      if (data) {
        setApplication(data)
        setNewStatus(data.status)
        setInternalNotes(data.notes_internal || '')
      }
    } catch (err) {
      console.error('Error loading application:', err)
    }

    setLoading(false)
  }

  const handleStatusChange = async () => {
    if (!application) return

    const previousStatus = application.status
    setSaving(true)

    // Optimistically update the UI
    setApplication(prev => prev ? { ...prev, status: newStatus } : null)
    setStatusNote('')

    try {
      const res = await fetch(`/api/admin/cit/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          status: newStatus,
          changed_by: user?.id || null,
          note: statusNote || undefined,
        }),
      })

      if (res.ok) {
        // Reload to get updated timeline/events
        loadApplication()
      } else {
        // Revert on error
        setApplication(prev => prev ? { ...prev, status: previousStatus } : null)
        setNewStatus(previousStatus)
        const errorData = await res.json()
        alert('Failed to update status: ' + (errorData.error || 'Unknown error'))
      }
    } catch (err) {
      // Revert on error
      setApplication(prev => prev ? { ...prev, status: previousStatus } : null)
      setNewStatus(previousStatus)
      alert('Failed to update status: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }

    setSaving(false)
  }

  const handleSaveNotes = async () => {
    if (!application) return

    setSaving(true)

    try {
      const res = await fetch(`/api/admin/cit/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_notes',
          notes: internalNotes,
        }),
      })

      if (res.ok) {
        setNotesChanged(false)
        loadApplication()
      }
    } catch (err) {
      console.error('Error saving notes:', err)
    }

    setSaving(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <AdminLayout userRole="hq_admin" userName={userName}>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-magenta" />
        </div>
      </AdminLayout>
    )
  }

  if (!application) {
    return (
      <AdminLayout userRole="hq_admin" userName={userName}>
        <div className="text-center py-24">
          <AlertCircle className="h-12 w-12 text-white/20 mx-auto mb-3" />
          <p className="text-lg font-bold text-white/60">Application Not Found</p>
          <Link href="/admin/cit" className="text-magenta hover:underline mt-4 inline-block">
            Back to CIT Pipeline
          </Link>
        </div>
      </AdminLayout>
    )
  }

  // Use application.status for display since we update it optimistically
  const statusConfig = STATUS_CONFIG[application.status] || STATUS_CONFIG.applied
  const StatusIcon = statusConfig.icon
  const fullName = `${application.first_name} ${application.last_name}`
  const location = [application.city, application.state].filter(Boolean).join(', ')

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <PageHeader
        title={fullName}
        description="CIT Application"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'CIT Pipeline', href: '/admin/cit' },
          { label: fullName },
        ]}
      >
        <Link href="/admin/cit">
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Pipeline
          </Button>
        </Link>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Application Details */}
          <ContentCard title="Application Details">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Contact Info */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">Contact</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-white/40" />
                    <a href={`mailto:${application.email}`} className="text-sm text-magenta hover:underline">
                      {application.email}
                    </a>
                  </div>
                  {application.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-white/40" />
                      <span className="text-sm text-white/70">{application.phone}</span>
                    </div>
                  )}
                  {location && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-white/40" />
                      <span className="text-sm text-white/70">{location}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* School Info */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">School</h4>
                <div className="space-y-3">
                  {application.school_name && (
                    <div className="flex items-center gap-3">
                      <School className="h-4 w-4 text-white/40" />
                      <span className="text-sm text-white/70">{application.school_name}</span>
                    </div>
                  )}
                  {application.grade_level && (
                    <div className="flex items-center gap-3">
                      <GraduationCap className="h-4 w-4 text-white/40" />
                      <span className="text-sm text-white/70">Grade {application.grade_level}</span>
                    </div>
                  )}
                  {application.graduation_year && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-white/40" />
                      <span className="text-sm text-white/70">Class of {application.graduation_year}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Parent Info */}
              {application.parent_name && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">Parent/Guardian</h4>
                  <div className="space-y-3">
                    <p className="text-sm text-white/70">{application.parent_name}</p>
                    {application.parent_email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-white/40" />
                        <a href={`mailto:${application.parent_email}`} className="text-sm text-magenta hover:underline">
                          {application.parent_email}
                        </a>
                      </div>
                    )}
                    {application.parent_phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-white/40" />
                        <span className="text-sm text-white/70">{application.parent_phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sports */}
              {application.sports_played && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">Sports</h4>
                  <p className="text-sm text-white/70">{application.sports_played}</p>
                </div>
              )}
            </div>

            {/* Essays */}
            <div className="mt-8 space-y-6 pt-6 border-t border-white/10">
              {application.why_cit && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">Why CIT?</h4>
                  <p className="text-sm text-white/70 whitespace-pre-wrap">{application.why_cit}</p>
                </div>
              )}

              {application.leadership_experience && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">Leadership Experience</h4>
                  <p className="text-sm text-white/70 whitespace-pre-wrap">{application.leadership_experience}</p>
                </div>
              )}

              {application.experience_summary && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">Sports Experience</h4>
                  <p className="text-sm text-white/70 whitespace-pre-wrap">{application.experience_summary}</p>
                </div>
              )}

              {application.availability_notes && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">Availability</h4>
                  <p className="text-sm text-white/70 whitespace-pre-wrap">{application.availability_notes}</p>
                </div>
              )}
            </div>
          </ContentCard>

          {/* Timeline */}
          <ContentCard title="Timeline">
            {application.progress_events && application.progress_events.length > 0 ? (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-white/10" />
                <div className="space-y-6">
                  {application.progress_events.map((event, index) => {
                    const EventIcon = EVENT_ICONS[event.event_type] || Clock
                    return (
                      <div key={event.id} className="relative flex gap-4 pl-10">
                        <div className="absolute left-0 w-8 h-8 bg-dark-100 border border-white/20 flex items-center justify-center">
                          <EventIcon className="h-4 w-4 text-white/60" />
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-sm text-white">{event.description}</p>
                          <p className="text-xs text-white/40 mt-1">
                            {formatDateTime(event.created_at)}
                            {event.performed_by && ` • ${event.performed_by}`}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/40">No events recorded yet.</p>
            )}
          </ContentCard>
        </div>

        {/* Sidebar - Right Side */}
        <div className="space-y-6">
          {/* Status Card */}
          <ContentCard title="Status">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-bold uppercase tracking-wider border',
                  statusConfig.color
                )}>
                  <StatusIcon className="h-4 w-4" />
                  {statusConfig.label}
                </span>
              </div>

              <div className="pt-4 border-t border-white/10">
                <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                  Change Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-black border border-white/20 text-white px-3 py-2 text-sm focus:border-magenta focus:outline-none mb-3"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                {newStatus !== application.status && (
                  <>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                      Add Note (Optional)
                    </label>
                    <textarea
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      rows={2}
                      placeholder="Reason for status change..."
                      className="w-full bg-black border border-white/20 text-white px-3 py-2 text-sm focus:border-magenta focus:outline-none resize-none mb-3"
                    />
                    <Button
                      variant="magenta"
                      className="w-full"
                      onClick={handleStatusChange}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Update Status
                    </Button>
                  </>
                )}
              </div>
            </div>
          </ContentCard>

          {/* Internal Notes */}
          <ContentCard title="Internal Notes">
            <textarea
              value={internalNotes}
              onChange={(e) => {
                setInternalNotes(e.target.value)
                setNotesChanged(true)
              }}
              rows={5}
              placeholder="Add notes for internal use..."
              className="w-full bg-black border border-white/20 text-white px-3 py-2 text-sm focus:border-magenta focus:outline-none resize-none"
            />
            {notesChanged && (
              <Button
                variant="outline-neon"
                className="w-full mt-3"
                onClick={handleSaveNotes}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Notes
              </Button>
            )}
          </ContentCard>

          {/* Meta Info */}
          <ContentCard title="Meta">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-white/40">Applied</span>
                <span className="text-white/70">{formatDate(application.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Last Updated</span>
                <span className="text-white/70">{formatDate(application.updated_at)}</span>
              </div>
              {application.how_heard && (
                <div className="flex justify-between">
                  <span className="text-white/40">How Heard</span>
                  <span className="text-white/70">{application.how_heard}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-white/40">ID</span>
                <span className="text-white/40 text-xs font-mono">{application.id.slice(0, 8)}</span>
              </div>
            </div>
          </ContentCard>
        </div>
      </div>
    </AdminLayout>
  )
}
