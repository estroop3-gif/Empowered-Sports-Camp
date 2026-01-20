'use client'

/**
 * useBannerOffset
 *
 * Hook to calculate the total banner offset based on active banners.
 * Used by layout components to properly position fixed elements
 * below the developer mode banner and view-as banner.
 */

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'

interface BannerOffsetResult {
  /** Total pixel offset for top positioning (e.g., 0, 36, 72) */
  bannerOffset: number
  /** Whether developer mode banner is showing */
  developerModeEnabled: boolean
  /** Whether view-as banner is showing */
  isViewingAsOtherRole: boolean
  /** Top position including navbar (bannerOffset + 80px navbar) */
  topWithNavbar: number
  /** CSS style object for top position */
  topStyle: { top: string }
  /** CSS style object for top position with navbar */
  topWithNavbarStyle: { top: string }
  /** Height calculation for full viewport minus offset */
  heightStyle: { height: string }
  /** Height calculation for full viewport minus offset and navbar */
  heightWithNavbarStyle: { height: string }
}

const BANNER_HEIGHT = 36 // Height of each banner in pixels
const NAVBAR_HEIGHT = 80 // Height of the main navbar (h-20 = 5rem = 80px)

export function useBannerOffset(): BannerOffsetResult {
  const [developerModeEnabled, setDeveloperModeEnabled] = useState(false)
  const { isViewingAsOtherRole } = useAuth()

  useEffect(() => {
    async function checkDeveloperMode() {
      try {
        const res = await fetch('/api/settings/developer-mode')
        if (res.ok) {
          const data = await res.json()
          setDeveloperModeEnabled(data.enabled === true)
        }
      } catch {
        // Silently fail
      }
    }
    checkDeveloperMode()
    // Re-check periodically
    const interval = setInterval(checkDeveloperMode, 30000)
    return () => clearInterval(interval)
  }, [])

  // Calculate total banner offset
  let bannerOffset = 0
  if (developerModeEnabled) bannerOffset += BANNER_HEIGHT
  if (isViewingAsOtherRole) bannerOffset += BANNER_HEIGHT

  const topWithNavbar = bannerOffset + NAVBAR_HEIGHT

  return {
    bannerOffset,
    developerModeEnabled,
    isViewingAsOtherRole: isViewingAsOtherRole ?? false,
    topWithNavbar,
    topStyle: { top: `${bannerOffset}px` },
    topWithNavbarStyle: { top: `${topWithNavbar}px` },
    heightStyle: { height: `calc(100vh - ${bannerOffset}px)` },
    heightWithNavbarStyle: { height: `calc(100vh - ${topWithNavbar}px)` },
  }
}

export default useBannerOffset
