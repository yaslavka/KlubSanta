import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { LANGUAGES, generateBookingReference } from '@/lib/site'
import { sendMail, bookingReceivedEmail } from '@/lib/mailer'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const bookingSchema = z.object({
  productSlug: z.string().min(1, 'Choose a ritual'),
  recipientName: z.string().trim().min(1, 'Name is required').max(80),
  pronunciation: z.string().trim().max(120).optional().default(''),
  ageRange: z.string().trim().max(40).optional().default(''),
  language: z.string().trim().min(1, 'Language is required').max(60),
  parentEmail: z.string().trim().email('Valid email is required').max(200),
  memoryNote: z.string().trim().max(600).optional().default(''),
  scheduledFor: z.string().trim().max(200).optional().default(''),
  consentGiven: z.boolean().refine((v) => v === true, 'Adult consent is required'),
})

// POST /api/bookings — create a reservation from the ritual modal (public)
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = rateLimit(`bookings:${ip}`, 10, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many reservations from this address. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bookingSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Validation failed' },
      { status: 422 }
    )
  }
  const data = parsed.data

  if (!LANGUAGES.includes(data.language as (typeof LANGUAGES)[number])) {
    return NextResponse.json({ error: 'Unsupported language' }, { status: 422 })
  }

  try {
    const product = await db.product.findUnique({ where: { slug: data.productSlug } })
    if (!product || !product.active) {
      return NextResponse.json({ error: 'This ritual is not available' }, { status: 404 })
    }

    const booking = await db.booking.create({
      data: {
        reference: generateBookingReference(),
        productId: product.id,
        planName: product.name,
        recipientName: data.recipientName,
        pronunciation: data.pronunciation,
        ageRange: data.ageRange,
        language: data.language,
        parentEmail: data.parentEmail.toLowerCase(),
        memoryNote: data.memoryNote,
        scheduledFor: data.scheduledFor || null,
        status: 'new',
      },
    })

    // Pending order tied to the product price (fulfilled via checkout or manual confirmation)
    await db.order.create({
      data: {
        bookingId: booking.id,
        amountCents: product.priceCents,
        currency: product.currency,
        status: 'pending',
        provider: 'stripe',
      },
    })

    const mail = bookingReceivedEmail({
      reference: booking.reference,
      recipientName: booking.recipientName,
      planName: product.name,
      language: booking.language,
    })
    await sendMail({
      to: booking.parentEmail,
      subject: mail.subject,
      html: mail.html,
      template: 'booking_received',
    })

    return NextResponse.json(
      {
        booking: {
          id: booking.id,
          reference: booking.reference,
          status: booking.status,
          planName: product.name,
        },
        amountCents: product.priceCents,
        currency: product.currency,
        message:
          'Your reservation has been inscribed in the Believer Ledger. A confirmation is on its way to your inbox.',
      },
      { status: 201 }
    )
  } catch (e) {
    console.error('POST /api/bookings', e)
    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 })
  }
}
