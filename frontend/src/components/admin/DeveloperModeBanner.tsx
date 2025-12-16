'use client'

/**
 * Developer Mode Banner
 *
 * Displays a persistent banner when Developer Mode is active.
 * Only shown to Admin and Licensee dashboard users, never to parents.
 */

import { useState, useEffect } from 'react'
import { AlertTriangle, X, Code, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DeveloperModeBannerProps {
  /** Whether to allow dismissing the banner (reappears on page refresh) */
  dismissible?: boolean
  /** Additional CSS classes */
  className?: string
}

export function DeveloperModeBanner({
  dismissible = true,
  className,
}: DeveloperModeBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [developerModeEnabled, setDeveloperModeEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkDeveloperMode() {
      try {
        const res = await fetch('/api/admin/settings/developer-mode')
        if (res.ok) {
          const data = await res.json()
          setDeveloperModeEnabled(data.enabled === true)
        }
      } catch (error) {
        console.error('[DeveloperModeBanner] Error checking developer mode:', error)
      } finally {
        setLoading(false)
      }
    }

    checkDeveloperMode()
  }, [])

  // Don't render anything if loading or not in developer mode
  if (loading || !developerModeEnabled || !isVisible) {
    return null
  }

  return (
    <div
      className={cn(
        'w-full bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20',
        'border-b border-amber-500/50',
        'px-4 py-2',
        className
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Icon and Message */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2 py-1 bg-amber-500/20 rounded">
            <FlaskConical className="h-4 w-4 text-amber-400" />
            <Code className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-bold uppercase tracking-wider text-amber-400">
              Developer Mode Active
            </span>
          </div>
          <span className="text-sm text-amber-200/80">
            Payments are simulated. No real charges will occur.
          </span>
        </div>

        {/* Right: Dismiss button */}
        {dismissible && (
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-amber-500/20 rounded transition-colors"
            aria-label="Dismiss developer mode banner"
          >
            <X className="h-4 w-4 text-amber-400" />
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Compact version for inline display
 */
export function DeveloperModeBadge({ className }: { className?: string }) {
  const [developerModeEnabled, setDeveloperModeEnabled] = useState(false)

  useEffect(() => {
    async function checkDeveloperMode() {
      try {
        const res = await fetch('/api/admin/settings/developer-mode')
        if (res.ok) {
          const data = await res.json()
          setDeveloperModeEnabled(data.enabled === true)
        }
      } catch {
        // Silently fail
      }
    }

    checkDeveloperMode()
  }, [])

  if (!developerModeEnabled) {
    return null
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1',
        'bg-amber-500/20 border border-amber-500/50 rounded',
        'text-xs font-bold uppercase tracking-wider text-amber-400',
        className
      )}
    >
      <FlaskConical className="h-3 w-3" />
      <span>Dev Mode</span>
    </div>
  )
}

export default DeveloperModeBanner
