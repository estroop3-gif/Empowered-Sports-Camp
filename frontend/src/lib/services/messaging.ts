/**
 * Messaging Service
 *
 * SHELL: Internal messaging system
 *
 * Handles:
 * - Sending messages between users (licensee ↔ director, director ↔ parent, etc.)
 * - Message threads and conversations
 * - Listing and reading messages
 */

import { prisma } from '@/lib/db/client'

// =============================================================================
// Types
// =============================================================================

export type MessageThreadType =
  | 'LICENSEE_DIRECTOR'
  | 'DIRECTOR_PARENT'
  | 'DIRECTOR_STAFF'
  | 'ADMIN_LICENSEE'
  | 'SUPPORT'
  | 'GENERAL'

export interface MessageData {
  id: string
  threadId: string
  fromUserId: string
  fromUserName: string
  toUserId: string
  toUserName: string
  subject: string | null
  body: string
  isRead: boolean
  createdAt: string
}

export interface MessageThread {
  id: string
  type: MessageThreadType
  participants: {
    userId: string
    name: string
    avatarUrl: string | null
  }[]
  subject: string | null
  lastMessage: {
    body: string
    createdAt: string
    fromUserId: string
  } | null
  unreadCount: number
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
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * SHELL: Send a message to another user
 */
export async function sendMessage(
  params: SendMessageParams
): Promise<{ data: MessageData | null; error: Error | null }> {
  try {
    const { fromUserId, toUserId, subject, body, tenantId, threadId } = params

    // SHELL: Verify sender and recipient exist
    const [fromProfile, toProfile] = await Promise.all([
      prisma.profile.findUnique({ where: { id: fromUserId } }),
      prisma.profile.findUnique({ where: { id: toUserId } }),
    ])

    if (!fromProfile || !toProfile) {
      return { data: null, error: new Error('Sender or recipient not found') }
    }

    // SHELL: Find or create thread
    // TODO: Implement after messages table is created
    /*
    let thread = threadId
      ? await prisma.messageThread.findUnique({ where: { id: threadId } })
      : await prisma.messageThread.findFirst({
          where: {
            OR: [
              { participants: { some: { userId: fromUserId } } },
              { participants: { some: { userId: toUserId } } },
            ],
          },
        })

    if (!thread) {
      thread = await prisma.messageThread.create({
        data: {
          tenantId,
          type: determineThreadType(fromUserId, toUserId),
          participants: {
            create: [
              { userId: fromUserId },
              { userId: toUserId },
            ],
          },
          subject,
        },
      })
    }

    const message = await prisma.message.create({
      data: {
        threadId: thread.id,
        tenantId,
        fromUserId,
        toUserId,
        subject,
        body,
        isRead: false,
      },
    })
    */

    console.log('[Messaging] SHELL: Would send message:', {
      from: fromUserId,
      to: toUserId,
      subject,
    })

    // SHELL: Trigger notifications
    // TODO: Call notifyMessageReceived and sendStaffMessageEmail

    const mockMessage: MessageData = {
      id: `msg_${Date.now()}`,
      threadId: threadId || `thread_${Date.now()}`,
      fromUserId,
      fromUserName: `${fromProfile.firstName} ${fromProfile.lastName}`,
      toUserId,
      toUserName: `${toProfile.firstName} ${toProfile.lastName}`,
      subject: subject || null,
      body,
      isRead: false,
      createdAt: new Date().toISOString(),
    }

    return {
      data: mockMessage,
      error: null,
    }
  } catch (error) {
    console.error('[Messaging] Failed to send message:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: List message threads for a user
 */
export async function listMessagesForUser(params: {
  userId: string
  tenantId: string
  limit?: number
  offset?: number
}): Promise<{ data: { threads: MessageThread[]; totalCount: number } | null; error: Error | null }> {
  try {
    const { userId, tenantId, limit = 50, offset = 0 } = params

    // SHELL: Query message threads from database
    // TODO: Implement after messages table is created
    /*
    const threads = await prisma.messageThread.findMany({
      where: {
        tenantId,
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          include: {
            profile: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
    })
    */

    console.log('[Messaging] SHELL: Would list threads for user:', userId)

    // SHELL: Return mock data for now
    const mockThreads: MessageThread[] = [
      {
        id: 'thread_1',
        type: 'DIRECTOR_PARENT',
        participants: [
          { userId, name: 'You', avatarUrl: null },
          { userId: 'user_2', name: 'John Parent', avatarUrl: null },
        ],
        subject: 'Camp Day 1 Update',
        lastMessage: {
          body: 'Just wanted to let you know that Alex had a great first day!',
          createdAt: new Date().toISOString(),
          fromUserId: 'user_2',
        },
        unreadCount: 1,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'thread_2',
        type: 'LICENSEE_DIRECTOR',
        participants: [
          { userId, name: 'You', avatarUrl: null },
          { userId: 'user_3', name: 'Camp Director', avatarUrl: null },
        ],
        subject: 'Schedule Change Notice',
        lastMessage: {
          body: 'We need to discuss the schedule change for next week.',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          fromUserId: userId,
        },
        unreadCount: 0,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ]

    return {
      data: {
        threads: mockThreads,
        totalCount: mockThreads.length,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Messaging] Failed to list messages:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: Get a message thread with all messages
 */
export async function getMessageThread(params: {
  threadId: string
  userId: string
  tenantId: string
}): Promise<{ data: { thread: MessageThread; messages: MessageData[] } | null; error: Error | null }> {
  try {
    const { threadId, userId, tenantId } = params

    // SHELL: Query thread and messages from database
    // TODO: Implement after messages table is created
    /*
    const thread = await prisma.messageThread.findFirst({
      where: {
        id: threadId,
        tenantId,
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          include: {
            profile: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!thread) {
      return { data: null, error: new Error('Thread not found') }
    }

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        threadId,
        toUserId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    })
    */

    console.log('[Messaging] SHELL: Would get thread:', threadId)

    // SHELL: Return mock data
    const mockThread: MessageThread = {
      id: threadId,
      type: 'DIRECTOR_PARENT',
      participants: [
        { userId, name: 'You', avatarUrl: null },
        { userId: 'user_2', name: 'John Parent', avatarUrl: null },
      ],
      subject: 'Camp Day 1 Update',
      lastMessage: null,
      unreadCount: 0,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const mockMessages: MessageData[] = [
      {
        id: 'msg_1',
        threadId,
        fromUserId: userId,
        fromUserName: 'You',
        toUserId: 'user_2',
        toUserName: 'John Parent',
        subject: 'Camp Day 1 Update',
        body: 'Hi! I wanted to reach out about how the first day of camp went.',
        isRead: true,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'msg_2',
        threadId,
        fromUserId: 'user_2',
        fromUserName: 'John Parent',
        toUserId: userId,
        toUserName: 'You',
        subject: null,
        body: 'Just wanted to let you know that Alex had a great first day!',
        isRead: true,
        createdAt: new Date().toISOString(),
      },
    ]

    return {
      data: {
        thread: mockThread,
        messages: mockMessages,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Messaging] Failed to get thread:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: Get unread message count for a user
 */
export async function getUnreadCount(params: {
  userId: string
  tenantId: string
}): Promise<{ data: { count: number } | null; error: Error | null }> {
  try {
    const { userId, tenantId } = params

    // SHELL: Count unread messages
    // TODO: Implement after messages table is created
    /*
    const count = await prisma.message.count({
      where: {
        tenantId,
        toUserId: userId,
        isRead: false,
      },
    })
    */

    console.log('[Messaging] SHELL: Would get unread count for user:', userId)

    return {
      data: { count: 2 }, // Mock count
      error: null,
    }
  } catch (error) {
    console.error('[Messaging] Failed to get unread count:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: Delete a message (soft delete)
 */
export async function deleteMessage(params: {
  messageId: string
  userId: string
  tenantId: string
}): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const { messageId, userId, tenantId } = params

    // SHELL: Soft delete message
    // TODO: Implement after messages table is created

    console.log('[Messaging] SHELL: Would delete message:', messageId)

    return {
      data: { success: true },
      error: null,
    }
  } catch (error) {
    console.error('[Messaging] Failed to delete message:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * SHELL: Determine thread type based on participants' roles
 */
function determineThreadType(fromUserId: string, toUserId: string): MessageThreadType {
  // TODO: Look up user roles and determine appropriate thread type
  return 'GENERAL'
}
