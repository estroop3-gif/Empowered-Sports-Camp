/**
 * Payments Service
 *
 * Stripe integration for camp registrations and shop orders
 *
 * SETUP REQUIRED:
 * 1. Create a Stripe account at https://dashboard.stripe.com
 * 2. Get your API keys from https://dashboard.stripe.com/apikeys
 * 3. Add to .env:
 *    - STRIPE_SECRET_KEY=sk_live_xxx (or sk_test_xxx for testing)
 *    - STRIPE_WEBHOOK_SECRET=whsec_xxx
 *    - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx (or pk_test_xxx for testing)
 * 4. Set up webhook endpoint in Stripe Dashboard:
 *    - URL: https://yourdomain.com/api/stripe/webhook
 *    - Events: checkout.session.completed, payment_intent.succeeded,
 *              payment_intent.payment_failed, charge.refunded
 *
 * Handles:
 * - Checkout session creation for camp registrations
 * - Checkout session creation for shop orders
 * - Webhook processing for payment events
 * - Payment status tracking
 * - Refund processing
 * - Stripe Connect for licensee payouts (optional)
 */

import Stripe from 'stripe'
import { prisma } from '@/lib/db/client'
import type { PaymentStatus, OrderStatus } from '@/generated/prisma'
import { createNotification } from './notifications'
import { ensureParentRole } from './users'
import { onSpotOpened, reorderPositions } from './waitlist'

// =============================================================================
// Types
// =============================================================================

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

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

/**
 * Check if Stripe is properly configured
 */
export function isStripeConfigured(): boolean {
  // Accept standard Stripe keys (sk_), organization keys (sk_org_), and restricted keys (rk_)
  return !!STRIPE_SECRET_KEY && (
    STRIPE_SECRET_KEY.startsWith('sk_') ||
    STRIPE_SECRET_KEY.startsWith('rk_')
  )
}

// Initialize Stripe SDK (lazy initialization)
let stripeInstance: Stripe | null = null

function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!isStripeConfigured()) {
      throw new Error(
        'Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment variables. ' +
        'See https://dashboard.stripe.com/apikeys to get your API keys.'
      )
    }
    stripeInstance = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
    })
  }
  return stripeInstance
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Create a Stripe Checkout session for camp registration
 * Supports multiple registrations (e.g., multiple campers in one checkout)
 */
