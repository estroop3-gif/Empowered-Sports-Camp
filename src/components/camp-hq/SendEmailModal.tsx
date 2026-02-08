'use client'

/**
 * Send Email Modal for Camp HQ
 *
 * Allows sending blast or individual emails to registered parents.
 */

import { useState, useEffect } from 'react'
import {
  X,
  Send,
  Loader2,
  Users,
  User,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Mail,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Parent {
  id: string
  email: string
  firstName: string
  lastName: string
  camperName: string
}

interface SendEmailModalProps {
  campId: string
  campName: string
  onClose: () => void
}

export function SendEmailModal({ campId, campName, onClose }: SendEmailModalProps) {
  const [mode, setMode] = useState<'blast' | 'individual'>('blast')
  const [parents, setParents] = useState<Parent[]>([])
  const [selectedParentIds, setSelectedParentIds] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [htmlBody, setHtmlBody] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadParents()
  }, [campId])

  const loadParents = async () => {
    try {
      const res = await fetch(`/api/camps/${campId}/parents`)
      const json = await res.json()
      if (json.data) {
        setParents(json.data)
      }
    } catch (err) {
      console.error('Failed to load parents:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleParent = (parentId: string) => {
    setSelectedParentIds(prev =>
      prev.includes(parentId)
        ? prev.filter(id => id !== parentId)
        : [...prev, parentId]
    )
  }

  const selectAll = () => {
    setSelectedParentIds(parents.map(p => p.id))
  }

  const deselectAll = () => {
    setSelectedParentIds([])
  }

  const handleSend = async () => {
    setError(null)
    setResult(null)

    if (!subject.trim()) {
      setError('Subject is required')
      return
    }

    if (!htmlBody.trim()) {
      setError('Email body is required')
      return
    }

    if (mode === 'individual' && selectedParentIds.length === 0) {
      setError('Please select at least one recipient')
      return
    }

    setSending(true)

    try {
      const res = await fetch(`/api/camps/${campId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          recipientIds: mode === 'individual' ? selectedParentIds : undefined,
          subject: subject.trim(),
          html: htmlBody,
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

  const recipientCount = mode === 'blast' ? parents.length : selectedParentIds.length

  // Preview with sample substitution
  const previewHtml = htmlBody
    .replace(/\{\{parentFirstName\}\}/g, 'Jane')
    .replace(/\{\{camperFirstName\}\}/g, 'Emily')
    .replace(/\{\{campName\}\}/g, campName)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-dark-100 border border-white/10 overflow-y-auto mx-4">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-dark-100 border-b border-white/10 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-neon" />
            <h2 className="text-lg font-bold text-white">Send Email - {campName}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 transition-colors">
            <X className="h-5 w-5 text-white/60" />
          </button>
        </div>

        {/* Success Result */}
        {result && (
          <div className="m-4 p-4 bg-neon/10 border border-neon/30">
            <div className="flex items-center gap-2 text-neon font-bold mb-1">
              <CheckCircle className="h-5 w-5" />
              Emails Sent
            </div>
            <p className="text-sm text-white/60">
              {result.sent} sent, {result.failed} failed
            </p>
            <button
              onClick={onClose}
              className="mt-3 px-4 py-2 bg-white/10 text-white text-sm font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="m-4 p-4 bg-red-400/10 border border-red-400/30">
            <div className="flex items-center gap-2 text-red-400 font-bold">
              <XCircle className="h-5 w-5" />
              {error}
            </div>
          </div>
        )}

        {!result && (
          <div className="p-4 space-y-6">
            {/* Mode Toggle */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                Send Mode
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('blast')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors',
                    mode === 'blast'
                      ? 'bg-neon text-black'
                      : 'bg-white/10 text-white/60 hover:text-white'
                  )}
                >
                  <Users className="h-4 w-4" />
                  Blast (All Parents)
                </button>
                <button
                  onClick={() => setMode('individual')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors',
                    mode === 'individual'
                      ? 'bg-purple text-white'
                      : 'bg-white/10 text-white/60 hover:text-white'
                  )}
                >
                  <User className="h-4 w-4" />
                  Individual
                </button>
              </div>
            </div>

            {/* Recipients */}
            {mode === 'blast' ? (
              <div className="p-3 bg-neon/10 border border-neon/30">
                <p className="text-sm text-white">
                  This will email <strong className="text-neon">{parents.length}</strong> registered parents
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/40">
                    Select Recipients ({selectedParentIds.length} selected)
                  </label>
                  <div className="flex gap-2">
                    <button onClick={selectAll} className="text-xs text-purple hover:text-purple/80">
                      Select All
                    </button>
                    <button onClick={deselectAll} className="text-xs text-white/40 hover:text-white">
                      Clear
                    </button>
                  </div>
                </div>
                {loading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-purple" />
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-white/10 divide-y divide-white/5">
                    {parents.map(parent => (
                      <label
                        key={parent.id}
                        className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedParentIds.includes(parent.id)}
                          onChange={() => toggleParent(parent.id)}
                          className="accent-purple"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">
                            {parent.firstName} {parent.lastName}
                          </p>
                          <p className="text-xs text-white/40 truncate">
                            {parent.email} - Camper: {parent.camperName}
                          </p>
                        </div>
                      </label>
                    ))}
                    {parents.length === 0 && (
                      <p className="p-4 text-sm text-white/40 text-center">No registered parents found</p>
                    )}
                  </div>
                )}
              </div>
            )}

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
              <p className="text-xs text-white/30 mt-1">
                Variables: {'{{parentFirstName}}'}, {'{{camperFirstName}}'}, {'{{campName}}'}
              </p>
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
                <div className="border border-white/10 bg-white min-h-[200px] p-4">
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full min-h-[180px] border-0"
                    sandbox="allow-same-origin"
                    title="Email Preview"
                  />
                </div>
              ) : (
                <textarea
                  value={htmlBody}
                  onChange={e => setHtmlBody(e.target.value)}
                  placeholder="<p>Hi {{parentFirstName}}, ...</p>"
                  className="w-full min-h-[200px] bg-dark-100 border border-white/10 text-white p-4 font-mono text-sm focus:outline-none focus:border-purple/50 resize-y"
                />
              )}
            </div>

            {/* Send Button */}
            <div className="flex items-center gap-4 pt-4 border-t border-white/10">
              <button
                onClick={handleSend}
                disabled={sending || recipientCount === 0}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 font-bold uppercase tracking-wider text-sm transition-colors',
                  sending || recipientCount === 0
                    ? 'bg-purple/50 text-white/50 cursor-not-allowed'
                    : 'bg-purple hover:bg-purple/80 text-white'
                )}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {sending ? 'Sending...' : `Send to ${recipientCount} Parent${recipientCount !== 1 ? 's' : ''}`}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-3 text-sm font-bold uppercase tracking-wider text-white/50 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
