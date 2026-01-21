'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { ROLE_CONFIG } from '@/lib/roles/config'
import {
  GraduationCap,
  Lock,
  ArrowRight,
  CheckCircle,
  ExternalLink,
} from 'lucide-react'

/**
 * LmsGate
 *
 * A wrapper component that gates access to features based on LMS completion.
 * Shows a "training required" screen when the user hasn't completed their
 * required LMS modules.
 *
 * Usage:
 * <LmsGate>
 *   <SomeProtectedFeature />
 * </LmsGate>
 */

interface LmsGateProps {
  children: React.ReactNode
  /** Custom message to show when training is required */
  message?: string
  /** Whether to show as inline block vs full page takeover */
  variant?: 'page' | 'inline' | 'card'
  /** Custom LMS path to link to */
  lmsPath?: string
  /** Feature name being gated (for messaging) */
  featureName?: string
}

export function LmsGate({
  children,
  message,
  variant = 'page',
  lmsPath,
  featureName,
}: LmsGateProps) {
  const { role, hasCompletedRequiredLms, lmsStatus } = useAuth()

  // If training is complete, render children
  if (hasCompletedRequiredLms) {
    return <>{children}</>
  }

  // Determine the LMS path based on role (using EmpowerU training)
  const defaultLmsPath = role === 'director'
    ? '/director/empoweru'
    : role === 'cit_volunteer'
      ? '/cit/empoweru'
      : role === 'coach'
        ? '/coach/empoweru'
        : role === 'licensee_owner'
          ? '/licensee/empoweru'
          : '/empoweru'

  const targetLmsPath = lmsPath || defaultLmsPath
  const roleConfig = role ? ROLE_CONFIG[role] : null
  const roleLabel = roleConfig?.label || 'Staff'

  // Determine training description
  const requiredModules = 'EmpowerU Training & Certification'

  // Full page variant
  if (variant === 'page') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="max-w-lg text-center">
          {/* Locked Icon */}
          <div className="relative mb-8">
            <div className="h-24 w-24 mx-auto bg-magenta/10 border-2 border-magenta flex items-center justify-center">
              <Lock className="h-12 w-12 text-magenta" />
            </div>
            <div className="absolute -top-2 -right-2 h-10 w-10 bg-neon flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-black" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-black text-white uppercase tracking-wider mb-4">
            Training Required
          </h1>

          {/* Message */}
          <p className="text-white/60 mb-2">
            {message || (
              <>
                Complete your required training to unlock
                {featureName ? ` ${featureName}` : ' this feature'}.
              </>
            )}
          </p>
          <p className="text-white/40 text-sm mb-8">
            This ensures all {roleLabel}s have the essential knowledge to provide an amazing camp experience.
          </p>

          {/* CTA */}
          <Link
            href={targetLmsPath}
            className="inline-flex items-center gap-2 px-6 py-4 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors"
          >
            <GraduationCap className="h-5 w-5" />
            Start Training
            <ArrowRight className="h-5 w-5" />
          </Link>

          {/* Additional Links for Volunteers */}
          {role === 'cit_volunteer' && (
            <div className="mt-6">
              <a
                href="https://www.nfhslearn.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-purple hover:text-purple/80 transition-colors"
              >
                NFHS Learn (External Training)
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Card variant
  if (variant === 'card') {
    return (
      <div className="p-6 bg-magenta/5 border border-magenta/30">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 bg-magenta/10 border border-magenta/30 flex items-center justify-center flex-shrink-0">
            <Lock className="h-6 w-6 text-magenta" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white mb-1">Training Required</h3>
            <p className="text-sm text-white/60 mb-4">
              {message || `Complete your required training to access${featureName ? ` ${featureName}` : ' this feature'}.`}
            </p>
            <Link
              href={targetLmsPath}
              className="inline-flex items-center gap-2 text-sm text-neon hover:text-neon/80 font-semibold"
            >
              Start Training
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Inline variant
  return (
    <div className="p-4 bg-white/5 border border-white/10 text-center">
      <div className="flex items-center justify-center gap-2 text-white/60 mb-2">
        <Lock className="h-4 w-4" />
        <span className="text-sm">Training required to access{featureName ? ` ${featureName}` : ' this feature'}</span>
      </div>
      <Link
        href={targetLmsPath}
        className="text-sm text-neon hover:underline"
      >
        Complete training →
      </Link>
    </div>
  )
}

/**
 * LmsProgressIndicator
 *
 * Shows the current LMS completion status.
 */
interface LmsProgressIndicatorProps {
  className?: string
  showDetails?: boolean
}

export function LmsProgressIndicator({ className, showDetails = true }: LmsProgressIndicatorProps) {
  const { role, lmsStatus, hasCompletedRequiredLms } = useAuth()

  // Determine which status to show based on role
  const statusLabel = role === 'director'
    ? 'Director Training'
    : role === 'cit_volunteer'
      ? 'Volunteer Training'
      : 'Core Training'

  const isComplete = hasCompletedRequiredLms

  return (
    <div className={className}>
      <div className={`flex items-center gap-2 ${isComplete ? 'text-neon' : 'text-yellow-400'}`}>
        {isComplete ? (
          <CheckCircle className="h-5 w-5" />
        ) : (
          <GraduationCap className="h-5 w-5" />
        )}
        <span className="font-bold">
          {statusLabel}: {isComplete ? 'Complete' : 'In Progress'}
        </span>
      </div>

      {showDetails && !isComplete && (
        <p className="text-sm text-white/50 mt-1">
          Complete your required training to unlock all features.
        </p>
      )}
    </div>
  )
}
