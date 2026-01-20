/**
 * Developer Mode Status API (Public)
 *
 * Public endpoint to check if developer mode is enabled.
 * Used by the global DeveloperModeBanner component.
 * No authentication required - shows to all users.
 */

import { NextResponse } from 'next/server'
import { isDeveloperModeEnabled } from '@/lib/services/settings'

/**
 * GET /api/settings/developer-mode
 *
 * Returns: { enabled: boolean }
 */
export async function GET() {
  try {
    const enabled = await isDeveloperModeEnabled()

    return NextResponse.json({
      enabled,
    })
  } catch (error) {
    console.error('[API] GET /api/settings/developer-mode error:', error)
    // Fail safe - return disabled
    return NextResponse.json({ enabled: false })
  }
}
