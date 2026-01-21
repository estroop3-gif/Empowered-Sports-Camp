'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import {
  ROLE_CONFIG,
  ROLE_HOME_ROUTES,
  getViewAsOptions,
  UserRole,
} from '@/lib/roles/config'
import { cn } from '@/lib/utils'
import {
  Eye,
  EyeOff,
  ChevronDown,
  Check,
  RotateCcw,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react'

/**
 * ViewAsControl
 *
 * Dropdown control that allows hq_admin to switch their "viewing role"
 * to see the app as different user types.
 *
 * SECURITY NOTE:
 * This is a UI-only feature. When viewing as a different role:
 * - Navigation and dashboard layouts change
 * - The actual session remains unchanged
 * - Authorization policies still use the real user identity
 * - API calls still use real permissions
 *
 * This is designed for admins to preview the user experience,
 * not to actually gain or lose permissions.
 */

interface ViewAsControlProps {
  className?: string
  variant?: 'full' | 'compact'
}

export function ViewAsControl({ className, variant = 'full' }: ViewAsControlProps) {
  const router = useRouter()
  const {
    actualRole,
    role,
    viewingAsRole,
    setViewingAsRole,
    resetViewingRole,
    isViewingAsOtherRole,
    canUseViewAs,
  } = useAuth()

  const [isOpen, setIsOpen] = useState(false)
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

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // Only show for users who can use View As
  if (!canUseViewAs) {
    return null
  }

  const viewAsOptions = getViewAsOptions()
  const currentRoleConfig = role ? ROLE_CONFIG[role] : null
  const CurrentIcon = currentRoleConfig?.icon || Eye

  const handleSelectRole = (selectedRole: UserRole) => {
    // If selecting actual role, reset instead
    if (selectedRole === actualRole) {
      resetViewingRole()
    } else {
      setViewingAsRole(selectedRole)
    }
    setIsOpen(false)

    // Navigate to the appropriate dashboard for the new role
    const targetRoute = ROLE_HOME_ROUTES[selectedRole]
    router.push(targetRoute)
  }

  const handleReset = () => {
    resetViewingRole()
    setIsOpen(false)
    if (actualRole) {
      router.push(ROLE_HOME_ROUTES[actualRole])
    }
  }

  if (variant === 'compact') {
    return (
      <div ref={dropdownRef} className={cn('relative', className)}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          title={isViewingAsOtherRole ? `Viewing as ${currentRoleConfig?.label}` : 'View as different role'}
          className={cn(
            'flex items-center justify-center h-9 w-9 transition-all border',
            isViewingAsOtherRole
              ? 'bg-purple/20 text-purple border-purple/30 animate-pulse'
              : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white'
          )}
        >
          <Eye className="h-4 w-4" />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full right-0 mt-2 w-72 bg-black border border-white/10 shadow-2xl z-[70]">
              <ViewAsDropdownContent
                viewAsOptions={viewAsOptions}
                actualRole={actualRole}
                viewingAsRole={viewingAsRole}
                isViewingAsOtherRole={isViewingAsOtherRole}
                onSelectRole={handleSelectRole}
                onReset={handleReset}
              />
            </div>
          </>
        )}
      </div>
    )
  }

  // Full variant
  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
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
          Viewing as: {currentRoleConfig?.label || 'Loading...'}
        </span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-80 bg-black border border-white/10 shadow-2xl z-[70]">
            <ViewAsDropdownContent
              viewAsOptions={viewAsOptions}
              actualRole={actualRole}
              viewingAsRole={viewingAsRole}
              isViewingAsOtherRole={isViewingAsOtherRole}
              onSelectRole={handleSelectRole}
              onReset={handleReset}
            />
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Dropdown content - shared between compact and full variants
 */
