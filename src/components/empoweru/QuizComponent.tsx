'use client'

/**
 * QuizComponent
 *
 * Interactive quiz for EmpowerU modules.
 * Supports MULTIPLE_CHOICE, TRUE_FALSE, and SHORT_ANSWER question types.
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, Circle, Loader2, AlertCircle } from 'lucide-react'
import type { EmpowerUQuizDetail, QuestionType } from '@/lib/services/empoweru'

interface QuizAnswer {
  question_id: string
  selected_option_id?: string
  text_answer?: string
}

interface QuizComponentProps {
  quiz: EmpowerUQuizDetail
  onSubmit: (answers: QuizAnswer[]) => Promise<void>
}

export function QuizComponent({ quiz, onSubmit }: QuizComponentProps) {
  // Store both option selections and text answers
  const [optionAnswers, setOptionAnswers] = useState<Record<string, string>>({})
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allQuestionsAnswered = quiz.questions.every((q) => {
    if (q.question_type === 'SHORT_ANSWER') {
      return textAnswers[q.id]?.trim()
    }
    return optionAnswers[q.id]
  })

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
      const answerArray: QuizAnswer[] = quiz.questions.map((q) => {
        if (q.question_type === 'SHORT_ANSWER') {
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

      await onSubmit(answerArray)
    } catch (err) {
      console.error('Failed to submit quiz:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit quiz')
    } finally {
      setSubmitting(false)
    }
  }

  function getAnsweredCount() {
    return quiz.questions.filter((q) => {
      if (q.question_type === 'SHORT_ANSWER') {
        return textAnswers[q.id]?.trim()
      }
      return optionAnswers[q.id]
    }).length
  }

  return (
    <div className="bg-black border border-white/10">
      {/* Quiz Header */}
      <div className="p-4 border-b border-white/10">
        <h2 className="text-lg font-bold text-white uppercase tracking-wider">{quiz.title}</h2>
        <p className="text-white/50 text-sm">
          {quiz.questions.length} questions | Passing score: {quiz.passing_score}%
        </p>
      </div>

      {/* Questions */}
      <div className="p-4 space-y-6">
        {quiz.questions.map((question, qIndex) => {
          const selectedOption = optionAnswers[question.id]
          const textAnswer = textAnswers[question.id] || ''

          return (
            <div key={question.id} className="pb-6 border-b border-white/10 last:border-0 last:pb-0">
              <div className="flex items-start gap-3 mb-4">
                <span className="h-6 w-6 bg-neon/10 text-neon font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {qIndex + 1}
                </span>
                <div>
                  <p className="text-white font-medium">{question.question_text}</p>
                  {question.question_type === 'SHORT_ANSWER' && (
                    <span className="text-xs text-white/40 uppercase tracking-wider">Short Answer</span>
                  )}
                </div>
              </div>

              <div className="ml-9">
                {/* MULTIPLE_CHOICE and TRUE_FALSE - show options */}
                {(question.question_type === 'MULTIPLE_CHOICE' || question.question_type === 'TRUE_FALSE') && (
                  <div className={cn(
                    question.question_type === 'TRUE_FALSE' ? 'flex gap-4' : 'space-y-2'
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
                            question.question_type === 'TRUE_FALSE' ? 'flex-1' : 'w-full',
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
                          <span>{option.option_text}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* SHORT_ANSWER - show text input */}
                {question.question_type === 'SHORT_ANSWER' && (
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
            {getAnsweredCount()}/{quiz.questions.length} answered
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
  )
}
