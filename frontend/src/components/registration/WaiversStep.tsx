'use client'

import { useState, useEffect } from 'react'
import {
  Shield,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  FileText,
} from 'lucide-react'
import { useCheckout } from '@/lib/checkout/context'
import { useAuth } from '@/lib/auth/context'
import type { CampSession } from '@/types/registration'

interface WaiverRequirement {
  id?: string
  waiverTemplateId: string
  displayOrder: number
  isRequired: boolean
  isSiteWide?: boolean
  waiverTemplate: {
    id: string
    title: string
    description?: string | null
    contentHtml: string
    currentVersion?: number
    isMandatorySiteWide?: boolean
  }
}

interface WaiverSigningState {
  waiverTemplateId: string
  signed: boolean
  expanded: boolean
  signerName: string
  signerEmail: string
  agreedToTerms: boolean
}

interface WaiversStepProps {
  campSession: CampSession
  onContinue: () => void
  onBack: () => void
}

export function WaiversStep({ campSession, onContinue, onBack }: WaiversStepProps) {
  const { state } = useCheckout()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requirements, setRequirements] = useState<WaiverRequirement[]>([])
  const [signingStates, setSigningStates] = useState<WaiverSigningState[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [currentWaiverIndex, setCurrentWaiverIndex] = useState(0)

  useEffect(() => {
    loadWaiverRequirements()
  }, [campSession.id])

  // Pre-fill signer info from parent info
  useEffect(() => {
    if (requirements.length > 0 && signingStates.length === 0) {
      const initialStates = requirements.map((req, index) => ({
        waiverTemplateId: req.waiverTemplateId,
        signed: false,
        expanded: index === 0,
        signerName: `${state.parentInfo.firstName} ${state.parentInfo.lastName}`.trim(),
        signerEmail: state.parentInfo.email,
        agreedToTerms: false,
      }))
      setSigningStates(initialStates)
    }
  }, [requirements, state.parentInfo])

  async function loadWaiverRequirements() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/camps/${campSession.id}/waivers`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load waivers')
      }

      const reqs = data.data?.requirements || []
      setRequirements(reqs)
    } catch (err) {
      console.error('Failed to load waiver requirements:', err)
      setError(err instanceof Error ? err.message : 'Failed to load waivers')
    } finally {
      setLoading(false)
    }
  }

  function handleExpandWaiver(waiverTemplateId: string) {
    setSigningStates((prev) =>
      prev.map((s) =>
        s.waiverTemplateId === waiverTemplateId
          ? { ...s, expanded: !s.expanded }
          : s
      )
    )
  }

  function handleAgreeToTerms(waiverTemplateId: string, agreed: boolean) {
    setSigningStates((prev) =>
      prev.map((s) =>
        s.waiverTemplateId === waiverTemplateId
          ? { ...s, agreedToTerms: agreed }
          : s
      )
    )
  }

  function handleSignWaiver(waiverTemplateId: string) {
    const signingState = signingStates.find((s) => s.waiverTemplateId === waiverTemplateId)
    if (!signingState?.agreedToTerms) return

    setSigningStates((prev) =>
      prev.map((s, index) =>
        s.waiverTemplateId === waiverTemplateId
          ? { ...s, signed: true, expanded: false }
          : { ...s, expanded: index === currentWaiverIndex + 1 }
      )
    )

    // Move to next unsigned waiver
    const nextUnsignedIndex = signingStates.findIndex(
      (s, index) => index > currentWaiverIndex && !s.signed
    )
    if (nextUnsignedIndex !== -1) {
      setCurrentWaiverIndex(nextUnsignedIndex)
    }
  }

  async function handleContinue() {
    // Check if all required waivers are signed
    const unsignedRequired = requirements.filter((req) => {
      if (!req.isRequired) return false
      const signingState = signingStates.find((s) => s.waiverTemplateId === req.waiverTemplateId)
      return !signingState?.signed
    })

    if (unsignedRequired.length > 0) {
      setError(`Please sign all required waivers before continuing. ${unsignedRequired.length} remaining.`)
      return
    }

    setSubmitting(true)
    setError(null)

    // In a production flow, we would save the waiver signatures here
    // For now, we'll just proceed to payment
    // The actual signing happens when the registration is created after payment

    // Store waiver acknowledgments in localStorage for the checkout process
    const waiverAcknowledgments = signingStates
      .filter((s) => s.signed)
      .map((s) => ({
        waiverTemplateId: s.waiverTemplateId,
        signerName: s.signerName,
        signerEmail: s.signerEmail,
        signedAt: new Date().toISOString(),
      }))

    localStorage.setItem('pendingWaiverSignatures', JSON.stringify(waiverAcknowledgments))

    setSubmitting(false)
    onContinue()
  }

  // If no waivers required, auto-proceed
  useEffect(() => {
    if (!loading && requirements.length === 0) {
      onContinue()
    }
  }, [loading, requirements, onContinue])

  const allRequiredSigned = requirements
    .filter((req) => req.isRequired)
    .every((req) => {
      const signingState = signingStates.find((s) => s.waiverTemplateId === req.waiverTemplateId)
      return signingState?.signed
    })

  const signedCount = signingStates.filter((s) => s.signed).length
  const requiredCount = requirements.filter((r) => r.isRequired).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-neon" />
      </div>
    )
  }

  if (requirements.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-neon" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple/10 border-2 border-purple mb-4">
          <Shield className="h-8 w-8 text-purple" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-white mb-2">
          Waiver & Release Forms
        </h2>
        <p className="text-white/60">
          Please review and sign the following waivers to complete your registration
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8 p-4 bg-black/30 border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/60">Waivers Signed</span>
          <span className="text-sm font-bold text-neon">
            {signedCount} / {requiredCount} required
          </span>
        </div>
        <div className="h-2 bg-white/10 overflow-hidden">
          <div
            className="h-full bg-neon transition-all duration-300"
            style={{ width: `${requiredCount > 0 ? (signedCount / requiredCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-magenta/10 border border-magenta/30 text-magenta flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Waiver List */}
      <div className="space-y-4 mb-8">
        {requirements.map((req, index) => {
          const signingState = signingStates.find((s) => s.waiverTemplateId === req.waiverTemplateId)
          const isSigned = signingState?.signed
          const isExpanded = signingState?.expanded

          return (
            <div
              key={req.waiverTemplateId}
              className={`border transition-all ${
                isSigned
                  ? 'border-neon/30 bg-neon/5'
                  : isExpanded
                    ? 'border-purple/50 bg-purple/5'
                    : 'border-white/10 bg-black/30'
              }`}
            >
              {/* Waiver Header */}
              <button
                onClick={() => !isSigned && handleExpandWaiver(req.waiverTemplateId)}
                disabled={isSigned}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 flex items-center justify-center border ${
                      isSigned
                        ? 'bg-neon/10 border-neon text-neon'
                        : 'bg-white/5 border-white/20 text-white/40'
                    }`}
                  >
                    {isSigned ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${isSigned ? 'text-neon' : 'text-white'}`}>
                        {req.waiverTemplate.title}
                      </span>
                      {req.isRequired && !isSigned && (
                        <span className="px-2 py-0.5 text-xs bg-magenta/10 text-magenta border border-magenta/30">
                          REQUIRED
                        </span>
                      )}
                      {req.isSiteWide && (
                        <span className="px-2 py-0.5 text-xs bg-purple/10 text-purple border border-purple/30">
                          SITE-WIDE
                        </span>
                      )}
                    </div>
                    {req.waiverTemplate.description && (
                      <p className="text-sm text-white/50 mt-1">{req.waiverTemplate.description}</p>
                    )}
                  </div>
                </div>
                {!isSigned && (
                  isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-white/40" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-white/40" />
                  )
                )}
              </button>

              {/* Expanded Content */}
              {isExpanded && !isSigned && (
                <div className="border-t border-white/10 p-4">
                  {/* Waiver Content */}
                  <div className="max-h-64 overflow-y-auto mb-6 p-4 bg-black/50 border border-white/10">
                    <div
                      className="prose prose-invert prose-sm max-w-none
                        prose-headings:text-white prose-headings:font-bold prose-headings:uppercase prose-headings:tracking-wider
                        prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                        prose-p:text-white/80 prose-p:leading-relaxed prose-p:mb-3
                        prose-strong:text-white
                        prose-ul:text-white/80 prose-ol:text-white/80
                        prose-li:marker:text-neon"
                      dangerouslySetInnerHTML={{ __html: req.waiverTemplate.contentHtml }}
                    />
                  </div>

                  {/* Agreement Checkbox */}
                  <label className="flex items-start gap-3 mb-6 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={signingState?.agreedToTerms || false}
                      onChange={(e) => handleAgreeToTerms(req.waiverTemplateId, e.target.checked)}
                      className="mt-1 w-5 h-5 accent-neon"
                    />
                    <span className="text-sm text-white/80">
                      I, <strong className="text-white">{signingState?.signerName || 'Parent/Guardian'}</strong>,
                      have read and understand the above waiver and release. I agree to its terms on behalf of myself
                      and my child(ren) being registered for this camp.
                    </span>
                  </label>

                  {/* Sign Button */}
                  <button
                    onClick={() => handleSignWaiver(req.waiverTemplateId)}
                    disabled={!signingState?.agreedToTerms}
                    className={`w-full flex items-center justify-center gap-2 py-3 font-bold uppercase tracking-wider transition-all ${
                      signingState?.agreedToTerms
                        ? 'bg-neon text-black hover:bg-neon/90'
                        : 'bg-white/10 text-white/30 cursor-not-allowed'
                    }`}
                  >
                    <Check className="h-5 w-5" />
                    Sign Waiver
                  </button>
                </div>
              )}

              {/* Signed Indicator */}
              {isSigned && (
                <div className="border-t border-neon/30 px-4 py-2 flex items-center gap-2 text-neon text-sm">
                  <Check className="h-4 w-4" />
                  Signed by {signingState?.signerName} on {new Date().toLocaleDateString()}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={onBack}
          disabled={submitting}
          className="flex items-center justify-center gap-2 px-6 py-4 border border-white/20 text-white/60 font-bold uppercase tracking-wider hover:border-white/40 hover:text-white transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!allRequiredSigned || submitting}
          className={`flex-1 flex items-center justify-center gap-2 py-4 font-bold uppercase tracking-wider transition-all ${
            allRequiredSigned && !submitting
              ? 'bg-neon text-black hover:bg-neon/90'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Continue to Payment
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
