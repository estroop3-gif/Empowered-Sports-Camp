/**
 * Admin Camps - User Role API
 *
 * GET /api/admin/camps/user-role - Get current user's role and tenant info
 *
 * Note: getAuthenticatedUserFromRequest already looks up the user's role from the database,
 * so we don't need to do another lookup here.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'

export async function GET(request: NextRequest) {
  try {
    console.log('[user-role] Starting auth check...')
    const user = await getAuthenticatedUserFromRequest(request)

    if (!user) {
      console.log('[user-role] No user returned from auth')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[user-role] User found:', { id: user.id, email: user.email, role: user.role })

    // Role is already looked up from database in getAuthenticatedUserFromRequest
    if (!user.role) {
      console.log('[user-role] User has no role assigned')
      return NextResponse.json({ error: 'No role assigned' }, { status: 403 })
    }

    return NextResponse.json({
      role: user.role,
      tenant_id: user.tenantId || null,
      user_id: user.id,
    })
  } catch (error) {
    console.error('[API] GET /api/admin/camps/user-role error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
