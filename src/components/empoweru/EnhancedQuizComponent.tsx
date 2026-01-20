'use client'

/**
 * EnhancedQuizComponent
 *
 * Interactive quiz with retry support for EmpowerU modules.
 * Requires 100% to pass, allows unlimited retakes of missed questions.
 */

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  CheckCircle,
  Circle,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { QuizResultModal } from './QuizResultModal'

type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER'

interface QuizQuestion {
  id: string
  questionText: string
  questionType?: QuestionType
  orderIndex?: number
  correctAnswer?: string // For SHORT_ANSWER type
  options: {
    id: string
    optionText: string
    orderIndex?: number
  }[]
}

interface EnhancedQuizComponentProps {
  moduleId: string
  quizTitle: string
  questions: QuizQuestion[]
  passingScore?: number
  portalType?: string
  isRetryMode?: boolean
  attemptNumber?: number
  userName?: string
  userRole?: string
  tenantName?: string
  onComplete?: (passed: boolean, certificationGenerated?: boolean) => void
}

interface QuizResult {
  score: number
  passed: boolean
  totalQuestions: number
  correctAnswers: number
  attemptNumber: number
  missedQuestionIds: string[]
  missedQuestions: {
    id: string
    questionText: string
  }[]
  certificationGenerated?: {
    certificateNumber: string
    certifiedAt: string
  } | null
}