export async function createStripeCheckoutSession(params: {
  campSessionId: string
  registrationId: string
  registrationIds?: string[] // Optional array for multiple campers
  successUrl: string
  cancelUrl: string
  tenantId: string
}): Promise<{ data: CheckoutSessionResult | null; error: Error | null }> {
  try {
    const { campSessionId, registrationId, registrationIds, successUrl, cancelUrl, tenantId } = params

    // Use registrationIds if provided, otherwise use single registrationId
    const allRegIds = registrationIds?.length ? registrationIds : [registrationId]

    // Fetch all registrations and their details
    const registrations = await prisma.registration.findMany({
      where: {
        id: { in: allRegIds },
        campId: campSessionId,
        tenantId,
      },
      include: {
        camp: true,
        athlete: true,
        parent: true,
        registrationAddons: {
          include: {
            addon: true,
            variant: true,
          },
        },
      },
    })

    if (registrations.length === 0) {
      return { data: null, error: new Error('Registration not found') }
    }

    const primaryRegistration = registrations[0]

    // Calculate total amount across all registrations
    const totalAmountInCents = registrations.reduce((sum, reg) => sum + (reg.totalPriceCents || 0), 0)

    if (totalAmountInCents <= 0) {
      // Free registration - mark all as paid immediately
      await prisma.registration.updateMany({
        where: { id: { in: allRegIds } },
        data: {
          paymentStatus: 'paid',
          status: 'confirmed',
          paidAt: new Date(),
        },
      })

      // Ensure parent has the parent role (for dashboard access)
      const parentIds = [...new Set(registrations.map(r => r.parentId))]
      for (const pid of parentIds) {
        ensureParentRole(pid).catch(err => console.error('[Payments] ensureParentRole failed:', err))
      }

      // Send confirmation emails for free registrations
      const { sendRegistrationConfirmationEmail } = await import('./email')
      for (const regId of allRegIds) {
        sendRegistrationConfirmationEmail({ registrationId: regId, tenantId })
          .catch(err => console.error('[Payments] Failed to send confirmation email:', err))
      }

      return {
        data: {
          checkoutUrl: `${successUrl}?free=true`,
          sessionId: 'free_registration',
        },
        error: null,
      }
    }

    // Check if Stripe is configured - use demo mode if not
    if (!isStripeConfigured()) {
      console.log('[Payments] Stripe not configured - using demo checkout')

      // Create a demo session ID for tracking (use primary registration)
      const demoSessionId = `demo_${registrationId}_${Date.now()}`

      // In demo mode, redirect to a simulated checkout page
      // The success URL will include demo=true so the app knows to simulate success
      return {
        data: {
          checkoutUrl: `${successUrl}?session_id=${demoSessionId}&demo=true`,
          sessionId: demoSessionId,
        },
        error: null,
      }
    }

    const stripe = getStripe()

    // Build line items for ALL registrations
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []
    let totalTaxCents = 0

    for (const registration of registrations) {
      // Promo discount may exceed the camp price when it applies to both camp + addons.
      // Split it: apply to camp first, then distribute overflow across addons.
      const campBase = registration.basePriceCents - registration.discountCents
      const promoOnCamp = Math.min(registration.promoDiscountCents, Math.max(0, campBase))
      const promoOnAddons = registration.promoDiscountCents - promoOnCamp
      const campNetPrice = Math.max(0, campBase - promoOnCamp)

      // Add camp registration line item (only if positive)
      if (campNetPrice > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: registration.camp.name,
              description: `Camp registration for ${registration.athlete?.firstName || 'Athlete'} ${registration.athlete?.lastName || ''}`.trim(),
            },
            unit_amount: campNetPrice,
          },
          quantity: 1,
        })
      }

      // Add addon line items, distributing any promo overflow proportionally
      const addonTotal = registration.registrationAddons.reduce((sum, a) => sum + a.priceCents, 0)
      let promoRemaining = promoOnAddons

      for (let j = 0; j < registration.registrationAddons.length; j++) {
        const regAddon = registration.registrationAddons[j]
        let addonUnitAmount = regAddon.priceCents

        if (promoRemaining > 0 && addonTotal > 0) {
          const isLast = j === registration.registrationAddons.length - 1
          const share = isLast
            ? promoRemaining
            : Math.round(promoOnAddons * (regAddon.priceCents / addonTotal))
          if (!isLast) promoRemaining -= share
          addonUnitAmount = Math.max(0, addonUnitAmount - share)
        }

        if (addonUnitAmount > 0) {
          lineItems.push({
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${regAddon.addon.name}${registrations.length > 1 ? ` (${registration.athlete?.firstName})` : ''}`,
                description: regAddon.variant?.name || undefined,
              },
              unit_amount: addonUnitAmount,
            },
            quantity: regAddon.quantity,
          })
        }
      }

      // Sum up taxes
      totalTaxCents += registration.taxCents
    }

    // Add combined tax as single line item
    if (totalTaxCents > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Sales Tax',
          },
          unit_amount: totalTaxCents,
        },
        quantity: 1,
      })
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      customer_email: primaryRegistration.parent?.email || undefined,
      metadata: {
        type: 'registration',
        registrationId: registrationId, // Primary registration for webhook
        registrationIds: allRegIds.join(','), // All registration IDs
        campSessionId,
        tenantId,
        athleteId: primaryRegistration.athleteId,
      },
      payment_intent_data: {
        metadata: {
          type: 'registration',
          registrationId: registrationId,
          registrationIds: allRegIds.join(','),
          tenantId,
        },
      },
    })

    // Update all registrations with checkout session ID
    await prisma.registration.updateMany({
      where: { id: { in: allRegIds } },
      data: {
        paymentMethod: 'stripe',
      },
    })

    return {
      data: {
        checkoutUrl: session.url!,
        sessionId: session.id,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Payments] Failed to create checkout session:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Create a Stripe Checkout session for shop order
 */
export async function createShopCheckoutSession(params: {
  orderId: string
  successUrl: string
  cancelUrl: string
  tenantId: string
}): Promise<{ data: CheckoutSessionResult | null; error: Error | null }> {
  try {
    const { orderId, successUrl, cancelUrl, tenantId } = params

    // Fetch order and items
    const order = await prisma.shopOrder.findFirst({
      where: {
        id: orderId,
        licenseeId: tenantId,
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        profile: true,
      },
    })

    if (!order) {
      return { data: null, error: new Error('Order not found') }
    }

    if (order.totalCents <= 0) {
      // Free order - mark as paid immediately
      await prisma.shopOrder.update({
        where: { id: orderId },
        data: {
          status: 'paid',
        },
      })

      return {
        data: {
          checkoutUrl: `${successUrl}?free=true`,
          sessionId: 'free_order',
        },
        error: null,
      }
    }

    // Check if Stripe is configured - use demo mode if not
    if (!isStripeConfigured()) {
      console.log('[Payments] Stripe not configured - using demo checkout')

      // Create a demo session ID for tracking
      const demoSessionId = `demo_order_${orderId}_${Date.now()}`

      // In demo mode, redirect to a simulated checkout page
      return {
        data: {
          checkoutUrl: `${successUrl}?session_id=${demoSessionId}&demo=true`,
          sessionId: demoSessionId,
        },
        error: null,
      }
    }

    const stripe = getStripe()

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = order.items.map((item) => ({
      price_data: {
        currency: order.currency || 'usd',
        product_data: {
          name: item.productName,
          description: item.variantName || undefined,
        },
        unit_amount: item.unitPriceCents,
      },
      quantity: item.quantity,
    }))

    // Add shipping if applicable
    if (order.shippingCents > 0) {
      lineItems.push({
        price_data: {
          currency: order.currency || 'usd',
          product_data: {
            name: 'Shipping',
          },
          unit_amount: order.shippingCents,
        },
        quantity: 1,
      })
    }

    // Add tax if applicable
    if (order.taxCents > 0) {
      lineItems.push({
        price_data: {
          currency: order.currency || 'usd',
          product_data: {
            name: 'Tax',
          },
          unit_amount: order.taxCents,
        },
        quantity: 1,
      })
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      customer_email: order.customerEmail || order.profile?.email || undefined,
      metadata: {
        type: 'order',
        orderId,
        tenantId,
      },
      payment_intent_data: {
        metadata: {
          type: 'order',
          orderId,
          tenantId,
        },
      },
      shipping_address_collection: {
        allowed_countries: ['US', 'CA'],
      },
    })

    // Update order with checkout session ID
    await prisma.shopOrder.update({
      where: { id: orderId },
      data: {
        stripeCheckoutSessionId: session.id,
      },
    })

    return {
      data: {
        checkoutUrl: session.url!,
        sessionId: session.id,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Payments] Failed to create shop checkout session:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(
  payload: string | Buffer,
  signature: string
): Promise<{ data: WebhookResult | null; error: Error | null }> {
  try {
    if (!isStripeConfigured()) {
      console.log('[Payments] Stripe not configured - ignoring webhook')
      return {
        data: { processed: false, eventType: 'unknown', resourceId: null },
        error: null,
      }
    }

    const stripe = getStripe()

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        STRIPE_WEBHOOK_SECRET
      )
    } catch (err) {
      console.error('[Payments] Webhook signature verification failed:', err)
      return { data: null, error: new Error('Webhook signature verification failed') }
    }

    console.log('[Payments] Processing webhook event:', event.type)

    let resourceId: string | null = null

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        resourceId = await handleCheckoutComplete(session)
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        resourceId = await handlePaymentIntentSucceeded(paymentIntent)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        resourceId = await handlePaymentIntentFailed(paymentIntent)
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        resourceId = await handleChargeRefunded(charge)
        break
      }

      default:
        console.log('[Payments] Unhandled webhook event type:', event.type)
    }

    return {
      data: {
        processed: true,
        eventType: event.type,
        resourceId,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Payments] Failed to process webhook:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Process successful checkout
 */
async function handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<string | null> {
  const metadata = session.metadata || {}
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id

  if (metadata.type === 'registration' && metadata.registrationId) {
    // Get all registration IDs (may be multiple for multi-camper checkout)
    const allRegIds = metadata.registrationIds
      ? metadata.registrationIds.split(',')
      : [metadata.registrationId]

    // Update ALL registration statuses and store checkout session ID
    await prisma.registration.updateMany({
      where: { id: { in: allRegIds } },
      data: {
        paymentStatus: 'paid',
        status: 'confirmed',
        stripePaymentIntentId: paymentIntentId,
        stripeCheckoutSessionId: session.id,
        paidAt: new Date(),
        // Clear waitlist fields for any waitlisted registrations
        waitlistPosition: null,
        waitlistOfferSentAt: null,
        waitlistOfferExpiresAt: null,
      },
    })

    // Fix addonsTotalCents and totalPriceCents from actual registrationAddons
    // This ensures DB matches Stripe's actual charge regardless of checkout calculation bugs
    const regsWithAddons = await prisma.registration.findMany({
      where: { id: { in: allRegIds } },
      select: {
        id: true,
        basePriceCents: true,
        discountCents: true,
        promoDiscountCents: true,
        addonsTotalCents: true,
        taxCents: true,
        registrationAddons: { select: { priceCents: true } },
      },
    })

    for (const reg of regsWithAddons) {
      const actualAddonTotal = reg.registrationAddons.reduce((s, a) => s + a.priceCents, 0)
      if (actualAddonTotal !== reg.addonsTotalCents) {
        const correctTotal = reg.basePriceCents - reg.discountCents - reg.promoDiscountCents + actualAddonTotal + reg.taxCents
        await prisma.registration.update({
          where: { id: reg.id },
          data: {
            addonsTotalCents: actualAddonTotal,
            totalPriceCents: correctTotal,
          },
        })
        console.log(`[Payments] Fixed registration ${reg.id}: addonsTotalCents ${reg.addonsTotalCents} → ${actualAddonTotal}, totalPriceCents → ${correctTotal}`)
      }
    }

    // Get all registration details for notifications
    const registrations = await prisma.registration.findMany({
      where: { id: { in: allRegIds } },
      include: {
        camp: true,
        parent: true,
        athlete: true,
      },
    })

    // Ensure parent has the parent role (for dashboard access)
    const parentIds = [...new Set(registrations.map(r => r.parentId))]
    for (const pid of parentIds) {
      ensureParentRole(pid).catch(err => console.error('[Payments] ensureParentRole failed:', err))
    }

    if (registrations.length > 0) {
      const primaryReg = registrations[0]
      const camperNames = registrations
        .map(r => r.athlete?.firstName)
        .filter(Boolean)
        .join(', ')

      // Send confirmation notification to parent
      createNotification({
        userId: primaryReg.parentId,
        tenantId: primaryReg.tenantId,
        type: 'payment_confirmed',
        title: 'Registration Confirmed!',
        body: registrations.length === 1
          ? `${camperNames}'s registration for ${primaryReg.camp.name} has been confirmed. See you at camp!`
          : `Registrations for ${camperNames} for ${primaryReg.camp.name} have been confirmed. See you at camp!`,
        category: 'camp',
        severity: 'success',
      }).catch((err) => console.error('[Payments] Failed to send confirmation notification:', err))
    }

    // Reorder waitlist positions for affected camps (in case these were waitlisted registrations)
    if (registrations.length > 0) {
      const campIds = [...new Set(registrations.map(r => r.campId))]
      for (const cId of campIds) {
        reorderPositions(cId).catch(err => console.error('[Payments] Waitlist reorder failed:', err))
      }
    }

    console.log('[Payments] Registrations confirmed:', allRegIds.join(', '))
    return metadata.registrationId
  }

  if (metadata.type === 'order' && metadata.orderId) {
    // Update order status
    await prisma.shopOrder.update({
      where: { id: metadata.orderId },
      data: {
        status: 'paid',
        stripePaymentIntentId: paymentIntentId,
      },
    })

    // Get order details for notification
    const order = await prisma.shopOrder.findUnique({
      where: { id: metadata.orderId },
      include: {
        profile: true,
      },
    })

    if (order && order.profileId) {
      // Send confirmation notification
      createNotification({
        userId: order.profileId,
        tenantId: order.licenseeId || undefined,
        type: 'payment_confirmed',
        title: 'Order Confirmed!',
        body: `Your order #${order.id.slice(0, 8)} has been confirmed and is being processed.`,
        category: 'camp',
        severity: 'success',
      }).catch((err) => console.error('[Payments] Failed to send order notification:', err))
    }

    console.log('[Payments] Order confirmed:', metadata.orderId)
    return metadata.orderId
  }

  return null
}

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<string | null> {
  const metadata = paymentIntent.metadata || {}

  // This is typically handled by checkout.session.completed
  // But we update the payment intent ID if needed
  if (metadata.type === 'registration' && metadata.registrationId) {
    await prisma.registration.update({
      where: { id: metadata.registrationId },
      data: {
        stripePaymentIntentId: paymentIntent.id,
      },
    })
    return metadata.registrationId
  }

  if (metadata.type === 'order' && metadata.orderId) {
    await prisma.shopOrder.update({
      where: { id: metadata.orderId },
      data: {
        stripePaymentIntentId: paymentIntent.id,
      },
    })
    return metadata.orderId
  }

  return null
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<string | null> {
  const metadata = paymentIntent.metadata || {}

  if (metadata.type === 'registration' && metadata.registrationId) {
    await prisma.registration.update({
      where: { id: metadata.registrationId },
      data: {
        paymentStatus: 'failed',
      },
    })

    // Get registration for notification
    const registration = await prisma.registration.findUnique({
      where: { id: metadata.registrationId },
      include: { camp: true },
    })

    if (registration) {
      createNotification({
        userId: registration.parentId,
        tenantId: registration.tenantId,
        type: 'system_alert',
        title: 'Payment Failed',
        body: `Payment for ${registration.camp.name} registration was not successful. Please try again.`,
        category: 'camp',
        severity: 'error',
        actionUrl: `/camps/${registration.campId}/register`,
      }).catch((err) => console.error('[Payments] Failed to send failure notification:', err))
    }

    return metadata.registrationId
  }

  if (metadata.type === 'order' && metadata.orderId) {
    await prisma.shopOrder.update({
      where: { id: metadata.orderId },
      data: {
        status: 'failed',
      },
    })

    const order = await prisma.shopOrder.findUnique({
      where: { id: metadata.orderId },
    })

    if (order && order.profileId) {
      createNotification({
        userId: order.profileId,
        tenantId: order.licenseeId || undefined,
        type: 'system_alert',
        title: 'Payment Failed',
        body: `Payment for order #${order.id.slice(0, 8)} was not successful. Please try again.`,
        category: 'camp',
        severity: 'error',
        actionUrl: '/shop/cart',
      }).catch((err) => console.error('[Payments] Failed to send order failure notification:', err))
    }

    return metadata.orderId
  }

  return null
}

/**
 * Handle refunded charge
 */
async function handleChargeRefunded(charge: Stripe.Charge): Promise<string | null> {
  const paymentIntentId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id

  if (!paymentIntentId) return null

  // Find ALL registrations with this payment intent (multi-camper checkouts share one PI)
  let registrations = await prisma.registration.findMany({
    where: { stripePaymentIntentId: paymentIntentId },
    include: { camp: true },
  })

  // Fallback: if no match by payment intent, try looking up via the payment intent's metadata
  if (registrations.length === 0) {
    console.log('[Payments] No registration found by stripePaymentIntentId, trying Stripe metadata lookup for PI:', paymentIntentId)
    try {
      const stripe = getStripe()
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
      const metadata = pi.metadata || {}
      if (metadata.registrationIds) {
        const regIds = metadata.registrationIds.split(',')
        registrations = await prisma.registration.findMany({
          where: { id: { in: regIds } },
          include: { camp: true },
        })
        // Backfill the stripePaymentIntentId for future lookups
        if (registrations.length > 0) {
          await prisma.registration.updateMany({
            where: { id: { in: regIds } },
            data: { stripePaymentIntentId: paymentIntentId },
          })
        }
      } else if (metadata.registrationId) {
        registrations = await prisma.registration.findMany({
          where: { id: metadata.registrationId },
          include: { camp: true },
        })
        if (registrations.length > 0) {
          await prisma.registration.update({
            where: { id: metadata.registrationId },
            data: { stripePaymentIntentId: paymentIntentId },
          })
        }
      }
    } catch (err) {
      console.error('[Payments] Stripe metadata lookup failed:', err)
    }
  }

  if (registrations.length > 0) {
    const isFullRefund = charge.amount_refunded === charge.amount

    // Distribute refund amount across registrations proportionally
    const totalCharged = registrations.reduce((s, r) => s + (r.totalPriceCents || 0), 0)
    const refundedCents = charge.amount_refunded || 0

    for (const reg of registrations) {
      const regShare = totalCharged > 0
        ? Math.round((reg.totalPriceCents / totalCharged) * refundedCents)
        : 0
      await prisma.registration.update({
        where: { id: reg.id },
        data: {
          paymentStatus: isFullRefund ? 'refunded' : 'partial',
          refundAmountCents: regShare,
          refundedAt: new Date(),
          ...(isFullRefund ? { status: 'refunded' } : {}),
        },
      })
    }

    const primaryReg = registrations[0]

    createNotification({
      userId: primaryReg.parentId,
      tenantId: primaryReg.tenantId,
      type: 'payment_confirmed',
      title: isFullRefund ? 'Refund Processed' : 'Partial Refund Processed',
      body: `A ${isFullRefund ? 'full' : 'partial'} refund of $${(charge.amount_refunded / 100).toFixed(2)} has been processed for ${primaryReg.camp.name}.`,
      category: 'camp',
      severity: 'info',
    }).catch((err) => console.error('[Payments] Failed to send refund notification:', err))

    // Notify next waitlisted person if a spot opened
    if (isFullRefund) {
      for (const reg of registrations) {
        onSpotOpened(reg.campId).catch(err =>
          console.error('[Payments] Waitlist notification failed:', err)
        )
      }
    }

    return primaryReg.id
  }

  // Find order with this payment intent
  const order = await prisma.shopOrder.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
  })

  if (order) {
    const isFullRefund = charge.amount_refunded === charge.amount

    await prisma.shopOrder.update({
      where: { id: order.id },
      data: {
        status: isFullRefund ? 'refunded' : order.status,
      },
    })

    if (order.profileId) {
      createNotification({
        userId: order.profileId,
        tenantId: order.licenseeId || undefined,
        type: 'payment_confirmed',
        title: isFullRefund ? 'Refund Processed' : 'Partial Refund Processed',
        body: `A ${isFullRefund ? 'full' : 'partial'} refund of $${(charge.amount_refunded / 100).toFixed(2)} has been processed for order #${order.id.slice(0, 8)}.`,
        category: 'camp',
        severity: 'info',
      }).catch((err) => console.error('[Payments] Failed to send order refund notification:', err))
    }

    return order.id
  }

  return null
}