function ViewAsDropdownContent({
  viewAsOptions,
  actualRole,
  viewingAsRole,
  isViewingAsOtherRole,
  onSelectRole,
  onReset,
}: {
  viewAsOptions: UserRole[]
  actualRole: UserRole | null
  viewingAsRole: UserRole | null
  isViewingAsOtherRole: boolean
  onSelectRole: (role: UserRole) => void
  onReset: () => void
}) {
  return (
    <>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10">
        <p className="text-xs font-bold uppercase tracking-wider text-white/40">
          Preview as different role
        </p>
        {isViewingAsOtherRole && (
          <p className="text-xs text-purple mt-1">
            Your actual role is {actualRole ? ROLE_CONFIG[actualRole].label : 'Unknown'}
          </p>
        )}
      </div>

      {/* Role Options */}
      <div className="py-2">
        {viewAsOptions.map((roleOption) => {
          const config = ROLE_CONFIG[roleOption]
          const Icon = config.icon
          const isActual = roleOption === actualRole
          const isViewing = (viewingAsRole === roleOption) || (viewingAsRole === null && isActual)

          return (
            <button
              key={roleOption}
              onClick={() => onSelectRole(roleOption)}
              className={cn(
                'flex items-center gap-3 w-full px-4 py-3 text-left transition-colors',
                isViewing
                  ? 'bg-neon/10 text-neon'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              )}
            >
              <div className={cn(
                'h-10 w-10 flex items-center justify-center border',
                isViewing
                  ? 'bg-neon/20 border-neon/30'
                  : `${config.bgColor} ${config.borderColor}`
              )}>
                <Icon className={cn('h-5 w-5', isViewing ? 'text-neon' : config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{config.label}</p>
                  {isActual && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-white/10 text-white/50 uppercase tracking-wider">
                      Your role
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/40 truncate">{config.description}</p>
              </div>
              {isViewing && (
                <Check className="h-4 w-4 text-neon flex-shrink-0" />
              )}
            </button>
          )
        })}
      </div>

      {/* Reset Button */}
      {isViewingAsOtherRole && (
        <div className="px-4 py-3 border-t border-white/10">
          <button
            onClick={onReset}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-purple hover:bg-purple/10 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to actual role ({actualRole ? ROLE_CONFIG[actualRole].shortLabel : ''})
          </button>
        </div>
      )}
    </>
  )
}

/**
 * ViewingAsBanner
 *
 * A persistent banner shown at the very top of the page when
 * viewing as a role different from actual role.
 * Makes it clear that the UI is in preview mode.
 * Includes LMS bypass toggle to preview full dashboard functionality.
 */
export function ViewingAsBanner() {
  const router = useRouter()
  const {
    actualRole,
    role,
    resetViewingRole,
    isViewingAsOtherRole,
    lmsBypassEnabled,
    toggleLmsBypass,
  } = useAuth()

  if (!isViewingAsOtherRole || !role || !actualRole) {
    return null
  }

  const viewingConfig = ROLE_CONFIG[role]
  const actualConfig = ROLE_CONFIG[actualRole]
  const ViewingIcon = viewingConfig.icon

  const handleExit = () => {
    resetViewingRole()
    router.push(ROLE_HOME_ROUTES[actualRole])
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-purple">
      <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="h-4 w-4 text-white" />
            <ViewingIcon className="h-4 w-4 text-white/80" />
            <span className="text-sm font-medium text-white">
              Viewing as <strong>{viewingConfig.label}</strong>
            </span>
            <span className="text-xs text-white/60 hidden sm:inline">
              (Your actual role: {actualConfig.label})
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* LMS Bypass Toggle */}
            <button
              onClick={toggleLmsBypass}
              title={lmsBypassEnabled ? 'LMS training bypassed - Click to see training gates' : 'Click to bypass LMS training gates'}
              className={cn(
                'flex items-center gap-2 px-3 py-1 transition-colors text-sm font-medium',
                lmsBypassEnabled
                  ? 'bg-neon text-black hover:bg-neon/90'
                  : 'bg-white/10 text-white hover:bg-white/20'
              )}
            >
              {lmsBypassEnabled ? (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Training Bypassed</span>
                </>
              ) : (
                <>
                  <GraduationCap className="h-4 w-4" />
                  <span className="hidden sm:inline">Bypass Training</span>
                </>
              )}
            </button>
            <button
              onClick={handleExit}
              className="flex items-center gap-2 px-3 py-1 bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium text-white"
            >
              <EyeOff className="h-4 w-4" />
              <span className="hidden sm:inline">Exit Preview</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
