'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { PortalLayout } from '@/components/portal'
import { Loader2 } from 'lucide-react'

/**
 * Coach Portal Layout
 *
 * This layout wraps all coach portal pages and provides:
 * - Role verification (redirects non-coaches)
 * - Consistent sidebar navigation
 * - LMS status indicator
 */

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { loading, isHqAdmin, isLicenseeOwner, isDirector, isCoach } = useAuth()

  // Redirect if not authorized
  useEffect(() => {
    if (loading) return

    // Coaches, Directors, HQ Admin, and Licensee Owners can access
    const canAccess = isCoach || isDirector || isHqAdmin || isLicenseeOwner

    if (!canAccess) {
      router.replace('/login')
    }
  }, [loading, isCoach, isDirector, isHqAdmin, isLicenseeOwner, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-100 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-magenta animate-spin" />
      </div>
    )
  }

  // Don't render until we verify access
  if (!isCoach && !isDirector && !isHqAdmin && !isLicenseeOwner) {
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