/**
 * Process a refund for a registration or order
 */
export async function processRefund(params: {
  resourceType: 'REGISTRATION' | 'ORDER'
  resourceId: string
  amount?: number // Partial refund amount in dollars, null for full refund
  reason?: string
  tenantId: string
  processedByUserId: string
}): Promise<{ data: { refundId: string; amount: number } | null; error: Error | null }> {
  try {
    const { resourceType, resourceId, amount, reason, tenantId, processedByUserId } = params

    if (!isStripeConfigured()) {
      return {
        data: null,
        error: new Error('Stripe is not configured. Please set up Stripe to process refunds.'),
      }
    }

    let paymentIntentId: string | null = null
    let originalAmount: number = 0

    // Fetch the original payment intent ID
    if (resourceType === 'REGISTRATION') {
      const registration = await prisma.registration.findFirst({
        where: { id: resourceId, tenantId },
      })

      if (!registration) {
        return { data: null, error: new Error('Registration not found') }
      }

      if (!registration.stripePaymentIntentId) {
        return { data: null, error: new Error('No payment to refund') }
      }

      paymentIntentId = registration.stripePaymentIntentId
      originalAmount = registration.totalPriceCents
    } else {
      const order = await prisma.shopOrder.findFirst({
        where: { id: resourceId, licenseeId: tenantId },
      })

      if (!order) {
        return { data: null, error: new Error('Order not found') }
      }

      if (!order.stripePaymentIntentId) {
        return { data: null, error: new Error('No payment to refund') }
      }

      paymentIntentId = order.stripePaymentIntentId
      originalAmount = order.totalCents
    }

    const stripe = getStripe()

    // Create Stripe refund
    const refundAmount = amount ? Math.round(amount * 100) : undefined // undefined for full refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: refundAmount,
      reason: 'requested_by_customer',
      metadata: {
        processedByUserId,
        resourceType,
        resourceId,
        internalReason: reason || 'Refund requested',
      },
    })

    const refundedAmount = refund.amount / 100

    console.log('[Payments] Refund processed:', {
      refundId: refund.id,
      amount: refundedAmount,
      resourceType,
      resourceId,
    })

    return {
      data: {
        refundId: refund.id,
        amount: refundedAmount,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Payments] Failed to process refund:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get payment status for a registration or order
 */
export async function getPaymentStatus(params: {
  resourceType: 'REGISTRATION' | 'ORDER'
  resourceId: string
  tenantId: string
}): Promise<{ data: PaymentRecord | null; error: Error | null }> {
  try {
    const { resourceType, resourceId, tenantId } = params

    if (resourceType === 'REGISTRATION') {
      const registration = await prisma.registration.findFirst({
        where: { id: resourceId, tenantId },
      })

      if (!registration) {
        return { data: null, error: new Error('Registration not found') }
      }

      return {
        data: {
          id: registration.id,
          stripePaymentIntentId: registration.stripePaymentIntentId,
          amount: registration.totalPriceCents / 100,
          currency: 'usd',
          status: registration.paymentStatus,
          resourceType: 'REGISTRATION',
          resourceId: registration.id,
          createdAt: registration.createdAt.toISOString(),
        },
        error: null,
      }
    }

    const order = await prisma.shopOrder.findFirst({
      where: { id: resourceId, licenseeId: tenantId },
    })

    if (!order) {
      return { data: null, error: new Error('Order not found') }
    }

    // Map order status to payment status
    const paymentStatusMap: Record<OrderStatus, PaymentStatus> = {
      pending: 'pending',
      paid: 'paid',
      processing: 'paid',
      shipped: 'paid',
      delivered: 'paid',
      failed: 'failed',
      cancelled: 'failed',
      refunded: 'refunded',
    }

    return {
      data: {
        id: order.id,
        stripePaymentIntentId: order.stripePaymentIntentId,
        amount: order.totalCents / 100,
        currency: order.currency,
        status: paymentStatusMap[order.status],
        resourceType: 'ORDER',
        resourceId: order.id,
        createdAt: order.createdAt.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[Payments] Failed to get payment status:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get Stripe connected account for a licensee (for payouts)
 */
export async function getConnectedAccount(params: {
  tenantId: string
}): Promise<{ data: { accountId: string; status: string; onboardingComplete: boolean } | null; error: Error | null }> {
  try {
    const { tenantId } = params

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        stripeAccountId: true,
        stripeOnboardingComplete: true,
      },
    })

    if (!tenant) {
      return { data: null, error: new Error('Tenant not found') }
    }

    // Return connected account info if available
    if (tenant.stripeAccountId) {
      return {
        data: {
          accountId: tenant.stripeAccountId,
          status: tenant.stripeOnboardingComplete ? 'active' : 'pending',
          onboardingComplete: tenant.stripeOnboardingComplete,
        },
        error: null,
      }
    }

    // No connected account yet
    return { data: null, error: null }
  } catch (error) {
    console.error('[Payments] Failed to get connected account:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Create a Stripe Connect onboarding link for a licensee
 *
 * This allows licensees to receive direct payouts from camp registrations.
 * Requires Stripe Connect to be enabled on your Stripe account.
 */
export async function createConnectOnboardingLink(params: {
  tenantId: string
  refreshUrl: string
  returnUrl: string
}): Promise<{ data: { url: string; accountId: string } | null; error: Error | null }> {
  try {
    const { tenantId, refreshUrl, returnUrl } = params

    if (!isStripeConfigured()) {
      return {
        data: null,
        error: new Error('Stripe is not configured. Please set up Stripe first.'),
      }
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    })

    if (!tenant) {
      return { data: null, error: new Error('Tenant not found') }
    }

    const stripe = getStripe()

    // Create a Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: tenant.contactEmail || undefined,
      business_type: 'company',
      company: {
        name: tenant.name,
      },
      metadata: {
        tenantId,
      },
    })

    // Save account.id to tenant record
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { stripeAccountId: account.id },
    })

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    })

    return {
      data: {
        url: accountLink.url,
        accountId: account.id,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Payments] Failed to create Connect onboarding link:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Retrieve a Stripe checkout session (for verifying payment after redirect)
 */
export async function retrieveCheckoutSession(params: {
  sessionId: string
}): Promise<{ data: { status: string; paymentStatus: string; metadata: Record<string, string>; isDemo?: boolean } | null; error: Error | null }> {
  try {
    const { sessionId } = params

    if (sessionId === 'free_registration' || sessionId === 'free_order') {
      return {
        data: {
          status: 'complete',
          paymentStatus: 'paid',
          metadata: {},
        },
        error: null,
      }
    }

    // Handle demo sessions
    if (sessionId.startsWith('demo_')) {
      return {
        data: {
          status: 'complete',
          paymentStatus: 'paid',
          metadata: {},
          isDemo: true,
        },
        error: null,
      }
    }

    if (!isStripeConfigured()) {
      return {
        data: null,
        error: new Error('Stripe is not configured'),
      }
    }

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    return {
      data: {
        status: session.status || 'unknown',
        paymentStatus: session.payment_status || 'unknown',
        metadata: session.metadata || {},
      },
      error: null,
    }
  } catch (error) {
    console.error('[Payments] Failed to retrieve checkout session:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Confirm a demo payment (simulates Stripe checkout completion)
 *
 * Call this after the user "completes" a demo checkout to update the database
 */
export async function confirmDemoPayment(params: {
  sessionId: string
}): Promise<{ data: { success: boolean; resourceId: string | null } | null; error: Error | null }> {
  try {
    const { sessionId } = params

    if (!sessionId.startsWith('demo_')) {
      return { data: null, error: new Error('Not a demo session') }
    }

    // Parse the session ID to get resource info
    // Format: demo_{registrationId}_{timestamp} or demo_order_{orderId}_{timestamp}
    const parts = sessionId.split('_')

    if (parts[1] === 'order' && parts[2]) {
      // It's a shop order
      const orderId = parts[2]

      await prisma.shopOrder.update({
        where: { id: orderId },
        data: {
          status: 'paid',
          stripePaymentIntentId: `demo_pi_${Date.now()}`,
        },
      })

      // Get order for notification
      const order = await prisma.shopOrder.findUnique({
        where: { id: orderId },
      })

      if (order && order.profileId) {
        createNotification({
          userId: order.profileId,
          tenantId: order.licenseeId || undefined,
          type: 'payment_confirmed',
          title: 'Order Confirmed! (Demo)',
          body: `Your order #${order.id.slice(0, 8)} has been confirmed. This was a demo payment.`,
          category: 'camp',
          severity: 'success',
        }).catch((err) => console.error('[Payments] Failed to send demo order notification:', err))
      }

      console.log('[Payments] Demo order payment confirmed:', orderId)
      return { data: { success: true, resourceId: orderId }, error: null }
    } else if (parts[1]) {
      // It's a registration
      const registrationId = parts[1]

      await prisma.registration.update({
        where: { id: registrationId },
        data: {
          paymentStatus: 'paid',
          status: 'confirmed',
          stripePaymentIntentId: `demo_pi_${Date.now()}`,
          paidAt: new Date(),
        },
      })

      // Get registration for notification
      const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        include: {
          camp: true,
          athlete: true,
        },
      })

      if (registration) {
        createNotification({
          userId: registration.parentId,
          tenantId: registration.tenantId,
          type: 'payment_confirmed',
          title: 'Registration Confirmed! (Demo)',
          body: `${registration.athlete?.firstName}'s registration for ${registration.camp.name} has been confirmed. This was a demo payment.`,
          category: 'camp',
          severity: 'success',
        }).catch((err) => console.error('[Payments] Failed to send demo registration notification:', err))
      }

      console.log('[Payments] Demo registration payment confirmed:', registrationId)
      return { data: { success: true, resourceId: registrationId }, error: null }
    }

    return { data: null, error: new Error('Could not parse demo session ID') }
  } catch (error) {
    console.error('[Payments] Failed to confirm demo payment:', error)
    return { data: null, error: error as Error }
  }
}
