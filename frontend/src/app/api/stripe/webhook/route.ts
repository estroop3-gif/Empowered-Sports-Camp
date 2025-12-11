import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

function getWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET!
}

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  const stripe = getStripe()

  try {
    event = stripe.webhooks.constructEvent(body, signature, getWebhookSecret())
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session

      // Extract registration ID from metadata
      const registrationId = session.metadata?.registration_id

      if (registrationId) {
        // TODO: Update registration status to 'confirmed' in Supabase
        // TODO: Update payment record with stripe_charge_id
        // TODO: Increment session enrolled_count
        // TODO: Send confirmation email via Resend

        console.log(`Payment completed for registration: ${registrationId}`)
      }
      break
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const registrationId = paymentIntent.metadata?.registration_id

      if (registrationId) {
        // TODO: Update registration status to reflect failure
        // TODO: Send failure notification email

        console.log(`Payment failed for registration: ${registrationId}`)
      }
      break
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      const registrationId = charge.metadata?.registration_id

      if (registrationId) {
        // TODO: Update payment record with refund info
        // TODO: Update registration status to 'refunded'
        // TODO: Decrement session enrolled_count
        // TODO: Send refund confirmation email
        // TODO: Process waitlist if applicable

        console.log(`Refund processed for registration: ${registrationId}`)
      }
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      // Handle subscription events if implementing recurring payments
      console.log(`Subscription event: ${event.type}`)
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
