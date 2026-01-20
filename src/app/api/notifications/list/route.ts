/**
 * List Notifications API
 *
 * GET /api/notifications/list
 * Lists notifications for the authenticated user.
 *
 * Query params:
 * - unreadOnly: boolean (default false)
 * - category: string (optional filter by category)
 * - limit: number (default 50)
 * - offset: number (default 0)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import { listNotifications, getNotificationFeedSummary, type NotificationCategory } from '@/lib/services/notifications'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const mode = searchParams.get('mode') || 'list'
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const category = searchParams.get('category') as NotificationCategory | null
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Feed summary mode for bell icon dropdown
    if (mode === 'feed') {
      const { data, error } = await getNotificationFeedSummary({
        userId: user.id,
        tenantId: user.tenantId || null,
        latestCount: limit,
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data })
    }

    // Full list mode
    const { data, error } = await listNotifications({
      userId: user.id,
      tenantId: user.tenantId || null,
      category: category || undefined,
      onlyUnread: unreadOnly,
      limit,
      offset,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] List notifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
