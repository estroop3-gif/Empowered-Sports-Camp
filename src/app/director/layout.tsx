'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { PortalLayout } from '@/components/portal'
import { Loader2 } from 'lucide-react'

/**
 * Director Portal Layout
 *
 * This layout wraps all director portal pages and provides:
 * - Role verification (redirects non-directors)
 * - Consistent sidebar navigation
 * - LMS status indicator
 *
 * Note: LMS gating for specific features is handled at the page level
 * using the <LmsGate> component, not here in the layout.
 */

export default function DirectorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { role, loading, isHqAdmin, isLicenseeOwner, isDirector } = useAuth()

  // Redirect non-directors (unless they're admin/licensee who can access)
  useEffect(() => {
    if (loading) return

    // Directors, HQ Admin, and Licensee Owners can access
    // HQ Admin and Licensee Owner may be "viewing as" director
    const canAccess = isDirector || isHqAdmin || isLicenseeOwner

    if (!canAccess) {
      router.replace('/login')
    }
  }, [loading, isDirector, isHqAdmin, isLicenseeOwner, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-100 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-magenta animate-spin" />
      </div>
    )
  }

  // Don't render until we verify access
  if (!isDirector && !isHqAdmin && !isLicenseeOwner) {
    return (
      <div className="min-h-screen bg-dark-100 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-magenta animate-spin" />
      </div>
    )
  }

  return (
    <PortalLayout showLmsStatus={true}>
      {children}
    </PortalLayout>
  )
}
