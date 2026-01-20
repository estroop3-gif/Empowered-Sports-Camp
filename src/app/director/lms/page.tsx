'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { PortalPageHeader, PortalCard } from '@/components/portal'
import {
  GraduationCap,
  CheckCircle,
  Circle,
  Clock,
  PlayCircle,
  ArrowRight,
  Loader2,
  Lock,
  ExternalLink,
} from 'lucide-react'
// Types (no longer imported from service)
interface LmsModule {
  id: string
  title: string
  slug: string
  description: string | null
  duration_minutes: number
  content_url: string | null
  required_for_roles: string[]
  order_index: number
  is_active: boolean
}

interface LmsProgress {
  id: string
  profile_id: string
  module_id: string
  started_at: string | null
  completed_at: string | null
  progress_percent: number
}

/**
 * Director LMS Page
 *
 * Shows the training modules required for directors.
 * Progress is tracked in lms_progress table.
 */

export default function DirectorLmsPage() {
  const { user, hasCompletedRequiredLms, lmsStatus } = useAuth()
  const [loading, setLoading] = useState(true)
  const [modules, setModules] = useState<LmsModule[]>([])
  const [progress, setProgress] = useState<Map<string, LmsProgress>>(new Map())

  useEffect(() => {
    loadLmsData()
  }, [])

  async function loadLmsData() {
    try {
      // Fetch modules required for directors
      const modulesRes = await fetch('/api/lms?action=modules&role=director')
      const { data: modulesData } = await modulesRes.json()

      if (modulesData) {
        setModules(modulesData)

        // Fetch user's progress
        if (user?.id) {
          const moduleIds = modulesData.map((m: LmsModule) => m.id).join(',')
          const progressRes = await fetch(`/api/lms?action=userProgress&profileId=${user.id}&moduleIds=${moduleIds}`)
          const { data: progressData } = await progressRes.json()

          if (progressData) {
            const progressMap = new Map<string, LmsProgress>()
            progressData.forEach((p: LmsProgress) => {
              progressMap.set(p.module_id, p)
            })
            setProgress(progressMap)
          }
        }
      }
    } catch (err) {
      console.error('Failed to load LMS data:', err)
    }

    setLoading(false)
  }

  async function handleStartModule(moduleId: string) {
    if (!user?.id) return

    try {
      await fetch('/api/lms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'startModule', profileId: user.id, moduleId }),
      })
      loadLmsData()
    } catch (err) {
      console.error('Failed to start module:', err)
    }
  }

  async function handleCompleteModule(moduleId: string) {
    if (!user?.id) return

    try {
      await fetch('/api/lms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'completeModule', profileId: user.id, moduleId }),
      })
      loadLmsData()
    } catch (err) {
      console.error('Failed to complete module:', err)
    }
  }

  // Calculate overall progress
  const completedCount = modules.filter(m => progress.get(m.id)?.completed_at).length
  const overallProgress = modules.length > 0 ? Math.round((completedCount / modules.length) * 100) : 0

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
        title="Director Training"
        description="Complete your certification to unlock camp management tools"
      />

      {/* Progress Overview */}
      <PortalCard className="mb-8" accent={hasCompletedRequiredLms ? 'neon' : 'magenta'}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`h-16 w-16 flex items-center justify-center ${
              hasCompletedRequiredLms ? 'bg-neon/20' : 'bg-magenta/20'
            }`}>
              {hasCompletedRequiredLms ? (
                <CheckCircle className="h-8 w-8 text-neon" />
              ) : (
                <GraduationCap className="h-8 w-8 text-magenta" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {hasCompletedRequiredLms ? 'Training Complete!' : 'Training In Progress'}
              </h2>
              <p className="text-white/60">
                {completedCount} of {modules.length} modules completed
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex-1 max-w-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">Overall Progress</span>
              <span className="text-sm font-bold text-white">{overallProgress}%</span>
            </div>
            <div className="h-3 bg-white/10 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  hasCompletedRequiredLms ? 'bg-neon' : 'bg-magenta'
                }`}
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>
      </PortalCard>

      {/* Modules List */}
      <div className="space-y-4">
        {modules.map((module, index) => {
          const moduleProgress = progress.get(module.id)
          const isCompleted = !!moduleProgress?.completed_at
          const isStarted = !!moduleProgress?.started_at
          const isLocked = index > 0 && !progress.get(modules[index - 1].id)?.completed_at

          return (
            <PortalCard
              key={module.id}
              className={isLocked ? 'opacity-50' : ''}
              accent={isCompleted ? 'neon' : isStarted ? 'purple' : undefined}
            >
              <div className="flex items-start gap-4">
                {/* Status Icon */}
                <div className={`h-12 w-12 flex items-center justify-center flex-shrink-0 ${
                  isCompleted
                    ? 'bg-neon/20 text-neon'
                    : isStarted
                      ? 'bg-purple/20 text-purple'
                      : isLocked
                        ? 'bg-white/5 text-white/30'
                        : 'bg-white/10 text-white/60'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : isLocked ? (
                    <Lock className="h-6 w-6" />
                  ) : isStarted ? (
                    <PlayCircle className="h-6 w-6" />
                  ) : (
                    <Circle className="h-6 w-6" />
                  )}
                </div>

                {/* Module Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-white">{module.title}</h3>
                      <p className="text-sm text-white/50 mt-1">{module.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {module.duration_minutes} min
                        </span>
                        {isStarted && !isCompleted && (
                          <span className="text-purple">
                            {moduleProgress?.progress_percent || 0}% complete
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    {!isLocked && (
                      <div>
                        {isCompleted ? (
                          <span className="px-3 py-1.5 bg-neon/10 text-neon text-xs font-bold uppercase">
                            Complete
                          </span>
                        ) : isStarted ? (
                          <button
                            onClick={() => handleCompleteModule(module.id)}
                            className="px-4 py-2 bg-purple text-white text-sm font-bold uppercase tracking-wider hover:bg-purple/90 transition-colors"
                          >
                            Mark Complete
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartModule(module.id)}
                            className="px-4 py-2 bg-white/10 text-white text-sm font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
                          >
                            Start Module
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Progress Bar (if in progress) */}
                  {isStarted && !isCompleted && (
                    <div className="mt-4">
                      <div className="h-1.5 bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-purple transition-all duration-300"
                          style={{ width: `${moduleProgress?.progress_percent || 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </PortalCard>
          )
        })}
      </div>

      {/* Completion Message */}
      {hasCompletedRequiredLms && (
        <div className="mt-8 p-6 bg-neon/10 border border-neon/30 text-center">
          <CheckCircle className="h-12 w-12 text-neon mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Congratulations!</h3>
          <p className="text-white/60 mb-4">
            You've completed all required training. All camp management tools are now unlocked.
          </p>
          <Link
            href="/director"
            className="inline-flex items-center gap-2 text-neon hover:text-neon/80 font-semibold"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  )
}
