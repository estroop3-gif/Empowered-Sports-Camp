'use client'

/**
 * Coach Messages Page
 *
 * Shows notifications and messages for the coach.
 */

import { useState, useEffect } from 'react'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import { cn } from '@/lib/utils'
import {
  Inbox,
  Bell,
  Calendar,
  Loader2,
  CheckCircle,
  AlertCircle,
  Mail,
  Clock,
} from 'lucide-react'
import type { CoachMessageSummary } from '@/lib/services/coach-dashboard'

export default function CoachMessagesPage() {
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<CoachMessageSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadMessages()
  }, [])

  async function loadMessages() {
    try {
      const res = await fetch('/api/coach/messages')
      const json = await res.json()

      if (!res.ok) throw new Error(json.error || 'Failed to load messages')

      setMessages(json.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  async function markAsRead(messageId: string) {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: messageId }),
      })
      // Reload messages
      loadMessages()
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }

  return (
    <div>
      <PortalPageHeader
        title="Messages"
        description="View your notifications and updates"
      />

      <LmsGate variant="card" featureName="messages">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
          </div>
        ) : error ? (
          <PortalCard>
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
              <p className="text-white/50">{error}</p>
              <button
                onClick={loadMessages}
                className="mt-4 px-4 py-2 bg-blue-400 text-black font-bold uppercase text-sm"
              >
                Retry
              </button>
            </div>
          </PortalCard>
        ) : messages ? (
          <div className="space-y-6">
            {/* Unread Badge */}
            {messages.unread_count > 0 && (
              <div className="p-4 bg-blue-400/10 border border-blue-400/30 flex items-center gap-3">
                <Bell className="h-5 w-5 text-blue-400" />
                <span className="font-bold text-blue-400">
                  {messages.unread_count} unread message{messages.unread_count > 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Messages List */}
            <PortalCard title="Recent Messages">
              {messages.recent_messages.length === 0 ? (
                <div className="text-center py-12">
                  <Inbox className="h-12 w-12 text-white/20 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">No Messages</h3>
                  <p className="text-white/50">
                    You don&apos;t have any messages yet.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {messages.recent_messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'p-4 transition-colors',
                        !msg.is_read ? 'bg-blue-400/5' : 'hover:bg-white/5'
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            'h-10 w-10 flex items-center justify-center flex-shrink-0',
                            !msg.is_read ? 'bg-blue-400/20' : 'bg-white/10'
                          )}>
                            <Mail className={cn(
                              'h-5 w-5',
                              !msg.is_read ? 'text-blue-400' : 'text-white/40'
                            )} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className={cn(
                                'font-bold',
                                !msg.is_read ? 'text-white' : 'text-white/70'
                              )}>
                                {msg.subject}
                              </h4>
                              {!msg.is_read && (
                                <span className="w-2 h-2 bg-blue-400 rounded-full" />
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-white/50 mt-1">
                              <span>{msg.from_name}</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(msg.sent_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </span>
                              <span className="px-2 py-0.5 text-xs bg-white/10 capitalize">
                                {msg.message_type}
                              </span>
                            </div>
                          </div>
                        </div>
                        {!msg.is_read && (
                          <button
                            onClick={() => markAsRead(msg.id)}
                            className="px-3 py-1 text-xs font-bold uppercase text-white/50 hover:text-white border border-white/20 hover:border-white/40 transition-colors"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PortalCard>
          </div>
        ) : null}
      </LmsGate>
    </div>
  )
}
