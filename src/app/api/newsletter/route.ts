import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { sendMail, newsletterWelcomeEmail } from '@/lib/mailer'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const schema = z.object({
  email: z.string().trim().email('Valid email is required').max(200),
})

// POST /api/newsletter — "North Pole Dispatch" subscription (public)
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = rateLimit(`newsletter:${ip}`, 8, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Validation failed' }, { status: 422 })
  }
  const email = parsed.data.email.toLowerCase()

  try {
    const existing = await db.newsletterSubscriber.findUnique({ where: { email } })
    if (existing) {
      if (existing.unsubscribedAt) {
        await db.newsletterSubscriber.update({
          where: { id: existing.id },
          data: { unsubscribedAt: null },
        })
        return NextResponse.json({ ok: true, message: 'Welcome back to the circle. Your subscription is restored.' })
      }
      return NextResponse.json({ ok: true, message: 'You are already part of the circle. See you when the season calls.' })
    }

    await db.newsletterSubscriber.create({ data: { email, source: 'landing' } })

    const mail = newsletterWelcomeEmail()
    await sendMail({
      to: email,
      subject: mail.subject,
      html: mail.html,
      template: 'newsletter_welcome',
    })

    return NextResponse.json({
      ok: true,
      message: 'You have entered the circle. Watch your inbox for the first North Pole letter.',
    })
  } catch (e) {
    console.error('POST /api/newsletter', e)
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }
}
