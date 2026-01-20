'use client'

/**
 * Licensee Job Application Detail Page
 *
 * View and manage an individual job application for the licensee's territory.
 */

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  AlertCircle,
  Briefcase,
  Link2,
  User,
  Send,
  Trash2,
  ExternalLink,
  UserCheck,
} from 'lucide-react'

interface StatusChange {
  id: string
  from_status: string
  to_status: string
  changed_by_name: string
  reason: string | null
  created_at: string
}

interface InternalNote {
  id: string
  author_name: string
  content: string
  created_at: string
}

interface Attachment {
  id: string
  file_name: string
  file_type: string
  file_size: number
  s3_key: string
  uploaded_at: string
}

interface JobApplication {
  id: string
  tenant_id: string | null
  job_id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  city: string | null
  state: string | null
  age: number | null
  resume_url: string | null
  cover_letter: string | null
  linkedin_url: string | null
  how_heard: string | null
  availability_json: Record<string, unknown> | null
  certifications_json: Record<string, unknown> | null
  applicant_notes: string | null
  background_check_acknowledged: boolean
  status: string
  reviewed_by_user_id: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  job?: {
    id: string
    title: string
    slug: string
    location_label: string
    employment_type: string
  }
  status_changes: StatusChange[]
  internal_notes: InternalNote[]
  attachments: Attachment[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  submitted: { label: 'Submitted', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30', icon: FileText },
  under_review: { label: 'Under Review', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', icon: Clock },
  phone_screen: { label: 'Phone Screen', color: 'text-purple bg-purple/10 border-purple/30', icon: Phone },
  interview_scheduled: { label: 'Interview Scheduled', color: 'text-purple bg-purple/10 border-purple/30', icon: Calendar },
  interview_completed: { label: 'Interview Done', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30', icon: CheckCircle },
  offer_extended: { label: 'Offer Extended', color: 'text-neon bg-neon/10 border-neon/30', icon: UserCheck },
  hired: { label: 'Hired', color: 'text-neon bg-neon/10 border-neon/30', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-400 bg-red-400/10 border-red-400/30', icon: XCircle },
  withdrawn: { label: 'Withdrawn', color: 'text-white/40 bg-white/5 border-white/10', icon: XCircle },
}

const STATUS_OPTIONS = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'phone_screen', label: 'Phone Screen' },
  { value: 'interview_scheduled', label: 'Interview Scheduled' },
  { value: 'interview_completed', label: 'Interview Completed' },
  { value: 'offer_extended', label: 'Offer Extended' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
]

export default function LicenseeJobApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [application, setApplication] = useState<JobApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [statusReason, setStatusReason] = useState('')
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    loadApplication()
  }, [id])

  const loadApplication = async () => {
    setLoading(true)

    try {
      const res = await fetch(`/api/licensee/job-applications/${id}`)
      const { data, error } = await res.json()

      if (error) {
        console.error('Error loading application:', error)
        setLoading(false)
        return
      }

      if (data) {
        setApplication(data)
        setNewStatus(data.status)
      }
    } catch (err) {
      console.error('Error loading application:', err)
    }

    setLoading(false)
  }

  const handleStatusChange = async () => {
    if (!application || newStatus === application.status) return

    const previousStatus = application.status
    setSaving(true)
    setSuccessMessage('')
    setErrorMessage('')

    // Optimistically update the UI
    setApplication(prev => prev ? { ...prev, status: newStatus } : null)
    setStatusReason('')

    try {
      const res = await fetch(`/api/licensee/job-applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          reason: statusReason || undefined,
        }),
      })

      if (res.ok) {
        setSuccessMessage('Status updated successfully')
        // Reload to get updated timeline
        loadApplication()
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        // Revert on error
        setApplication(prev => prev ? { ...prev, status: previousStatus } : null)
        setNewStatus(previousStatus)
        const { error } = await res.json()
        setErrorMessage(error || 'Failed to update status')
      }
    } catch (err) {
      // Revert on error
      setApplication(prev => prev ? { ...prev, status: previousStatus } : null)
      setNewStatus(previousStatus)
      console.error('Error updating status:', err)
      setErrorMessage('Failed to update status')
    }

    setSaving(false)
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return

    setAddingNote(true)
    setSuccessMessage('')
    setErrorMessage('')

    try {
      const res = await fetch(`/api/licensee/job-applications/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote }),
      })

