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
  TestTube,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCheckout } from '@/lib/checkout/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AppliedPromoCode } from '@/types/registration'

/**
 * PaymentStep
 *
 * DESIGN NOTES:
 * - Embedded payment form with Stripe Elements OR
 * - Developer mode simulation for testing
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

interface PromoCodeInputExtendedProps extends PromoCodeInputProps {
  tenantId: string
  subtotalCents: number
}

function PromoCodeInput({
  onApply,
  onRemove,
  appliedPromo,
  tenantId,
  subtotalCents,
}: PromoCodeInputExtendedProps) {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApply = async () => {
    if (!code.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/promo-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.toUpperCase(),
          tenantId,
          subtotalCents,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Invalid promo code')
        return
      }

      onApply({
        id: result.data.id,
        code: result.data.code,
        discountType: result.data.discountType,
        discountValue: result.data.discountValue,
        discountAmount: result.data.discountAmount,
      })
      setCode('')
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

// Simulated card form for developer mode
interface SimulatedCardFormProps {
  onPayment: () => void
  isProcessing: boolean
  total: number
}

function SimulatedCardForm({ onPayment, isProcessing, total }: SimulatedCardFormProps) {
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [cardError, setCardError] = useState<string | null>(null)

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    return parts.length ? parts.join(' ') : v
  }

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + (v.length > 2 ? '/' + v.substring(2, 4) : '')
    }
    return v
  }

  const handleSubmit = () => {
    // Validate simulated card
    const cleanCardNumber = cardNumber.replace(/\s/g, '')
    if (cleanCardNumber.length < 16) {
      setCardError('Please enter a valid card number')
      return
    }
    if (expiry.length < 5) {
      setCardError('Please enter a valid expiry date')
      return
    }
    if (cvc.length < 3) {
      setCardError('Please enter a valid CVC')
      return
    }

    // Test card numbers that simulate different scenarios
    if (cleanCardNumber === '4000000000000002') {
      setCardError('Card declined. Please try a different card.')
      return
    }

    setCardError(null)
    onPayment()
  }

  return (
    <div className="space-y-4">
      {/* Dev Mode Banner */}
      <div className="flex items-center gap-2 bg-purple/20 border border-purple/40 p-3 text-sm">
        <TestTube className="h-4 w-4 text-purple" />
        <span className="text-purple font-medium">Developer Mode</span>
        <span className="text-white/60">- No real charges will be made</span>
      </div>

      {/* Card Input Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
            Card Number
          </label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="4242 4242 4242 4242"
              maxLength={19}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
              Expiry
            </label>
            <Input
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              placeholder="MM/YY"
              maxLength={5}
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
              CVC
            </label>
            <Input
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/[^0-9]/g, '').substring(0, 4))}
              placeholder="123"
              maxLength={4}
            />
          </div>
        </div>
      </div>

      {/* Test Card Info */}
      <div className="bg-white/5 border border-white/10 p-3 text-xs text-white/50 space-y-1">
        <p><strong className="text-white/70">Test cards:</strong></p>
        <p>Success: 4242 4242 4242 4242</p>
        <p>Decline: 4000 0000 0000 0002</p>
        <p>Any future expiry and 3-digit CVC</p>
      </div>

      {cardError && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{cardError}</span>
        </div>
      )}

      <Button
        variant="neon"
        size="lg"
        className="w-full"
        onClick={handleSubmit}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Processing Payment...
          </>
        ) : (
          <>
            <Lock className="h-5 w-5 mr-2" />
            Pay {formatCents(total)} (Test Mode)
          </>
        )}
      </Button>
    </div>
  )
}

