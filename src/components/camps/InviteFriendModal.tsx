'use client'

import { useState } from 'react'
import { X, Send, Loader2, CheckCircle, UserPlus } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface InviteFriendModalProps {
  campId: string
  campName: string
  tenantId: string
  isOpen: boolean
  onClose: () => void
  inviterName?: string
  inviterEmail?: string
  athleteNames?: string[]
}

export function InviteFriendModal({
  campId,
  campName,
  tenantId,
  isOpen,
  onClose,
  inviterName = '',
  inviterEmail = '',
  athleteNames = [],
}: InviteFriendModalProps) {
  const [friendEmail, setFriendEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [sentEmail, setSentEmail] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    try {
      const res = await fetch('/api/squads/guest-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviterEmail: inviterEmail || '',
          inviterName: inviterName || 'A friend',
          inviteeEmail: friendEmail,
          campId,
          campName,
          tenantId,
          athleteNames,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to send invite')
      }

      setSentEmail(friendEmail)
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const handleSendAnother = () => {
    setFriendEmail('')
    setStatus('idle')
    setErrorMessage('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-dark-100 border border-white/10 mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <UserPlus className="h-5 w-5 text-neon" />
            <h2 className="text-lg font-bold uppercase tracking-wider text-white">
              Invite a Friend
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {status === 'success' ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 bg-neon/10 border border-neon/30 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-neon" />
                </div>
              </div>
              <div>
                <p className="text-lg font-bold text-white">Invite Sent!</p>
                <p className="text-sm text-white/60 mt-1">
                  We sent an email to <span className="text-white">{sentEmail}</span> with a link to register for <span className="text-neon">{campName}</span>. Their athletes will be grouped with yours!
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={handleSendAnother}
                  className="w-full py-3 bg-neon text-black font-bold uppercase tracking-wider text-sm hover:bg-neon/90 transition-colors"
                >
                  Invite Another Friend
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 border border-white/10 text-white/60 font-bold uppercase tracking-wider text-sm hover:text-white hover:border-white/30 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-white/60">
                Enter your friend&apos;s email to invite them to register for <span className="text-neon font-semibold">{campName}</span>. Their athletes will be grouped with yours in the same squad!
              </p>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5">
                  Friend&apos;s Email
                </label>
                <Input
                  type="email"
                  value={friendEmail}
                  onChange={(e) => setFriendEmail(e.target.value)}
                  placeholder="friend@example.com"
                  required
                  autoFocus
                />
              </div>

              {status === 'error' && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-sm text-red-400">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-3 bg-neon text-black font-bold uppercase tracking-wider text-sm hover:bg-neon/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Invite
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
