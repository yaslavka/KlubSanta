import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'node:crypto'
import { db } from '@/lib/db'
import { markOrderPaid } from '@/lib/fulfillment'
import {
  normalizeCardNumber,
  SANDBOX_DECLINE_CARDS,
  SANDBOX_SUCCESS_CARD,
  verifySandboxPaymentToken,
} from '@/lib/payments'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const schema = z.object({
  token: z.string().min(20).max(2048),
  card: z.object({
    number: z.string().min(12).max(25),
    name: z.string().trim().min(1).max(120),
    expiry: z.string().trim().regex(/^(0[1-9]|1[0-2])\s*\/\s*([0-9]{2})$/, 'MM/YY'),
    cvc: z.string().trim().regex(/^[0-9]{3,4}$/, '3–4 digits'),
  }),
})

const DECLINE_MESSAGES: Record<string, string> = {
  '4000000000000002': 'Your card was declined.',
  '4000000000000006': 'Your card has expired.',
  '4000000000009995': 'Your card has insufficient funds.',
}

// POST /api/checkout/sandbox — the sandbox gateway's "process payment" step.
// Runs the exact same markOrderPaid pipeline as the Stripe webhook, so a
// sandbox payment is indistinguishable downstream (order → paid → durable job
// → provider dispatch → emails). This is the test harness for the full flow.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = rateLimit(`sandbox-pay:${ip}`, 12, 60_000)
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
    return NextResponse.json({ error: 'Invalid payment details' }, { status: 422 })
  }

  const verified = verifySandboxPaymentToken(parsed.data.token)
  if (!verified) {
    return NextResponse.json(
      { error: 'This checkout link has expired. Please restart the reservation payment.' },
      { status: 400 }
    )
  }

  try {
    const order = await db.order.findUnique({
      where: { id: verified.orderId },
      include: { booking: true },
    })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (order.amountCents !== verified.amountCents) {
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
    }
    if (order.status === 'paid') {
      return NextResponse.json({
        ok: true,
        alreadyPaid: true,
        redirect: `/?checkout=success&ref=${order.booking.reference}`,
      })
    }
    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: 'This order can no longer be paid online.' },
        { status: 409 }
      )
    }

    const number = normalizeCardNumber(parsed.data.card.number)

    // Simulated issuer responses for the documented test cards.
    if (SANDBOX_DECLINE_CARDS.has(number)) {
      await new Promise((resolve) => setTimeout(resolve, 600)) // mimic processor latency
      return NextResponse.json(
        {
          code: 'card_declined',
          error: DECLINE_MESSAGES[number] ?? 'Your card was declined.',
        },
        { status: 402 }
      )
    }

    // Any other well-formed number succeeds (sandbox analogue of 4242…).
    if (number.length < 12 || number.length > 19 || !/^[0-9]+$/.test(number)) {
      return NextResponse.json({ error: 'Your card number is incomplete.' }, { status: 422 })
    }

    const paymentRef = `sbx_${crypto.randomUUID()}`
    const result = await markOrderPaid(order.id, paymentRef)
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? 'Payment failed' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      alreadyPaid: Boolean(result.alreadyPaid),
      testCard: number === SANDBOX_SUCCESS_CARD ? SANDBOX_SUCCESS_CARD : number,
      redirect: `/?checkout=success&ref=${order.booking.reference}`,
    })
  } catch (e) {
    console.error('POST /api/checkout/sandbox', e)
    return NextResponse.json({ error: 'Sandbox payment failed' }, { status: 500 })
  }
}
