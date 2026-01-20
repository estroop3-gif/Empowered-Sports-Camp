/**
 * SHELL: Message Thread API
 *
 * GET /api/messaging/thread?id=xxx
 * Gets a specific message thread with all messages.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import { getMessageThread } from '@/lib/services/messaging'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const threadId = request.nextUrl.searchParams.get('id')

    if (!threadId) {
      return NextResponse.json({ error: 'Thread id is required' }, { status: 400 })
    }

    const { data, error } = await getMessageThread({
      threadId,
      userId: user.id,
      tenantId: user.tenantId || '',
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] Get thread error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
