'use client'

/**
 * Notifications Page
 *
 * Full page view of all notifications with filtering and management.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import {
  Bell,
  CheckCheck,
  FileText,
  MessageSquare,
  DollarSign,
  Calendar,
  Award,
  GraduationCap,
  Briefcase,
  Filter,
  Loader2,
  ArrowLeft,
  Trash2,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NotificationData, NotificationCategory, NotificationSeverity } from '@/lib/services/notifications'

const CATEGORIES: { value: NotificationCategory | 'all'; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <Bell className="h-4 w-4" /> },
  { value: 'camp', label: 'Camps', icon: <Calendar className="h-4 w-4" /> },
  { value: 'message', label: 'Messages', icon: <MessageSquare className="h-4 w-4" /> },
  { value: 'lms', label: 'Training', icon: <GraduationCap className="h-4 w-4" /> },
  { value: 'licensee', label: 'Licensee', icon: <FileText className="h-4 w-4" /> },
  { value: 'royalty', label: 'Royalties', icon: <DollarSign className="h-4 w-4" /> },
  { value: 'incentive', label: 'Incentives', icon: <Award className="h-4 w-4" /> },
  { value: 'job', label: 'Jobs', icon: <Briefcase className="h-4 w-4" /> },
  { value: 'certification', label: 'Certifications', icon: <Award className="h-4 w-4" /> },
  { value: 'system', label: 'System', icon: <Bell className="h-4 w-4" /> },
]

export default function NotificationsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [total, setTotal] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory | 'all'>('all')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [offset, setOffset] = useState(0)
  const limit = 20

  useEffect(() => {
    if (!authLoading && user) {
      loadNotifications()
    }
  }, [authLoading, user, selectedCategory, showUnreadOnly, offset])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      })

      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory)
      }

      if (showUnreadOnly) {
        params.append('unreadOnly', 'true')
      }

      const response = await fetch(`/api/notifications/list?${params}`)
      const result = await response.json()

      if (response.ok && result.data) {
        setNotifications(result.data.notifications || [])
        setTotal(result.data.total || 0)
        setUnreadCount(result.data.unreadCount || 0)
      }
    } catch (err) {
      console.error('[NotificationsPage] Error loading notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId?: string) => {
    try {
      const body = notificationId
        ? { notificationId }
        : selectedCategory !== 'all'
          ? { all: true, category: selectedCategory }
          : { all: true }

      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (notificationId) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } else {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
        setUnreadCount(0)
      }
    } catch (err) {
      console.error('[NotificationsPage] Error marking as read:', err)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, action: 'delete' }),
      })

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
      setTotal((prev) => prev - 1)
    } catch (err) {
      console.error('[NotificationsPage] Error deleting notification:', err)
    }
  }

  const handleNotificationClick = (notification: NotificationData) => {
    if (!notification.isRead) {
      markAsRead(notification.id)
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  const getCategoryIcon = (category: NotificationCategory) => {
    const iconClass = 'h-5 w-5'
    switch (category) {
      case 'licensee':
        return <FileText className={iconClass} />
      case 'camp':
        return <Calendar className={iconClass} />
      case 'lms':
        return <GraduationCap className={iconClass} />
      case 'message':
        return <MessageSquare className={iconClass} />
      case 'royalty':
        return <DollarSign className={iconClass} />
      case 'incentive':
        return <Award className={iconClass} />
      case 'job':
        return <Briefcase className={iconClass} />
      case 'certification':
        return <Award className={iconClass} />
      case 'system':
      default:
        return <Bell className={iconClass} />
    }
  }

  const getSeverityColor = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'success':
        return 'text-neon'
      case 'warning':
        return 'text-yellow-400'
      case 'error':
        return 'text-magenta'
      case 'info':
      default:
        return 'text-white/70'
    }
  }

  const getSeverityBg = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'success':
        return 'bg-neon/10'
      case 'warning':
        return 'bg-yellow-400/10'
      case 'error':
        return 'bg-magenta/10'
      case 'info':
      default:
        return 'bg-white/5'
    }
  }

  const getCategoryLabel = (category: NotificationCategory) => {
    const cat = CATEGORIES.find((c) => c.value === category)
    return cat?.label || category
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-neon animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Bell className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Sign In Required</h2>
          <p className="text-white/50">Please sign in to view your notifications.</p>
          <button
            onClick={() => router.push('/signin')}
            className="mt-4 px-6 py-2 bg-neon text-black font-semibold rounded-md hover:bg-neon/90"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-md"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white uppercase tracking-wide">
                  Notifications
                </h1>
                <p className="text-sm text-white/50">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAsRead()}
                className="flex items-center gap-2 px-4 py-2 text-sm text-neon border border-neon/30 rounded-md hover:bg-neon/10"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>
            )}
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => {
                  setSelectedCategory(cat.value)
                  setOffset(0)
                }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md whitespace-nowrap transition-colors text-sm',
                  selectedCategory === cat.value
                    ? 'bg-neon text-black font-semibold'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>

          {/* Unread Filter Toggle */}
          <div className="flex items-center gap-4 mt-3">
            <button
              onClick={() => {
                setShowUnreadOnly(!showUnreadOnly)
                setOffset(0)
              }}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
                showUnreadOnly
                  ? 'bg-magenta/20 text-magenta'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              )}
            >
              <Filter className="h-4 w-4" />
              Unread only
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-neon animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              {showUnreadOnly ? 'No unread notifications' : 'No notifications'}
            </h3>
            <p className="text-white/50 text-sm">
              {showUnreadOnly
                ? "You've read all your notifications!"
                : selectedCategory !== 'all'
                  ? `No ${getCategoryLabel(selectedCategory as NotificationCategory).toLowerCase()} notifications yet.`
                  : 'Notifications will appear here when there are updates.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  'bg-white/5 border border-white/10 rounded-lg overflow-hidden',
                  !notification.isRead && 'border-l-4 border-l-neon'
                )}
              >
                <button
                  onClick={() => handleNotificationClick(notification)}
                  className="w-full px-4 py-4 text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'p-3 rounded-lg flex-shrink-0',
                        getSeverityBg(notification.severity),
                        getSeverityColor(notification.severity)
                      )}
                    >
                      {getCategoryIcon(notification.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p
                            className={cn(
                              'font-semibold',
                              notification.isRead ? 'text-white/70' : 'text-white'
                            )}
                          >
                            {notification.title}
                          </p>
                          <p className="text-sm text-white/50 mt-1">{notification.body}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-white/30 whitespace-nowrap">
                            {formatTime(notification.createdAt)}
                          </span>
                          {!notification.isRead && (
                            <span className="w-2 h-2 bg-neon rounded-full" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-xs text-white/30 px-2 py-0.5 bg-white/5 rounded">
                          {getCategoryLabel(notification.category)}
                        </span>
                        {notification.actionUrl && (
                          <span className="text-xs text-neon">Click to view</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
                <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-white/5 bg-white/[0.02]">
                  {!notification.isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        markAsRead(notification.id)
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/50 hover:text-neon hover:bg-white/5 rounded-md transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Mark read
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteNotification(notification.id)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/50 hover:text-magenta hover:bg-white/5 rounded-md transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className={cn(
                'px-4 py-2 text-sm rounded-md transition-colors',
                offset === 0
                  ? 'text-white/30 bg-white/5 cursor-not-allowed'
                  : 'text-white bg-white/10 hover:bg-white/20'
              )}
            >
              Previous
            </button>
            <span className="text-sm text-white/50">
              {offset + 1} - {Math.min(offset + limit, total)} of {total}
            </span>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className={cn(
                'px-4 py-2 text-sm rounded-md transition-colors',
                offset + limit >= total
                  ? 'text-white/30 bg-white/5 cursor-not-allowed'
                  : 'text-white bg-white/10 hover:bg-white/20'
              )}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
