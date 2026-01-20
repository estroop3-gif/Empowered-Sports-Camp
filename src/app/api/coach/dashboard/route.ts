/**
 * Coach Dashboard API
 *
 * GET /api/coach/dashboard - Get full dashboard data for the authenticated coach
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { getCoachDashboardOverview } from '@/lib/services/coach-dashboard'
import { applyRateLimit, errorResponse, successResponse } from '@/lib/api-middleware'
import { apiLogger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return errorResponse('Unauthorized', 401)
    }

    // Apply rate limiting (expensive endpoint)
    const rateLimitResponse = applyRateLimit(request, user.id, 'expensive')
    if (rateLimitResponse) return rateLimitResponse

    // Coaches and higher roles can access
    const allowedRoles = ['coach', 'director', 'licensee_owner', 'hq_admin']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return errorResponse('Forbidden', 403)
    }

    const { data, error } = await getCoachDashboardOverview({
      userId: user.id,
    })

    if (error) {
      apiLogger.error('Dashboard overview failed', { userId: user.id }, error)
      return errorResponse(error.message, 500)
    }

    return successResponse(data)
  } catch (error) {
    apiLogger.error('Unexpected error in dashboard API', {}, error as Error)
    return errorResponse('Internal server error', 500)
  }
}
