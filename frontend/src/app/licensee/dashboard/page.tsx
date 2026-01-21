'use client'

/**
 * Licensee Dashboard Page
 *
 * Main hub for licensee business owners to manage their territory.
 * Shows KPIs, camps, staff, finances, and action items.
 */

import { useAuth } from '@/lib/auth/context'
import { PortalPageHeader, LmsGate } from '@/components/portal'
import { LicenseeDashboardOverview } from '@/components/licensee/LicenseeDashboardOverview'
import { GraduationCap, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function LicenseeDashboardPage() {
  const { user, hasCompletedRequiredLms } = useAuth()
  const userName = user?.firstName || user?.email?.split('@')[0] || 'Owner'

  return (
    <div>
      <PortalPageHeader
        title="Licensee Dashboard"
        description={`Welcome back, ${userName}`}
        actions={
          <Link
            href="/licensee/camps"
            className="px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider text-sm hover:bg-neon/90 transition-colors"
          >
            My Camps
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
                <h2 className="text-lg font-bold text-white">Complete Your Training</h2>
                <p className="text-white/60 text-sm mt-1">
                  Finish your required EmpowerU training modules to unlock all territory management tools.
                </p>
              </div>
            </div>
            <Link
              href="/licensee/empoweru"
              className="inline-flex items-center gap-2 px-6 py-3 bg-magenta text-white font-bold uppercase tracking-wider hover:bg-magenta/90 transition-colors whitespace-nowrap"
            >
              Continue Training
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      )}

      {/* Main Dashboard Content */}
      <LmsGate variant="card" featureName="licensee dashboard">
        <LicenseeDashboardOverview />
      </LmsGate>
    </div>
  )
}