export function EnhancedQuizComponent({
  moduleId,
  quizTitle,
  questions,
  passingScore = 100,
  portalType,
  isRetryMode = false,
  attemptNumber = 1,
  userName,
  userRole,
  tenantName,
  onComplete,
}: EnhancedQuizComponentProps) {
  const [currentQuestions, setCurrentQuestions] = useState(questions)
  const [optionAnswers, setOptionAnswers] = useState<Record<string, string>>({})
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [retryMode, setRetryMode] = useState(isRetryMode)
  const [currentAttempt, setCurrentAttempt] = useState(attemptNumber)
  const [completedModules, setCompletedModules] = useState<string[]>([])

  // Reset answers when questions change
  useEffect(() => {
    setOptionAnswers({})
    setTextAnswers({})
  }, [currentQuestions])

  const allQuestionsAnswered = currentQuestions.every((q) => {
    if (q.questionType === 'SHORT_ANSWER') {
      return textAnswers[q.id]?.trim()
    }
    return optionAnswers[q.id]
  })

  function getAnsweredCount() {
    return currentQuestions.filter((q) => {
      if (q.questionType === 'SHORT_ANSWER') {
        return textAnswers[q.id]?.trim()
      }
      return optionAnswers[q.id]
    }).length
  }

  function handleSelectOption(questionId: string, optionId: string) {
    setOptionAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }))
    setError(null)
  }

  function handleTextAnswer(questionId: string, text: string) {
    setTextAnswers((prev) => ({
      ...prev,
      [questionId]: text,
    }))
    setError(null)
  }

  async function handleSubmit() {
    if (!allQuestionsAnswered) {
      setError('Please answer all questions before submitting.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const answerArray = currentQuestions.map((q) => {
        if (q.questionType === 'SHORT_ANSWER') {
          return {
            question_id: q.id,
            text_answer: textAnswers[q.id],
          }
        }
        return {
          question_id: q.id,
          selected_option_id: optionAnswers[q.id],
        }
      })

      const response = await fetch(`/api/empoweru/quiz/${moduleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          answers: answerArray,
          portalType,
          isRetry: retryMode,
        }),
      })

      const json = await response.json()

      if (!response.ok) {
        throw new Error(json.error || 'Failed to submit quiz')
      }

      const quizResult: QuizResult = {
        score: json.data.score,
        passed: json.data.passed,
        totalQuestions: json.data.totalQuestions,
        correctAnswers: json.data.correctAnswers,
        attemptNumber: json.data.attemptNumber,
        missedQuestionIds: json.data.missedQuestionIds || [],
        missedQuestions: json.data.missedQuestions || [],
        certificationGenerated: json.data.certificationGenerated,
      }

      setResult(quizResult)
      setCurrentAttempt(quizResult.attemptNumber)
      setShowResult(true)

      // Callback for parent component
      if (onComplete) {
        onComplete(quizResult.passed, !!quizResult.certificationGenerated)
      }
    } catch (err) {
      console.error('Failed to submit quiz:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit quiz')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRetry() {
    if (!result) return

    // Set the questions to only the missed ones
    setCurrentQuestions(
      result.missedQuestions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        options:
          questions.find((orig) => orig.id === q.id)?.options || [],
      }))
    )
    setRetryMode(true)
    setShowResult(false)
    setOptionAnswers({})
    setTextAnswers({})
    setResult(null)
  }

  function handleCloseResult() {
    setShowResult(false)
    if (result?.passed) {
      // Reset to full quiz if needed
      setCurrentQuestions(questions)
      setRetryMode(false)
    }
  }

  return (
    <>
      <div className="bg-black border border-white/10">
        {/* Quiz Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                {quizTitle}
              </h2>
              <p className="text-white/50 text-sm">
                {currentQuestions.length} questions | Passing score: {passingScore}%
                {retryMode && (
                  <span className="ml-2 text-magenta">
                    (Retry - Attempt #{currentAttempt})
                  </span>
                )}
              </p>
            </div>
            {retryMode && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-magenta/10 border border-magenta/30 text-magenta text-sm">
                <RefreshCw className="h-4 w-4" />
                Retry Mode
              </div>
            )}
          </div>
        </div>

        {/* Questions */}
        <div className="p-4 space-y-6">
          {currentQuestions.map((question, qIndex) => {
            const selectedOption = optionAnswers[question.id]
            const textAnswer = textAnswers[question.id] || ''

            return (
              <div
                key={question.id}
                className="pb-6 border-b border-white/10 last:border-0 last:pb-0"
              >
                <div className="flex items-start gap-3 mb-4">
                  <span className="h-6 w-6 bg-neon/10 text-neon font-bold text-sm flex items-center justify-center flex-shrink-0">
                    {qIndex + 1}
                  </span>
                  <div>
                    <p className="text-white font-medium">{question.questionText}</p>
                    {question.questionType === 'SHORT_ANSWER' && (
                      <span className="text-xs text-white/40 uppercase tracking-wider">Short Answer</span>
                    )}
                  </div>
                </div>

                <div className="ml-9">
                  {/* MULTIPLE_CHOICE and TRUE_FALSE - show options */}
                  {(question.questionType === 'MULTIPLE_CHOICE' || question.questionType === 'TRUE_FALSE' || !question.questionType) && (
                    <div className={cn(
                      question.questionType === 'TRUE_FALSE' ? 'flex gap-4' : 'space-y-2'
                    )}>
                      {question.options.map((option) => {
                        const isSelected = selectedOption === option.id

                        return (
                          <button
                            key={option.id}
                            onClick={() => handleSelectOption(question.id, option.id)}
                            disabled={submitting}
                            className={cn(
                              'flex items-center gap-3 p-3 border text-left transition-all',
                              question.questionType === 'TRUE_FALSE' ? 'flex-1' : 'w-full',
                              isSelected
                                ? 'border-neon bg-neon/5 text-white'
                                : 'border-white/10 hover:border-white/30 text-white/70 hover:text-white',
                              submitting && 'opacity-50 cursor-not-allowed'
                            )}
                          >
                            {isSelected ? (
                              <CheckCircle className="h-5 w-5 text-neon flex-shrink-0" />
                            ) : (
                              <Circle className="h-5 w-5 text-white/30 flex-shrink-0" />
                            )}
                            <span>{option.optionText}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* SHORT_ANSWER - show text input */}
                  {question.questionType === 'SHORT_ANSWER' && (
                    <input
                      type="text"
                      value={textAnswer}
                      onChange={(e) => handleTextAnswer(question.id, e.target.value)}
                      disabled={submitting}
                      placeholder="Type your answer..."
                      className={cn(
                        'w-full px-4 py-3 bg-black border text-white focus:border-neon focus:outline-none',
                        textAnswer.trim() ? 'border-neon/50' : 'border-white/20',
                        submitting && 'opacity-50 cursor-not-allowed'
                      )}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-4 mb-4 p-3 bg-magenta/10 border border-magenta/30 flex items-center gap-2 text-magenta">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-sm">
              {getAnsweredCount()}/{currentQuestions.length} answered
            </span>
            <button
              onClick={handleSubmit}
              disabled={submitting || !allQuestionsAnswered}
              className={cn(
                'flex items-center gap-2 px-6 py-3 font-bold uppercase tracking-wider transition-colors',
                submitting || !allQuestionsAnswered
                  ? 'bg-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-neon text-black hover:bg-neon/90'
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Quiz'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Result Modal */}
      {result && (
        <QuizResultModal
          isOpen={showResult}
          onClose={handleCloseResult}
          score={result.score}
          passed={result.passed}
          totalQuestions={result.totalQuestions}
          correctAnswers={result.correctAnswers}
          attemptNumber={result.attemptNumber}
          missedQuestions={result.missedQuestions}
          onRetry={handleRetry}
          certificationGenerated={result.certificationGenerated}
          userName={userName}
          role={userRole}
          tenantName={tenantName}
          completedModules={completedModules}
        />
      )}
    </>
  )
}
