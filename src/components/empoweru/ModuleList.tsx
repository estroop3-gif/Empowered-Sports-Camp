'use client'

/**
 * ModuleList
 *
 * Displays a grid of module cards for a specific portal.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  Play,
  CheckCircle,
  Clock,
  Lock,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import type { EmpowerUModuleWithProgress, PortalType } from '@/lib/services/empoweru'

interface ModuleListProps {
  portalType: PortalType
  baseRoute: string // e.g., '/director/empoweru' or '/licensee/empoweru'
}

type ModuleStatus = 'completed' | 'in-progress' | 'not-started' | 'locked'

function getModuleStatus(module: EmpowerUModuleWithProgress): ModuleStatus {
  if (module.progress_status === 'COMPLETED') return 'completed'
  if (module.progress_status === 'IN_PROGRESS') return 'in-progress'
  return 'not-started'
}

const STATUS_CONFIG = {
  completed: {
    badge: 'Completed',
    badgeClass: 'bg-neon/10 text-neon border-neon/30',
    icon: CheckCircle,
    iconClass: 'text-neon',
  },
  'in-progress': {
    badge: 'In Progress',
    badgeClass: 'bg-purple/10 text-purple border-purple/30',
    icon: Play,
    iconClass: 'text-purple',
  },
  'not-started': {
    badge: 'Not Started',
    badgeClass: 'bg-white/5 text-white/50 border-white/20',
    icon: Play,
    iconClass: 'text-white/50',
  },
  locked: {
    badge: 'Locked',
    badgeClass: 'bg-magenta/10 text-magenta border-magenta/30',
    icon: Lock,
    iconClass: 'text-magenta',
  },
}

export function ModuleList({ portalType, baseRoute }: ModuleListProps) {
  const [modules, setModules] = useState<EmpowerUModuleWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadModules() {
      try {
        const res = await fetch(`/api/empoweru/modules?portalType=${portalType}`)
        const json = await res.json()

        if (!res.ok) {
          throw new Error(json.error || 'Failed to load modules')
        }

        setModules(json.data || [])
      } catch (err) {
        console.error('Failed to load modules:', err)
        setError(err instanceof Error ? err.message : 'Failed to load modules')
      } finally {
        setLoading(false)
      }
    }

    loadModules()
  }, [portalType])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-neon animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-magenta/10 border border-magenta/30 text-center">
        <AlertCircle className="h-8 w-8 text-magenta mx-auto mb-2" />
        <p className="text-magenta font-bold">{error}</p>
      </div>
    )
  }

  if (modules.length === 0) {
    return (
      <div className="p-12 bg-white/5 border border-white/10 text-center">
        <Clock className="h-12 w-12 text-white/20 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">No Modules Available</h3>
        <p className="text-white/50">Check back soon for new training content.</p>
      </div>
    )
  }

  // Group modules by level
  const modulesByLevel = modules.reduce(
    (acc, module) => {
      const level = module.level
      if (!acc[level]) acc[level] = []
      acc[level].push(module)
      return acc
    },
    {} as Record<number, EmpowerUModuleWithProgress[]>
  )

  const levels = Object.keys(modulesByLevel)
    .map(Number)
    .sort((a, b) => a - b)

  return (
    <div className="space-y-8">
      {levels.map((level) => (
        <div key={level}>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white/50 mb-4">
            Level {level}
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {modulesByLevel[level].map((module) => {
              const status = getModuleStatus(module)
              const config = STATUS_CONFIG[status]
              const StatusIcon = config.icon

              return (
                <Link
                  key={module.id}
                  href={`${baseRoute}/module/${module.slug}?portalType=${portalType}`}
                  className={cn(
                    'block p-4 bg-black border transition-all hover:border-neon/50 hover:bg-white/5',
                    status === 'completed' ? 'border-neon/30' : 'border-white/10'
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className={cn(
                        'px-2 py-1 text-xs font-bold uppercase tracking-wider border',
                        config.badgeClass
                      )}
                    >
                      {config.badge}
                    </span>
                    <StatusIcon className={cn('h-5 w-5', config.iconClass)} />
                  </div>

                  <h4 className="text-lg font-bold text-white mb-2 line-clamp-2">
                    {module.title}
                  </h4>

                  {module.description && (
                    <p className="text-white/50 text-sm mb-3 line-clamp-2">
                      {module.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-white/40">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>{module.estimated_minutes} min</span>
                      {module.has_quiz && (
                        <>
                          <span className="text-white/20">|</span>
                          <span>Quiz</span>
                        </>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4" />
                  </div>

                  {status === 'completed' && module.quiz_score !== null && (
                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                      <span className="text-xs text-white/50">Quiz Score</span>
                      <span className="text-neon font-bold">{module.quiz_score}%</span>
                    </div>
                  )}

                  {module.contributor && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <span className="text-xs text-white/40">
                        Contributed by {module.contributor.name}
                      </span>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ModuleListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="p-4 bg-black border border-white/10 animate-pulse">
          <div className="h-6 w-24 bg-white/10 mb-3" />
          <div className="h-6 w-full bg-white/10 mb-2" />
          <div className="h-4 w-3/4 bg-white/10 mb-3" />
          <div className="h-4 w-1/2 bg-white/10" />
        </div>
      ))}
    </div>
  )
}
