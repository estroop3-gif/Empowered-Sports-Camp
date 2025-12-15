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
    // Check if this is a registration (not an order)
    const registration = await prisma.registration.findUnique({
      where: { id: data.resourceId },
      select: { id: true, tenantId: true },
    })

    if (registration) {
      // Send confirmation email via Resend
      const { error: emailError } = await sendRegistrationConfirmationEmail({
        registrationId: registration.id,
        tenantId: registration.tenantId,
      })

      if (emailError) {
        console.error(`[Webhook] Failed to send confirmation email for registration ${registration.id}:`, emailError)
      } else {
        console.log(`[Webhook] Confirmation email sent for registration ${registration.id}`)
      }
    }
  }

  return NextResponse.json({ received: true, ...data })
}
