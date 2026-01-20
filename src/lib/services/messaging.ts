/**
 * Messaging Service
 *
 * Internal messaging system for Empowered Sports Camp.
 *
 * Handles:
 * - Sending messages between users (licensee ↔ director, director ↔ parent, etc.)
 * - Message threads and conversations
 * - Listing and reading messages
 */

import { prisma } from '@/lib/db/client'
import type { MessageThreadType as PrismaMessageThreadType, Prisma } from '@/generated/prisma'
import { notifyMessageReceived } from './notifications'

// =============================================================================
// Types
// =============================================================================

// Map Prisma enum to service type
export type MessageThreadType =
  | 'licensee_director'
  | 'director_parent'
  | 'director_staff'
  | 'admin_licensee'
  | 'support'
  | 'general'

export interface MessageData {
  id: string
  threadId: string
  fromUserId: string
  fromUserName: string
  body: string
  isDeleted: boolean
  createdAt: string
}

export interface MessageThreadData {
  id: string
  tenantId: string | null
  type: MessageThreadType
  subject: string | null
  participants: {
    id: string
    userId: string
    name: string
    avatarUrl: string | null
    lastReadAt: string | null
    isActive: boolean
  }[]
  lastMessage: {
    body: string
    createdAt: string
    fromUserId: string
    fromUserName: string
  } | null
  unreadCount: number
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export interface SendMessageParams {
  fromUserId: string
  toUserId: string
  subject?: string
  body: string
  tenantId: string
  threadId?: string // If replying to existing thread
  threadType?: MessageThreadType
}

// =============================================================================
// Helper Functions
// =============================================================================

function toMessageData(message: {
  id: string
  threadId: string
  fromUserId: string
  fromUser: { firstName: string | null; lastName: string | null }
  body: string
  isDeleted: boolean
  createdAt: Date
}): MessageData {
  return {
    id: message.id,
    threadId: message.threadId,
    fromUserId: message.fromUserId,
    fromUserName: `${message.fromUser.firstName || ''} ${message.fromUser.lastName || ''}`.trim() || 'Unknown',
    body: message.body,
    isDeleted: message.isDeleted,
    createdAt: message.createdAt.toISOString(),
  }
}

function toMessageThreadData(
  thread: {
    id: string
    tenantId: string | null
    type: PrismaMessageThreadType
    subject: string | null
    isArchived: boolean
    createdAt: Date
    updatedAt: Date
    participants: {
      id: string
      userId: string
      lastReadAt: Date | null
      isActive: boolean
      user: { firstName: string | null; lastName: string | null; avatarUrl: string | null }
    }[]
    messages: {
      body: string
      createdAt: Date
      fromUserId: string
      fromUser: { firstName: string | null; lastName: string | null }
    }[]
  },
  currentUserId: string
): MessageThreadData {
  const lastMessage = thread.messages[0] || null
  const currentParticipant = thread.participants.find((p) => p.userId === currentUserId)

  // Count unread messages (messages after lastReadAt from other users)
  let unreadCount = 0
  if (currentParticipant) {
    const lastReadAt = currentParticipant.lastReadAt
    unreadCount = thread.messages.filter((m) => {
      if (m.fromUserId === currentUserId) return false
      if (!lastReadAt) return true
      return m.createdAt > lastReadAt
    }).length
  }

  return {
    id: thread.id,
    tenantId: thread.tenantId,
    type: thread.type as MessageThreadType,
    subject: thread.subject,
    participants: thread.participants.map((p) => ({
      id: p.id,
      userId: p.userId,
      name: `${p.user.firstName || ''} ${p.user.lastName || ''}`.trim() || 'Unknown',
      avatarUrl: p.user.avatarUrl,
      lastReadAt: p.lastReadAt?.toISOString() || null,
      isActive: p.isActive,
    })),
    lastMessage: lastMessage
      ? {
          body: lastMessage.body,
          createdAt: lastMessage.createdAt.toISOString(),
          fromUserId: lastMessage.fromUserId,
          fromUserName: `${lastMessage.fromUser.firstName || ''} ${lastMessage.fromUser.lastName || ''}`.trim() || 'Unknown',
        }
      : null,
    unreadCount,
    isArchived: thread.isArchived,
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
  }
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Send a message to another user
 * Creates a new thread if no threadId is provided.
 */
export async function sendMessage(
  params: SendMessageParams
): Promise<{ data: MessageData | null; error: Error | null }> {
  try {
    const { fromUserId, toUserId, subject, body, tenantId, threadId, threadType = 'general' } = params

    // Verify sender exists
    const fromProfile = await prisma.profile.findUnique({
      where: { id: fromUserId },
      select: { firstName: true, lastName: true },
    })

    if (!fromProfile) {
      return { data: null, error: new Error('Sender not found') }
    }

    let actualThreadId = threadId

    // If no threadId, find existing thread or create new one
    if (!actualThreadId) {
      // Verify recipient exists when creating new thread
      const toProfile = await prisma.profile.findUnique({
        where: { id: toUserId },
        select: { id: true },
      })

      if (!toProfile) {
        return { data: null, error: new Error('Recipient not found') }
      }

      // Look for existing thread between these two users
      const existingThread = await prisma.messageThread.findFirst({
        where: {
          isArchived: false,
          AND: [
            { participants: { some: { userId: fromUserId, isActive: true } } },
            { participants: { some: { userId: toUserId, isActive: true } } },
          ],
        },
        select: { id: true },
      })

      if (existingThread) {
        actualThreadId = existingThread.id
      } else {
        // Create new thread with participants
        const newThread = await prisma.messageThread.create({
          data: {
            tenantId: tenantId || null,
            type: threadType as PrismaMessageThreadType,
            subject: subject || null,
            participants: {
              create: [
                { userId: fromUserId },
                { userId: toUserId },
              ],
            },
          },
        })
        actualThreadId = newThread.id
      }
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        threadId: actualThreadId,
        fromUserId,
        body,
      },
      include: {
        fromUser: {
          select: { firstName: true, lastName: true },
        },
      },
    })

    // Update thread's lastMessageAt
    await prisma.messageThread.update({
      where: { id: actualThreadId },
      data: { lastMessageAt: new Date() },
    })

    // Get all participants except sender to notify
    const participants = await prisma.messageParticipant.findMany({
      where: {
        threadId: actualThreadId,
        userId: { not: fromUserId },
        isActive: true,
      },
      select: { userId: true },
    })

    // Notify recipients
    const senderName = `${fromProfile.firstName || ''} ${fromProfile.lastName || ''}`.trim() || 'Someone'
    for (const participant of participants) {
      notifyMessageReceived({
        userId: participant.userId,
        tenantId: tenantId || undefined,
        senderName,
        messagePreview: body.substring(0, 100),
        threadId: actualThreadId,
      }).catch((err) => console.error('[Messaging] Failed to send notification:', err))
    }

    return {
      data: toMessageData(message),
      error: null,
    }
  } catch (error) {
    console.error('[Messaging] Failed to send message:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * List message threads for a user
 */
export async function listThreadsForUser(params: {
  userId: string
  tenantId?: string
  includeArchived?: boolean
  limit?: number
  offset?: number
}): Promise<{ data: { threads: MessageThreadData[]; totalCount: number } | null; error: Error | null }> {
  try {
    const { userId, tenantId, includeArchived = false, limit = 50, offset = 0 } = params

    // Build where clause
    const where: Prisma.MessageThreadWhereInput = {
      participants: {
        some: { userId, isActive: true },
      },
      ...(includeArchived ? {} : { isArchived: false }),
      ...(tenantId ? { tenantId } : {}),
    }

    // Get threads with participants and last message
    const [threads, totalCount] = await Promise.all([
      prisma.messageThread.findMany({
        where,
        include: {
          participants: {
            include: {
              user: {
                select: { firstName: true, lastName: true, avatarUrl: true },
              },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 10, // Get recent messages to calculate unread count
            include: {
              fromUser: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
        orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
        take: limit,
        skip: offset,
      }),
      prisma.messageThread.count({ where }),
    ])

    return {
      data: {
        threads: threads.map((thread) => toMessageThreadData(thread, userId)),
        totalCount,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Messaging] Failed to list threads:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get a message thread with all messages
 */
export async function getThread(params: {
  threadId: string
  userId: string
  markAsRead?: boolean
  limit?: number
  offset?: number
}): Promise<{ data: { thread: MessageThreadData; messages: MessageData[] } | null; error: Error | null }> {
  try {
    const { threadId, userId, markAsRead = true, limit = 100, offset = 0 } = params

    // Get thread with verification that user is a participant
    const thread = await prisma.messageThread.findFirst({
      where: {
        id: threadId,
        participants: {
          some: { userId, isActive: true },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          include: {
            fromUser: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    })

    if (!thread) {
      return { data: null, error: new Error('Thread not found or access denied') }
    }

    // Mark as read - update participant's lastReadAt
    if (markAsRead) {
      await prisma.messageParticipant.updateMany({
        where: {
          threadId,
          userId,
        },
        data: {
          lastReadAt: new Date(),
        },
      })
    }

    // Convert messages (reverse to get chronological order)
    const messages = thread.messages.reverse().map(toMessageData)

    return {
      data: {
        thread: toMessageThreadData(thread, userId),
        messages,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Messaging] Failed to get thread:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get total unread message count for a user across all threads
 */
export async function getUnreadCount(params: {
  userId: string
  tenantId?: string
}): Promise<{ data: { count: number } | null; error: Error | null }> {
  try {
    const { userId, tenantId } = params

    // Get all threads the user is a participant in
    const participations = await prisma.messageParticipant.findMany({
      where: {
        userId,
        isActive: true,
        thread: {
          isArchived: false,
          ...(tenantId ? { tenantId } : {}),
        },
      },
      select: {
        threadId: true,
        lastReadAt: true,
      },
    })

    if (participations.length === 0) {
      return { data: { count: 0 }, error: null }
    }

    // Count unread messages across all threads
    let totalUnread = 0

    for (const participation of participations) {
      const unreadInThread = await prisma.message.count({
        where: {
          threadId: participation.threadId,
          fromUserId: { not: userId },
          isDeleted: false,
          ...(participation.lastReadAt
            ? { createdAt: { gt: participation.lastReadAt } }
            : {}),
        },
      })
      totalUnread += unreadInThread
    }

    return {
      data: { count: totalUnread },
      error: null,
    }
  } catch (error) {
    console.error('[Messaging] Failed to get unread count:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Soft delete a message (only the sender can delete their own messages)
 */
export async function deleteMessage(params: {
  messageId: string
  userId: string
}): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const { messageId, userId } = params

    // Only allow deleting own messages
    const result = await prisma.message.updateMany({
      where: {
        id: messageId,
        fromUserId: userId,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
      },
    })

    return {
      data: { success: result.count > 0 },
      error: null,
    }
  } catch (error) {
    console.error('[Messaging] Failed to delete message:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Archive a thread (hides it from the thread list)
 */
export async function archiveThread(params: {
  threadId: string
  userId: string
}): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const { threadId, userId } = params

    // Verify user is a participant before archiving
    const participant = await prisma.messageParticipant.findFirst({
      where: {
        threadId,
        userId,
        isActive: true,
      },
    })

    if (!participant) {
      return { data: null, error: new Error('Thread not found or access denied') }
    }

    // Archive the thread
    await prisma.messageThread.update({
      where: { id: threadId },
      data: { isArchived: true },
    })

    return {
      data: { success: true },
      error: null,
    }
  } catch (error) {
    console.error('[Messaging] Failed to archive thread:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Mark a thread as read by updating the participant's lastReadAt
 */
export async function markThreadAsRead(params: {
  threadId: string
  userId: string
}): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const { threadId, userId } = params

    const result = await prisma.messageParticipant.updateMany({
      where: {
        threadId,
        userId,
        isActive: true,
      },
      data: {
        lastReadAt: new Date(),
      },
    })

    return {
      data: { success: result.count > 0 },
      error: null,
    }
  } catch (error) {
    console.error('[Messaging] Failed to mark thread as read:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get users that can be messaged (for composing new messages)
 */
export async function getMessageableUsers(params: {
  userId: string
  tenantId: string
  role: string
  search?: string
  limit?: number
}): Promise<{
  data: { users: { id: string; name: string; email: string; avatarUrl: string | null; role: string }[] } | null
  error: Error | null
}> {
  try {
    const { userId, tenantId, role, search, limit = 20 } = params

    // Build where clause based on role
    // Directors can message parents, licensees can message directors, etc.
    const where: Prisma.ProfileWhereInput = {
      id: { not: userId },
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const profiles = await prisma.profile.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatarUrl: true,
        userRoles: {
          where: { isActive: true },
          select: { role: true },
          take: 1,
        },
      },
      take: limit,
    })

    return {
      data: {
        users: profiles.map((p) => ({
          id: p.id,
          name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unknown',
          email: p.email,
          avatarUrl: p.avatarUrl,
          role: p.userRoles[0]?.role || 'parent',
        })),
      },
      error: null,
    }
  } catch (error) {
    console.error('[Messaging] Failed to get messageable users:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Alias Exports (for API route compatibility)
// =============================================================================

/**
 * Alias for listThreadsForUser - used by /api/messaging/list
 */
export async function listMessagesForUser(params: {
  userId: string
  tenantId: string
  limit?: number
  offset?: number
}): Promise<{ data: { threads: MessageThreadData[]; totalCount: number } | null; error: Error | null }> {
  return listThreadsForUser({
    userId: params.userId,
    tenantId: params.tenantId,
    limit: params.limit,
    offset: params.offset,
  })
}

/**
 * Alias for getThread - used by /api/messaging/thread
 */
export async function getMessageThread(params: {
  threadId: string
  userId: string
  tenantId?: string
}): Promise<{ data: { thread: MessageThreadData; messages: MessageData[] } | null; error: Error | null }> {
  return getThread({
    threadId: params.threadId,
    userId: params.userId,
  })
}
