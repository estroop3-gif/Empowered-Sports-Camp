/**
 * EmpowerU Start Module API
 *
 * POST /api/empoweru/modules/[slug]/start - Start a module
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { startModule } from '@/lib/services/empoweru'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { slug } = await params

    const { data, error } = await startModule({
      moduleId: slug,
      userId: user.id,
      role: user.role || '',
      tenantId: user.tenantId,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] POST /api/empoweru/modules/[slug]/start error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
