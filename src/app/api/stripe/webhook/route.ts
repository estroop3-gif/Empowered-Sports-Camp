import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { handleStripeWebhook } from '@/lib/services/payments'
import { sendRegistrationConfirmationEmail } from '@/lib/services/email'
import { prisma } from '@/lib/db/client'

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

  // Process webhook using payments service
  const { data, error } = await handleStripeWebhook(body, signature)

  if (error) {
    console.error('[Webhook] Error processing webhook:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }

  // Send confirmation email for successful registration payments
  if (data?.eventType === 'checkout.session.completed' && data.resourceId) {
    // Find ALL registrations from this checkout session (supports multi-camper)
    const registration = await prisma.registration.findUnique({
      where: { id: data.resourceId },
      select: { stripeCheckoutSessionId: true },
    })

    if (registration?.stripeCheckoutSessionId) {
      const allRegistrations = await prisma.registration.findMany({
        where: { stripeCheckoutSessionId: registration.stripeCheckoutSessionId },
        select: { id: true, tenantId: true },
      })

      // Send confirmation email for EACH registration
      for (const reg of allRegistrations) {
        const { error: emailError } = await sendRegistrationConfirmationEmail({
          registrationId: reg.id,
          tenantId: reg.tenantId,
        })

        if (emailError) {
          console.error(`[Webhook] Failed to send confirmation email for registration ${reg.id}:`, emailError)
        } else {
          console.log(`[Webhook] Confirmation email sent for registration ${reg.id}`)
        }
      }
    }
  }

  return NextResponse.json({ received: true, ...data })
}
