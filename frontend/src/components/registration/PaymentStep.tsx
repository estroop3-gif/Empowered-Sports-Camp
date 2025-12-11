'use client'

import { useState, useEffect } from 'react'
import {
  CreditCard,
  Lock,
  Tag,
  Check,
  X,
  Loader2,
  Shield,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCheckout } from '@/lib/checkout/context'
import { Button } from '@/components/ui/button'
import type { AppliedPromoCode } from '@/types/registration'

/**
 * PaymentStep
 *
 * DESIGN NOTES:
 * - Stripe Elements for secure card input
 * - Promo code input with validation
 * - Order review before payment
 * - Terms acceptance checkbox
 * - Processing state with animation
 */

interface PaymentStepProps {
  onComplete: (paymentIntentId: string) => void
  onBack: () => void
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

interface PromoCodeInputProps {
  onApply: (promo: AppliedPromoCode) => void
  onRemove: () => void
  appliedPromo: AppliedPromoCode | null
}

function PromoCodeInput({ onApply, onRemove, appliedPromo }: PromoCodeInputProps) {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApply = async () => {
    if (!code.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      // TODO: Implement actual promo code validation via API
      // For now, simulate a successful promo
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Mock response - replace with actual API call
      if (code.toUpperCase() === 'FIERCE20') {
        onApply({
          id: 'promo-1',
          code: code.toUpperCase(),
          discountType: 'percent',
          discountValue: 20,
          discountAmount: 0, // Calculated by context
        })
        setCode('')
      } else if (code.toUpperCase() === 'SAVE50') {
        onApply({
          id: 'promo-2',
          code: code.toUpperCase(),
          discountType: 'fixed',
          discountValue: 5000, // $50
          discountAmount: 0,
        })
        setCode('')
      } else {
        setError('Invalid promo code')
      }
    } catch {
      setError('Failed to validate code')
    } finally {
      setIsLoading(false)
    }
  }

  if (appliedPromo) {
    return (
      <div className="flex items-center justify-between bg-purple/10 border border-purple/30 p-3">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-purple" />
          <span className="text-sm font-semibold text-purple">{appliedPromo.code}</span>
          <span className="text-xs text-white/50">
            {appliedPromo.discountType === 'percent'
              ? `${appliedPromo.discountValue}% off`
              : `${formatCents(appliedPromo.discountValue)} off`}
          </span>
        </div>
        <button
          onClick={onRemove}
          className="p-1 text-white/40 hover:text-red-500 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setError(null)
            }}
            placeholder="Promo code"
            className={cn(
              'w-full pl-10 pr-4 py-3 bg-white/5 border text-white uppercase tracking-wider',
              'focus:outline-none focus:ring-2 focus:ring-neon/50 focus:border-neon transition-all',
              error ? 'border-red-500' : 'border-white/10'
            )}
          />
        </div>
        <Button
          variant="outline-neon"
          onClick={handleApply}
          disabled={!code.trim() || isLoading}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
        </Button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// Mock Stripe Card Input (replace with actual Stripe Elements)
function CardInput() {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
          Card Number
        </label>
        <div className="relative">
          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            placeholder="1234 5678 9012 3456"
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-neon/50 focus:border-neon transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
            Expiry
          </label>
          <input
            type="text"
            placeholder="MM / YY"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-neon/50 focus:border-neon transition-all"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
            CVC
          </label>
          <input
            type="text"
            placeholder="123"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-neon/50 focus:border-neon transition-all"
          />
        </div>
      </div>
    </div>
  )
}

export function PaymentStep({ onComplete, onBack }: PaymentStepProps) {
  const { state, totals, applyPromo, removePromo } = useCheckout()
  const [isProcessing, setIsProcessing] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!acceptedTerms) {
      setError('Please accept the terms and conditions')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // TODO: Implement actual Stripe payment processing
      // 1. Create PaymentIntent on server
      // 2. Confirm payment with Stripe.js
      // 3. Handle result

      // Mock payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Mock successful payment
      const mockPaymentIntentId = `pi_${Date.now()}_mock`
      onComplete(mockPaymentIntentId)
    } catch {
      setError('Payment failed. Please try again.')
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
          Secure Payment
        </h1>
        <p className="mt-2 text-white/60">
          Complete your registration with a secure payment.
        </p>
      </div>

      {/* Order Review */}
      <div className="bg-white/5 border border-white/10 p-4 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">
          Order Review
        </h2>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/60">
              Camp ({state.campers.length} camper{state.campers.length > 1 ? 's' : ''})
            </span>
            <span className="text-white">{formatCents(totals.campSubtotal)}</span>
          </div>

          {totals.addOnsSubtotal > 0 && (
            <div className="flex justify-between">
              <span className="text-white/60">Add-Ons</span>
              <span className="text-white">{formatCents(totals.addOnsSubtotal)}</span>
            </div>
          )}

          {totals.siblingDiscount > 0 && (
            <div className="flex justify-between text-magenta">
              <span>Sibling Discount</span>
              <span>-{formatCents(totals.siblingDiscount)}</span>
            </div>
          )}

          {totals.promoDiscount > 0 && (
            <div className="flex justify-between text-purple">
              <span>Promo ({state.promoCode?.code})</span>
              <span>-{formatCents(totals.promoDiscount)}</span>
            </div>
          )}

          <div className="pt-2 border-t border-white/10 flex justify-between font-bold">
            <span className="text-white">Total</span>
            <span className="text-neon text-lg">{formatCents(totals.total)}</span>
          </div>
        </div>
      </div>

      {/* Promo Code */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">
          Promo Code
        </h2>
        <PromoCodeInput
          onApply={applyPromo}
          onRemove={removePromo}
          appliedPromo={state.promoCode}
        />
      </div>

      {/* Payment Form */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-neon" />
          <h2 className="text-lg font-bold uppercase tracking-wider text-white">
            Payment Details
          </h2>
        </div>

        <div className="bg-white/5 border border-white/10 p-4">
          <CardInput />

          {/* Security Note */}
          <div className="mt-4 flex items-center gap-2 text-xs text-white/40">
            <Lock className="h-3 w-3" />
            <span>Your payment info is encrypted and secure</span>
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className="space-y-4">
        <label className="flex items-start gap-3 cursor-pointer group">
          <div
            className={cn(
              'h-5 w-5 border flex items-center justify-center shrink-0 mt-0.5 transition-all',
              acceptedTerms
                ? 'bg-neon border-neon'
                : 'border-white/30 group-hover:border-neon/50'
            )}
            onClick={() => setAcceptedTerms(!acceptedTerms)}
          >
            {acceptedTerms && <Check className="h-3 w-3 text-black" />}
          </div>
          <span className="text-sm text-white/70">
            I agree to the{' '}
            <a href="/terms" className="text-neon hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-neon hover:underline">
              Privacy Policy
            </a>
            . I understand that registration is non-refundable within 14 days of camp start.
          </span>
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit */}
      <div className="space-y-4">
        <Button
          variant="neon"
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          disabled={isProcessing || !acceptedTerms}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Processing...
            </>
          ) : (
            <>
              <Lock className="h-5 w-5 mr-2" />
              Pay {formatCents(totals.total)}
            </>
          )}
        </Button>

        <Button
          variant="outline-neon"
          size="lg"
          className="w-full"
          onClick={onBack}
          disabled={isProcessing}
        >
          Back to Add-Ons
        </Button>
      </div>

      {/* Trust Badges */}
      <div className="flex items-center justify-center gap-6 pt-4">
        <div className="flex items-center gap-2 text-white/40">
          <Shield className="h-5 w-5" />
          <span className="text-xs">SSL Secure</span>
        </div>
        <div className="flex items-center gap-2 text-white/40">
          <CreditCard className="h-5 w-5" />
          <span className="text-xs">Stripe Powered</span>
        </div>
      </div>
    </div>
  )
}
