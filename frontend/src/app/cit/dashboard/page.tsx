'use client'

/**
 * CIT / Volunteer Dashboard
 *
 * Main control center for CITs showing:
 * - Welcome and status
 * - Today's schedule
 * - Upcoming camps
 * - EmpowerU training progress
 * - Certification status
 * - Quick links
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { PortalPageHeader, PortalCard } from '@/components/portal'
import { cn } from '@/lib/utils'
import {
  Loader2,
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
  Users,
  GraduationCap,
  CheckCircle,
  Circle,
  Upload,
  ExternalLink,
  ChevronRight,
  BookOpen,
  Star,
  Trophy,
} from 'lucide-react'
import type { CitDashboardOverview } from '@/lib/services/cit-dashboard'

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  applied: { label: 'Application Submitted', color: 'text-yellow-400', bgColor: 'bg-yellow-400/10' },
  under_review: { label: 'Under Review', color: 'text-blue-400', bgColor: 'bg-blue-400/10' },
  interview_scheduled: { label: 'Interview Scheduled', color: 'text-purple', bgColor: 'bg-purple/10' },
  interview_completed: { label: 'Interview Complete', color: 'text-purple', bgColor: 'bg-purple/10' },
  training_pending: { label: 'Training Required', color: 'text-orange-400', bgColor: 'bg-orange-400/10' },
  training_complete: { label: 'Training Complete', color: 'text-neon', bgColor: 'bg-neon/10' },
  approved: { label: 'Approved', color: 'text-neon', bgColor: 'bg-neon/10' },
  assigned_first_camp: { label: 'Active CIT', color: 'text-neon', bgColor: 'bg-neon/10' },
  rejected: { label: 'Not Approved', color: 'text-red-400', bgColor: 'bg-red-400/10' },
  on_hold: { label: 'On Hold', color: 'text-white/50', bgColor: 'bg-white/10' },
  withdrawn: { label: 'Withdrawn', color: 'text-white/30', bgColor: 'bg-white/5' },
}

export default function CitDashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<CitDashboardOverview | null>(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      setLoading(true)
      const res = await fetch('/api/cit/dashboard')
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load dashboard')
      }

      setData(json.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-orange-400 animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div>
        <PortalPageHeader
          title="Dashboard"
          description="Your CIT command center"
        />
        <PortalCard>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Error Loading Dashboard</h3>
            <p className="text-white/50 mb-4">{error}</p>
            <button
              onClick={loadDashboard}
              className="px-6 py-3 bg-orange-400 text-black font-bold uppercase tracking-wider hover:bg-orange-400/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </PortalCard>
      </div>
    )
  }

  const statusConfig = data.application
    ? STATUS_CONFIG[data.application.status] || STATUS_CONFIG.applied
    : null

  return (
    <div>
      <PortalPageHeader
        title="Dashboard"
        description="Your CIT command center"
      />

      {/* Welcome Card */}
      <PortalCard accent="orange" className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">
              Hey {data.profile.first_name}!
            </h2>
            <p className="text-white/60">
              You&apos;re part of the Empowered Sports Camp team. This is where you see your camps, schedule, and training progress.
            </p>
          </div>
          {statusConfig && (
            <div className={cn('px-4 py-2 text-sm font-bold uppercase tracking-wider', statusConfig.bgColor, statusConfig.color)}>
              {statusConfig.label}
            </div>
          )}
        </div>
      </PortalCard>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <PortalCard>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-orange-400/20 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{data.quick_stats.camps_assigned}</div>
              <div className="text-sm text-white/50 uppercase">Camps Assigned</div>
            </div>
          </div>
        </PortalCard>

        <PortalCard>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-neon/20 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-neon" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{data.quick_stats.camps_completed}</div>
              <div className="text-sm text-white/50 uppercase">Camps Completed</div>
            </div>
          </div>
        </PortalCard>

        <PortalCard>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-purple/20 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-purple" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{data.quick_stats.modules_completed}</div>
              <div className="text-sm text-white/50 uppercase">Modules Done</div>
            </div>
          </div>
        </PortalCard>

        <PortalCard>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-magenta/20 flex items-center justify-center">
              <Upload className="h-6 w-6 text-magenta" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{data.quick_stats.certs_approved}</div>
              <div className="text-sm text-white/50 uppercase">Certs Approved</div>
            </div>
          </div>
        </PortalCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Schedule */}
        <PortalCard title="Today's Schedule" accent="orange">
          {data.todays_camps.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/50">No camps scheduled for today</p>
              <p className="text-sm text-white/30 mt-1">Enjoy your day off!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.todays_camps.map((camp) => (
                <div key={camp.camp_id} className="p-4 bg-white/5 border border-white/10">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="font-bold text-white">{camp.camp_name}</h3>
                      <p className="text-sm text-white/50">{camp.role}</p>
                    </div>
                    {camp.station_name && (
                      <span className="px-2 py-1 bg-orange-400/20 text-orange-400 text-xs font-bold uppercase">
                        {camp.station_name}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-white/50 mb-3">
                    {camp.call_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Arrive: {camp.call_time}
                      </span>
                    )}
                    {camp.location_name && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {camp.location_name}
                      </span>
                    )}
                  </div>

                  <Link
                    href="/cit/today"
                    className="inline-flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    View Full Schedule
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </PortalCard>

        {/* Upcoming Camps */}
        <PortalCard
          title="Upcoming Camps"
          headerActions={
            <Link
              href="/cit/camps"
              className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
            >
              View All
            </Link>
          }
        >
          {data.upcoming_camps.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/50">No upcoming camps assigned</p>
              <p className="text-sm text-white/30 mt-1">Check back soon for new assignments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.upcoming_camps.slice(0, 3).map((camp) => (
                <Link
                  key={camp.id}
                  href={`/cit/camps`}
                  className="block p-3 bg-white/5 border border-white/10 hover:border-orange-400/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-white">{camp.name}</h4>
                      <p className="text-sm text-white/50">
                        {new Date(camp.start_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })} - {new Date(camp.end_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    {camp.days_until_start !== null && (
                      <span className="text-sm text-orange-400">
                        {camp.days_until_start === 0
                          ? 'Today'
                          : camp.days_until_start === 1
                          ? 'Tomorrow'
                          : `${camp.days_until_start} days`}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </PortalCard>

        {/* EmpowerU Progress */}
        <PortalCard
          title="Training Progress"
          headerActions={
            <Link
              href="/cit/empoweru"
              className="text-sm text-purple hover:text-purple/80 transition-colors"
            >
              Open EmpowerU
            </Link>
          }
          accent="purple"
        >
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/50">Skill Station Training</span>
              <span className="text-sm font-bold text-purple">
                {data.empoweru_progress.completion_percentage}%
              </span>
            </div>
            <div className="h-2 bg-white/10 overflow-hidden">
              <div
                className="h-full bg-purple transition-all duration-500"
                style={{ width: `${data.empoweru_progress.completion_percentage}%` }}
              />
            </div>
            <p className="text-xs text-white/40 mt-2">
              {data.empoweru_progress.completed_modules} of {data.empoweru_progress.total_modules} modules completed
            </p>
          </div>

          {data.empoweru_progress.required_modules.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-white/50 uppercase tracking-wider">Required Modules</p>
              {data.empoweru_progress.required_modules.slice(0, 3).map((mod) => (
                <div
                  key={mod.module_id}
                  className="flex items-center justify-between p-2 bg-white/5"
                >
                  <div className="flex items-center gap-2">
                    {mod.status === 'COMPLETED' ? (
                      <CheckCircle className="h-4 w-4 text-neon" />
                    ) : mod.status === 'IN_PROGRESS' ? (
                      <Circle className="h-4 w-4 text-yellow-400" />
                    ) : (
                      <Circle className="h-4 w-4 text-white/30" />
                    )}
                    <span className="text-sm text-white">{mod.title}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PortalCard>

        {/* Certifications */}
        <PortalCard
          title="Certifications"
          headerActions={
            <Link
              href="/cit/certifications"
              className="text-sm text-magenta hover:text-magenta/80 transition-colors"
            >
              Manage
            </Link>
          }
          accent="magenta"
        >
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/50">Completion Status</span>
              <span className="text-sm font-bold text-magenta">
                {data.certifications.completed} / {data.certifications.total_required}
              </span>
            </div>
            <div className="h-2 bg-white/10 overflow-hidden">
              <div
                className="h-full bg-magenta transition-all duration-500"
                style={{
                  width: `${
                    data.certifications.total_required > 0
                      ? (data.certifications.completed / data.certifications.total_required) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            {data.certifications.items.slice(0, 3).map((cert) => (
              <div
                key={cert.document_type}
                className="flex items-center justify-between p-2 bg-white/5"
              >
                <span className="text-sm text-white">{cert.display_name}</span>
                <CertStatusBadge status={cert.status} hasDocument={!!cert.document_url} />
              </div>
            ))}
          </div>
        </PortalCard>
      </div>

      {/* Quick Links */}
      <PortalCard title="Quick Links" className="mt-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/cit/curriculum"
            className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 hover:border-purple/30 transition-colors"
          >
            <BookOpen className="h-6 w-6 text-purple" />
            <div>
              <span className="font-bold text-white">Curriculum Library</span>
              <p className="text-xs text-white/50">Drills & activities</p>
            </div>
          </Link>

          <a
            href="https://www.nfhslearn.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 hover:border-orange-400/30 transition-colors"
          >
            <ExternalLink className="h-6 w-6 text-orange-400" />
            <div>
              <span className="font-bold text-white">NFHS Learn</span>
              <p className="text-xs text-white/50">External training</p>
            </div>
          </a>

          <Link
            href="/cit/curriculum"
            className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 hover:border-neon/30 transition-colors"
          >
            <Star className="h-6 w-6 text-neon" />
            <div>
              <span className="font-bold text-white">Contribute</span>
              <p className="text-xs text-white/50">Share your ideas</p>
            </div>
          </Link>

          <Link
            href="/cit/camps"
            className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 hover:border-magenta/30 transition-colors"
          >
            <Trophy className="h-6 w-6 text-magenta" />
            <div>
              <span className="font-bold text-white">My Camps</span>
              <p className="text-xs text-white/50">View assignments</p>
            </div>
          </Link>
        </div>
      </PortalCard>
    </div>
  )
}

function CertStatusBadge({
  status,
  hasDocument,
}: {
  status: string
  hasDocument: boolean
}) {
  if (status === 'approved') {
    return (
      <span className="px-2 py-0.5 text-xs font-bold uppercase bg-neon/20 text-neon">
        Approved
      </span>
    )
  }

  if (status === 'pending_review' && hasDocument) {
    return (
      <span className="px-2 py-0.5 text-xs font-bold uppercase bg-yellow-400/20 text-yellow-400">
        Pending Review
      </span>
    )
  }

  if (status === 'rejected') {
    return (
      <span className="px-2 py-0.5 text-xs font-bold uppercase bg-red-400/20 text-red-400">
        Rejected
      </span>
    )
  }

  return (
    <span className="px-2 py-0.5 text-xs font-bold uppercase bg-white/10 text-white/50">
      Not Uploaded
    </span>
  )
}
