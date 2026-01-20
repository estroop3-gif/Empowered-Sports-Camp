/**
 * SHELL: Stripe Webhook Handler API
 *
 * POST /api/payments/stripe-webhook
 * Handles Stripe webhook events (payment success, refunds, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { handleStripeWebhook } from '@/lib/services/payments'

// SHELL: Stripe webhooks need raw body, not JSON
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    // SHELL: Get raw body for signature verification
    const rawBody = await request.text()

    const { data, error } = await handleStripeWebhook(rawBody, signature)

    if (error) {
      console.error('[API] Stripe webhook error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ received: true, data })
  } catch (error) {
    console.error('[API] Stripe webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

// SHELL: Stripe needs to be able to POST without CORS issues
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 })
}
