'use client'

import { useState, useEffect } from 'react'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import {
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  Clock,
  Users,
  Loader2,
  Save,
  X,
  HelpCircle,
} from 'lucide-react'
import {
  QuizEditor,
  validateQuiz,
  createDefaultQuiz,
  type QuizData,
} from '@/components/empoweru'

interface Module {
  id: string
  title: string
  slug: string
  description: string | null
  portal_type: string
  level: number
  video_provider: string
  video_url: string | null
  estimated_minutes: number
  is_published: boolean
  has_quiz: boolean
  quiz_title: string | null
  quiz_passing_score: number | null
  required_for_roles: string[]
  created_at: string
  updated_at: string
}

const ROLE_OPTIONS = [
  { value: 'director', label: 'Director' },
  { value: 'coach', label: 'Coach' },
  { value: 'cit_volunteer', label: 'CIT / Volunteer' },
  { value: 'licensee_owner', label: 'Licensee Owner' },
]

interface ModuleDetail extends Module {
  quiz: {
    id: string
    title: string
    passing_score: number
    questions: {
      id: string
      question_text: string
      question_type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER'
      correct_answer?: string
      options: { id: string; option_text: string; is_correct: boolean }[]
    }[]
  } | null
}

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

/**
 * Admin LMS Modules Page
 *
 * Manage training modules with integrated quiz editing.
 * Uses EmpowerU backend for full quiz support.
 */
