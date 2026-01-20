'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { PortalLayout } from '@/components/portal'
import { Loader2 } from 'lucide-react'

/**
 * CIT / Volunteer Portal Layout
 *
 * This layout wraps all CIT portal pages and provides:
 * - Role verification (redirects non-CITs)
 * - Consistent sidebar navigation
 * - LMS status indicator
 * - External link to NFHS Learn
 */

export default function CitLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { loading, isHqAdmin, isVolunteer } = useAuth()

  // Redirect non-CITs (unless they're admin who can access anything)
  useEffect(() => {
    if (loading) return

    // CIT/Volunteers and HQ Admin can access
    const canAccess = isVolunteer || isHqAdmin

    if (!canAccess) {
      router.replace('/login')
    }
  }, [loading, isVolunteer, isHqAdmin, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-100 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-orange-400 animate-spin" />
      </div>
    )
  }

  // Don't render until we verify access
  if (!isVolunteer && !isHqAdmin) {
    return (
      <div className="min-h-screen bg-dark-100 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-orange-400 animate-spin" />
      </div>
    )
  }

  return (
    <PortalLayout showLmsStatus={true}>
      {children}
    </PortalLayout>
  )
}
