'use client'

import { useState } from 'react'
import { useAuth, UserRole } from '@/lib/auth/context'
import { cn } from '@/lib/utils'
import {
  Eye,
  EyeOff,
  Shield,
  Building2,
  Users,
  UserCheck,
  Crown,
  X,
  ChevronDown,
} from 'lucide-react'

/**
 * RoleSwitcher - Allows hq_admin to view the app as different roles
 *
 * Features:
 * - Dropdown to select a role to view as
 * - Sticky banner when viewing as another role
 * - Quick exit button to return to admin view
 *
 * Only visible to hq_admin users.
 */

const ROLES: { value: UserRole; label: string; icon: typeof Shield; description: string }[] = [
  {
    value: 'hq_admin',
    label: 'HQ Admin',
    icon: Shield,
    description: 'Full system access',
  },
  {
    value: 'licensee_owner',
    label: 'Licensee Owner',
    icon: Building2,
    description: 'Franchise owner view',
  },
  {
    value: 'director',
    label: 'Director',
    icon: Users,
    description: 'Camp director view',
  },
  {
    value: 'coach',
    label: 'Coach',
    icon: UserCheck,
    description: 'Coach view',
  },
  {
    value: 'parent',
    label: 'Parent',
    icon: Crown,
    description: 'Parent/guardian view',
  },
]

interface RoleSwitcherProps {
  className?: string
  variant?: 'dropdown' | 'inline'
}

export function RoleSwitcher({ className, variant = 'dropdown' }: RoleSwitcherProps) {
  const { actualRole, viewingAsRole, setViewingAsRole, isViewingAsOtherRole } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  // Only show for hq_admin
  if (actualRole !== 'hq_admin') {
    return null
  }

  const currentRole = viewingAsRole || actualRole
  const currentRoleInfo = ROLES.find(r => r.value === currentRole)
  const CurrentIcon = currentRoleInfo?.icon || Shield

  const handleSelectRole = (role: UserRole) => {
    setViewingAsRole(role === 'hq_admin' ? null : role)
    setIsOpen(false)
  }

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span className="text-xs text-white/40 uppercase tracking-wider">View as:</span>
        <div className="flex flex-wrap gap-1">
          {ROLES.map((role) => {
            const Icon = role.icon
            const isActive = (role.value === 'hq_admin' && !viewingAsRole) || role.value === viewingAsRole
            return (
              <button
                key={role.value}
                onClick={() => handleSelectRole(role.value)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 text-xs font-medium transition-all',
                  isActive
                    ? 'bg-neon/20 text-neon border border-neon/30'
                    : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className="h-3 w-3" />
                {role.label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-sm transition-all border',
          isViewingAsOtherRole
            ? 'bg-purple/20 text-purple border-purple/30'
            : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
        )}
      >
        <Eye className="h-4 w-4" />
        <span className="font-medium">
          {isViewingAsOtherRole ? `Viewing as ${currentRoleInfo?.label}` : 'View as Role'}
        </span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 w-64 bg-black border border-white/10 shadow-xl z-[70]">
            <div className="p-2 border-b border-white/10">
              <p className="text-xs text-white/40 uppercase tracking-wider px-2">
                Preview as different role
              </p>
            </div>
            <div className="py-1">
              {ROLES.map((role) => {
                const Icon = role.icon
                const isActive = (role.value === 'hq_admin' && !viewingAsRole) || role.value === viewingAsRole
                return (
                  <button
                    key={role.value}
                    onClick={() => handleSelectRole(role.value)}
                    className={cn(
                      'flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors',
                      isActive
                        ? 'bg-neon/10 text-neon'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <div className={cn(
                      'h-8 w-8 flex items-center justify-center border',
                      isActive ? 'bg-neon/20 border-neon/30' : 'bg-white/5 border-white/10'
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{role.label}</p>
                      <p className="text-xs text-white/40">{role.description}</p>
                    </div>
                    {isActive && (
                      <div className="ml-auto">
                        <div className="h-2 w-2 bg-neon rounded-full" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * ViewingAsBanner - Shows a sticky banner when viewing as another role
 *
 * Should be placed at the top of the layout to always be visible.
 */
export function ViewingAsBanner() {
  const { actualRole, viewingAsRole, setViewingAsRole, isViewingAsOtherRole } = useAuth()

  // Only show when hq_admin is viewing as another role
  if (!isViewingAsOtherRole) {
    return null
  }

  const roleInfo = ROLES.find(r => r.value === viewingAsRole)
  const RoleIcon = roleInfo?.icon || Crown

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-purple text-white">
      <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="h-4 w-4" />
            <span className="text-sm font-medium">
              Viewing as <strong>{roleInfo?.label}</strong>
            </span>
            <span className="text-xs text-white/60">
              (You are actually HQ Admin)
            </span>
          </div>
          <button
            onClick={() => setViewingAsRole(null)}
            className="flex items-center gap-2 px-3 py-1 bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium"
          >
            <EyeOff className="h-4 w-4" />
            Exit Preview
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * RoleSwitcherCompact - A compact version for headers/toolbars
 */
export function RoleSwitcherCompact({ className }: { className?: string }) {
  const { actualRole, viewingAsRole, setViewingAsRole, isViewingAsOtherRole } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  if (actualRole !== 'hq_admin') {
    return null
  }

  const currentRole = viewingAsRole || actualRole
  const currentRoleInfo = ROLES.find(r => r.value === currentRole)
  const CurrentIcon = currentRoleInfo?.icon || Shield

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="View as different role"
        className={cn(
          'flex items-center justify-center h-9 w-9 transition-all border',
          isViewingAsOtherRole
            ? 'bg-purple/20 text-purple border-purple/30'
            : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white'
        )}
      >
        <Eye className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 mt-1 w-56 bg-black border border-white/10 shadow-xl z-[70]">
            <div className="p-2 border-b border-white/10">
              <p className="text-xs text-white/40 uppercase tracking-wider">View as</p>
            </div>
            <div className="py-1">
              {ROLES.map((role) => {
                const Icon = role.icon
                const isActive = (role.value === 'hq_admin' && !viewingAsRole) || role.value === viewingAsRole
                return (
                  <button
                    key={role.value}
                    onClick={() => {
                      setViewingAsRole(role.value === 'hq_admin' ? null : role.value)
                      setIsOpen(false)
                    }}
                    className={cn(
                      'flex items-center gap-2 w-full px-3 py-2 text-left text-sm transition-colors',
                      isActive
                        ? 'bg-neon/10 text-neon'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{role.label}</span>
                    {isActive && <div className="ml-auto h-1.5 w-1.5 bg-neon rounded-full" />}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
