'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import {
  QuizEditor,
  validateQuiz,
  createDefaultQuiz,
  type QuizData,
  type QuizQuestion,
} from '@/components/empoweru'

const PORTAL_OPTIONS = [
  { value: 'OPERATIONAL', label: 'Operational Execution' },
  { value: 'BUSINESS', label: 'Business & Strategy' },
  { value: 'SKILL_STATION', label: 'Skill Station Training' },
]

const VIDEO_PROVIDER_OPTIONS = [
  { value: 'YOUTUBE', label: 'YouTube' },
  { value: 'VIMEO', label: 'Vimeo' },
  { value: 'EMBED', label: 'Custom Embed URL' },
]

export default function EditModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    portalType: 'OPERATIONAL',
    level: 1,
    videoProvider: 'YOUTUBE',
    videoUrl: '',
    estimatedMinutes: 30,
    isPublished: false,
  })

  const [quizEnabled, setQuizEnabled] = useState(false)
  const [quiz, setQuiz] = useState<QuizData>(createDefaultQuiz())

  useEffect(() => {
    async function loadModule() {
      try {
        const res = await fetch(`/api/empoweru/admin/modules/${id}`)
        const json = await res.json()

        if (!res.ok) {
          if (res.status === 404) {
            setNotFound(true)
          } else {
            setError(json.error || 'Failed to load module')
          }
        } else {
          const m = json.data
          setFormData({
            title: m.title || '',
            description: m.description || '',
            portalType: m.portal_type || 'OPERATIONAL',
            level: m.level || 1,
            videoProvider: m.video_provider || 'YOUTUBE',
            videoUrl: m.video_url || '',
            estimatedMinutes: m.estimated_minutes || 30,
            isPublished: m.is_published || false,
          })

          // Load quiz if exists
          if (m.quiz) {
            setQuizEnabled(true)
            setQuiz({
              id: m.quiz.id,
              title: m.quiz.title,
              passingScore: m.quiz.passing_score,
              questions: m.quiz.questions.map((q: {
                id: string
                question_text: string
                question_type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER'
                correct_answer?: string
                options: { id: string; option_text: string; is_correct: boolean }[]
              }) => ({
                id: q.id,
                questionText: q.question_text,
                questionType: q.question_type,
                correctAnswer: q.correct_answer || '',
                options: q.options.map((o) => ({
                  id: o.id,
                  optionText: o.option_text,
                  isCorrect: o.is_correct,
                })),
              })),
            })
          }
        }
      } catch (err) {
        setError('Failed to load module')
      }
      setLoading(false)
    }

    loadModule()
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validate quiz if enabled
    if (quizEnabled && quiz.questions.length > 0) {
      const quizError = validateQuiz(quiz)
      if (quizError) {
        setError(quizError)
        return
      }
    }

    setSaving(true)

    try {
      const res = await fetch(`/api/empoweru/admin/modules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quiz: quizEnabled && quiz.questions.length > 0 ? {
            title: quiz.title,
            passingScore: quiz.passingScore,
            questions: quiz.questions.map((q) => ({
              questionText: q.questionText,
              questionType: q.questionType,
              correctAnswer: q.questionType === 'SHORT_ANSWER' ? q.correctAnswer : undefined,
              options:
                q.questionType === 'SHORT_ANSWER'
                  ? undefined
                  : q.options.map((o) => ({
                      optionText: o.optionText,
                      isCorrect: o.isCorrect,
                    })),
            })),
          } : null, // null means delete quiz if it exists
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Failed to update module')
      } else {
        router.push('/admin/empoweru')
      }
    } catch (err) {
      setError('Failed to update module')
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-neon animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-4xl mx-auto">
          <div className="p-4 bg-black border border-white/10">
            <div className="py-16 text-center">
              <h2 className="text-xl font-bold text-white mb-2">Module Not Found</h2>
              <p className="text-white/50 mb-6">The requested module does not exist.</p>
              <Link
                href="/admin/empoweru"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to EmpowerU
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Link
            href="/admin/empoweru"
            className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to EmpowerU
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-black text-white uppercase tracking-wider">Edit Module</h1>
          <p className="text-white/50">Update module details and quiz</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400">
              {error}
            </div>
          )}

          {/* Module Details */}
          <div className="p-4 bg-black border border-white/10">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Module Details
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Title <span className="text-magenta">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                  placeholder="Module title"
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none resize-none"
                  placeholder="Brief description of the module content"
                />
              </div>

              {/* Portal Type */}
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Portal Type <span className="text-magenta">*</span>
                </label>
                <select
                  value={formData.portalType}
                  onChange={(e) => setFormData({ ...formData, portalType: e.target.value })}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                >
                  {PORTAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Level */}
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Level (Order)
                </label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                />
                <p className="text-xs text-white/30 mt-1">
                  Lower numbers appear first in the portal
                </p>
              </div>

              {/* Video Provider */}
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Video Provider
                </label>
                <select
                  value={formData.videoProvider}
                  onChange={(e) => setFormData({ ...formData, videoProvider: e.target.value })}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                >
                  {VIDEO_PROVIDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Video URL */}
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Video URL
                </label>
                <input
                  type="url"
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                  placeholder="https://..."
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Estimated Duration (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.estimatedMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, estimatedMinutes: parseInt(e.target.value) || 30 })
                  }
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                />
              </div>

              {/* Published */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    className="h-5 w-5 accent-neon"
                  />
                  <span className="text-white">Published</span>
                </label>
              </div>
            </div>
          </div>

          {/* Quiz Editor */}
          <QuizEditor
            quiz={quiz}
            onChange={setQuiz}
            enabled={quizEnabled}
            onEnabledChange={setQuizEnabled}
          />

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-6 border-t border-white/10">
            <Link
              href="/admin/empoweru"
              className="px-6 py-3 text-sm font-bold uppercase tracking-wider text-white/60 hover:text-white transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || !formData.title}
              className="flex items-center gap-2 px-6 py-3 bg-neon text-black text-sm font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
