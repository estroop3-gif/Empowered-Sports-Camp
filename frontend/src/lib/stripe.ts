/**
 * Stripe Utilities
 *
 * Helper functions for Stripe integration with the Empowered Locker.
 * Currently stubbed out - the structure is ready for real Stripe calls.
 *
 * Environment variables needed:
 *   STRIPE_SECRET_KEY        - Server-side secret key
 *   STRIPE_PUBLISHABLE_KEY   - Client-side publishable key
 *   STRIPE_WEBHOOK_SECRET    - Webhook signature verification
 *
 * TODO: Install stripe package: npm install stripe
 */

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

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  )
}

/**
 * Get Stripe client (server-side only)
 *
 * TODO: When ready to integrate Stripe:
 * 1. npm install stripe
 * 2. Uncomment the Stripe import and client creation
 */
export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    console.warn('[Stripe] STRIPE_SECRET_KEY not set - running in stub mode')
    return null
  }

  // TODO: Uncomment when ready to integrate Stripe
  // import Stripe from 'stripe'
  // return new Stripe(secretKey, { apiVersion: '2023-10-16' })

  // For now, return null to indicate stub mode
  console.log('[Stripe] Would initialize Stripe client here')
  return null
}

// ============================================================================
// CHECKOUT SESSION
// ============================================================================

/**
 * Create a Stripe Checkout Session from cart items
 *
 * This function:
 * 1. Fetches product details from database
 * 2. Builds Stripe line_items
 * 3. Creates a Checkout Session (or returns a stub URL)
 *
 * @param cartItems - Array of { product_id, variant_id, quantity }
 * @param profileId - Optional user profile ID for order tracking
 * @param successUrl - URL to redirect after successful payment
 * @param cancelUrl - URL to redirect if checkout is cancelled
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
    const lineItems: StripeLineItem[] = []

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

    // Log what would be sent to Stripe
    console.log('[Stripe] Checkout session line items:', JSON.stringify(lineItems, null, 2))
    console.log('[Stripe] Success URL:', options.successUrl)
    console.log('[Stripe] Cancel URL:', options.cancelUrl)
    console.log('[Stripe] Profile ID:', options.profileId)
    console.log('[Stripe] Licensee ID:', options.licenseeId)

    // Check if Stripe is configured
    const stripe = getStripeClient()

    if (!stripe) {
      // Return stub response for development
      console.log('[Stripe] Running in stub mode - returning placeholder session')

      return {
        sessionId: `stub_session_${Date.now()}`,
        sessionUrl: null, // Will be handled by the API route
        error: null,
      }
    }

    // TODO: When Stripe is configured, create real checkout session:
    /*
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      metadata: {
        profile_id: options.profileId || '',
        licensee_id: options.licenseeId || '',
      },
      // Enable automatic tax calculation if configured
      // automatic_tax: { enabled: true },
    })

    return {
      sessionId: session.id,
      sessionUrl: session.url,
      error: null,
    }
    */

    return {
      sessionId: `stub_session_${Date.now()}`,
      sessionUrl: null,
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
 *
 * TODO: Implement when ready to auto-create Stripe products
 */
export async function syncProductToStripe(product: ShopProduct): Promise<{
  stripeProductId: string | null
  stripePriceId: string | null
  error: string | null
}> {
  console.log('[Stripe] Would sync product to Stripe:', product.name)

  // Stub implementation
  return {
    stripeProductId: null,
    stripePriceId: null,
    error: 'Stripe integration not yet configured',
  }
}

// ============================================================================
// WEBHOOK HANDLING
// ============================================================================

/**
 * Verify Stripe webhook signature
 *
 * TODO: Implement when setting up webhooks
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): { valid: boolean; error: string | null } {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    return { valid: false, error: 'STRIPE_WEBHOOK_SECRET not configured' }
  }

  // TODO: Implement actual signature verification
  // const stripe = getStripeClient()
  // const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)

  console.log('[Stripe] Would verify webhook signature')
  return { valid: true, error: null }
}

/**
 * Handle checkout.session.completed webhook event
 *
 * TODO: Implement when webhooks are set up
 */
export async function handleCheckoutCompleted(sessionId: string): Promise<{
  success: boolean
  error: string | null
}> {
  console.log('[Stripe] Would handle checkout completed:', sessionId)

  // TODO: Implement:
  // 1. Fetch session from Stripe
  // 2. Update order status in database
  // 3. Decrement inventory
  // 4. Send confirmation email

  return { success: true, error: null }
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

  // TODO: Implement tax calculation based on location
  const tax = 0

  // TODO: Implement shipping calculation
  const shipping = 0

  return {
    subtotal,
    tax,
    shipping,
    total: subtotal + tax + shipping,
  }
}
