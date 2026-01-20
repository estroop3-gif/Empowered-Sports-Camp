'use client'

/**
 * QuizEditor
 *
 * Inline quiz editor component for module creation/editing.
 * Supports Multiple Choice, True/False, and Short Answer question types.
 */

import { useState } from 'react'
import {
  Plus,
  Trash2,
  GripVertical,
  CheckCircle,
  XCircle,
  FileQuestion,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER'

export interface QuizOption {
  id?: string
  optionText: string
  isCorrect: boolean
}

export interface QuizQuestion {
  id?: string
  questionText: string
  questionType: QuestionType
  correctAnswer?: string
  options: QuizOption[]
}

export interface QuizData {
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

interface QuizEditorProps {
  quiz: QuizData
  onChange: (quiz: QuizData) => void
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
}

export function QuizEditor({ quiz, onChange, enabled, onEnabledChange }: QuizEditorProps) {
  function updateQuiz(updates: Partial<QuizData>) {
    onChange({ ...quiz, ...updates })
  }

  function addQuestion() {
    updateQuiz({
      questions: [
        ...quiz.questions,
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
    })
  }

  function removeQuestion(index: number) {
    updateQuiz({
      questions: quiz.questions.filter((_, i) => i !== index),
    })
  }

  function updateQuestion(index: number, updates: Partial<QuizQuestion>) {
    updateQuiz({
      questions: quiz.questions.map((q, i) => (i === index ? { ...q, ...updates } : q)),
    })
  }

  function handleQuestionTypeChange(index: number, newType: QuestionType) {
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

  return (
    <div className="space-y-4">
      {/* Enable Quiz Toggle */}
      <div className="flex items-center justify-between p-4 bg-black border border-white/10">
        <div className="flex items-center gap-3">
          <FileQuestion className="h-5 w-5 text-purple" />
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Module Quiz
            </h3>
            <p className="text-xs text-white/50">Add a quiz to test knowledge</p>
          </div>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <span className="text-sm text-white/70">{enabled ? 'Enabled' : 'Disabled'}</span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            className="h-5 w-5 accent-neon"
          />
        </label>
      </div>

      {enabled && (
        <>
          {/* Quiz Settings */}
          <div className="p-4 bg-black border border-white/10">
            <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-4">
              Quiz Settings
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Quiz Title
                </label>
                <input
                  type="text"
                  value={quiz.title}
                  onChange={(e) => updateQuiz({ title: e.target.value })}
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
                  onChange={(e) => updateQuiz({ passingScore: parseInt(e.target.value) || 80 })}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="p-4 bg-black border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider">
                Questions ({quiz.questions.length})
              </h4>
              <button
                type="button"
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
                  <div key={qIndex} className="p-4 bg-white/5 border border-white/10">
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
                            type="button"
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
                              type="button"
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
                                  type="button"
                                  onClick={() => updateOption(qIndex, oIndex, { isCorrect: true })}
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
                                    type="button"
                                    onClick={() => removeOption(qIndex, oIndex)}
                                    className="p-1 text-white/30 hover:text-magenta transition-colors"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
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
                                type="button"
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
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Validates quiz data before submission
 * Returns error message if invalid, null if valid
 */
export function validateQuiz(quiz: QuizData): string | null {
  if (!quiz.title.trim()) {
    return 'Quiz title is required'
  }

  for (let i = 0; i < quiz.questions.length; i++) {
    const q = quiz.questions[i]
    if (!q.questionText.trim()) {
      return `Question ${i + 1} text is required`
    }
    if (q.questionType === 'SHORT_ANSWER' && !q.correctAnswer?.trim()) {
      return `Question ${i + 1} requires a correct answer`
    }
    if (q.questionType === 'MULTIPLE_CHOICE') {
      if (q.options.length < 2) {
        return `Question ${i + 1} needs at least 2 options`
      }
      if (!q.options.some((o) => o.isCorrect)) {
        return `Question ${i + 1} needs a correct answer marked`
      }
      if (q.options.some((o) => !o.optionText.trim())) {
        return `Question ${i + 1} has empty option text`
      }
    }
  }

  return null
}

/**
 * Creates default quiz data
 */
export function createDefaultQuiz(): QuizData {
  return {
    title: 'Module Quiz',
    passingScore: 80,
    questions: [],
  }
}
