'use client'

/**
 * QuizResultModal
 *
 * Displays quiz results with option to retry missed questions.
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  CheckCircle,
  XCircle,
  Trophy,
  RefreshCw,
  Award,
  Download,
  X,
} from 'lucide-react'
import { downloadCertificate, type CertificateData } from '@/lib/services/certificate-generator'

interface QuizResultModalProps {
  isOpen: boolean
  onClose: () => void
  score: number
  passed: boolean
  totalQuestions: number
  correctAnswers: number
  attemptNumber: number
  missedQuestions: {
    id: string
    questionText: string
  }[]
  onRetry: () => void
  certificationGenerated?: {
    certificateNumber: string
    certifiedAt: string
  } | null
  userName?: string
  role?: string
  tenantName?: string
  completedModules?: string[]
}

export function QuizResultModal({
  isOpen,
  onClose,
  score,
  passed,
  totalQuestions,
  correctAnswers,
  attemptNumber,
  missedQuestions,
  onRetry,
  certificationGenerated,
  userName,
  role,
  tenantName,
  completedModules = [],
}: QuizResultModalProps) {
  const [downloading, setDownloading] = useState(false)

  if (!isOpen) return null

  const handleDownloadCertificate = async () => {
    if (!certificationGenerated || !userName || !role) return

    setDownloading(true)
    try {
      const data: CertificateData = {
        userName,
        role,
        certificateNumber: certificationGenerated.certificateNumber,
        certifiedAt: new Date(certificationGenerated.certifiedAt),
        tenantName,
        completedModules,
      }
      downloadCertificate(data)
    } catch (error) {
      console.error('Failed to download certificate:', error)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-black border border-white/20 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header with result */}
        <div
          className={cn(
            'p-6 text-center border-b',
            passed ? 'border-neon/30 bg-neon/5' : 'border-magenta/30 bg-magenta/5'
          )}
        >
          <div
            className={cn(
              'h-20 w-20 mx-auto mb-4 flex items-center justify-center',
              passed ? 'bg-neon/20' : 'bg-magenta/20'
            )}
          >
            {passed ? (
              certificationGenerated ? (
                <Trophy className="h-10 w-10 text-neon" />
              ) : (
                <CheckCircle className="h-10 w-10 text-neon" />
              )
            ) : (
              <XCircle className="h-10 w-10 text-magenta" />
            )}
          </div>

          <h2 className="text-2xl font-bold text-white uppercase tracking-wider mb-2">
            {passed
              ? certificationGenerated
                ? 'Congratulations!'
                : 'Quiz Passed!'
              : 'Not Quite...'}
          </h2>

          <div
            className={cn(
              'text-5xl font-bold mb-2',
              passed ? 'text-neon' : 'text-magenta'
            )}
          >
            {score}%
          </div>

          <p className="text-white/50 text-sm">
            {correctAnswers} of {totalQuestions} correct | Attempt #{attemptNumber}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {passed ? (
            certificationGenerated ? (
              <>
                <div className="text-center mb-6">
                  <Award className="h-12 w-12 text-purple mx-auto mb-3" />
                  <p className="text-white mb-2">
                    You've completed all required training and are now certified!
                  </p>
                  <p className="text-white/50 text-sm">
                    Certificate Number:{' '}
                    <span className="text-neon font-mono">
                      {certificationGenerated.certificateNumber}
                    </span>
                  </p>
                </div>

                <button
                  onClick={handleDownloadCertificate}
                  disabled={downloading || !userName || !role}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-6 py-3 font-bold uppercase tracking-wider transition-colors',
                    downloading
                      ? 'bg-white/10 text-white/30 cursor-not-allowed'
                      : 'bg-purple text-white hover:bg-purple/90'
                  )}
                >
                  <Download className="h-4 w-4" />
                  {downloading ? 'Generating...' : 'Download Certificate'}
                </button>
              </>
            ) : (
              <div className="text-center">
                <p className="text-white mb-4">
                  Great job! You've successfully passed this module's quiz.
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
                >
                  Continue
                </button>
              </div>
            )
          ) : (
            <>
              <div className="mb-6">
                <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-3">
                  Questions to Review
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {missedQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="p-3 bg-magenta/5 border border-magenta/20 text-white/70 text-sm"
                    >
                      <span className="text-magenta font-bold mr-2">
                        {idx + 1}.
                      </span>
                      {q.questionText}
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-white/50 text-sm mb-4 text-center">
                You need 100% to pass. Take your time and try again!
              </p>

              <button
                onClick={onRetry}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Retry Missed Questions
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
