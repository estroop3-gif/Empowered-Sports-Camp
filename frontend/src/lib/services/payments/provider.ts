/**
 * Payments Provider Abstraction
 *
 * Provides a unified interface for payment processing that works
 * with both live Stripe and simulated payments (Developer Mode).
 *
 * The rest of the application uses this interface and doesn't need
 * to know whether payments are live or simulated.
 */

import { getStripeMode, getSetting } from '@/lib/services/settings'
import { getStripeClient, isStripeConfigured } from '@/lib/stripe'
import type Stripe from 'stripe'

// =============================================================================
// TYPES
// =============================================================================

export type PaymentOutcome = 'SUCCESS' | 'DECLINED' | 'REQUIRES_ACTION_THEN_SUCCESS' | 'REFUND_SUCCESS' | 'REFUND_FAILED'

export interface CreateCheckoutSessionParams {
  lineItems: Array<{
    name: string
    description?: string
    unitAmountCents: number
    quantity: number
    imageUrl?: string
  }>
  metadata: Record<string, string>
  successUrl: string
  cancelUrl: string
  customerEmail?: string
}

export interface CheckoutSessionResult {
  sessionId: string
  sessionUrl: string | null
  provider: 'STRIPE_LIVE' | 'STRIPE_SIMULATED'
}

export interface WebhookEventResult {
  eventType: string
  eventId: string
  data: Record<string, unknown>
  provider: 'STRIPE_LIVE' | 'STRIPE_SIMULATED'
}

export interface RefundParams {
  paymentIntentId: string
  amountCents?: number // Partial refund if specified
  reason?: string
}

export interface RefundResult {
  refundId: string
  status: 'succeeded' | 'pending' | 'failed'
  amountCents: number
  provider: 'STRIPE_LIVE' | 'STRIPE_SIMULATED'
}

export interface SessionStatus {
  status: 'open' | 'complete' | 'expired'
  paymentStatus: 'unpaid' | 'paid' | 'no_payment_required'
  provider: 'STRIPE_LIVE' | 'STRIPE_SIMULATED'
}

// =============================================================================
// PAYMENT PROVIDER INTERFACE
// =============================================================================

export interface PaymentProvider {
  readonly providerType: 'STRIPE_LIVE' | 'STRIPE_SIMULATED'

  createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{
    data: CheckoutSessionResult | null
    error: Error | null
  }>

  getSessionStatus(sessionId: string): Promise<{
    data: SessionStatus | null
    error: Error | null
  }>

  processWebhookEvent(payload: string | Buffer, signature: string): Promise<{
    data: WebhookEventResult | null
    error: Error | null
  }>

  createRefund(params: RefundParams): Promise<{
    data: RefundResult | null
    error: Error | null
  }>
}

// =============================================================================
// STRIPE LIVE PROVIDER
// =============================================================================

class StripeLiveProvider implements PaymentProvider {
  readonly providerType = 'STRIPE_LIVE' as const

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{
    data: CheckoutSessionResult | null
    error: Error | null
  }> {
    try {
      const stripe = getStripeClient()
      if (!stripe) {
        return { data: null, error: new Error('Stripe not configured') }
      }

      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = params.lineItems.map((item) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            description: item.description,
            images: item.imageUrl ? [item.imageUrl] : undefined,
          },
          unit_amount: item.unitAmountCents,
        },
        quantity: item.quantity,
      }))

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: lineItems,
        success_url: params.successUrl + '?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: params.cancelUrl,
        customer_email: params.customerEmail,
        metadata: params.metadata,
      })

      return {
        data: {
          sessionId: session.id,
          sessionUrl: session.url,
          provider: 'STRIPE_LIVE',
        },
        error: null,
      }
    } catch (error) {
      console.error('[StripeLiveProvider] createCheckoutSession error:', error)
      return { data: null, error: error as Error }
    }
  }

  async getSessionStatus(sessionId: string): Promise<{
    data: SessionStatus | null
    error: Error | null
  }> {
    try {
      const stripe = getStripeClient()
      if (!stripe) {
        return { data: null, error: new Error('Stripe not configured') }
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId)

      return {
        data: {
          status: session.status as SessionStatus['status'],
          paymentStatus: session.payment_status as SessionStatus['paymentStatus'],
          provider: 'STRIPE_LIVE',
        },
        error: null,
      }
    } catch (error) {
      console.error('[StripeLiveProvider] getSessionStatus error:', error)
      return { data: null, error: error as Error }
    }
  }

  async processWebhookEvent(payload: string | Buffer, signature: string): Promise<{
    data: WebhookEventResult | null
    error: Error | null
  }> {
    try {
      const stripe = getStripeClient()
      if (!stripe) {
        return { data: null, error: new Error('Stripe not configured') }
      }

      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
      if (!webhookSecret) {
        return { data: null, error: new Error('STRIPE_WEBHOOK_SECRET not configured') }
      }

      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)

      return {
        data: {
          eventType: event.type,
          eventId: event.id,
          data: event.data.object as unknown as Record<string, unknown>,
          provider: 'STRIPE_LIVE',
        },
        error: null,
      }
    } catch (error) {
      console.error('[StripeLiveProvider] processWebhookEvent error:', error)
      return { data: null, error: error as Error }
    }
  }

  async createRefund(params: RefundParams): Promise<{
    data: RefundResult | null
    error: Error | null
  }> {
    try {
      const stripe = getStripeClient()
      if (!stripe) {
        return { data: null, error: new Error('Stripe not configured') }
      }

      const refund = await stripe.refunds.create({
        payment_intent: params.paymentIntentId,
        amount: params.amountCents,
        reason: (params.reason as Stripe.RefundCreateParams.Reason) || undefined,
      })

      return {
        data: {
          refundId: refund.id,
          status: refund.status as RefundResult['status'],
          amountCents: refund.amount,
          provider: 'STRIPE_LIVE',
        },
        error: null,
      }
    } catch (error) {
      console.error('[StripeLiveProvider] createRefund error:', error)
      return { data: null, error: error as Error }
    }
  }
}

