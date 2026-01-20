'use client'

/**
 * BannerSpacer
 *
 * Adds vertical space to account for fixed banners at the top of the page.
 * This ensures content isn't hidden behind the developer mode banner
 * or view-as banner when they're active.
 */

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'

export function BannerSpacer() {
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

  // Calculate total banner height
  let bannerHeight = 0
  if (developerModeEnabled) bannerHeight += 36
  if (isViewingAsOtherRole) bannerHeight += 36

  if (bannerHeight === 0) {
    return null
  }

  return <div style={{ height: `${bannerHeight}px` }} aria-hidden="true" />
}

export default BannerSpacer
