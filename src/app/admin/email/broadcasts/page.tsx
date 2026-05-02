'use client'

/**
 * Camp Broadcasts Page
 *
 * Select a camp, compose a branded email, preview it, and send to all parents.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  Radio,
  History,
  FileText,
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  AlertTriangle,
  Mail,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const SECTION_TABS = [
  { value: 'logs', label: 'Email Logs', href: '/admin/email', icon: History },
  { value: 'templates', label: 'Templates', href: '/admin/email/templates', icon: FileText },
  { value: 'broadcasts', label: 'Camp Broadcasts', href: '/admin/email/broadcasts', icon: Radio },
  { value: 'tshirt-sizes', label: 'T-Shirt Sizes', href: '/admin/email/tshirt-sizes', icon: Mail },
]

interface CampOption {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
  recipientCount: number
}

const EMAIL_TYPES = [
  { value: 'notification', label: 'Notification', emailType: 'broadcast', color: 'bg-purple text-white border-purple/50', activeGlow: 'shadow-[0_0_12px_rgba(111,0,216,0.4)]' },
  { value: 'reminder', label: 'Reminder', emailType: 'camp_reminder', color: 'bg-magenta text-white border-magenta/50', activeGlow: 'shadow-[0_0_12px_rgba(255,45,206,0.4)]' },
  { value: 'update', label: 'Update', emailType: 'staff_message', color: 'bg-neon text-black border-neon/50', activeGlow: 'shadow-[0_0_12px_rgba(204,255,0,0.4)]' },
] as const

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-white/40 bg-white/5 border-white/10',
  published: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  registration_open: 'text-neon bg-neon/10 border-neon/30',
  registration_closed: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  in_progress: 'text-magenta bg-magenta/10 border-magenta/30',
  completed: 'text-purple bg-purple/10 border-purple/30',
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function CampBroadcastsPage() {
  const { user } = useAuth()
  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  // Camp selector state
  const [camps, setCamps] = useState<CampOption[]>([])
  const [loadingCamps, setLoadingCamps] = useState(true)
  const [selectedCamp, setSelectedCamp] = useState<CampOption | null>(null)

  // Compose state
  const [emailType, setEmailType] = useState<typeof EMAIL_TYPES[number]>(EMAIL_TYPES[0])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [previewHtml, setPreviewHtml] = useState('')
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [sending, setSending] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load camps
  useEffect(() => {
    const loadCamps = async () => {
      try {
        const res = await fetch('/api/admin/email/camps')
        const json = await res.json()
        if (json.data) setCamps(json.data)
      } catch {
        console.error('Failed to load camps')
      }
      setLoadingCamps(false)
    }
    loadCamps()
  }, [])

  // Set default subject when camp or type changes
  useEffect(() => {
    if (selectedCamp) {
      const prefixes: Record<string, string> = {
        notification: 'Important Update',
        reminder: 'Reminder',
        update: 'Update',
      }
      setSubject(`${prefixes[emailType.value] || 'Update'}: ${selectedCamp.name}`)
    }
  }, [selectedCamp, emailType])

  // Debounced preview
  const fetchPreview = useCallback(async (bodyText: string, subjectText: string, type: string, campName: string) => {
    if (!bodyText.trim() || !subjectText.trim()) {
      setPreviewHtml('')
      return
    }
    setLoadingPreview(true)
    try {
      const res = await fetch('/api/admin/email/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: bodyText,
          emailType: type,
          subject: subjectText,
          campName,
        }),
      })
      const json = await res.json()
      if (json.data?.html) setPreviewHtml(json.data.html)
    } catch {
      // Preview failed silently
    }
    setLoadingPreview(false)
  }, [])

  useEffect(() => {
    if (!selectedCamp) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchPreview(body, subject, emailType.value, selectedCamp.name)
    }, 600)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [body, subject, emailType, selectedCamp, fetchPreview])

  const handleSend = async () => {
    if (!selectedCamp) return
    setShowConfirm(false)
    setSending(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(`/api/camps/${selectedCamp.id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'blast',
          subject,
          html: body,
          emailType: emailType.emailType,
          wrapInBrand: true,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Failed to send')
      } else {
        setResult(json.data)
      }
    } catch {
      setError('Failed to send broadcast')
    } finally {
      setSending(false)
    }
  }

  const handleBack = () => {
    setSelectedCamp(null)
    setBody('')
    setSubject('')
    setPreviewHtml('')
    setResult(null)
    setError(null)
  }

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <PageHeader
        title="Automated Email"
        description="Send branded broadcast emails to camp parents"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Automated Email', href: '/admin/email' },
          { label: 'Camp Broadcasts' },
        ]}
      />

      {/* Section Tabs */}
      <div className="flex gap-1 mb-6 bg-dark-100 border border-white/10 p-1 w-fit">
        {SECTION_TABS.map(tab => {
          const Icon = tab.icon
          const isActive = tab.value === 'broadcasts'
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

      {/* Main Content */}
      {!selectedCamp ? (
        /* ── Camp Selector ── */
        <>
          {loadingCamps ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-purple" />
            </div>
          ) : camps.length === 0 ? (
            <ContentCard>
              <div className="text-center py-12">
                <Radio className="h-12 w-12 text-white/20 mx-auto mb-3" />
                <p className="text-lg font-bold text-white/60">No Camps Found</p>
                <p className="text-sm text-white/40 mt-1">
                  Create a camp first to send broadcast emails
                </p>
              </div>
            </ContentCard>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {camps.map(camp => (
                <div
                  key={camp.id}
                  className="bg-dark-100 border border-white/10 p-6 hover:border-purple/40 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-bold text-white group-hover:text-purple transition-colors">
                      {camp.name}
                    </h3>
                    <span className={cn(
                      'px-2 py-0.5 text-xs font-bold uppercase tracking-wider border',
                      STATUS_COLORS[camp.status] || STATUS_COLORS.draft
                    )}>
                      {formatStatus(camp.status)}
                    </span>
                  </div>

                  <div className="space-y-2 mb-5">
                    <div className="flex items-center gap-2 text-sm text-white/50">
                      <Calendar className="h-4 w-4" />
                      {formatDate(camp.startDate)} — {formatDate(camp.endDate)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/50">
                      <Users className="h-4 w-4" />
                      {camp.recipientCount} parent{camp.recipientCount !== 1 ? 's' : ''} registered
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedCamp(camp)}
                    disabled={camp.recipientCount === 0}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 px-4 py-2.5 font-bold uppercase tracking-wider text-sm transition-colors',
                      camp.recipientCount > 0
                        ? 'bg-purple hover:bg-purple/80 text-white'
                        : 'bg-white/5 text-white/30 cursor-not-allowed'
                    )}
                  >
                    <Send className="h-4 w-4" />
                    {camp.recipientCount > 0 ? 'Compose Broadcast' : 'No Recipients'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* ── Compose & Send ── */
        <>
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Camp List
          </button>

          {/* Success/Error Banners */}
          {result && (
            <div className="mb-6 p-4 bg-neon/10 border border-neon/30">
              <div className="flex items-center gap-2 text-neon font-bold mb-1">
                <CheckCircle className="h-5 w-5" />
                Broadcast Sent Successfully
              </div>
              <p className="text-sm text-white/60">
                {result.sent} sent, {result.failed} failed out of {result.sent + result.failed} total
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-400/10 border border-red-400/30">
              <div className="flex items-center gap-2 text-red-400 font-bold">
                <XCircle className="h-5 w-5" />
                {error}
              </div>
            </div>
          )}

          {/* Camp Info Header */}
          <ContentCard className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black uppercase tracking-wider text-white">
                  {selectedCamp.name}
                </h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-white/50">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {formatDate(selectedCamp.startDate)} — {formatDate(selectedCamp.endDate)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {selectedCamp.recipientCount} parent{selectedCamp.recipientCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <span className={cn(
                'px-3 py-1 text-xs font-bold uppercase tracking-wider border',
                STATUS_COLORS[selectedCamp.status] || STATUS_COLORS.draft
              )}>
                {formatStatus(selectedCamp.status)}
              </span>
            </div>
          </ContentCard>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column — Compose */}
            <div className="space-y-6">
              {/* Email Type Pills */}
              <ContentCard title="Email Type">
                <div className="flex gap-2">
                  {EMAIL_TYPES.map(type => {
                    const isActive = emailType.value === type.value
                    return (
                      <button
                        key={type.value}
                        onClick={() => setEmailType(type)}
                        className={cn(
                          'px-5 py-2.5 text-sm font-bold uppercase tracking-wider border transition-all',
                          isActive
                            ? cn(type.color, type.activeGlow)
                            : 'bg-dark-100 text-white/40 border-white/10 hover:text-white hover:border-white/20'
                        )}
                      >
                        {type.label}
                      </button>
                    )
                  })}
                </div>
              </ContentCard>

              {/* Subject */}
              <ContentCard title="Subject">
                <Input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Email subject..."
                  className="font-medium"
                />
              </ContentCard>

              {/* Body */}
              <ContentCard title="Message Body">
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Type your message here...&#10;&#10;Use {{parentFirstName}}, {{camperFirstName}}, or {{campName}} for personalization."
                  rows={10}
                  className="w-full bg-black/40 border border-white/10 text-white p-4 text-sm focus:outline-none focus:border-purple/50 resize-y"
                />
                <div className="mt-3 p-3 bg-purple/5 border border-purple/20">
                  <p className="text-xs font-bold uppercase tracking-wider text-purple mb-1.5">
                    Available Variables
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['{{parentFirstName}}', '{{camperFirstName}}', '{{campName}}'].map(v => (
                      <code key={v} className="px-2 py-0.5 text-xs bg-purple/10 text-purple border border-purple/30">
                        {v}
                      </code>
                    ))}
                  </div>
                </div>
              </ContentCard>

              {/* Send */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={sending || !subject.trim() || !body.trim()}
                  className={cn(
                    'flex items-center gap-2 px-8 py-3 font-bold uppercase tracking-wider text-sm transition-colors',
                    sending || !subject.trim() || !body.trim()
                      ? 'bg-purple/30 text-white/30 cursor-not-allowed'
                      : 'bg-purple hover:bg-purple/80 text-white'
                  )}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {sending ? 'Sending...' : 'Send Broadcast'}
                </button>
                <span className="text-xs text-white/30">
                  To {selectedCamp.recipientCount} parent{selectedCamp.recipientCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Right Column — Preview */}
            <div>
              <ContentCard title="Live Preview">
                {loadingPreview ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-purple" />
                  </div>
                ) : previewHtml ? (
                  <div className="bg-white overflow-hidden">
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full min-h-[600px] border-0"
                      sandbox="allow-same-origin"
                      title="Email Preview"
                    />
                  </div>
                ) : (
                  <div className="text-center py-16 text-white/30">
                    <Radio className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Start typing to see a live preview</p>
                  </div>
                )}
              </ContentCard>
            </div>
          </div>

          {/* Confirmation Dialog */}
          {showConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/70" onClick={() => setShowConfirm(false)} />
              <div className="relative bg-dark-100 border border-white/10 p-8 max-w-md w-full mx-4">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="h-6 w-6 text-magenta" />
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                    Confirm Broadcast
                  </h3>
                </div>
                <p className="text-sm text-white/60 mb-2">
                  You are about to send a <strong className="text-white">{emailType.label.toLowerCase()}</strong> email to{' '}
                  <strong className="text-white">{selectedCamp.recipientCount} parent{selectedCamp.recipientCount !== 1 ? 's' : ''}</strong>{' '}
                  registered for <strong className="text-white">{selectedCamp.name}</strong>.
                </p>
                <p className="text-sm text-white/40 mb-6">
                  This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleSend}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-magenta hover:bg-magenta/80 text-white font-bold uppercase tracking-wider text-sm transition-colors"
                  >
                    <Send className="h-4 w-4" />
                    Send Now
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-bold uppercase tracking-wider text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  )
}
