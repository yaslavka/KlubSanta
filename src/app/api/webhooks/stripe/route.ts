import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { markOrderPaid } from '@/lib/fulfillment'
import { getStripeForWebhook, getStripeWebhookSecret } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// POST /api/webhooks/stripe — signed Stripe webhook (checkout.session.completed etc).
// Verifies the signature (required control per the brief) and is idempotent:
// duplicate deliveries never double-charge or double-fulfill.
export async function POST(req: NextRequest) {
  const secret = await getStripeWebhookSecret()
  const signature = req.headers.get('stripe-signature')

  if (!secret || !signature) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  const stripe = await getStripeForWebhook()
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, secret)
  } catch (e) {
    console.error('Stripe signature verification failed', e)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const orderId = session.metadata?.orderId
        const paymentRef =
          typeof session.payment_intent === 'string' ? session.payment_intent : session.id
        if (orderId) {
          await markOrderPaid(orderId, paymentRef)
        }
        break
      }
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object
        const orderId = session.metadata?.orderId
        if (orderId) {
          const { db } = await import('@/lib/db')
          await db.order.updateMany({
            where: { id: orderId, status: 'pending' },
            data: { status: 'failed' },
          })
        }
        break
      }
      case 'charge.refunded': {
        const charge = event.data.object
        const paymentIntent = typeof charge.payment_intent === 'string' ? charge.payment_intent : null
        if (paymentIntent) {
          const { db } = await import('@/lib/db')
          await db.order.updateMany({
            where: { paymentRef: paymentIntent, status: 'paid' },
            data: { status: 'refunded', refundedAt: new Date() },
          })
        }
        break
      }
      default:
        // Unhandled event types are acknowledged quickly (dispatcher pattern per the brief)
        break
    }
  } catch (e) {
    // Acknowledge but log - Stripe will retry on non-2xx only for hard failures we rethrow
    console.error('Stripe webhook handler error', event.type, e)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
