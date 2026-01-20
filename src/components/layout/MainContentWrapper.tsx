'use client'

/**
 * MainContentWrapper
 *
 * Provides proper top padding for main content to account for:
 * - Fixed navbar height
 * - Developer mode banner (when active)
 * - ViewingAs banner (when active)
 *
 * This ensures content doesn't clip under the fixed navbar/banners.
 *
 * NOTE: Admin, Portal, and Licensee pages handle their own padding
 * via their layout components, so we skip padding for those routes.
 */

import { usePathname } from 'next/navigation'
import { useBannerOffset } from '@/hooks/useBannerOffset'

interface MainContentWrapperProps {
  children: React.ReactNode
}

export function MainContentWrapper({ children }: MainContentWrapperProps) {
  const pathname = usePathname()
  const { topWithNavbar } = useBannerOffset()

  // Admin, portal, and licensee pages handle their own padding
  const hasOwnLayout = pathname?.startsWith('/admin') ||
    pathname?.startsWith('/portal') ||
    pathname?.startsWith('/licensee') ||
    pathname?.startsWith('/director') ||
    pathname?.startsWith('/volunteer')

  if (hasOwnLayout) {
    return <>{children}</>
  }

  return (
    <div style={{ paddingTop: `${topWithNavbar}px` }}>
      {children}
    </div>
  )
}
