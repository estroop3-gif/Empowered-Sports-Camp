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
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Role is already looked up from database in getAuthenticatedUserFromRequest
    if (!user.role) {
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