      if (res.ok) {
        setNewNote('')
        setSuccessMessage('Note added successfully')
        loadApplication()
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        const { error } = await res.json()
        setErrorMessage(error || 'Failed to add note')
      }
    } catch (err) {
      console.error('Error adding note:', err)
      setErrorMessage('Failed to add note')
    }

    setAddingNote(false)
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      const res = await fetch(`/api/licensee/job-applications/${id}/notes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId }),
      })

      if (res.ok) {
        setSuccessMessage('Note deleted')
        loadApplication()
        setTimeout(() => setSuccessMessage(''), 3000)
      }
    } catch (err) {
      console.error('Error deleting note:', err)
    }
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <LmsGate featureName="job submissions">
        <div className="min-h-screen bg-black flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-magenta" />
        </div>
      </LmsGate>
    )
  }

  if (!application) {
    return (
      <LmsGate featureName="job submissions">
        <div className="min-h-screen bg-black">
          <div className="text-center py-24">
            <AlertCircle className="h-12 w-12 text-white/20 mx-auto mb-3" />
            <p className="text-lg font-bold text-white/60">Application Not Found</p>
            <Link href="/licensee/job-submissions" className="text-magenta hover:underline mt-4 inline-block">
              Back to Job Submissions
            </Link>
          </div>
        </div>
      </LmsGate>
    )
  }

  // Use application.status for display since we update it optimistically
  const statusConfig = STATUS_CONFIG[application.status] || STATUS_CONFIG.submitted
  const StatusIcon = statusConfig.icon
  const fullName = `${application.first_name} ${application.last_name}`
  const location = [application.city, application.state].filter(Boolean).join(', ')

  return (
    <LmsGate featureName="job submissions">
      <div className="min-h-screen bg-black">
        <PortalPageHeader
          title={fullName}
          description={application.job?.title || 'Job Application'}
        />

        <div className="px-6 pb-12">
          {/* Back Button */}
          <div className="mb-6">
            <Link href="/licensee/job-submissions">
              <Button variant="ghost">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to List
              </Button>
            </Link>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-6 bg-neon/10 border border-neon/30 p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-neon" />
              <span className="text-neon font-medium">{successMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className="mb-6 bg-red-400/10 border border-red-400/30 p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <span className="text-red-400 font-medium">{errorMessage}</span>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content - Left Side */}
            <div className="lg:col-span-2 space-y-6">
              {/* Application Details */}
              <PortalCard title="Application Details">
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
                      {application.age && (
                        <div className="flex items-center gap-3">
                          <User className="h-4 w-4 text-white/40" />
                          <span className="text-sm text-white/70">{application.age} years old</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Position Info */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">Position</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Briefcase className="h-4 w-4 text-white/40" />
                        <span className="text-sm text-white/70">{application.job?.title || '—'}</span>
                      </div>
                      {application.job?.location_label && (
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-white/40" />
                          <span className="text-sm text-white/70">{application.job.location_label}</span>
                        </div>
                      )}
                      {application.job?.employment_type && (
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-white/40" />
                          <span className="text-sm text-white/70 capitalize">
                            {application.job.employment_type.replace('_', ' ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Links */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">Links</h4>
                    <div className="space-y-3">
                      {application.linkedin_url && (
                        <div className="flex items-center gap-3">
                          <Link2 className="h-4 w-4 text-white/40" />
                          <a
                            href={application.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-magenta hover:underline flex items-center gap-1"
                          >
                            LinkedIn Profile
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                      {application.resume_url && (
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-white/40" />
                          <a
                            href={application.resume_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-magenta hover:underline flex items-center gap-1"
                          >
                            View Resume
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">Additional</h4>
                    <div className="space-y-3">
                      {application.how_heard && (
                        <div>
                          <p className="text-xs text-white/40">How they heard about us</p>
                          <p className="text-sm text-white/70">{application.how_heard}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        {application.background_check_acknowledged ? (
                          <CheckCircle className="h-4 w-4 text-neon" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                        <span className="text-sm text-white/70">
                          Background check {application.background_check_acknowledged ? 'acknowledged' : 'not acknowledged'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cover Letter */}
                {application.cover_letter && (
                  <div className="mt-8 pt-6 border-t border-white/10">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">Cover Letter</h4>
                    <p className="text-sm text-white/70 whitespace-pre-wrap">{application.cover_letter}</p>
                  </div>
                )}

                {/* Applicant Notes */}
                {application.applicant_notes && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">Applicant Notes</h4>
                    <p className="text-sm text-white/70 whitespace-pre-wrap">{application.applicant_notes}</p>
                  </div>
                )}
              </PortalCard>

              {/* Timeline */}
              <PortalCard title="Status History">
                {application.status_changes && application.status_changes.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-white/10" />
                    <div className="space-y-6">
                      {application.status_changes.map((change) => {
                        const toConfig = STATUS_CONFIG[change.to_status] || STATUS_CONFIG.submitted
                        const ToIcon = toConfig.icon
                        return (
                          <div key={change.id} className="relative flex gap-4 pl-10">
                            <div className="absolute left-0 w-8 h-8 bg-dark-100 border border-white/20 flex items-center justify-center">
                              <ToIcon className="h-4 w-4 text-white/60" />
                            </div>
                            <div className="flex-1 pt-1">
                              <p className="text-sm text-white">
                                Changed from <span className="font-medium">{STATUS_CONFIG[change.from_status]?.label || change.from_status}</span>
                                {' → '}
                                <span className="font-medium">{toConfig.label}</span>
                              </p>
                              {change.reason && (
                                <p className="text-sm text-white/60 mt-1">{change.reason}</p>
                              )}
                              <p className="text-xs text-white/40 mt-1">
                                {formatDateTime(change.created_at)} • {change.changed_by_name}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-white/40">No status changes recorded yet.</p>
                )}
              </PortalCard>

              {/* Internal Notes */}
              <PortalCard title="Internal Notes">
                <div className="space-y-4">
                  {/* Add Note Form */}
                  <div className="flex gap-3">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={2}
                      placeholder="Add an internal note..."
                      className="flex-1 bg-black border border-white/20 text-white px-3 py-2 text-sm focus:border-magenta focus:outline-none resize-none"
                    />
                    <Button
                      variant="magenta"
                      onClick={handleAddNote}
                      disabled={addingNote || !newNote.trim()}
                      className="self-end"
                    >
                      {addingNote ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Notes List */}
                  {application.internal_notes && application.internal_notes.length > 0 ? (
                    <div className="space-y-3 pt-4 border-t border-white/10">
                      {application.internal_notes.map((note) => (
                        <div key={note.id} className="bg-dark-100/50 p-4 group">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <p className="text-sm text-white/80 whitespace-pre-wrap">{note.content}</p>
                              <p className="text-xs text-white/40 mt-2">
                                {note.author_name} • {formatDateTime(note.created_at)}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-white/40 pt-4 border-t border-white/10">No internal notes yet.</p>
                  )}
                </div>
              </PortalCard>
            </div>

            {/* Sidebar - Right Side */}
            <div className="space-y-6">
              {/* Status Card */}
              <PortalCard title="Status">
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
                          Reason (Optional)
                        </label>
                        <textarea
                          value={statusReason}
                          onChange={(e) => setStatusReason(e.target.value)}
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
              </PortalCard>

              {/* Quick Actions */}
              <PortalCard title="Quick Actions">
                <div className="space-y-3">
                  <a
                    href={`mailto:${application.email}`}
                    className="flex items-center gap-3 text-sm text-white/70 hover:text-white transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    Send Email
                  </a>
                  {application.phone && (
                    <a
                      href={`tel:${application.phone}`}
                      className="flex items-center gap-3 text-sm text-white/70 hover:text-white transition-colors"
                    >
                      <Phone className="h-4 w-4" />
                      Call Applicant
                    </a>
                  )}
                  {application.linkedin_url && (
                    <a
                      href={application.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-sm text-white/70 hover:text-white transition-colors"
                    >
                      <Link2 className="h-4 w-4" />
                      View LinkedIn
                    </a>
                  )}
                </div>
              </PortalCard>

              {/* Attachments */}
              {application.attachments && application.attachments.length > 0 && (
                <PortalCard title="Attachments">
                  <div className="space-y-3">
                    {application.attachments.map((att) => (
                      <div key={att.id} className="flex items-center gap-3 p-2 bg-dark-100/50">
                        <FileText className="h-4 w-4 text-white/40" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/80 truncate">{att.file_name}</p>
                          <p className="text-xs text-white/40">{formatFileSize(att.file_size)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </PortalCard>
              )}

              {/* Meta Info */}
              <PortalCard title="Meta">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/40">Applied</span>
                    <span className="text-white/70">{formatDate(application.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Last Updated</span>
                    <span className="text-white/70">{formatDate(application.updated_at)}</span>
                  </div>
                  {application.reviewed_at && (
                    <div className="flex justify-between">
                      <span className="text-white/40">Last Reviewed</span>
                      <span className="text-white/70">{formatDate(application.reviewed_at)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-white/40">ID</span>
                    <span className="text-white/40 text-xs font-mono">{application.id.slice(0, 8)}</span>
                  </div>
                </div>
              </PortalCard>
            </div>
          </div>
        </div>
      </div>
    </LmsGate>
  )
}
