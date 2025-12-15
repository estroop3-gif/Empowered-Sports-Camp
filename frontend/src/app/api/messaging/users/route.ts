/**
 * Messageable Users API
 *
 * GET /api/messaging/users
 * Lists users that can be messaged by the current user.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import { getMessageableUsers } from '@/lib/services/messaging'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || undefined
    const limit = parseInt(searchParams.get('limit') || '20')

    const { data, error } = await getMessageableUsers({
      userId: user.id,
      tenantId: user.tenantId || '',
      role: user.role,
      search,
      limit,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] Get messageable users error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
