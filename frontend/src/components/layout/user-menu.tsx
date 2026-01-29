'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { cn } from '@/lib/utils'
import {
  User,
  LogOut,
  Settings,
  ChevronDown,
  LayoutDashboard,
  Building2,
  Shield,
  Crown,
  Eye,
  Home,
} from 'lucide-react'

/**
 * UserMenu - Auth-aware user dropdown
 *
 * Shows different content based on authentication state:
 * - Logged out: Sign In / Register buttons
 * - Logged in: User avatar dropdown with profile, dashboard link, and logout
 *
 * Adapts styling for different contexts:
 * - variant="navbar": For public pages (transparent bg)
 * - variant="sidebar": For admin layout sidebar footer
 * - variant="header": For admin layout top bar
 */

interface UserMenuProps {
  variant?: 'navbar' | 'sidebar' | 'header'
  className?: string
}

export function UserMenu({ variant = 'navbar', className }: UserMenuProps) {
  const router = useRouter()
  const {
    user,
    role,
    actualRole,
    tenant,
    loading,
    signOut,
    isHqAdmin,
    isLicenseeOwner,
    isDirector,
    isCoach,
    isParent,
    isViewingAsOtherRole,
    viewingAsRole,
    setViewingAsRole,
    hasParentRole,
  } = useAuth()

  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    setIsOpen(false)

    try {
      await signOut()
      // Redirect to home page after logout
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
      // Still redirect even if there's an error
      router.push('/')
      router.refresh()
    } finally {
      setIsLoggingOut(false)
    }
  }

  // Get user display info
  const getUserDisplayName = () => {
    if (!user) return ''
    if (user.firstName) {
      return `${user.firstName} ${user.lastName || ''}`.trim()
    }
    return user.email?.split('@')[0] || 'User'
  }

  const getUserInitials = () => {
    const name = getUserDisplayName()
    if (!name) return 'U'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name[0].toUpperCase()
  }

  const getRoleLabel = () => {
    switch (role) {
      case 'hq_admin': return 'HQ Admin'
      case 'licensee_owner': return 'Licensee Owner'
      case 'director': return 'Director'
      case 'coach': return 'Coach'
      case 'parent': return 'Parent'
      default: return 'User'
    }
  }

  const getRoleIcon = () => {
    if (isHqAdmin) return Shield
    if (isLicenseeOwner) return Building2
    if (isDirector || isCoach) return Crown
    return User
  }

  const getDashboardLink = () => {
    // Use effective role (which considers viewingAsRole)
    if (isHqAdmin) return '/admin'
    if (isLicenseeOwner || isDirector || isCoach) return '/portal'
    return '/dashboard'
  }

  // Get the actual dashboard for the real role (ignoring view-as)
  const getActualDashboardLink = () => {
    if (actualRole === 'hq_admin') return '/admin'
    if (['licensee_owner', 'director', 'coach'].includes(actualRole || '')) return '/portal'
    return '/dashboard'
  }

  const RoleIcon = getRoleIcon()

  // Loading state
  if (loading) {
    return (
      <div className={cn('flex items-center gap-4', className)}>
        <div className="h-10 w-10 bg-white/10 animate-pulse" />
      </div>
    )
  }

  // Not authenticated - show sign in / register
  if (!user) {
    if (variant === 'sidebar') {
      return null // Sidebar doesn't show for unauthenticated users
    }

    return (
      <div className={cn('flex items-center gap-4', className)}>
        <Link
          href="/login"
          className="px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white/80 hover:text-neon transition-colors"
        >
          Sign In
        </Link>
        <Link
          href="/signup"
          className="px-6 py-3 bg-neon text-black text-sm font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
        >
          Register Now
        </Link>
      </div>
    )
  }

  // Authenticated user - show dropdown
  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoggingOut}
        className={cn(
          'flex items-center gap-3 transition-all',
          variant === 'sidebar' && 'w-full px-4 py-3 hover:bg-white/5',
          variant === 'navbar' && 'px-2 py-1 hover:bg-white/5',
          variant === 'header' && 'px-2 py-1 hover:bg-white/5',
          isLoggingOut && 'opacity-50 cursor-not-allowed'
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar */}
        <div
          className={cn(
            'flex items-center justify-center bg-neon/10 border border-neon/30',
            variant === 'sidebar' ? 'h-10 w-10' : 'h-9 w-9'
          )}
        >
          <span className="text-neon font-black text-sm">{getUserInitials()}</span>
        </div>

        {/* Name and role (shown in sidebar variant) */}
        {variant === 'sidebar' && (
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold text-white truncate">
              {getUserDisplayName()}
            </p>
            <p className="text-xs text-white/40 uppercase tracking-wider">
              {getRoleLabel()}
            </p>
          </div>
        )}

        {/* Dropdown indicator */}
        <ChevronDown
          className={cn(
            'h-4 w-4 text-white/50 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 w-64 bg-black border border-white/10 shadow-2xl',
            'animate-in fade-in-0 zoom-in-95 duration-150',
            variant === 'sidebar' ? 'bottom-full left-0 mb-2' : 'top-full right-0 mt-2'
          )}
        >
          {/* User info header */}
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex items-center justify-center bg-neon/10 border border-neon/30">
                <span className="text-neon font-black">{getUserInitials()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {getUserDisplayName()}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <RoleIcon className="h-3 w-3 text-neon" />
                  <span className="text-xs text-neon uppercase tracking-wider">
                    {getRoleLabel()}
                  </span>
                </div>
                {tenant && (
                  <p className="text-xs text-white/40 truncate mt-0.5">
                    {tenant.name}
                  </p>
                )}
              </div>
            </div>
            {/* View-as indicator */}
            {isViewingAsOtherRole && (
              <div className="mt-3 p-2 bg-purple/10 border border-purple/30">
                <p className="text-xs text-purple">
                  Viewing as {getRoleLabel()} (actually HQ Admin)
                </p>
                <button
                  onClick={() => {
                    setViewingAsRole(null)
                    setIsOpen(false)
                  }}
                  className="text-xs text-purple hover:text-purple/80 underline mt-1"
                >
                  Exit preview mode
                </button>
              </div>
            )}
          </div>

          {/* Menu items */}
          <div className="py-2">
            <Link
              href={getDashboardLink()}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="font-medium">Dashboard</span>
            </Link>

            {/* Show parent dashboard link if user has parent role but is viewing as another role */}
            {hasParentRole && role !== 'parent' && (
              <Link
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Home className="h-4 w-4" />
                <span className="font-medium">Parent Dashboard</span>
              </Link>
            )}

            {/* Show link to actual admin dashboard when viewing as another role */}
            {isViewingAsOtherRole && (
              <Link
                href="/admin"
                onClick={() => {
                  setViewingAsRole(null)
                  setIsOpen(false)
                }}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-purple hover:text-purple/80 hover:bg-purple/5 transition-colors"
              >
                <Shield className="h-4 w-4" />
                <span className="font-medium">Back to Admin</span>
              </Link>
            )}

            <Link
              href={`${getDashboardLink()}/settings`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span className="font-medium">Settings</span>
            </Link>
          </div>

          {/* Logout */}
          <div className="border-t border-white/10 py-2">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={cn(
                'flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors',
                'text-white/70 hover:text-red-400 hover:bg-red-500/10',
                isLoggingOut && 'opacity-50 cursor-not-allowed'
              )}
            >
              <LogOut className="h-4 w-4" />
              <span className="font-medium">
                {isLoggingOut ? 'Logging out...' : 'Log Out'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * LogoutButton - Simple logout button for inline use
 *
 * Use this when you just need a logout button without the full menu
 * (e.g., in sidebar footer where space is limited)
 */
export function LogoutButton({
  className,
  showLabel = false,
}: {
  className?: string
  showLabel?: boolean
}) {
  const router = useRouter()
  const { signOut } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
      router.push('/')
      router.refresh()
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={cn(
        'flex items-center gap-2 text-white/40 hover:text-red-400 transition-colors',
        isLoggingOut && 'opacity-50 cursor-not-allowed',
        className
      )}
      title="Log out"
    >
      <LogOut className={cn('h-5 w-5', isLoggingOut && 'animate-pulse')} />
      {showLabel && (
        <span className="text-sm font-medium">
          {isLoggingOut ? 'Logging out...' : 'Log Out'}
        </span>
      )}
    </button>
  )
}
