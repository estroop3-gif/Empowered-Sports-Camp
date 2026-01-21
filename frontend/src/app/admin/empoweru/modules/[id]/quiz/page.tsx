'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER'

interface QuizOption {
  id?: string
  optionText: string
  isCorrect: boolean
}

interface QuizQuestion {
  id?: string
  questionText: string
  questionType: QuestionType
  correctAnswer?: string
  options: QuizOption[]
}

interface QuizData {
  id?: string
  title: string
  passingScore: number
  questions: QuizQuestion[]
}

const QUESTION_TYPE_OPTIONS = [
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { value: 'TRUE_FALSE', label: 'True / False' },
  { value: 'SHORT_ANSWER', label: 'Short Answer' },
]

export default function QuizEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: moduleId } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [moduleName, setModuleName] = useState('')
  const [hasExistingQuiz, setHasExistingQuiz] = useState(false)

  const [quiz, setQuiz] = useState<QuizData>({
    title: 'Module Quiz',
    passingScore: 80,
    questions: [],
  })

  useEffect(() => {
    async function loadData() {
      try {
        // Load module info
        const moduleRes = await fetch(`/api/empoweru/admin/modules/${moduleId}`)
        const moduleJson = await moduleRes.json()

        if (!moduleRes.ok) {
          setError('Module not found')
          setLoading(false)
          return
        }

        setModuleName(moduleJson.data.title)

        // Load existing quiz if any
        const quizRes = await fetch(`/api/empoweru/admin/modules/${moduleId}/quiz`)
        const quizJson = await quizRes.json()

        if (quizRes.ok && quizJson.data) {
          const q = quizJson.data
          setHasExistingQuiz(true)
          setQuiz({
            id: q.id,
            title: q.title,
            passingScore: q.passing_score,
            questions: q.questions.map((qn: {
              id: string
              question_text: string
              question_type: QuestionType
              correct_answer?: string
              options: { id: string; option_text: string; is_correct: boolean }[]
            }) => ({
              id: qn.id,
              questionText: qn.question_text,
              questionType: qn.question_type,
              correctAnswer: qn.correct_answer || '',
              options: qn.options.map((o) => ({
                id: o.id,
                optionText: o.option_text,
                isCorrect: o.is_correct,
              })),
            })),
          })
        }
      } catch (err) {
        setError('Failed to load data')
      }
      setLoading(false)
    }

    loadData()
  }, [moduleId])

  function addQuestion() {
    setQuiz((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          questionText: '',
          questionType: 'MULTIPLE_CHOICE',
          correctAnswer: '',
          options: [
            { optionText: '', isCorrect: true },
            { optionText: '', isCorrect: false },
          ],
        },
      ],
    }))
  }

  function removeQuestion(index: number) {
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }))
  }

  function updateQuestion(index: number, updates: Partial<QuizQuestion>) {
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => (i === index ? { ...q, ...updates } : q)),
    }))
  }

  function handleQuestionTypeChange(index: number, newType: QuestionType) {
    const question = quiz.questions[index]

    let newOptions: QuizOption[] = []
    if (newType === 'MULTIPLE_CHOICE') {
      newOptions = [
        { optionText: '', isCorrect: true },
        { optionText: '', isCorrect: false },
      ]
    } else if (newType === 'TRUE_FALSE') {
      newOptions = [
        { optionText: 'True', isCorrect: true },
        { optionText: 'False', isCorrect: false },
      ]
    }
    // SHORT_ANSWER has no options

    updateQuestion(index, {
      questionType: newType,
      options: newOptions,
      correctAnswer: newType === 'SHORT_ANSWER' ? '' : undefined,
    })
  }

  function addOption(questionIndex: number) {
    const question = quiz.questions[questionIndex]
    updateQuestion(questionIndex, {
      options: [...question.options, { optionText: '', isCorrect: false }],
    })
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    const question = quiz.questions[questionIndex]
    const newOptions = question.options.filter((_, i) => i !== optionIndex)
    // Ensure at least one option is correct
    if (!newOptions.some((o) => o.isCorrect) && newOptions.length > 0) {
      newOptions[0].isCorrect = true
    }
    updateQuestion(questionIndex, { options: newOptions })
  }

  function updateOption(questionIndex: number, optionIndex: number, updates: Partial<QuizOption>) {
    const question = quiz.questions[questionIndex]
    const newOptions = question.options.map((o, i) => {
      if (i === optionIndex) {
        return { ...o, ...updates }
      }
      // If setting this option as correct, unset others (for single correct answer)
      if (updates.isCorrect && question.questionType !== 'SHORT_ANSWER') {
        return { ...o, isCorrect: false }
      }
      return o
    })
    updateQuestion(questionIndex, { options: newOptions })
  }

  async function handleSave() {
    setError(null)

    // Validate
    if (!quiz.title.trim()) {
      setError('Quiz title is required')
      return
    }

    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i]
      if (!q.questionText.trim()) {
        setError(`Question ${i + 1} text is required`)
        return
      }
      if (q.questionType === 'SHORT_ANSWER' && !q.correctAnswer?.trim()) {
        setError(`Question ${i + 1} requires a correct answer`)
        return
      }
      if (q.questionType === 'MULTIPLE_CHOICE') {
        if (q.options.length < 2) {
          setError(`Question ${i + 1} needs at least 2 options`)
          return
        }
        if (!q.options.some((o) => o.isCorrect)) {
          setError(`Question ${i + 1} needs a correct answer marked`)
          return
        }
        if (q.options.some((o) => !o.optionText.trim())) {
          setError(`Question ${i + 1} has empty option text`)
          return
        }
      }
    }

    setSaving(true)

    try {
      const res = await fetch(`/api/empoweru/admin/modules/${moduleId}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Failed to save quiz')
      } else {
        router.push('/admin/empoweru/modules')
      }
    } catch (err) {
      setError('Failed to save quiz')
    }

    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this quiz?')) return

    setDeleting(true)

    try {
      const res = await fetch(`/api/empoweru/admin/modules/${moduleId}/quiz`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const json = await res.json()
        setError(json.error || 'Failed to delete quiz')
      } else {
        router.push('/admin/empoweru/modules')
      }
    } catch (err) {
      setError('Failed to delete quiz')
    }

    setDeleting(false)
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
      <div className="mb-4">
        <Link
          href="/admin/empoweru/modules"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Modules
        </Link>
      </div>

      <PageHeader
        title={hasExistingQuiz ? 'Edit Quiz' : 'Create Quiz'}
        description={`Quiz for: ${moduleName}`}
      />

      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>
        )}

        {/* Quiz Settings */}
        <ContentCard>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
            Quiz Settings
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                Quiz Title
              </label>
              <input
                type="text"
                value={quiz.title}
                onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                placeholder="Quiz title"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                Passing Score (%)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={quiz.passingScore}
                onChange={(e) =>
                  setQuiz({ ...quiz, passingScore: parseInt(e.target.value) || 80 })
                }
                className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
              />
            </div>
          </div>
        </ContentCard>

        {/* Questions */}
        <ContentCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Questions ({quiz.questions.length})
            </h3>
            <button
              onClick={addQuestion}
              className="flex items-center gap-2 px-4 py-2 bg-neon/10 text-neon border border-neon/30 text-sm font-bold uppercase tracking-wider hover:bg-neon/20 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Question
            </button>
          </div>

          {quiz.questions.length === 0 ? (
            <div className="py-12 text-center text-white/50">
              No questions yet. Click "Add Question" to get started.
            </div>
          ) : (
            <div className="space-y-6">
              {quiz.questions.map((question, qIndex) => (
                <div
                  key={qIndex}
                  className="p-4 bg-black/50 border border-white/10"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-white/30 mt-3">
                      <GripVertical className="h-5 w-5" />
                    </div>

                    <div className="flex-1 space-y-4">
                      {/* Question Header */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white/50">
                          Question {qIndex + 1}
                        </span>
                        <button
                          onClick={() => removeQuestion(qIndex)}
                          className="p-1 text-white/30 hover:text-magenta transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Question Type */}
                      <div className="flex gap-2">
                        {QUESTION_TYPE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() =>
                              handleQuestionTypeChange(qIndex, opt.value as QuestionType)
                            }
                            className={cn(
                              'px-3 py-1 text-xs font-bold uppercase border transition-colors',
                              question.questionType === opt.value
                                ? 'bg-neon/10 text-neon border-neon'
                                : 'bg-white/5 text-white/50 border-white/20 hover:border-white/40'
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {/* Question Text */}
                      <textarea
                        value={question.questionText}
                        onChange={(e) =>
                          updateQuestion(qIndex, { questionText: e.target.value })
                        }
                        rows={2}
                        className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none resize-none"
                        placeholder="Enter question text..."
                      />

                      {/* Options - Multiple Choice */}
                      {question.questionType === 'MULTIPLE_CHOICE' && (
                        <div className="space-y-2">
                          {question.options.map((option, oIndex) => (
                            <div key={oIndex} className="flex items-center gap-3">
                              <button
                                onClick={() =>
                                  updateOption(qIndex, oIndex, { isCorrect: true })
                                }
                                className={cn(
                                  'p-1 rounded-full border-2 transition-colors',
                                  option.isCorrect
                                    ? 'border-neon text-neon'
                                    : 'border-white/30 text-white/30 hover:border-white/50'
                                )}
                              >
                                {option.isCorrect ? (
                                  <CheckCircle className="h-4 w-4" />
                                ) : (
                                  <div className="h-4 w-4" />
                                )}
                              </button>
                              <input
                                type="text"
                                value={option.optionText}
                                onChange={(e) =>
                                  updateOption(qIndex, oIndex, { optionText: e.target.value })
                                }
                                className="flex-1 px-4 py-2 bg-black border border-white/20 text-white text-sm focus:border-neon focus:outline-none"
                                placeholder={`Option ${oIndex + 1}`}
                              />
                              {question.options.length > 2 && (
                                <button
                                  onClick={() => removeOption(qIndex, oIndex)}
                                  className="p-1 text-white/30 hover:text-magenta transition-colors"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={() => addOption(qIndex)}
                            className="text-sm text-neon/70 hover:text-neon transition-colors"
                          >
                            + Add Option
                          </button>
                        </div>
                      )}

                      {/* Options - True/False */}
                      {question.questionType === 'TRUE_FALSE' && (
                        <div className="flex gap-4">
                          {question.options.map((option, oIndex) => (
                            <button
                              key={oIndex}
                              onClick={() => updateOption(qIndex, oIndex, { isCorrect: true })}
                              className={cn(
                                'flex items-center gap-2 px-4 py-2 border transition-colors',
                                option.isCorrect
                                  ? 'bg-neon/10 text-neon border-neon'
                                  : 'bg-white/5 text-white/50 border-white/20 hover:border-white/40'
                              )}
                            >
                              {option.isCorrect && <CheckCircle className="h-4 w-4" />}
                              {option.optionText}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Short Answer */}
                      {question.questionType === 'SHORT_ANSWER' && (
                        <div>
                          <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                            Correct Answer
                          </label>
                          <input
                            type="text"
                            value={question.correctAnswer || ''}
                            onChange={(e) =>
                              updateQuestion(qIndex, { correctAnswer: e.target.value })
                            }
                            className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                            placeholder="Enter the correct answer (case-insensitive)"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ContentCard>

        {/* Actions */}
        <div className="flex justify-between items-center">
          {hasExistingQuiz ? (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-6 py-3 bg-magenta/10 text-magenta border border-magenta/30 text-sm font-bold uppercase tracking-wider hover:bg-magenta/20 transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
              Delete Quiz
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-4">
            <Link
              href="/admin/empoweru/modules"
              className="px-6 py-3 text-sm font-bold uppercase tracking-wider text-white/60 hover:text-white transition-colors"
            >
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={saving || quiz.questions.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-neon text-black text-sm font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Save Quiz
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
