'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { PortalLayout } from '@/components/portal'
import { Loader2 } from 'lucide-react'

/**
 * Licensee Portal Layout
 *
 * This layout wraps all licensee portal pages and provides:
 * - Role verification (redirects non-licensees)
 * - Consistent sidebar navigation via PortalLayout
 * - Proper padding for fixed navbar
 */

export default function LicenseeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { loading, isHqAdmin, isLicenseeOwner } = useAuth()

  // Redirect non-licensees (unless they're admin who can access anything)
  useEffect(() => {
    if (loading) return

    const canAccess = isLicenseeOwner || isHqAdmin

    if (!canAccess) {
      router.replace('/login')
    }
  }, [loading, isLicenseeOwner, isHqAdmin, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-100 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-purple animate-spin" />
      </div>
    )
  }

  // Don't render until we verify access
  if (!isLicenseeOwner && !isHqAdmin) {
    return (
      <div className="min-h-screen bg-dark-100 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-purple animate-spin" />
      </div>
    )
  }

  return (
    <PortalLayout showLmsStatus={true}>
      {children}
    </PortalLayout>
  )
}
