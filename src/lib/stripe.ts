/**
 * Stripe Utilities
 *
 * Helper functions for Stripe integration with the Empowered Locker (shop).
 *
 * Environment variables needed:
 *   STRIPE_SECRET_KEY        - Server-side secret key
 *   STRIPE_PUBLISHABLE_KEY   - Client-side publishable key (NEXT_PUBLIC_)
 *   STRIPE_WEBHOOK_SECRET    - Webhook signature verification
 */

import Stripe from 'stripe'
import { getProductsByIds, type ShopProduct, type ShopProductVariant, type CartItem } from '@/lib/services/shop'

// ============================================================================
// TYPES
// ============================================================================

export interface CheckoutSessionResult {
  sessionId: string | null
  sessionUrl: string | null
  error: string | null
}

export interface StripeLineItem {
  price_data: {
    currency: string
    product_data: {
      name: string
      description?: string
      images?: string[]
    }
    unit_amount: number
  }
  quantity: number
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

let stripeInstance: Stripe | null = null

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!STRIPE_SECRET_KEY && STRIPE_SECRET_KEY.startsWith('sk_')
}

/**
 * Get Stripe client (server-side only)
 */
export function getStripeClient(): Stripe | null {
  if (!isStripeConfigured()) {
    console.warn('[Stripe] STRIPE_SECRET_KEY not set - running in stub mode')
    return null
  }

  if (!stripeInstance) {
    stripeInstance = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
    })
  }

  return stripeInstance
}

// ============================================================================
// CHECKOUT SESSION
// ============================================================================

/**
 * Create a Stripe Checkout Session from cart items
 */
export async function createCheckoutSessionFromCart(
  cartItems: CartItem[],
  options: {
    profileId?: string | null
    successUrl: string
    cancelUrl: string
    licenseeId?: string | null
  }
): Promise<CheckoutSessionResult> {
  try {
    // Validate cart is not empty
    if (!cartItems || cartItems.length === 0) {
      return { sessionId: null, sessionUrl: null, error: 'Cart is empty' }
    }

    // Fetch product details from database
    const productIds = [...new Set(cartItems.map((item) => item.product_id))]
    const { data: products, error: fetchError } = await getProductsByIds(productIds)

    if (fetchError || !products) {
      return { sessionId: null, sessionUrl: null, error: 'Failed to fetch product details' }
    }

    // Build line items for Stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

    for (const cartItem of cartItems) {
      const product = products.find((p) => p.id === cartItem.product_id)
      if (!product) {
        return { sessionId: null, sessionUrl: null, error: `Product not found: ${cartItem.product_id}` }
      }

      // Get variant if specified
      let variant: ShopProductVariant | null = null
      if (cartItem.variant_id && product.variants) {
        variant = product.variants.find((v) => v.id === cartItem.variant_id) || null
      }

      // Use variant price if available, otherwise product price
      const unitPrice = variant?.price_cents ?? product.price_cents

      // Build product name (include variant if applicable)
      const productName = variant
        ? `${product.name} - ${variant.name}`
        : product.name

      lineItems.push({
        price_data: {
          currency: product.currency || 'usd',
          product_data: {
            name: productName,
            description: product.description || undefined,
            images: product.image_url ? [product.image_url] : undefined,
          },
          unit_amount: unitPrice,
        },
        quantity: cartItem.quantity,
      })
    }

    // Check if Stripe is configured
    const stripe = getStripeClient()

    if (!stripe) {
      // Return stub response for development
      console.log('[Stripe] Running in stub mode - returning placeholder session')
      return {
        sessionId: `stub_session_${Date.now()}`,
        sessionUrl: `${options.successUrl}?session_id=stub_session_${Date.now()}&demo=true`,
        error: null,
      }
    }

    // Create real Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: options.successUrl + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: options.cancelUrl,
      metadata: {
        profile_id: options.profileId || '',
        licensee_id: options.licenseeId || '',
        type: 'shop_order',
      },
    })

    return {
      sessionId: session.id,
      sessionUrl: session.url,
      error: null,
    }
  } catch (error) {
    console.error('[Stripe] Error creating checkout session:', error)
    return {
      sessionId: null,
      sessionUrl: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// PRODUCT SYNC
// ============================================================================

/**
 * Sync a product to Stripe (create or update)
 */
export async function syncProductToStripe(product: ShopProduct): Promise<{
  stripeProductId: string | null
  stripePriceId: string | null
  error: string | null
}> {
  const stripe = getStripeClient()

  if (!stripe) {
    return {
      stripeProductId: null,
      stripePriceId: null,
      error: 'Stripe not configured',
    }
  }

  try {
    // Create or update product in Stripe
    let stripeProduct: Stripe.Product

    if (product.stripe_product_id) {
      // Update existing product
      stripeProduct = await stripe.products.update(product.stripe_product_id, {
        name: product.name,
        description: product.description || undefined,
        images: product.image_url ? [product.image_url] : undefined,
        active: product.is_active,
      })
    } else {
      // Create new product
      stripeProduct = await stripe.products.create({
        name: product.name,
        description: product.description || undefined,
        images: product.image_url ? [product.image_url] : undefined,
        active: product.is_active,
        metadata: {
          product_id: product.id,
          licensee_id: product.licensee_id || '',
        },
      })
    }

    // Create price for the product
    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: product.price_cents,
      currency: product.currency || 'usd',
    })

    return {
      stripeProductId: stripeProduct.id,
      stripePriceId: stripePrice.id,
      error: null,
    }
  } catch (error) {
    console.error('[Stripe] Error syncing product:', error)
    return {
      stripeProductId: null,
      stripePriceId: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// WEBHOOK HANDLING
// ============================================================================

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): { event: Stripe.Event | null; error: string | null } {
  const stripe = getStripeClient()

  if (!stripe) {
    return { event: null, error: 'Stripe not configured' }
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    return { event: null, error: 'STRIPE_WEBHOOK_SECRET not configured' }
  }

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET)
    return { event, error: null }
  } catch (err) {
    console.error('[Stripe] Webhook signature verification failed:', err)
    return { event: null, error: 'Webhook signature verification failed' }
  }
}

