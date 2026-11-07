import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getStripe } from '@/lib/stripe'
import { isStripeConfigured } from '@/lib/payments'
import { markOrderPaid } from '@/lib/fulfillment'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
export const dynamic = 'force-dynamic'

const schema = z.object({ sessionId: z.string().min(10).max(300) })

// POST /api/checkout/confirm — verify-on-return for Stripe Checkout.
// Called by the success page with the session_id Stripe appended to the
// success_url. Retrieves the session directly from Stripe and, when the
// payment is truly paid, runs the idempotent markOrderPaid pipeline.
//
// Why this exists: the signed Stripe webhook (/api/webhooks/stripe) is the
// source of truth in production, but during local TEST-mode development no
// public webhook URL may be reachable. Confirm-on-return makes test payments
// complete the full fulfillment pipeline anyway. Both paths are idempotent —
// whoever arrives first (webhook or confirm) marks the order paid exactly once.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = rateLimit(`confirm:${ip}`, 20, 60_000)
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 })
  }

  if (!(await isStripeConfigured())) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 422 })
  }

  try {
    const stripe = await getStripe()
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
    }

    const session = await stripe.checkout.sessions.retrieve(parsed.data.sessionId)
    const orderId = session.metadata?.orderId

    if (session.payment_status !== 'paid' || !orderId) {
      return NextResponse.json({ ok: false, status: session.payment_status })
    }

    const paymentRef =
      typeof session.payment_intent === 'string' ? session.payment_intent : session.id
    const result = await markOrderPaid(orderId, paymentRef)
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? 'Confirmation failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, alreadyPaid: Boolean(result.alreadyPaid) })
  } catch (e) {
    console.error('POST /api/checkout/confirm', e)
    return NextResponse.json({ error: 'Could not verify the payment' }, { status: 500 })
  }
}
