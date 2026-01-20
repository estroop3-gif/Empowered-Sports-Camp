'use client'

/**
 * ModuleDetail
 *
 * Displays a single module with video player, description, and quiz.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Play,
  CheckCircle,
  Clock,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Trophy,
  RefreshCw,
} from 'lucide-react'
import type {
  EmpowerUModuleWithProgress,
  EmpowerUQuizDetail,
  PortalType,
} from '@/lib/services/empoweru'
import { QuizComponent } from './QuizComponent'
import { useAuth } from '@/lib/auth/context'

interface ModuleDetailProps {
  slug: string
  portalType: PortalType
  backRoute: string
}

export function ModuleDetail({ slug, portalType, backRoute }: ModuleDetailProps) {
  const router = useRouter()
  const { refreshAuth } = useAuth()
  const [module, setModule] = useState<EmpowerUModuleWithProgress | null>(null)
  const [quiz, setQuiz] = useState<EmpowerUQuizDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [showQuiz, setShowQuiz] = useState(false)
  const [quizResult, setQuizResult] = useState<{
    score: number
    passed: boolean
    newUnlocks: string[]
  } | null>(null)

  useEffect(() => {
    async function loadModule() {
      try {
        const res = await fetch(`/api/empoweru/modules/${slug}?portalType=${portalType}`)
        const json = await res.json()

        if (!res.ok) {
          throw new Error(json.error || 'Failed to load module')
        }

        setModule(json.data.module)
        setQuiz(json.data.quiz)

        // Show quiz if module is in progress or completed (for retakes)
        if (json.data.module.progress_status === 'IN_PROGRESS') {
          setShowQuiz(true)
        }
      } catch (err) {
        console.error('Failed to load module:', err)
        setError(err instanceof Error ? err.message : 'Failed to load module')
      } finally {
        setLoading(false)
      }
    }

    loadModule()
  }, [slug, portalType])

  async function handleStartModule() {
    if (!module || starting) return
    setStarting(true)

    try {
      const res = await fetch(`/api/empoweru/modules/${module.id}/start`, {
        method: 'POST',
      })

      if (!res.ok) {
        throw new Error('Failed to start module')
      }

      // Update local state
      setModule({
        ...module,
        progress_status: 'IN_PROGRESS',
      })
      setShowQuiz(true)
    } catch (err) {
      console.error('Failed to start module:', err)
    } finally {
      setStarting(false)
    }
  }

  async function handleQuizSubmit(answers: { question_id: string; selected_option_id?: string; text_answer?: string }[]) {
    if (!module) return

    const res = await fetch(`/api/empoweru/modules/${module.id}/quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, portalType }),
    })

    const json = await res.json()

    if (!res.ok) {
      throw new Error(json.error || 'Failed to submit quiz')
    }

    setQuizResult({
      score: json.data.score,
      passed: json.data.passed,
      newUnlocks: json.data.new_unlocks || [],
    })

    if (json.data.passed) {
      setModule({
        ...module,
        progress_status: 'COMPLETED',
        quiz_score: json.data.score,
        quiz_passed: true,
      })

      // If certification was awarded, refresh auth so dashboard unlocks
      if (json.data.certification_awarded) {
        console.log('[ModuleDetail] Certification awarded! Refreshing auth state...')
        await refreshAuth()
      }
    }
  }

  function handleRetakeQuiz() {
    setQuizResult(null)
    setShowQuiz(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-neon animate-spin" />
      </div>
    )
  }

  if (error || !module) {
    return (
      <div className="p-6 bg-magenta/10 border border-magenta/30 text-center">
        <AlertCircle className="h-8 w-8 text-magenta mx-auto mb-2" />
        <p className="text-magenta font-bold">{error || 'Module not found'}</p>
        <button
          onClick={() => router.push(backRoute)}
          className="mt-4 px-4 py-2 bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          Go Back
        </button>
      </div>
    )
  }

  const isCompleted = module.progress_status === 'COMPLETED'

  return (
    <div>
      {/* Back Button */}
      <button
        onClick={() => router.push(backRoute)}
        className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm uppercase tracking-wider">Back to Modules</span>
      </button>

      {/* Module Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-2">
          <span
            className={cn(
              'px-2 py-1 text-xs font-bold uppercase tracking-wider border',
              isCompleted
                ? 'bg-neon/10 text-neon border-neon/30'
                : 'bg-purple/10 text-purple border-purple/30'
            )}
          >
            {isCompleted ? 'Completed' : module.progress_status === 'IN_PROGRESS' ? 'In Progress' : 'Not Started'}
          </span>
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <Clock className="h-4 w-4" />
            <span>{module.estimated_minutes} min</span>
          </div>
        </div>
        <h1 className="text-2xl font-black uppercase tracking-wider text-white mb-2">
          {module.title}
        </h1>
        {module.description && (
          <p className="text-white/70">{module.description}</p>
        )}
        {module.contributor && (
          <p className="text-white/40 text-sm mt-2">
            Contributed by {module.contributor.name} ({module.contributor.role})
          </p>
        )}
      </div>

      {/* Quiz Result */}
      {quizResult && (
        <div
          className={cn(
            'mb-6 p-6 border',
            quizResult.passed
              ? 'bg-neon/5 border-neon/30'
              : 'bg-magenta/5 border-magenta/30'
          )}
        >
          <div className="flex items-center gap-4">
            {quizResult.passed ? (
              <Trophy className="h-12 w-12 text-neon" />
            ) : (
              <AlertCircle className="h-12 w-12 text-magenta" />
            )}
            <div>
              <h3 className={cn('text-xl font-bold', quizResult.passed ? 'text-neon' : 'text-magenta')}>
                {quizResult.passed ? 'Congratulations!' : 'Not Quite'}
              </h3>
              <p className="text-white/70">
                You scored <span className="font-bold">{quizResult.score}%</span>
                {quizResult.passed
                  ? ' - You passed the quiz!'
                  : ' - Keep learning and try again.'}
              </p>
            </div>
          </div>

          {quizResult.newUnlocks.length > 0 && (
            <div className="mt-4 p-4 bg-neon/10 border border-neon/30">
              <p className="text-neon font-bold uppercase tracking-wider text-sm mb-2">
                New Features Unlocked!
              </p>
              <ul className="text-white/70 text-sm">
                {quizResult.newUnlocks.map((code) => (
                  <li key={code}>- {formatUnlockCode(code)}</li>
                ))}
              </ul>
            </div>
          )}

          {!quizResult.passed && (
            <button
              onClick={handleRetakeQuiz}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Retake Quiz
            </button>
          )}
        </div>
      )}

      {/* Video Player */}
      {module.video_url && !showQuiz && (
        <div className="mb-6">
          <div className="aspect-video bg-black border border-white/10">
            {module.video_provider === 'YOUTUBE' && (
              <iframe
                src={getYouTubeEmbedUrl(module.video_url)}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            )}
            {module.video_provider === 'VIMEO' && (
              <iframe
                src={getVimeoEmbedUrl(module.video_url)}
                className="w-full h-full"
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture"
              />
            )}
            {module.video_provider === 'EMBED' && (
              <iframe src={module.video_url} className="w-full h-full" allowFullScreen />
            )}
          </div>
        </div>
      )}

      {/* Quiz Section */}
      {quiz && showQuiz && !quizResult && (
        <QuizComponent quiz={quiz} onSubmit={handleQuizSubmit} />
      )}

      {/* Start Module Button */}
      {!showQuiz && !isCompleted && quiz && (
        <button
          onClick={handleStartModule}
          disabled={starting}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-6 py-4 font-bold uppercase tracking-wider transition-colors',
            starting
              ? 'bg-white/10 text-white/50 cursor-not-allowed'
              : 'bg-neon text-black hover:bg-neon/90'
          )}
        >
          {starting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Play className="h-5 w-5" />
          )}
          {module.progress_status === 'IN_PROGRESS' ? 'Continue to Quiz' : 'Start Module & Take Quiz'}
        </button>
      )}

      {/* Completed State */}
      {isCompleted && !quizResult && (
        <div className="p-6 bg-neon/5 border border-neon/30">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-neon" />
            <div>
              <h3 className="text-lg font-bold text-neon">Module Completed</h3>
              <p className="text-white/70">
                Quiz Score: <span className="font-bold">{module.quiz_score}%</span>
              </p>
            </div>
          </div>
          {quiz && (
            <button
              onClick={handleRetakeQuiz}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Retake Quiz
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function getYouTubeEmbedUrl(url: string): string {
  // Handle various YouTube URL formats
  const videoId = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  )?.[1]

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`
  }
  return url
}

function getVimeoEmbedUrl(url: string): string {
  const videoId = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1]

  if (videoId) {
    return `https://player.vimeo.com/video/${videoId}`
  }
  return url
}

function formatUnlockCode(code: string): string {
  return code
    .replace(/^UNLOCK_/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase())
}