/**
 * Handle checkout.session.completed webhook event
 */
export async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<{
  success: boolean
  error: string | null
}> {
  console.log('[Stripe] Processing checkout completed:', session.id)

  try {
    // Extract metadata
    const metadata = session.metadata || {}
    const profileId = metadata.profile_id
    const licenseeId = metadata.licensee_id
    const type = metadata.type // 'shop_order' or 'registration'

    console.log('[Stripe] Checkout metadata:', { profileId, licenseeId, type })

    // The actual order/registration update is handled in payments.ts
    // This function is for any additional shop-specific logic

    return { success: true, error: null }
  } catch (error) {
    console.error('[Stripe] Error handling checkout completed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate order totals (useful for display before checkout)
 */
export function calculateOrderTotals(
  items: Array<{
    unitPrice: number
    quantity: number
  }>
): {
  subtotal: number
  tax: number
  shipping: number
  total: number
} {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

  // Tax and shipping would be calculated based on location/settings
  const tax = 0
  const shipping = 0

  return {
    subtotal,
    tax,
    shipping,
    total: subtotal + tax + shipping,
  }
}

/**
 * Get Stripe session status
 */
export async function getSessionStatus(sessionId: string): Promise<{
  status: string
  paymentStatus: string
  error: string | null
}> {
  const stripe = getStripeClient()

  if (!stripe) {
    return { status: 'unknown', paymentStatus: 'unknown', error: 'Stripe not configured' }
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    return {
      status: session.status || 'unknown',
      paymentStatus: session.payment_status || 'unknown',
      error: null,
    }
  } catch (error) {
    console.error('[Stripe] Error retrieving session:', error)
    return {
      status: 'error',
      paymentStatus: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
