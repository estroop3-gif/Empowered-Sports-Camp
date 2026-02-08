'use client'

/**
 * Admin Email Compose Page
 *
 * Allows HQ admins to compose and send ad-hoc emails.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  Send,
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export default function EmailComposePage() {
  const { user } = useAuth()
  const router = useRouter()
  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  const [recipients, setRecipients] = useState('')
  const [subject, setSubject] = useState('')
  const [htmlBody, setHtmlBody] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async () => {
    setError(null)
    setResult(null)

    const toEmails = recipients
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0)

    if (toEmails.length === 0) {
      setError('Please enter at least one recipient email')
      return
    }

    if (!subject.trim()) {
      setError('Subject is required')
      return
    }

    if (!htmlBody.trim()) {
      setError('Email body is required')
      return
    }

    setSending(true)

    try {
      const res = await fetch('/api/admin/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toEmails,
          subject: subject.trim(),
          html: htmlBody,
          emailType: 'broadcast',
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Failed to send')
        return
      }

      setResult(json.data)
    } catch (err) {
      setError('Failed to send emails')
    } finally {
      setSending(false)
    }
  }

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <PageHeader
        title="Compose Email"
        description="Send ad-hoc emails to one or more recipients"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Automated Email', href: '/admin/email' },
          { label: 'Compose' },
        ]}
      />

      <div className="mb-4">
        <Link
          href="/admin/email"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Email Logs
        </Link>
      </div>

      {result && (
        <div className="mb-6 p-4 bg-neon/10 border border-neon/30">
          <div className="flex items-center gap-2 text-neon font-bold mb-1">
            <CheckCircle className="h-5 w-5" />
            Emails Sent Successfully
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

      <ContentCard>
        <div className="space-y-6">
          {/* Recipients */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
              To (comma-separated emails)
            </label>
            <Input
              type="text"
              placeholder="parent@example.com, another@example.com"
              value={recipients}
              onChange={e => setRecipients(e.target.value)}
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
              Subject
            </label>
            <Input
              type="text"
              placeholder="Email subject..."
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-white/40">
                Body (HTML)
              </label>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1 text-xs text-purple hover:text-purple/80 transition-colors"
              >
                {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showPreview ? 'Edit' : 'Preview'}
              </button>
            </div>

            {showPreview ? (
              <div className="border border-white/10 bg-white min-h-[300px] p-4">
                <iframe
                  srcDoc={htmlBody}
                  className="w-full min-h-[280px] border-0"
                  sandbox="allow-same-origin"
                  title="Email Preview"
                />
              </div>
            ) : (
              <textarea
                value={htmlBody}
                onChange={e => setHtmlBody(e.target.value)}
                placeholder="<h1>Hello!</h1><p>Your email content here...</p>"
                className="w-full min-h-[300px] bg-dark-100 border border-white/10 text-white p-4 font-mono text-sm focus:outline-none focus:border-purple/50 resize-y"
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4 border-t border-white/10">
            <button
              onClick={handleSend}
              disabled={sending}
              className={cn(
                'flex items-center gap-2 px-6 py-3 font-bold uppercase tracking-wider text-sm transition-colors',
                sending
                  ? 'bg-purple/50 text-white/50 cursor-not-allowed'
                  : 'bg-purple hover:bg-purple/80 text-white'
              )}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {sending ? 'Sending...' : 'Send Email'}
            </button>
            <span className="text-xs text-white/30">
              {recipients.split(',').filter(e => e.trim()).length} recipient(s)
            </span>
          </div>
        </div>
      </ContentCard>
    </AdminLayout>
  )
}
