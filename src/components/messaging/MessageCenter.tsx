/**
 * Message Center Component
 *
 * Main messaging interface with thread list and compose functionality.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'

interface MessageThread {
  id: string
  subject: string | null
  participants: { id: string; userId: string; name: string }[]
  lastMessage: {
    body: string
    createdAt: string
    fromUserName: string
  } | null
  unreadCount: number
  type: string
}

interface MessageableUser {
  id: string
  name: string
  email: string
  role: string
}

interface MessageCenterProps {
  className?: string
}

export function MessageCenter({ className = '' }: MessageCenterProps) {
  const [threads, setThreads] = useState<MessageThread[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [showCompose, setShowCompose] = useState(false)

  // Compose state
  const [composeRecipient, setComposeRecipient] = useState<MessageableUser | null>(null)
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [composeSending, setComposeSending] = useState(false)
  const [recipientSearch, setRecipientSearch] = useState('')
  const [recipientResults, setRecipientResults] = useState<MessageableUser[]>([])
  const [searchingRecipients, setSearchingRecipients] = useState(false)

  useEffect(() => {
    loadThreads()
  }, [])

  const loadThreads = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/messaging/list')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load messages')
      }

      setThreads(result.data?.threads || [])
    } catch (err) {
      console.error('[MessageCenter] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  // Search for messageable users
  const searchRecipients = useCallback(async (search: string) => {
    if (search.length < 2) {
      setRecipientResults([])
      return
    }

    setSearchingRecipients(true)
    try {
      const response = await fetch(`/api/messaging/users?search=${encodeURIComponent(search)}`)
      const result = await response.json()
      if (response.ok && result.data?.users) {
        setRecipientResults(result.data.users)
      }
    } catch (err) {
      console.error('[MessageCenter] Search error:', err)
    } finally {
      setSearchingRecipients(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (recipientSearch) {
        searchRecipients(recipientSearch)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [recipientSearch, searchRecipients])

  // Send message
  const handleSendMessage = async () => {
    if (!composeRecipient || !composeBody.trim()) {
      return
    }

    setComposeSending(true)
    try {
      const response = await fetch('/api/messaging/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId: composeRecipient.id,
          subject: composeSubject || null,
          body: composeBody,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message')
      }

      // Reset compose form and reload threads
      setShowCompose(false)
      setComposeRecipient(null)
      setComposeSubject('')
      setComposeBody('')
      setRecipientSearch('')
      setRecipientResults([])
      loadThreads()
    } catch (err) {
      console.error('[MessageCenter] Send error:', err)
      alert(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setComposeSending(false)
    }
  }

  // Reset compose form when closing
  const handleCloseCompose = () => {
    setShowCompose(false)
    setComposeRecipient(null)
    setComposeSubject('')
    setComposeBody('')
    setRecipientSearch('')
    setRecipientResults([])
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-red-600 ${className}`}>
        <p>Error loading messages: {error}</p>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Messages</h3>
        <button
          onClick={() => setShowCompose(true)}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <svg className="-ml-0.5 mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Message
        </button>
      </div>

      {/* Thread List */}
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {threads.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <p className="mt-2">No messages yet.</p>
            <p className="text-sm">Start a conversation!</p>
          </div>
        ) : (
          threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => setSelectedThreadId(thread.id)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                selectedThreadId === thread.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {thread.subject || 'No subject'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {thread.participants.map((p) => p.name).join(', ')}
                  </p>
                  {thread.lastMessage && (
                    <p className="text-sm text-gray-600 truncate mt-1">
                      <span className="font-medium">{thread.lastMessage.fromUserName}:</span>{' '}
                      {thread.lastMessage.body}
                    </p>
                  )}
                </div>
                <div className="ml-2 flex flex-col items-end">
                  {thread.lastMessage && (
                    <span className="text-xs text-gray-500">
                      {formatDate(thread.lastMessage.createdAt)}
                    </span>
                  )}
                  {thread.unreadCount > 0 && (
                    <span className="mt-1 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                      {thread.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h4 className="text-lg font-medium">New Message</h4>
              <button
                onClick={handleCloseCompose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700">To</label>
                {composeRecipient ? (
                  <div className="mt-1 flex items-center gap-2 p-2 bg-blue-50 rounded-md">
                    <span className="text-sm font-medium text-blue-800">{composeRecipient.name}</span>
                    <span className="text-xs text-blue-600">({composeRecipient.role})</span>
                    <button
                      onClick={() => setComposeRecipient(null)}
                      className="ml-auto text-blue-600 hover:text-blue-800"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={recipientSearch}
                      onChange={(e) => setRecipientSearch(e.target.value)}
                      placeholder="Search for a recipient..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    {recipientResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {recipientResults.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => {
                              setComposeRecipient(user)
                              setRecipientSearch('')
                              setRecipientResults([])
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            <p className="text-sm font-medium text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.email} • {user.role}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchingRecipients && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg p-3 text-center text-sm text-gray-500">
                        Searching...
                      </div>
                    )}
                  </>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject (optional)</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Message</label>
                <textarea
                  rows={4}
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Type your message..."
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="px-4 py-3 bg-gray-50 flex justify-end gap-2 rounded-b-lg">
              <button
                onClick={handleCloseCompose}
                disabled={composeSending}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={composeSending || !composeRecipient || !composeBody.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {composeSending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
