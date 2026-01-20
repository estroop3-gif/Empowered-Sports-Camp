'use client'

/**
 * Contact Message Detail Page
 *
 * Admin view for managing an individual contact submission.
 * Includes status controls, internal notes, and quick actions.
 */

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  Calendar,
  Clock,
  CheckCircle,
  Archive,
  Eye,
  MessageSquare,
  AlertCircle,
  Save,
  Send,
} from 'lucide-react'

interface ContactSubmission {
  id: string
  name: string
  email: string
  phone: string | null
  inquiry_type: string
  message: string
  status: string
  internal_notes: string | null
  responded_by: string | null
  responded_at: string | null
  created_at: string
  updated_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  new: { label: 'New', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30', icon: Mail },
  read: { label: 'Read', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', icon: Eye },
  replied: { label: 'Replied', color: 'text-neon bg-neon/10 border-neon/30', icon: CheckCircle },
  archived: { label: 'Archived', color: 'text-white/40 bg-white/5 border-white/10', icon: Archive },
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'replied', label: 'Replied' },
  { value: 'archived', label: 'Archived' },
]

const INQUIRY_LABELS: Record<string, string> = {
  parent: 'Parent Inquiry',
  athlete: 'Athlete Inquiry',
  coach: 'Coaching Opportunity',
  partnership: 'Partnership',
  franchise: 'Franchise Inquiry',
  volunteer: 'Volunteer Interest',
  other: 'General Inquiry',
}

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const [submission, setSubmission] = useState<ContactSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [internalNotes, setInternalNotes] = useState<string>('')
  const [notesChanged, setNotesChanged] = useState(false)

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  useEffect(() => {
    loadSubmission()
  }, [id])

  const loadSubmission = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/contact/${id}`)
      const { data, error: apiError } = await res.json()

      if (apiError || !data) {
        setError(apiError || 'Message not found')
        setLoading(false)
        return
      }

      setSubmission(data)
      setSelectedStatus(data.status)
      setInternalNotes(data.internal_notes || '')

      // Auto-mark as read if new
      if (data.status === 'new') {
        updateStatus('read')
      }
    } catch (err) {
      console.error('Error loading submission:', err)
      setError('Failed to load message')
    }

    setLoading(false)
  }

  const updateStatus = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/contact/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const { data } = await res.json()
      if (data) {
        setSubmission(data)
        setSelectedStatus(data.status)
      }
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  const handleSave = async () => {
    if (!submission) return

    const previousStatus = submission.status
    const previousNotes = submission.internal_notes
    setSaving(true)
    setError(null)

    // Optimistically update the UI
    setSubmission(prev => prev ? {
      ...prev,
      status: selectedStatus,
      internal_notes: internalNotes
    } : null)
    setNotesChanged(false)

    try {
      const res = await fetch(`/api/admin/contact/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: selectedStatus,
          internal_notes: internalNotes,
        }),
      })

      const { data, error: apiError } = await res.json()

      if (apiError) {
        // Revert on error
        setSubmission(prev => prev ? {
          ...prev,
          status: previousStatus,
          internal_notes: previousNotes
        } : null)
        setSelectedStatus(previousStatus)
        setError(apiError)
        setSaving(false)
        return
      }

      // Update with full data from server (includes timestamps)
      setSubmission(data)
    } catch (err) {
      // Revert on error
      setSubmission(prev => prev ? {
        ...prev,
        status: previousStatus,
        internal_notes: previousNotes
      } : null)
      setSelectedStatus(previousStatus)
      console.error('Error saving:', err)
      setError('Failed to save changes')
    }

    setSaving(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
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
          <Loader2 className="h-8 w-8 animate-spin text-purple" />
        </div>
      </AdminLayout>
    )
  }

  if (error || !submission) {
    return (
      <AdminLayout userRole="hq_admin" userName={userName}>
        <div className="text-center py-24">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">
            {error || 'Message not found'}
          </h2>
          <Link href="/admin/contact">
            <Button variant="purple" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Inbox
            </Button>
          </Link>
        </div>
      </AdminLayout>
    )
  }

  const statusConfig = STATUS_CONFIG[submission.status] || STATUS_CONFIG.new
  const StatusIcon = statusConfig.icon

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <PageHeader
          title={submission.name}
          description="Contact Message"
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Inbox', href: '/admin/contact' },
            { label: submission.name },
          ]}
        />
        <Link href="/admin/contact">
          <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inbox
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <ContentCard>
            <h3 className="text-sm font-bold uppercase tracking-wider text-purple mb-4">
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-white/40 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider">Email</p>
                  <a
                    href={`mailto:${submission.email}`}
                    className="text-white hover:text-purple transition-colors"
                  >
                    {submission.email}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-white/40 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider">Phone</p>
                  <p className="text-white">
                    {submission.phone || <span className="text-white/40">Not provided</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 md:col-span-2">
                <MessageSquare className="h-5 w-5 text-white/40 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider">Inquiry Type</p>
                  <p className="text-white">
                    {INQUIRY_LABELS[submission.inquiry_type] || submission.inquiry_type}
                  </p>
                </div>
              </div>
            </div>
          </ContentCard>

          {/* Message Content */}
          <ContentCard>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-purple" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-purple">
                Message
              </h3>
            </div>
            <div className="bg-black/30 border border-white/5 p-6">
              <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
                {submission.message}
              </p>
            </div>
          </ContentCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <ContentCard>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-4">
              Status
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
                  className="w-full h-10 px-3 bg-dark-100 border border-white/20 text-white focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple transition-colors"
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
              onChange={(e) => {
                setInternalNotes(e.target.value)
                setNotesChanged(true)
              }}
              placeholder="Add notes about this message..."
              rows={5}
              className="w-full px-3 py-2 bg-dark-100 border border-white/20 text-white placeholder:text-white/40 focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple transition-colors resize-none text-sm"
            />
          </ContentCard>

          {/* Save Button */}
          <Button
            variant="purple"
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

          {/* Timeline */}
          <ContentCard>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-4">
              Timeline
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-white/40 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider">Received</p>
                  <p className="text-sm text-white">{formatDateTime(submission.created_at)}</p>
                </div>
              </div>
              {submission.responded_at && (
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 text-white/40 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Responded</p>
                    <p className="text-sm text-white">{formatDateTime(submission.responded_at)}</p>
                    {submission.responded_by && (
                      <p className="text-xs text-white/40">{submission.responded_by}</p>
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-white/40 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider">Last Updated</p>
                  <p className="text-sm text-white">{formatDateTime(submission.updated_at)}</p>
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
                href={`mailto:${submission.email}?subject=Re: Your inquiry to Empowered Athletes`}
                className="block"
              >
                <Button variant="outline-white" size="sm" className="w-full justify-start">
                  <Send className="h-4 w-4 mr-2" />
                  Reply via Email
                </Button>
              </a>
              {submission.phone && (
                <a href={`tel:${submission.phone}`} className="block">
                  <Button variant="outline-white" size="sm" className="w-full justify-start">
                    <Phone className="h-4 w-4 mr-2" />
                    Call
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
