/**
 * SHELL: Mark Notifications Read API
 *
 * POST /api/notifications/read
 * Marks one or all notifications as read.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import { markNotificationRead, markAllNotificationsRead } from '@/lib/services/notifications'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationId, all } = body

    let result

    if (all) {
      // Mark all notifications as read
      result = await markAllNotificationsRead({
        userId: user.id,
        tenantId: user.tenantId || '',
      })
    } else if (notificationId) {
      // Mark single notification as read
      result = await markNotificationRead({
        notificationId,
        userId: user.id,
        tenantId: user.tenantId || '',
      })
    } else {
      return NextResponse.json(
        { error: 'notificationId or all=true is required' },
        { status: 400 }
      )
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('[API] Mark notification read error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
