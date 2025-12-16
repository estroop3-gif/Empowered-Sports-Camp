/**
 * Developer Mode Status API
 *
 * Simple endpoint to check if developer mode is enabled.
 * Used by the DeveloperModeBanner component.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { isDeveloperModeEnabled, getSetting } from '@/lib/services/settings'

// Allow admin and licensee roles to see developer mode status
const ALLOWED_ROLES = ['hq_admin', 'licensee_owner', 'director', 'coach']

/**
 * GET /api/admin/settings/developer-mode
 *
 * Returns: { enabled: boolean, bannerEnabled: boolean }
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      // For unauthenticated users, just return disabled
      return NextResponse.json({ enabled: false, bannerEnabled: false })
    }

    const userRole = user.role?.toLowerCase() || ''
    if (!ALLOWED_ROLES.includes(userRole)) {
      // For parent users, just return disabled
      return NextResponse.json({ enabled: false, bannerEnabled: false })
    }

    const enabled = await isDeveloperModeEnabled()
    const bannerResult = await getSetting({ key: 'developerModeBannerEnabled' })
    const bannerEnabled = bannerResult.data ?? true

    return NextResponse.json({
      enabled,
      bannerEnabled: enabled && bannerEnabled,
    })
  } catch (error) {
    console.error('[API] GET /api/admin/settings/developer-mode error:', error)
    // Fail safe - return disabled
    return NextResponse.json({ enabled: false, bannerEnabled: false })
  }
}
