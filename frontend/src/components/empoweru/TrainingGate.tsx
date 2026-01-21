'use client'

/**
 * TrainingGate
 *
 * Full-page blocker that prevents users from accessing
 * their dashboard until they complete required training.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  BookOpen,
  CheckCircle,
  Circle,
  ArrowRight,
  Award,
  Loader2,
  AlertCircle,
} from 'lucide-react'

interface RequiredModule {
  id: string
  title: string
  slug?: string
}

interface TrainingGateProps {
  role: string
  userName?: string
  tenantName?: string
}

interface EligibilityData {
  isEligible: boolean
  completedModules: { id: string; title: string; completedAt: string }[]
  requiredModules: { id: string; title: string }[]
  missingModules: { id: string; title: string }[]
}

interface StatusData {
  isCertified: boolean
  certifiedAt: string | null
  certificateUrl: string | null
  certificateNumber: string | null
}

const ROLE_LABELS: Record<string, string> = {
  coach: 'Coach',
  director: 'Camp Director',
  licensee_owner: 'Licensee Owner',
  cit_volunteer: 'CIT Volunteer',
}

export function TrainingGate({ role, userName, tenantName }: TrainingGateProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [eligibility, setEligibility] = useState<EligibilityData | null>(null)
  const [status, setStatus] = useState<StatusData | null>(null)

  useEffect(() => {
    loadCertificationData()
  }, [role])

  async function loadCertificationData() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/empoweru/certification?role=${role}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to load certification data')
      }

      const json = await response.json()
      setEligibility(json.data?.eligibility || null)
      setStatus(json.data?.status || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // Calculate progress
  const completedCount = eligibility?.completedModules.length || 0
  const totalCount = eligibility?.requiredModules.length || 0
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 text-neon animate-spin mx-auto mb-4" />
          <p className="text-white/50">Checking training status...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-magenta mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Error Loading Status</h2>
          <p className="text-white/50 mb-4">{error}</p>
          <button
            onClick={loadCertificationData}
            className="px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // If no requirements configured, allow access
  if (totalCount === 0) {
    return null
  }

  // If already certified, show nothing (allow access)
  if (status?.isCertified) {
    return null
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-20 w-20 bg-purple/20 mx-auto mb-4 flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-purple" />
          </div>

          <h1 className="text-3xl font-bold text-white uppercase tracking-wider mb-2">
            Training Required
          </h1>

          <p className="text-white/50 text-lg">
            Complete your {ROLE_LABELS[role] || role} certification to access your dashboard
          </p>
        </div>

        {/* Progress Card */}
        <div className="bg-black border border-white/10 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/50 text-sm uppercase tracking-wider">
              Your Progress
            </span>
            <span className="text-white font-bold">
              {completedCount} / {totalCount} modules
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-3 bg-white/10 mb-6">
            <div
              className="h-full bg-gradient-to-r from-purple to-neon transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Module List */}
          <div className="space-y-3">
            {eligibility?.requiredModules.map((module) => {
              const isCompleted = eligibility.completedModules.some(
                (c) => c.id === module.id
              )

              return (
                <div
                  key={module.id}
                  className={cn(
                    'flex items-center gap-3 p-3 border',
                    isCompleted
                      ? 'border-neon/30 bg-neon/5'
                      : 'border-white/10'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5 text-neon flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-white/30 flex-shrink-0" />
                  )}
                  <span
                    className={cn(
                      'flex-1',
                      isCompleted ? 'text-white' : 'text-white/70'
                    )}
                  >
                    {module.title}
                  </span>
                  {isCompleted && (
                    <span className="text-xs text-neon/70 uppercase">
                      Completed
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* CTA Button */}
        <Link
          href="/empoweru"
          className="flex items-center justify-center gap-3 w-full px-8 py-4 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
        >
          <BookOpen className="h-5 w-5" />
          {completedCount === 0
            ? 'Start Training'
            : completedCount === totalCount
            ? 'Complete Certification'
            : 'Continue Training'}
          <ArrowRight className="h-5 w-5" />
        </Link>

        {/* Info Footer */}
        <div className="mt-6 text-center">
          <p className="text-white/40 text-sm">
            Each module includes a quiz that must be passed with 100% accuracy.
            <br />
            Don't worry - you can retake quizzes as many times as needed!
          </p>
        </div>

        {/* Certification Preview */}
        <div className="mt-8 p-4 bg-white/5 border border-white/10 text-center">
          <Award className="h-8 w-8 text-purple/50 mx-auto mb-2" />
          <p className="text-white/50 text-sm">
            Upon completion, you'll receive an official{' '}
            <span className="text-white">EmpowerU Certification</span> with a
            downloadable PDF certificate.
          </p>
        </div>
      </div>
    </div>
  )
}