export default function AdminLmsPage() {
  const [loading, setLoading] = useState(true)
  const [modules, setModules] = useState<Module[]>([])
  const [editingModule, setEditingModule] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    portalType: 'OPERATIONAL',
    level: 1,
    videoProvider: 'YOUTUBE',
    videoUrl: '',
    estimatedMinutes: 30,
    isPublished: false,
    requiredForRoles: [] as string[],
  })

  // Quiz state
  const [quizEnabled, setQuizEnabled] = useState(false)
  const [quiz, setQuiz] = useState<QuizData>(createDefaultQuiz())

  useEffect(() => {
    loadModules()
  }, [])

  async function loadModules() {
    try {
      const res = await fetch('/api/empoweru/admin/modules')
      const { data, error } = await res.json()

      if (error) {
        console.error('Failed to load modules:', error)
      } else {
        setModules(data || [])
      }
    } catch (err) {
      console.error('Failed to load modules:', err)
    }
    setLoading(false)
  }

  function startCreate() {
    setFormData({
      title: '',
      description: '',
      portalType: 'OPERATIONAL',
      level: modules.length + 1,
      videoProvider: 'YOUTUBE',
      videoUrl: '',
      estimatedMinutes: 30,
      isPublished: false,
      requiredForRoles: [],
    })
    setQuizEnabled(false)
    setQuiz(createDefaultQuiz())
    setIsCreating(true)
    setEditingModule(null)
  }

  async function startEdit(moduleId: string) {
    setLoadingDetail(true)
    setEditingModule(moduleId)
    setIsCreating(false)

    try {
      const res = await fetch(`/api/empoweru/admin/modules/${moduleId}`)
      const { data, error } = await res.json()

      if (error) {
        console.error('Failed to load module:', error)
        setEditingModule(null)
      } else {
        const m = data as ModuleDetail
        setFormData({
          title: m.title || '',
          description: m.description || '',
          portalType: m.portal_type || 'OPERATIONAL',
          level: m.level || 1,
          videoProvider: m.video_provider || 'YOUTUBE',
          videoUrl: m.video_url || '',
          estimatedMinutes: m.estimated_minutes || 30,
          isPublished: m.is_published || false,
          requiredForRoles: m.required_for_roles || [],
        })

        if (m.quiz) {
          setQuizEnabled(true)
          setQuiz({
            id: m.quiz.id,
            title: m.quiz.title,
            passingScore: m.quiz.passing_score,
            questions: m.quiz.questions.map((q) => ({
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
        } else {
          setQuizEnabled(false)
          setQuiz(createDefaultQuiz())
        }
      }
    } catch (err) {
      console.error('Failed to load module:', err)
      setEditingModule(null)
    }
    setLoadingDetail(false)
  }

  function cancelEdit() {
    setEditingModule(null)
    setIsCreating(false)
  }

  function toggleRole(role: string) {
    setFormData((prev) => ({
      ...prev,
      requiredForRoles: prev.requiredForRoles.includes(role)
        ? prev.requiredForRoles.filter((r) => r !== role)
        : [...prev.requiredForRoles, role],
    }))
  }

  async function handleSave() {
    // Validate quiz if enabled
    if (quizEnabled && quiz.questions.length > 0) {
      const quizError = validateQuiz(quiz)
      if (quizError) {
        alert(quizError)
        return
      }
    }

    setSaving(true)

    const payload = {
      ...formData,
      quiz:
        quizEnabled && quiz.questions.length > 0
          ? {
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
            }
          : null,
    }

    console.log('[LMS] Quiz enabled:', quizEnabled)
    console.log('[LMS] Quiz questions count:', quiz.questions.length)
    console.log('[LMS] Payload quiz:', JSON.stringify(payload.quiz, null, 2))

    try {
      if (editingModule) {
        const res = await fetch(`/api/empoweru/admin/modules/${editingModule}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const { error } = await res.json()
        if (error) console.error('Failed to update module:', error)
      } else {
        const res = await fetch('/api/empoweru/admin/modules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const { error } = await res.json()
        if (error) console.error('Failed to create module:', error)
      }
    } catch (err) {
      console.error('Failed to save module:', err)
    }

    setSaving(false)
    cancelEdit()
    loadModules()
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this module?')) return

    try {
      const res = await fetch(`/api/empoweru/admin/modules/${id}`, {
        method: 'DELETE',
      })
      const { error } = await res.json()

      if (error) {
        console.error('Failed to delete module:', error)
      } else {
        loadModules()
      }
    } catch (err) {
      console.error('Failed to delete module:', err)
    }
  }

  if (loading) {
    return (
      <AdminLayout userRole="hq_admin" userName="Admin">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 text-neon animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout userRole="hq_admin" userName="Admin">
      <PageHeader
        title="EmpowerU Studio"
        description="Manage training modules with videos and quizzes"
      >
        <button
          onClick={startCreate}
          className="flex items-center gap-2 px-6 py-3 bg-neon text-black text-sm font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Module
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <ContentCard>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-neon/10 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-neon" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{modules.length}</p>
              <p className="text-xs text-white/50 uppercase tracking-wider">Total Modules</p>
            </div>
          </div>
        </ContentCard>
        <ContentCard>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-purple/10 flex items-center justify-center">
              <HelpCircle className="h-6 w-6 text-purple" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">
                {modules.filter((m) => m.has_quiz).length}
              </p>
              <p className="text-xs text-white/50 uppercase tracking-wider">With Quizzes</p>
            </div>
          </div>
        </ContentCard>
        <ContentCard>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-orange-500/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">
                {modules.filter((m) => m.required_for_roles.length > 0).length}
              </p>
              <p className="text-xs text-white/50 uppercase tracking-wider">Role Required</p>
            </div>
          </div>
        </ContentCard>
        <ContentCard>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-magenta/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-magenta" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">
                {modules.reduce((acc, m) => acc + m.estimated_minutes, 0)}
              </p>
              <p className="text-xs text-white/50 uppercase tracking-wider">Total Minutes</p>
            </div>
          </div>
        </ContentCard>
      </div>

      {/* Edit/Create Form */}
      {(editingModule || isCreating) && (
        <ContentCard className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              {isCreating ? 'Create Module' : 'Edit Module'}
            </h2>
            <button onClick={cancelEdit} className="p-2 text-white/50 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          {loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-neon animate-spin" />
            </div>
          ) : (
            <>
              {/* Module Details */}
              <div className="mb-8">
                <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4">
                  Module Details
                </h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                      Title <span className="text-magenta">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                      placeholder="Module title"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none resize-none"
                      placeholder="Module description"
                    />
                  </div>

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
                    <p className="text-xs text-white/40 mt-1">
                      Licensees see Business portal by default. Coaches/Directors see Operational.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                      Level (Order)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={formData.level}
                      onChange={(e) =>
                        setFormData({ ...formData, level: parseInt(e.target.value) || 1 })
                      }
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                    />
                  </div>

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

                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                      Duration (minutes)
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

                  <div>
                    <label className="flex items-center gap-3 cursor-pointer p-3 border border-white/20 bg-white/5">
                      <input
                        type="checkbox"
                        checked={formData.isPublished}
                        onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                        className="h-5 w-5 accent-neon"
                      />
                      <div>
                        <span className="text-white font-bold">Published</span>
                        <p className="text-xs text-white/40">Module must be published to be visible to users</p>
                      </div>
                    </label>
                  </div>

                  {/* Required For Roles */}
                  <div className="md:col-span-2">
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                      Required For Roles
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {ROLE_OPTIONS.map((role) => (
                        <button
                          key={role.value}
                          type="button"
                          onClick={() => toggleRole(role.value)}
                          className={`px-4 py-2 text-sm font-medium uppercase tracking-wider border transition-colors ${
                            formData.requiredForRoles.includes(role.value)
                              ? 'bg-neon/10 border-neon text-neon'
                              : 'border-white/20 text-white/60 hover:border-white/40'
                          }`}
                        >
                          {role.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-white/30 mt-2">
                      Select which roles must complete this module
                    </p>
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
              <div className="flex justify-end gap-4 mt-6 pt-6 border-t border-white/10">
                <button
                  onClick={cancelEdit}
                  className="px-6 py-3 text-sm font-bold uppercase tracking-wider text-white/60 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formData.title}
                  className="flex items-center gap-2 px-6 py-3 bg-neon text-black text-sm font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                  {isCreating ? 'Create Module' : 'Save Changes'}
                </button>
              </div>
            </>
          )}
        </ContentCard>
      )}

      {/* Modules List */}
      <ContentCard>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">
                  Level
                </th>
                <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">
                  Module
                </th>
                <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">
                  Portal
                </th>
                <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">
                  Duration
                </th>
                <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">
                  Required For
                </th>
                <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">
                  Quiz
                </th>
                <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">
                  Status
                </th>
                <th className="text-right py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {modules.map((module) => (
                <tr
                  key={module.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-4 px-4">
                    <span className="text-white/50">{module.level}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-bold text-white">{module.title}</div>
                      {module.description && (
                        <div className="text-sm text-white/40 truncate max-w-xs">
                          {module.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-1 text-xs font-medium bg-white/10 text-white/60">
                      {module.portal_type}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-white/70">{module.estimated_minutes} min</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex flex-wrap gap-1">
                      {module.required_for_roles.length > 0 ? (
                        module.required_for_roles.map((role) => (
                          <span
                            key={role}
                            className="px-2 py-0.5 text-xs font-medium bg-white/10 text-white/60"
                          >
                            {role}
                          </span>
                        ))
                      ) : (
                        <span className="text-white/30">-</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    {module.has_quiz ? (
                      <span className="px-2 py-1 text-xs font-bold uppercase bg-purple/10 text-purple">
                        Yes
                      </span>
                    ) : (
                      <span className="text-white/30">-</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {module.is_published ? (
                      <span className="px-2 py-1 text-xs font-bold uppercase bg-neon/10 text-neon">
                        Published
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-bold uppercase bg-white/10 text-white/40">
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(module.id)}
                        className="p-2 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(module.id)}
                        className="p-2 text-white/50 hover:text-magenta hover:bg-magenta/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {modules.length === 0 && (
          <div className="py-12 text-center">
            <GraduationCap className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Modules Yet</h3>
            <p className="text-white/50 mb-6">Create your first training module to get started</p>
            <button
              onClick={startCreate}
              className="inline-flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Module
            </button>
          </div>
        )}
      </ContentCard>
    </AdminLayout>
  )
}
