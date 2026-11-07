import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getStripe, isStripeConfigured, getAppUrl } from '@/lib/stripe'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const schema = z.object({ bookingId: z.string().min(10) })

// POST /api/checkout — create a Stripe Checkout session for a reservation.
// Real Stripe path activates automatically when STRIPE_SECRET_KEY is present.
// Without keys the API answers 503 PAYMENTS_NOT_CONFIGURED and the reservation
// stays saved for manual payment confirmation in the admin panel.
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

    if (!isStripeConfigured()) {
      return NextResponse.json(
        {
          code: 'PAYMENTS_NOT_CONFIGURED',
          error:
            'Online payments are not switched on yet. Your reservation is safely stored — our team will contact you to complete the ritual.',
        },
        { status: 503 }
      )
    }

    const stripe = await getStripe()
    if (!stripe) {
      return NextResponse.json({ code: 'PAYMENTS_NOT_CONFIGURED', error: 'Stripe unavailable' }, { status: 503 })
    }

    const appUrl = getAppUrl()
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
      success_url: `${appUrl}/?checkout=success&ref=${booking.reference}`,
      cancel_url: `${appUrl}/?checkout=cancelled&ref=${booking.reference}`,
    })

    await db.order.update({
      where: { id: openOrder.id },
      data: { sessionRef: session.id, provider: 'stripe' },
    })

    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('POST /api/checkout', e)
    return NextResponse.json({ error: 'Failed to start checkout' }, { status: 500 })
  }
}