// =============================================================================
// STRIPE SIMULATED PROVIDER
// =============================================================================

// In-memory store for simulated sessions (in production, could use Redis)
const simulatedSessions = new Map<string, {
  id: string
  status: 'open' | 'complete' | 'expired'
  paymentStatus: 'unpaid' | 'paid' | 'no_payment_required'
  metadata: Record<string, string>
  amountCents: number
  outcome: PaymentOutcome
  createdAt: Date
}>()

// Webhook handlers registered for simulation
let simulatedWebhookHandler: ((event: WebhookEventResult) => Promise<void>) | null = null

/**
 * Register a handler for simulated webhook events
 */
export function registerSimulatedWebhookHandler(
  handler: (event: WebhookEventResult) => Promise<void>
): void {
  simulatedWebhookHandler = handler
}

/**
 * Generate a Stripe-like ID
 */
function generateStripeId(prefix: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = prefix + '_'
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

class StripeSimulatedProvider implements PaymentProvider {
  readonly providerType = 'STRIPE_SIMULATED' as const

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{
    data: CheckoutSessionResult | null
    error: Error | null
  }> {
    try {
      // Get default outcome from settings
      const outcomeResult = await getSetting({ key: 'simulatedPaymentsDefaultOutcome' })
      const defaultOutcome = (outcomeResult.data as PaymentOutcome) || 'SUCCESS'

      // Check for override in metadata
      const outcome = (params.metadata.simulatedOutcome as PaymentOutcome) || defaultOutcome

      const sessionId = generateStripeId('cs')
      const totalAmountCents = params.lineItems.reduce(
        (sum, item) => sum + item.unitAmountCents * item.quantity,
        0
      )

      // Store session
      simulatedSessions.set(sessionId, {
        id: sessionId,
        status: 'open',
        paymentStatus: 'unpaid',
        metadata: params.metadata,
        amountCents: totalAmountCents,
        outcome,
        createdAt: new Date(),
      })

      // Simulate the checkout URL pointing to a confirmation endpoint
      const sessionUrl = `${params.successUrl.split('?')[0]}?session_id=${sessionId}&simulated=true`

      // Schedule automatic completion based on outcome (simulates user completing checkout)
      setTimeout(() => {
        this.simulateCheckoutCompletion(sessionId)
      }, 1000) // 1 second delay to simulate user flow

      return {
        data: {
          sessionId,
          sessionUrl,
          provider: 'STRIPE_SIMULATED',
        },
        error: null,
      }
    } catch (error) {
      console.error('[StripeSimulatedProvider] createCheckoutSession error:', error)
      return { data: null, error: error as Error }
    }
  }

  private async simulateCheckoutCompletion(sessionId: string): Promise<void> {
    const session = simulatedSessions.get(sessionId)
    if (!session || session.status !== 'open') return

    const { outcome } = session

    if (outcome === 'DECLINED') {
      // Payment declined - session remains unpaid
      session.status = 'expired'
      session.paymentStatus = 'unpaid'

      // Fire failed webhook
      if (simulatedWebhookHandler) {
        await simulatedWebhookHandler({
          eventType: 'checkout.session.expired',
          eventId: generateStripeId('evt'),
          data: {
            id: sessionId,
            object: 'checkout.session',
            payment_status: 'unpaid',
            status: 'expired',
            metadata: session.metadata,
          },
          provider: 'STRIPE_SIMULATED',
        })
      }
    } else if (outcome === 'REQUIRES_ACTION_THEN_SUCCESS') {
      // Simulate 3D Secure - brief delay then success
      setTimeout(async () => {
        session.status = 'complete'
        session.paymentStatus = 'paid'

        if (simulatedWebhookHandler) {
          await simulatedWebhookHandler({
            eventType: 'checkout.session.completed',
            eventId: generateStripeId('evt'),
            data: {
              id: sessionId,
              object: 'checkout.session',
              payment_status: 'paid',
              status: 'complete',
              payment_intent: generateStripeId('pi'),
              amount_total: session.amountCents,
              metadata: session.metadata,
            },
            provider: 'STRIPE_SIMULATED',
          })
        }
      }, 2000) // Extra delay for "3D Secure"
    } else {
      // SUCCESS - immediate completion
      session.status = 'complete'
      session.paymentStatus = 'paid'

      if (simulatedWebhookHandler) {
        await simulatedWebhookHandler({
          eventType: 'checkout.session.completed',
          eventId: generateStripeId('evt'),
          data: {
            id: sessionId,
            object: 'checkout.session',
            payment_status: 'paid',
            status: 'complete',
            payment_intent: generateStripeId('pi'),
            amount_total: session.amountCents,
            metadata: session.metadata,
          },
          provider: 'STRIPE_SIMULATED',
        })
      }
    }
  }

  async getSessionStatus(sessionId: string): Promise<{
    data: SessionStatus | null
    error: Error | null
  }> {
    const session = simulatedSessions.get(sessionId)
    if (!session) {
      return { data: null, error: new Error('Session not found') }
    }

    return {
      data: {
        status: session.status,
        paymentStatus: session.paymentStatus,
        provider: 'STRIPE_SIMULATED',
      },
      error: null,
    }
  }

  async processWebhookEvent(_payload: string | Buffer, _signature: string): Promise<{
    data: WebhookEventResult | null
    error: Error | null
  }> {
    // In simulated mode, webhooks are triggered internally
    // This method is called but doesn't need to verify signatures
    return {
      data: null,
      error: new Error('Simulated webhooks are handled internally'),
    }
  }

  async createRefund(params: RefundParams): Promise<{
    data: RefundResult | null
    error: Error | null
  }> {
    try {
      const outcomeResult = await getSetting({ key: 'simulatedPaymentsDefaultOutcome' })
      const outcome = outcomeResult.data as PaymentOutcome

      // Find the session associated with this payment intent (simplified)
      const refundId = generateStripeId('re')

      // Simulate refund based on settings
      const succeeded = outcome !== 'REFUND_FAILED'

      // Fire refund webhook
      if (simulatedWebhookHandler) {
        await simulatedWebhookHandler({
          eventType: succeeded ? 'charge.refunded' : 'charge.refund.failed',
          eventId: generateStripeId('evt'),
          data: {
            id: refundId,
            object: 'refund',
            payment_intent: params.paymentIntentId,
            amount: params.amountCents || 0,
            status: succeeded ? 'succeeded' : 'failed',
          },
          provider: 'STRIPE_SIMULATED',
        })
      }

      return {
        data: {
          refundId,
          status: succeeded ? 'succeeded' : 'failed',
          amountCents: params.amountCents || 0,
          provider: 'STRIPE_SIMULATED',
        },
        error: null,
      }
    } catch (error) {
      console.error('[StripeSimulatedProvider] createRefund error:', error)
      return { data: null, error: error as Error }
    }
  }
}

// =============================================================================
// PROVIDER FACTORY
// =============================================================================

let cachedProvider: PaymentProvider | null = null
let cachedProviderMode: 'LIVE' | 'SIMULATED' | null = null

/**
 * Get the appropriate payment provider based on settings
 */
export async function getPaymentProvider(): Promise<PaymentProvider> {
  const mode = await getStripeMode()

  // Return cached provider if mode hasn't changed
  if (cachedProvider && cachedProviderMode === mode) {
    return cachedProvider
  }

  if (mode === 'SIMULATED') {
    cachedProvider = new StripeSimulatedProvider()
    cachedProviderMode = 'SIMULATED'
    console.log('[Payments] Using SIMULATED provider (Developer Mode)')
  } else {
    cachedProvider = new StripeLiveProvider()
    cachedProviderMode = 'LIVE'
    console.log('[Payments] Using LIVE provider')
  }

  return cachedProvider
}

/**
 * Force refresh the provider (after settings change)
 */
export function resetPaymentProvider(): void {
  cachedProvider = null
  cachedProviderMode = null
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export const stripeLiveProvider = new StripeLiveProvider()
export const stripeSimulatedProvider = new StripeSimulatedProvider()
