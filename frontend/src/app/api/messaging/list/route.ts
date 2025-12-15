/**
 * SHELL: List Messages API
 *
 * GET /api/messaging/list
 * Lists message threads for the authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import { listMessagesForUser, getUnreadCount } from '@/lib/services/messaging'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data, error } = await listMessagesForUser({
      userId: user.id,
      tenantId: user.tenantId || '',
      limit,
      offset,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // SHELL: Also get unread count for badge display
    const { data: unreadData } = await getUnreadCount({
      userId: user.id,
      tenantId: user.tenantId || '',
    })

    return NextResponse.json({
      data: {
        ...data,
        unreadCount: unreadData?.count || 0,
      },
    })
  } catch (error) {
    console.error('[API] List messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
