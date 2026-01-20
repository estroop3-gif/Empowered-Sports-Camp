'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { PortalLayout } from '@/components/portal'
import { Loader2 } from 'lucide-react'

/**
 * Volunteer Portal Layout
 *
 * This layout wraps all volunteer portal pages and provides:
 * - Role verification (redirects non-volunteers)
 * - Consistent sidebar navigation
 * - LMS status indicator
 */

export default function VolunteerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { role, loading, isHqAdmin, isLicenseeOwner, isVolunteer, isDirector } = useAuth()

  // Redirect non-volunteers (unless they're admin/licensee who can access)
  useEffect(() => {
    if (loading) return

    // Volunteers, HQ Admin, Licensee Owners, and Directors can access
    const canAccess = isVolunteer || isHqAdmin || isLicenseeOwner || isDirector

    if (!canAccess) {
      router.replace('/login')
    }
  }, [loading, isVolunteer, isHqAdmin, isLicenseeOwner, isDirector, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-100 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-orange-400 animate-spin" />
      </div>
    )
  }

  // Don't render until we verify access
  if (!isVolunteer && !isHqAdmin && !isLicenseeOwner && !isDirector) {
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
