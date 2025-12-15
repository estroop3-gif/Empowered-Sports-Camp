import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/db/client'
import { sendRegistrationConfirmationEmail } from '@/lib/services/email'

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

      // Extract registration ID and tenant ID from metadata
      const registrationId = session.metadata?.registration_id
      const tenantId = session.metadata?.tenant_id

      if (registrationId && tenantId) {
        try {
          // Update registration status to 'confirmed' and payment status to 'paid'
          await prisma.registration.update({
            where: { id: registrationId },
            data: {
              status: 'confirmed',
              paymentStatus: 'paid',
              paidAt: new Date(),
              stripePaymentIntentId: session.payment_intent as string,
            },
          })

          console.log(`[Webhook] Registration ${registrationId} confirmed`)

          // Send confirmation email via Resend
          const { error: emailError } = await sendRegistrationConfirmationEmail({
            registrationId,
            tenantId,
          })

          if (emailError) {
            console.error(`[Webhook] Failed to send confirmation email for registration ${registrationId}:`, emailError)
          } else {
            console.log(`[Webhook] Confirmation email sent for registration ${registrationId}`)
          }
        } catch (dbError) {
          console.error(`[Webhook] Database error updating registration ${registrationId}:`, dbError)
          // Don't fail the webhook - Stripe will retry
        }
      } else {
        console.warn('[Webhook] checkout.session.completed missing registration_id or tenant_id in metadata')
      }
      break
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const registrationId = paymentIntent.metadata?.registration_id

      if (registrationId) {
        try {
          // Update payment status to 'failed'
          await prisma.registration.update({
            where: { id: registrationId },
            data: {
              paymentStatus: 'failed',
            },
          })

          console.log(`[Webhook] Payment failed for registration: ${registrationId}`)
        } catch (dbError) {
          console.error(`[Webhook] Database error updating failed payment for registration ${registrationId}:`, dbError)
        }
      }
      break
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      const registrationId = charge.metadata?.registration_id

      if (registrationId) {
        try {
          // Update registration status to 'refunded'
          await prisma.registration.update({
            where: { id: registrationId },
            data: {
              status: 'refunded',
              paymentStatus: 'refunded',
            },
          })

          console.log(`[Webhook] Refund processed for registration: ${registrationId}`)

          // TODO: Send refund confirmation email
          // TODO: Process waitlist if applicable
        } catch (dbError) {
          console.error(`[Webhook] Database error updating refund for registration ${registrationId}:`, dbError)
        }
      }
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      // Handle subscription events if implementing recurring payments
      console.log(`[Webhook] Subscription event: ${event.type}`)
      break
    }

    default:
      console.log(`[Webhook] Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
