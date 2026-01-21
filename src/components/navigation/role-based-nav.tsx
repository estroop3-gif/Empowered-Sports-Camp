'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { getNavItemsForRole, ROLE_CONFIG, UserRole } from '@/lib/roles/config'
import { cn } from '@/lib/utils'

/**
 * RoleBasedNav
 *
 * Renders navigation items based on the current viewing role.
 * When an admin uses "View As", this component automatically
 * shows the navigation appropriate for that role.
 *
 * SECURITY NOTE:
 * This only changes what navigation links are shown.
 * Actual route access is still controlled by:
 * - Middleware (real role check)
 * - Application-level authorization (real user identity)
 */

interface RoleBasedNavProps {
  className?: string
  variant?: 'horizontal' | 'vertical'
  showIcons?: boolean
}

export function RoleBasedNav({
  className,
  variant = 'horizontal',
  showIcons = true,
}: RoleBasedNavProps) {
  const pathname = usePathname()
  const { role } = useAuth()

  if (!role) return null

  const navItems = getNavItemsForRole(role)

  if (variant === 'vertical') {
    return (
      <nav className={cn('space-y-1', className)}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 text-sm font-semibold uppercase tracking-wider transition-all',
                isActive
                  ? 'bg-neon/10 text-neon border-l-2 border-neon'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              )}
            >
              {showIcons && <Icon className="h-5 w-5" />}
              {item.label}
              {item.badge && (
                <span className="ml-auto text-xs bg-magenta/20 text-magenta px-2 py-0.5">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    )
  }

  // Horizontal variant
  return (
    <nav className={cn('flex items-center gap-1', className)}>
      {navItems.slice(0, 5).map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-colors',
              isActive
                ? 'text-neon'
                : 'text-white/60 hover:text-white'
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

/**
 * RoleBadge
 *
 * Shows the current viewing role as a badge
 */
export function RoleBadge({ className }: { className?: string }) {
  const { role, isViewingAsOtherRole } = useAuth()

  if (!role) return null

  const config = ROLE_CONFIG[role]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 text-xs font-bold uppercase tracking-wider border',
        config.bgColor,
        config.borderColor,
        config.color,
        isViewingAsOtherRole && 'ring-1 ring-purple/50',
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.shortLabel}
    </div>
  )
}

/**
 * RoleIndicator
 *
 * A small indicator showing the current role with option to show
 * "viewing as" status
 */
export function RoleIndicator({ showViewingAs = true }: { showViewingAs?: boolean }) {
  const { role, actualRole, isViewingAsOtherRole } = useAuth()

  if (!role) return null

  const config = ROLE_CONFIG[role]
  const Icon = config.icon

  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        'h-8 w-8 flex items-center justify-center',
        config.bgColor,
        'border',
        config.borderColor
      )}>
        <Icon className={cn('h-4 w-4', config.color)} />
      </div>
      <div>
        <p className={cn('text-sm font-semibold', config.color)}>
          {config.label}
        </p>
        {showViewingAs && isViewingAsOtherRole && actualRole && (
          <p className="text-xs text-purple">
            Viewing as (actual: {ROLE_CONFIG[actualRole].shortLabel})
          </p>
        )}
      </div>
    </div>
  )
}
