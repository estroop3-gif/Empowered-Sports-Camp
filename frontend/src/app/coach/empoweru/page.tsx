'use client'

/**
 * Coach EmpowerU Training Page
 *
 * Shows the coach's training progress and available modules.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import { cn } from '@/lib/utils'
import {
  GraduationCap,
  Clock,
  Loader2,
  CheckCircle,
  Play,
  Lock,
  ChevronRight,
  AlertCircle,
  Trophy,
} from 'lucide-react'
import type { CoachEmpowerUProgress } from '@/lib/services/coach-dashboard'

export default function CoachEmpowerUPage() {
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<CoachEmpowerUProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProgress()
  }, [])

  async function loadProgress() {
    try {
      const res = await fetch('/api/coach/empoweru')
      const json = await res.json()

      if (!res.ok) throw new Error(json.error || 'Failed to load progress')

      setProgress(json.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load progress')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PortalPageHeader
        title="EmpowerU Training"
        description="Complete your required training modules"
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-purple animate-spin" />
        </div>
      ) : error ? (
        <PortalCard>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
            <p className="text-white/50">{error}</p>
            <button
              onClick={loadProgress}
              className="mt-4 px-4 py-2 bg-purple text-white font-bold uppercase text-sm"
            >
              Retry
            </button>
          </div>
        </PortalCard>
      ) : progress ? (
        <div className="space-y-8">
          {/* Progress Overview */}
          <PortalCard accent="purple">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-4">Your Progress</h2>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-white/50">Overall Completion</span>
                    <span className="font-bold text-white">
                      {progress.completion_percentage}%
                    </span>
                  </div>
                  <div className="h-4 bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple to-blue-400 transition-all"
                      style={{ width: `${progress.completion_percentage}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2 text-neon">
                    <CheckCircle className="h-4 w-4" />
                    <span>{progress.completed_modules} completed</span>
                  </div>
                  {progress.in_progress_modules > 0 && (
                    <div className="flex items-center gap-2 text-blue-400">
                      <Play className="h-4 w-4" />
                      <span>{progress.in_progress_modules} in progress</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-white/50">
                    <GraduationCap className="h-4 w-4" />
                    <span>{progress.total_modules} total modules</span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="lg:text-right">
                {progress.has_completed_core ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-neon/20 text-neon">
                    <Trophy className="h-5 w-5" />
                    <span className="font-bold">Core Training Complete</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-bold">Core Training Required</span>
                  </div>
                )}
              </div>
            </div>
          </PortalCard>

          {/* Next Module CTA */}
          {progress.next_module && !progress.has_completed_core && (
            <div className="p-6 bg-gradient-to-r from-purple/20 to-blue-400/20 border border-purple/30">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-white/40 uppercase mb-1">Continue Training</div>
                  <h3 className="text-lg font-bold text-white">
                    {progress.next_module.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-white/50 mt-1">
                    <Clock className="h-4 w-4" />
                    <span>~{progress.next_module.estimated_minutes} minutes</span>
                  </div>
                </div>
                <Link
                  href={`/empoweru/modules/${progress.next_module.slug}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple text-white font-bold uppercase tracking-wider hover:bg-purple/90 transition-colors"
                >
                  Start Module
                  <ChevronRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          )}

          {/* Module List */}
          <PortalCard title="Training Modules">
            <div className="space-y-3">
              {progress.modules.map((module) => {
                const statusConfig = {
                  COMPLETED: {
                    label: 'Completed',
                    color: 'bg-neon/20 text-neon',
                    icon: CheckCircle,
                  },
                  IN_PROGRESS: {
                    label: 'In Progress',
                    color: 'bg-blue-400/20 text-blue-400',
                    icon: Play,
                  },
                  NOT_STARTED: {
                    label: 'Not Started',
                    color: 'bg-white/10 text-white/50',
                    icon: Lock,
                  },
                }

                const status = statusConfig[module.status] || statusConfig.NOT_STARTED
                const StatusIcon = status.icon

                return (
                  <Link
                    key={module.module_id}
                    href={`/empoweru/modules/${module.slug}`}
                    className={cn(
                      'flex items-center justify-between p-4 border transition-colors',
                      module.status === 'COMPLETED'
                        ? 'bg-white/5 border-white/10 hover:border-neon/50'
                        : module.status === 'IN_PROGRESS'
                          ? 'bg-blue-400/5 border-blue-400/30 hover:border-blue-400/50'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'h-10 w-10 flex items-center justify-center',
                        status.color.split(' ')[0]
                      )}>
                        <StatusIcon className={cn('h-5 w-5', status.color.split(' ')[1])} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{module.title}</span>
                          {module.is_required && (
                            <span className="px-2 py-0.5 text-xs bg-magenta/20 text-magenta">
                              Required
                            </span>
                          )}
                        </div>
                        {module.status === 'IN_PROGRESS' && module.progress_percent > 0 && (
                          <div className="mt-1">
                            <div className="h-1 w-24 bg-white/10 overflow-hidden">
                              <div
                                className="h-full bg-blue-400"
                                style={{ width: `${module.progress_percent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={cn(
                      'px-2 py-1 text-xs font-bold uppercase',
                      status.color
                    )}>
                      {status.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          </PortalCard>
        </div>
      ) : null}
    </div>
  )
}
