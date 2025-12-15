/**
 * SHELL: Send Message API
 *
 * POST /api/messaging/send
 * Sends a message in a thread or creates a new thread.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import { sendMessage } from '@/lib/services/messaging'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { threadId, toUserId, subject, body: messageBody } = body

    if (!messageBody) {
      return NextResponse.json({ error: 'body is required' }, { status: 400 })
    }

    // SHELL: Either threadId (reply) or toUserId (new thread) required
    if (!threadId && !toUserId) {
      return NextResponse.json(
        { error: 'threadId or toUserId is required' },
        { status: 400 }
      )
    }

    const { data, error } = await sendMessage({
      fromUserId: user.id,
      toUserId: toUserId || '',
      subject,
      body: messageBody,
      tenantId: user.tenantId || '',
      threadId,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] Send message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
