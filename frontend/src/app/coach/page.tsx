'use client'

/**
 * Coach Dashboard
 *
 * The main landing page for coaches - a focused "game-day hub" that answers:
 * - What camps am I coaching?
 * - What's my schedule today?
 * - Which athletes/groups am I responsible for?
 * - What drills/curriculum am I running?
 * - Where am I on training and incentives?
 *
 * Features are gated behind LMS completion.
 */

import { useAuth } from '@/lib/auth/context'
import { PortalPageHeader, LmsGate } from '@/components/portal'
import { CoachDashboardOverview } from '@/components/coach'
import { GraduationCap, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function CoachDashboard() {
  const { user, hasCompletedRequiredLms } = useAuth()
  const userName = user?.firstName || user?.email?.split('@')[0] || 'Coach'

  return (
    <div>
      <PortalPageHeader
        title="Coach Dashboard"
        description={`Welcome back, ${userName}`}
        actions={
          <Link
            href="/coach/today"
            className="px-4 py-2 bg-blue-400 text-black font-bold uppercase tracking-wider text-sm hover:bg-blue-400/90 transition-colors"
          >
            Today&apos;s Schedule
          </Link>
        }
      />

      {/* LMS Banner - Prominent when not complete */}
      {!hasCompletedRequiredLms && (
        <div className="mb-8 p-6 bg-gradient-to-r from-purple/20 to-blue-400/20 border border-purple/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 bg-purple/20 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="h-6 w-6 text-purple" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Get Certified</h2>
                <p className="text-white/60 text-sm mt-1">
                  Complete your EmpowerU training modules with 100% quiz scores to unlock all coach features and receive your certification.
                </p>
              </div>
            </div>
            <Link
              href="/coach/empoweru"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple text-white font-bold uppercase tracking-wider hover:bg-purple/90 transition-colors whitespace-nowrap"
            >
              Continue Training
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      )}

      {/* Main Dashboard Content */}
      <LmsGate variant="card" featureName="coach dashboard">
        <CoachDashboardOverview />
      </LmsGate>
    </div>
  )
}
