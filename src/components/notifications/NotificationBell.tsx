/**
 * Notification Bell Component
 *
 * Bell icon with unread count badge and dropdown.
 * Styled to match Empowered Sports Camp brand aesthetic.
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Check,
  CheckCheck,
  FileText,
  MessageSquare,
  DollarSign,
  Calendar,
  Award,
  GraduationCap,
  Briefcase,
  AlertTriangle,
  Info,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NotificationData, NotificationCategory, NotificationSeverity } from '@/lib/services/notifications'

export function NotificationBell() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadNotifications()

    // Poll for updates every minute
    const interval = setInterval(loadNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notifications/list?mode=feed&limit=10')
      const result = await response.json()

      if (response.ok && result.data) {
        setNotifications(result.data.latest || [])
        setUnreadCount(result.data.unreadCount || 0)
      }
    } catch (err) {
      console.error('[NotificationBell] Error loading notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId?: string) => {
    try {
      const body = notificationId ? { notificationId } : { all: true }
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
      console.error('[NotificationBell] Error marking as read:', err)
    }
  }

  const handleNotificationClick = (notification: NotificationData) => {
    if (!notification.isRead) {
      markAsRead(notification.id)
    }
    setIsOpen(false)
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
    return date.toLocaleDateString()
  }

  const getCategoryIcon = (category: NotificationCategory) => {
    const iconClass = 'h-4 w-4'
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative p-2 rounded-md transition-colors',
          'text-white/70 hover:text-neon hover:bg-white/5',
          'focus:outline-none focus:ring-2 focus:ring-neon/50',
          isOpen && 'text-neon bg-white/5'
        )}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none text-black bg-neon rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-black border border-white/10 rounded-lg shadow-xl shadow-black/50 z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
              Notifications
            </h3>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAsRead()}
                  className="text-xs text-neon hover:text-neon/80 font-medium flex items-center gap-1"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="h-6 w-6 border-2 border-neon/30 border-t-neon rounded-full animate-spin mx-auto" />
                <p className="text-white/50 text-sm mt-2">Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-8 w-8 text-white/20 mx-auto mb-2" />
                <p className="text-white/50 text-sm">You're all caught up!</p>
                <p className="text-white/30 text-xs mt-1">No new notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'w-full px-4 py-3 text-left transition-colors border-b border-white/5 last:border-0',
                    'hover:bg-white/5',
                    !notification.isRead && 'bg-neon/5'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'p-2 rounded-md flex-shrink-0',
                        getSeverityBg(notification.severity),
                        getSeverityColor(notification.severity)
                      )}
                    >
                      {getCategoryIcon(notification.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            'text-sm font-medium truncate',
                            notification.isRead ? 'text-white/70' : 'text-white'
                          )}
                        >
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <span className="w-2 h-2 bg-neon rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-white/50 line-clamp-2 mt-0.5">
                        {notification.body}
                      </p>
                      <p className="text-[10px] text-white/30 mt-1 uppercase tracking-wide">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-white/10">
            <button
              onClick={() => {
                setIsOpen(false)
                router.push('/notifications')
              }}
              className="w-full text-center text-xs text-neon hover:text-neon/80 font-medium py-1"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
