/**
 * Users API Routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchUsersWithRoles } from '@/lib/services/users'

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'withRoles'
  const limit = request.nextUrl.searchParams.get('limit')

  try {
    switch (action) {
      case 'withRoles': {
        const { data, error } = await fetchUsersWithRoles(limit ? parseInt(limit) : undefined)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
