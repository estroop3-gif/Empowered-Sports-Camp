/**
 * Payments Service
 *
 * SHELL: Stripe integration for camp registrations and shop orders
 *
 * Handles:
 * - Checkout session creation
 * - Webhook processing for payment events
 * - Payment status tracking
 * - Refund processing
 */

import { prisma } from '@/lib/db/client'

// =============================================================================
// Types
// =============================================================================

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED'

export interface CheckoutSessionResult {
  checkoutUrl: string
  sessionId: string
}

export interface WebhookResult {
  processed: boolean
  eventType: string
  resourceId: string | null
}

export interface PaymentRecord {
  id: string
  stripePaymentIntentId: string | null
  amount: number
  currency: string
  status: PaymentStatus
  resourceType: 'REGISTRATION' | 'ORDER'
  resourceId: string
  createdAt: string
}

// =============================================================================
// Configuration
// =============================================================================

// SHELL: Stripe configuration from environment
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''

// =============================================================================
// Service Functions
// =============================================================================

/**
 * SHELL: Create a Stripe Checkout session for camp registration
 */
export async function createStripeCheckoutSession(params: {
  campSessionId: string
  registrationId: string
  successUrl: string
  cancelUrl: string
  tenantId: string
}): Promise<{ data: CheckoutSessionResult | null; error: Error | null }> {
  try {
    const { campSessionId, registrationId, successUrl, cancelUrl, tenantId } = params

    // SHELL: Fetch registration and camp details
    const registration = await prisma.registration.findFirst({
      where: {
        id: registrationId,
        campId: campSessionId,
        tenantId,
      },
      include: {
        camp: true,
        athlete: true,
        parent: true,
      },
    })

    if (!registration) {
      return { data: null, error: new Error('Registration not found') }
    }

    // SHELL: Calculate total amount
    // TODO: Include base price, add-ons, discounts, promo codes
    const amountInCents = registration.totalPriceCents || registration.camp.priceCents || 0

    // SHELL: Create Stripe Checkout Session
    // TODO: Implement actual Stripe integration
    /*
    const stripe = new Stripe(STRIPE_SECRET_KEY)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: registration.camp.name,
              description: `Camp registration for ${registration.athlete?.firstName}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        registrationId,
        campSessionId,
        tenantId,
      },
    })
    */

    console.log('[Payments] SHELL: Would create Stripe checkout session:', {
      registrationId,
      campSessionId,
      amount: amountInCents / 100,
    })

    // SHELL: Return mock checkout URL
    // TODO: Replace with actual Stripe session URL
    return {
      data: {
        checkoutUrl: `https://checkout.stripe.com/placeholder?registration=${registrationId}`,
        sessionId: `cs_test_${Date.now()}`,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Payments] Failed to create checkout session:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: Create a Stripe Checkout session for shop order
 */
export async function createShopCheckoutSession(params: {
  orderId: string
  successUrl: string
  cancelUrl: string
  tenantId: string
}): Promise<{ data: CheckoutSessionResult | null; error: Error | null }> {
  try {
    const { orderId, successUrl, cancelUrl, tenantId } = params

    // SHELL: Fetch order and items
    const order = await prisma.shopOrder.findFirst({
      where: {
        id: orderId,
        licenseeId: tenantId,
      },
      include: {
        items: true,
      },
    })

    if (!order) {
      return { data: null, error: new Error('Order not found') }
    }

    // SHELL: Build line items for Stripe
    const lineItems = order.items.map((item) => ({
      name: item.productName,
      description: item.variantName,
      quantity: item.quantity,
      amount: item.unitPriceCents,
    }))

    // SHELL: Create Stripe Checkout Session
    // TODO: Implement actual Stripe integration

    console.log('[Payments] SHELL: Would create shop checkout session:', {
      orderId,
      lineItems,
      total: order.totalCents,
    })

    return {
      data: {
        checkoutUrl: `https://checkout.stripe.com/placeholder?order=${orderId}`,
        sessionId: `cs_test_${Date.now()}`,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Payments] Failed to create shop checkout session:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: Handle Stripe webhook events
 */
export async function handleStripeWebhook(
  payload: string | Buffer,
  signature: string
): Promise<{ data: WebhookResult | null; error: Error | null }> {
  try {
    // SHELL: Verify webhook signature
    // TODO: Implement Stripe signature verification
    /*
    const stripe = new Stripe(STRIPE_SECRET_KEY)
    const event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET)
    */

    // SHELL: Parse event (mock for now)
    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_xxx',
          metadata: {
            registrationId: null,
            orderId: null,
            tenantId: null,
          },
          payment_status: 'paid',
        },
      },
    }

    console.log('[Payments] SHELL: Would process webhook event:', event.type)

    // SHELL: Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as any)
        break

      case 'payment_intent.succeeded':
        // SHELL: Update payment record
        break

      case 'payment_intent.payment_failed':
        // SHELL: Handle failed payment, notify user
        break

      case 'charge.refunded':
        // SHELL: Process refund, update records
        break

      default:
        console.log('[Payments] Unhandled webhook event type:', event.type)
    }

    return {
      data: {
        processed: true,
        eventType: event.type,
        resourceId: null,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Payments] Failed to process webhook:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: Process successful checkout
 */
async function handleCheckoutComplete(session: {
  id: string
  metadata: { registrationId?: string; orderId?: string; tenantId?: string }
  payment_status: string
}): Promise<void> {
  const { metadata } = session

  if (metadata.registrationId) {
    // SHELL: Update registration status
    // TODO: Update camp_registrations.status = 'CONFIRMED'
    // TODO: Update camp_registrations.payment_status = 'COMPLETED'
    // TODO: Send confirmation email

    console.log('[Payments] SHELL: Would confirm registration:', metadata.registrationId)
  }

  if (metadata.orderId) {
    // SHELL: Update order status
    // TODO: Update shop_orders.status = 'PAID'
    // TODO: Send order confirmation email

    console.log('[Payments] SHELL: Would confirm order:', metadata.orderId)
  }
}

/**
 * SHELL: Process a refund for a registration or order
 */
export async function processRefund(params: {
  resourceType: 'REGISTRATION' | 'ORDER'
  resourceId: string
  amount?: number // Partial refund amount, null for full refund
  reason?: string
  tenantId: string
  processedByUserId: string
}): Promise<{ data: { refundId: string; amount: number } | null; error: Error | null }> {
  try {
    const { resourceType, resourceId, amount, reason, tenantId, processedByUserId } = params

    // SHELL: Fetch the original payment
    // TODO: Query payment records to get Stripe payment intent ID

    // SHELL: Create Stripe refund
    // TODO: Implement actual Stripe refund
    /*
    const stripe = new Stripe(STRIPE_SECRET_KEY)
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // undefined for full refund
      reason: 'requested_by_customer',
    })
    */

    console.log('[Payments] SHELL: Would process refund:', {
      resourceType,
      resourceId,
      amount,
      reason,
    })

    // SHELL: Update records
    // TODO: Update registration/order status
    // TODO: Create refund record
    // TODO: Send refund notification email

    return {
      data: {
        refundId: `re_test_${Date.now()}`,
        amount: amount || 0,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Payments] Failed to process refund:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: Get payment status for a registration or order
 */
export async function getPaymentStatus(params: {
  resourceType: 'REGISTRATION' | 'ORDER'
  resourceId: string
  tenantId: string
}): Promise<{ data: PaymentRecord | null; error: Error | null }> {
  try {
    const { resourceType, resourceId, tenantId } = params

    // SHELL: Query payment records
    // TODO: Implement after payment_records table is created

    console.log('[Payments] SHELL: Would get payment status:', {
      resourceType,
      resourceId,
    })

    return {
      data: null, // SHELL: Return payment record
      error: null,
    }
  } catch (error) {
    console.error('[Payments] Failed to get payment status:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * SHELL: Get Stripe connected account for a licensee (for payouts)
 */
export async function getConnectedAccount(params: {
  tenantId: string
}): Promise<{ data: { accountId: string; status: string } | null; error: Error | null }> {
  try {
    const { tenantId } = params

    // SHELL: Fetch tenant's Stripe connected account
    // TODO: Add stripeAccountId and stripeAccountStatus fields to Tenant model
    console.log('[Payments] SHELL: Would fetch Stripe connected account for tenant:', tenantId)

    // SHELL: Return null - no connected account configured yet
    return { data: null, error: null }
  } catch (error) {
    console.error('[Payments] Failed to get connected account:', error)
    return { data: null, error: error as Error }
  }
}
