'use client'

/**
 * QuizComponent
 *
 * Interactive quiz for EmpowerU modules.
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, Circle, Loader2, AlertCircle } from 'lucide-react'
import type { EmpowerUQuizDetail } from '@/lib/services/empoweru'

interface QuizComponentProps {
  quiz: EmpowerUQuizDetail
  onSubmit: (answers: { question_id: string; selected_option_id: string }[]) => Promise<void>
}

export function QuizComponent({ quiz, onSubmit }: QuizComponentProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allQuestionsAnswered = quiz.questions.every((q) => answers[q.id])

  function handleSelectOption(questionId: string, optionId: string) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
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
      const answerArray = Object.entries(answers).map(([question_id, selected_option_id]) => ({
        question_id,
        selected_option_id,
      }))

      await onSubmit(answerArray)
    } catch (err) {
      console.error('Failed to submit quiz:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit quiz')
    } finally {
      setSubmitting(false)
    }
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
          const selectedOption = answers[question.id]

          return (
            <div key={question.id} className="pb-6 border-b border-white/10 last:border-0 last:pb-0">
              <div className="flex items-start gap-3 mb-4">
                <span className="h-6 w-6 bg-neon/10 text-neon font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {qIndex + 1}
                </span>
                <p className="text-white font-medium">{question.question_text}</p>
              </div>

              <div className="ml-9 space-y-2">
                {question.options.map((option) => {
                  const isSelected = selectedOption === option.id

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelectOption(question.id, option.id)}
                      disabled={submitting}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 border text-left transition-all',
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
            {Object.keys(answers).length}/{quiz.questions.length} answered
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
