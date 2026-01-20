'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth, type UserRole } from '@/lib/auth/context'
import { useBannerOffset } from '@/hooks/useBannerOffset'
import { ROLE_CONFIG, ROLE_NAV_ITEMS, type NavItem } from '@/lib/roles/config'
import { LogoutButton, UserMenu } from '@/components/layout/user-menu'
import { LmsProgressIndicator } from './LmsGate'
import {
  Menu,
  X,
  ChevronDown,
  Bell,
  ExternalLink,
} from 'lucide-react'

/**
 * PortalLayout
 *
 * Shared layout for role-specific portals (Director, Volunteer, etc.)
 * Provides consistent navigation, header, and sidebar while adapting
 * to the user's role.
 *
 * Features:
 * - Role-aware navigation
 * - LMS status indicator
 * - Mobile responsive
 * - Consistent Empowered brand styling
 */

interface PortalLayoutProps {
  children: React.ReactNode
  /** Override the default role-based navigation */
  customNavItems?: NavItem[]
  /** Extra items to show in the sidebar footer */
  footerContent?: React.ReactNode
  /** Show LMS progress indicator in sidebar */
  showLmsStatus?: boolean
  /** Page title for header */
  pageTitle?: string
  /** Header actions (buttons, etc.) */
  headerActions?: React.ReactNode
}

export function PortalLayout({
  children,
  customNavItems,
  footerContent,
  showLmsStatus = true,
  pageTitle,
  headerActions,
}: PortalLayoutProps) {
  const pathname = usePathname()
  const { user, role, tenant, hasCompletedRequiredLms } = useAuth()
  const { topWithNavbar } = useBannerOffset()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const userName = user?.firstName || user?.email?.split('@')[0] || 'User'
  const roleConfig = role ? ROLE_CONFIG[role] : null
  const navItems = customNavItems || (role ? ROLE_NAV_ITEMS[role] : [])

  return (
    <div
      className="min-h-screen bg-dark-100 flex"
      style={{ paddingTop: `${topWithNavbar}px` }}
    >
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-x-0 bottom-0 bg-black/80 z-30 lg:hidden"
          style={{ top: `${topWithNavbar}px` }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static left-0 z-40 w-64 bg-black border-r border-white/10 flex flex-col transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{ top: `${topWithNavbar}px`, bottom: 0 }}
      >
        {/* Logo */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Empowered"
              width={140}
              height={35}
              className="h-8 w-auto"
            />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-white/50 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Role Badge */}
        {roleConfig && (
          <div className="px-4 py-3 border-b border-white/10">
            <div className={cn(
              'px-3 py-2 text-xs font-bold uppercase tracking-wider',
              roleConfig.bgColor,
              roleConfig.borderColor,
              roleConfig.color,
              'border'
            )}>
              {roleConfig.label}
            </div>
            {tenant && (
              <p className="text-xs text-white/40 mt-2 truncate">{tenant.name}</p>
            )}
          </div>
        )}

        {/* LMS Status */}
        {showLmsStatus && (role === 'director' || role === 'cit_volunteer') && (
          <div className="px-4 py-3 border-b border-white/10">
            <LmsProgressIndicator showDetails={false} />
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 text-sm font-medium uppercase tracking-wider transition-all',
                      isActive
                        ? 'bg-neon/10 text-neon border-l-2 border-neon'
                        : 'text-white/60 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {item.label}
                    {item.badge && (
                      <span className="ml-auto px-2 py-0.5 text-xs bg-magenta text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* External Links for Volunteers */}
          {role === 'cit_volunteer' && (
            <div className="px-4 py-4 mt-4 border-t border-white/10">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-3">External Training</p>
              <a
                href="https://www.nfhslearn.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-purple hover:text-purple/80 transition-colors"
              >
                NFHS Learn
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}
        </nav>

        {/* Footer Content */}
        {footerContent && (
          <div className="px-4 py-4 border-t border-white/10">
            {footerContent}
          </div>
        )}

        {/* User Info */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-white/10 flex items-center justify-center text-white font-bold text-sm uppercase">
              {userName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <p className="text-xs text-white/40 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="mt-3">
            <LogoutButton className="w-full" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="h-16 bg-black/50 border-b border-white/10 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 backdrop-blur-sm">
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-white/50 hover:text-white"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Page Title */}
          <div className="flex-1 lg:flex-none">
            {pageTitle && (
              <h1 className="text-lg font-bold text-white uppercase tracking-wider truncate">
                {pageTitle}
              </h1>
            )}
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-4">
            {headerActions}
            <button className="p-2 text-white/50 hover:text-white relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-magenta rounded-full" />
            </button>
            <UserMenu />
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

/**
 * PortalPageHeader
 *
 * Standard page header for portal pages
 */
interface PortalPageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function PortalPageHeader({ title, description, actions }: PortalPageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-white uppercase tracking-wider">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-white/50">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * PortalCard
 *
 * Standard content card for portal pages
 */
export interface PortalCardProps {
  children: React.ReactNode
  title?: string
  description?: string
  accent?: 'neon' | 'purple' | 'magenta' | 'orange'
  className?: string
  headerActions?: React.ReactNode
  onClick?: () => void
}

export function PortalCard({
  children,
  title,
  description,
  accent,
  className,
  headerActions,
  onClick,
}: PortalCardProps) {
  const accentColors = {
    neon: 'border-l-neon',
    purple: 'border-l-purple',
    magenta: 'border-l-magenta',
    orange: 'border-l-orange-400',
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-black border border-white/10 p-6',
        accent && `border-l-4 ${accentColors[accent]}`,
        onClick && 'cursor-pointer',
        className
      )}
    >
      {(title || headerActions) && (
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            {title && (
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-white/50 mt-1">{description}</p>
            )}
          </div>
          {headerActions}
        </div>
      )}
      {children}
    </div>
  )
}
