import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getStripe, getAppUrl } from '@/lib/stripe'
import {
  createSandboxPaymentToken,
  getPaymentMode,
  isStripeConfigured,
} from '@/lib/payments'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const schema = z.object({ bookingId: z.string().min(10) })

// POST /api/checkout — start a hosted checkout for a reservation.
//
// mode = stripe_live | stripe_test (STRIPE_SECRET_KEY set)
//   → real Stripe Checkout session (same code path for both; the key prefix
//     decides whether Stripe charges real money or runs its test network).
//
// mode = sandbox (no STRIPE_SECRET_KEY)
//   → built-in test gateway page at /checkout/sandbox. It exercises the exact
//     same markOrderPaid fulfillment pipeline, so test payments work with zero
//     configuration. Switching to Stripe is a settings/env-only change.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = rateLimit(`checkout:${ip}`, 12, 60_000)
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 })
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: 'bookingId is required' }, { status: 422 })
  }

  try {
    const booking = await db.booking.findUnique({
      where: { id: parsed.data.bookingId },
      include: { product: true, orders: true },
    })
    if (!booking) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }
    const openOrder = booking.orders.find((o) => o.status === 'pending' || o.status === 'paid')
    if (!openOrder) {
      return NextResponse.json({ error: 'No payable order for this reservation' }, { status: 409 })
    }
    if (openOrder.status === 'paid') {
      return NextResponse.json({ error: 'This reservation is already paid' }, { status: 409 })
    }

    if (!(await isStripeConfigured())) {
      // Sandbox gateway — a real, self-hosted test checkout that feeds the
      // production fulfillment pipeline (markOrderPaid). Used until Stripe
      // keys are provided; nothing here is dead-ended.
      const token = createSandboxPaymentToken(openOrder.id, openOrder.amountCents)
      return NextResponse.json({
        url: `/checkout/sandbox?t=${encodeURIComponent(token)}`,
        mode: 'sandbox',
      })
    }

    const stripe = await getStripe()
    if (!stripe) {
      const token = createSandboxPaymentToken(openOrder.id, openOrder.amountCents)
      return NextResponse.json({
        url: `/checkout/sandbox?t=${encodeURIComponent(token)}`,
        mode: 'sandbox',
      })
    }

    const appUrl = getAppUrl()
    const mode = getPaymentMode()
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: booking.parentEmail,
      client_reference_id: booking.reference,
      metadata: { bookingId: booking.id, orderId: openOrder.id },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (booking.product?.currency || openOrder.currency || 'usd').toLowerCase(),
            unit_amount: openOrder.amountCents,
            product_data: {
              name: booking.product?.name || booking.planName || 'Klub Santa Ritual',
              description: `Personalised for ${booking.recipientName} · Reservation ${booking.reference}`,
            },
          },
        },
      ],
      // session_id template lets /api/checkout/confirm verify the payment on
      // return — fulfillment no longer depends solely on webhook reachability
      // (matters for local test mode; the signed webhook remains the source of
      // truth in production and both paths are idempotent).
      success_url: `${appUrl}/?checkout=success&ref=${booking.reference}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?checkout=cancelled&ref=${booking.reference}`,
    })

    await db.order.update({
      where: { id: openOrder.id },
      data: { sessionRef: session.id, provider: 'stripe' },
    })

    return NextResponse.json({ url: session.url, mode })
  } catch (e) {
    console.error('POST /api/checkout', e)
    return NextResponse.json({ error: 'Failed to start checkout' }, { status: 500 })
  }
}