// Stripe Checkout info panel (for redirect mode)
function StripeCheckoutInfo() {
  return (
    <div className="bg-white/5 border border-white/10 p-4 space-y-3">
      <div className="flex items-center gap-2 text-white/80">
        <Shield className="h-5 w-5 text-neon" />
        <span className="text-sm font-medium">Secure Stripe Checkout</span>
      </div>
      <p className="text-xs text-white/50">
        You&apos;ll be redirected to Stripe&apos;s secure checkout page to complete your payment.
        All major credit cards are accepted.
      </p>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <CreditCard className="h-4 w-4 text-white/40" />
          <span className="text-xs text-white/40">Visa</span>
        </div>
        <div className="flex items-center gap-1">
          <CreditCard className="h-4 w-4 text-white/40" />
          <span className="text-xs text-white/40">Mastercard</span>
        </div>
        <div className="flex items-center gap-1">
          <CreditCard className="h-4 w-4 text-white/40" />
          <span className="text-xs text-white/40">Amex</span>
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
  const [isDevMode, setIsDevMode] = useState(false)

  // Check if we're in developer mode - only if explicitly set
  // Always use Stripe checkout redirect by default
  useEffect(() => {
    // Only use dev mode if NEXT_PUBLIC_USE_MOCK is explicitly true
    const useMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true'
    setIsDevMode(useMock)
  }, [])

  const handleDevModePayment = async () => {
    if (!acceptedTerms) {
      setError('Please accept the terms and conditions')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Build registration payload
      const payload = {
        campId: state.campSession?.id,
        tenantId: state.campSession?.tenantId,
        parent: state.parentInfo,
        campers: state.campers,
        addOns: state.selectedAddOns,
        promoCode: state.promoCode?.code || null,
        totals,
      }

      // Call checkout API to create registrations
      const response = await fetch('/api/registrations/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create registration')
      }

      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1500))

      // In dev mode, mark registration as paid
      if (result.data?.registrationIds) {
        await fetch('/api/registrations/confirm-dev', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            registrationIds: result.data.registrationIds,
          }),
        }).catch(console.error) // Don't fail if this doesn't exist
      }

      // Complete with mock session ID
      onComplete(result.data?.sessionId || `dev_${Date.now()}`)
    } catch (err) {
      console.error('[PaymentStep] Dev payment error:', err)
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.')
      setIsProcessing(false)
    }
  }

  const handleStripeCheckout = async () => {
    if (!acceptedTerms) {
      setError('Please accept the terms and conditions')
      return
    }

    if (!state.campSession) {
      setError('No camp selected')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Validate required data before submission
      if (!state.parentInfo?.email || !state.parentInfo?.firstName || !state.parentInfo?.lastName) {
        throw new Error('Parent information is incomplete. Please go back and fill in all required fields.')
      }

      if (!state.campers?.length) {
        throw new Error('No campers added. Please go back and add at least one camper.')
      }

      // Build registration payload
      const payload = {
        campId: state.campSession.id,
        tenantId: state.campSession.tenantId,
        parent: state.parentInfo,
        campers: state.campers,
        addOns: state.selectedAddOns,
        promoCode: state.promoCode?.code || null,
        totals,
      }

      console.log('[PaymentStep] Checkout payload:', JSON.stringify(payload, null, 2))

      // Call checkout API
      const response = await fetch('/api/registrations/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create registration')
      }

      // Redirect to Stripe Checkout
      if (result.data?.checkoutUrl) {
        console.log('[PaymentStep] Redirecting to checkout:', result.data.checkoutUrl)
        window.location.href = result.data.checkoutUrl
      } else {
        // No checkout URL returned - this is an error state
        console.error('[PaymentStep] No checkout URL in response:', result)
        throw new Error('Payment system unavailable. Please try again or contact support.')
      }
    } catch (err) {
      console.error('[PaymentStep] Checkout error:', err)
      // Provide more specific error messages
      let errorMessage = 'Payment failed. Please try again.'
      if (err instanceof Error) {
        if (err.message.includes('Missing required fields')) {
          errorMessage = 'Some required information is missing. Please go back and fill in all fields.'
        } else if (err.message.includes('Camp not found')) {
          errorMessage = 'This camp is no longer available. Please select a different camp.'
        } else if (err.message.includes('Not enough spots')) {
          errorMessage = 'Sorry, this camp is now full. Please select a different session.'
        } else if (err.message.includes('Parent information')) {
          errorMessage = err.message
        } else if (err.message.includes('No campers')) {
          errorMessage = err.message
        } else if (err.message.includes('Registration not found')) {
          errorMessage = 'Could not create your registration. Please try again.'
        } else if (err.message.includes('already registered')) {
          errorMessage = err.message
        } else if (err.message.includes('Stripe')) {
          errorMessage = 'Payment system error. Please try again in a few moments.'
        } else {
          errorMessage = err.message
        }
      }
      setError(errorMessage)
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
          tenantId={state.campSession?.tenantId || ''}
          subtotalCents={totals.campSubtotal - totals.siblingDiscount + totals.addOnsSubtotal}
        />
      </div>

      {/* Payment Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-neon" />
          <h2 className="text-lg font-bold uppercase tracking-wider text-white">
            Payment Details
          </h2>
        </div>

        {isDevMode ? (
          <>
            <SimulatedCardForm
              onPayment={handleDevModePayment}
              isProcessing={isProcessing}
              total={totals.total}
            />
            {/* Terms for Dev Mode */}
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
            {/* Back button for Dev Mode */}
            <Button
              variant="outline-neon"
              size="lg"
              className="w-full"
              onClick={onBack}
              disabled={isProcessing}
            >
              Back to Account
            </Button>
          </>
        ) : (
          <>
            <StripeCheckoutInfo />
            {/* Terms checkbox - above the continue button */}
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
            {/* Navigation Buttons */}
            <div className="flex gap-4">
              <Button
                variant="outline-neon"
                size="lg"
                className="flex-1"
                onClick={onBack}
                disabled={isProcessing}
              >
                Back
              </Button>
              <Button
                variant="neon"
                size="lg"
                className="flex-1"
                onClick={handleStripeCheckout}
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
                    Continue to Payment ({formatCents(totals.total)})
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

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
