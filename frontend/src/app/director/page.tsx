'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import {
  Calendar,
  Users,
  Clock,
  ArrowRight,
  GraduationCap,
  ClipboardList,
  MessageSquare,
  BookOpen,
  Loader2,
} from 'lucide-react'
import { fetchUpcomingCampsForDirector, type DirectorCamp } from '@/lib/services/camps'

/**
 * Director Portal Dashboard
 *
 * Shows:
 * - LMS completion status (prominent if not complete)
 * - Today's and upcoming camps
 * - Quick actions (grouping, recaps, communications)
 * - Curriculum access
 *
 * Most features are gated behind LMS completion.
 */

export default function DirectorDashboard() {
  const { user, hasCompletedRequiredLms } = useAuth()
  const [loading, setLoading] = useState(true)
  const [camps, setCamps] = useState<DirectorCamp[]>([])
  const [todayCamps, setTodayCamps] = useState<DirectorCamp[]>([])

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Director'

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    const today = new Date().toISOString().split('T')[0]

    // Fetch camps assigned to this director (via staff_assignments)
    // For now, we'll fetch all camps - in production, filter by staff_assignments
    const { data: campsData, error } = await fetchUpcomingCampsForDirector(10)

    if (error) {
      console.error('Error loading camps:', error)
    }

    if (campsData) {
      setCamps(campsData)

      // Filter for today's camps
      const todaysCamps = campsData.filter(
        (c) => c.start_date <= today && c.end_date >= today
      )
      setTodayCamps(todaysCamps)
    }

    setLoading(false)
  }

  // Quick action cards shown when LMS is complete
  const quickActions = [
    {
      title: 'Grouping Tool',
      description: 'Manage camper groups and assignments',
      href: '/director/camps',
      icon: Users,
      color: 'neon',
    },
    {
      title: 'Daily Recaps',
      description: 'Enter notes and flag incidents',
      href: '/director/daily-recaps',
      icon: ClipboardList,
      color: 'purple',
    },
    {
      title: 'Communications',
      description: 'Send updates to parents',
      href: '/director/communications',
      icon: MessageSquare,
      color: 'magenta',
    },
    {
      title: 'Curriculum',
      description: 'View and contribute to curriculum',
      href: '/director/curriculum',
      icon: BookOpen,
      color: 'orange',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-magenta animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <PortalPageHeader
        title={`Welcome, ${userName}`}
        description="Manage your camps, groups, and daily operations"
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
                  Finish the Director Certification Program to unlock camp management tools.
                </p>
              </div>
            </div>
            <Link
              href="/director/lms"
              className="inline-flex items-center gap-2 px-6 py-3 bg-magenta text-white font-bold uppercase tracking-wider hover:bg-magenta/90 transition-colors whitespace-nowrap"
            >
              Continue Training
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      )}

      {/* Today's Camps */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-neon" />
          Today's Camps
        </h2>

        {todayCamps.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {todayCamps.map((camp) => (
              <PortalCard key={camp.id} accent="neon">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-white">{camp.name}</h3>
                    <p className="text-sm text-white/50 mt-1">
                      {new Date(camp.start_date).toLocaleDateString()} - {new Date(camp.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="px-2 py-1 bg-neon/10 text-neon text-xs font-bold uppercase">
                    Active
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Users className="h-4 w-4" />
                    <span>{camp.capacity || 0} capacity</span>
                  </div>
                  <LmsGate variant="inline" featureName="camp details">
                    <Link
                      href={`/director/camps/${camp.id}`}
                      className="text-sm text-neon hover:text-neon/80 font-semibold flex items-center gap-1"
                    >
                      Manage
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </LmsGate>
                </div>
              </PortalCard>
            ))}
          </div>
        ) : (
          <PortalCard>
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/50">No camps scheduled for today</p>
            </div>
          </PortalCard>
        )}
      </div>

      {/* Quick Actions - Gated behind LMS */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-purple" />
          Quick Actions
        </h2>

        <LmsGate variant="card" featureName="operational tools">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link key={action.href} href={action.href}>
                  <PortalCard
                    className="h-full hover:border-white/30 transition-colors cursor-pointer"
                    accent={action.color as any}
                  >
                    <Icon className={`h-8 w-8 text-${action.color} mb-3`} />
                    <h3 className="font-bold text-white mb-1">{action.title}</h3>
                    <p className="text-sm text-white/50">{action.description}</p>
                  </PortalCard>
                </Link>
              )
            })}
          </div>
        </LmsGate>
      </div>

      {/* Upcoming Camps */}
      <div>
        <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-magenta" />
          Upcoming Camps
        </h2>

        {camps.length > 0 ? (
          <PortalCard>
            <div className="divide-y divide-white/10">
              {camps.slice(0, 5).map((camp) => (
                <div key={camp.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-white">{camp.name}</h4>
                    <p className="text-sm text-white/50">
                      {new Date(camp.start_date).toLocaleDateString()} - {new Date(camp.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <LmsGate variant="inline" featureName="camp details">
                    <Link
                      href={`/director/camps/${camp.id}`}
                      className="text-sm text-neon hover:text-neon/80"
                    >
                      View →
                    </Link>
                  </LmsGate>
                </div>
              ))}
            </div>
          </PortalCard>
        ) : (
          <PortalCard>
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/50">No upcoming camps assigned</p>
            </div>
          </PortalCard>
        )}
      </div>
    </div>
  )
}
