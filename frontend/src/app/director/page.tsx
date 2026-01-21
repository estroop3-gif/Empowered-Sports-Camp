'use client'

/**
 * Director Portal Dashboard
 *
 * Comprehensive hub for Camp Directors (Independent Contractors).
 * Shows:
 * - Welcome card with role summary and responsibilities
 * - Today's camps with quick actions
 * - Upcoming camps
 * - EmpowerU progress (Operational Execution Portal)
 * - Incentive snapshot
 * - Quick links to all director tools
 *
 * Most features are gated behind LMS completion.
 */

import { useAuth } from '@/lib/auth/context'
import { PortalPageHeader, LmsGate } from '@/components/portal'
import { DirectorDashboardOverview } from '@/components/director/DirectorDashboardOverview'
import { GraduationCap, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function DirectorDashboard() {
  const { user, hasCompletedRequiredLms } = useAuth()
  const userName = user?.firstName || user?.email?.split('@')[0] || 'Director'

  return (
    <div>
      <PortalPageHeader
        title="Director Dashboard"
        description={`Welcome back, ${userName}`}
        actions={
          <Link
            href="/director/today"
            className="px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider text-sm hover:bg-neon/90 transition-colors"
          >
            Today's Camps
          </Link>
        }
      />

      {/* LMS Banner - Prominent when not complete */}
      {!hasCompletedRequiredLms && (
        <div className="mb-8 p-6 bg-gradient-to-r from-magenta/20 to-purple/20 border border-magenta/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 bg-magenta/20 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="h-6 w-6 text-magenta" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Get Certified</h2>
                <p className="text-white/60 text-sm mt-1">
                  Complete your EmpowerU training modules with 100% quiz scores to unlock all camp management tools and receive your Director certification.
                </p>
              </div>
            </div>
            <Link
              href="/director/empoweru"
              className="inline-flex items-center gap-2 px-6 py-3 bg-magenta text-white font-bold uppercase tracking-wider hover:bg-magenta/90 transition-colors whitespace-nowrap"
            >
              Continue Training
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      )}

      {/* Main Dashboard Content */}
      <LmsGate variant="card" featureName="director dashboard">
        <DirectorDashboardOverview />
      </LmsGate>
    </div>
  )
}
