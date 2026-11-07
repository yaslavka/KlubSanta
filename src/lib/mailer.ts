// Transactional email via Resend. Every message is logged into EmailLog.
// When RESEND_API_KEY is not configured, the email is stored with status
// "skipped_no_provider" so support can still see what should have been sent.
import 'server-only'
import { db } from '@/lib/db'

type MailInput = {
  to: string
  subject: string
  html: string
  template: string
}

function brandWrap(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F3EDE2;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="background:#7D0A16;border-radius:16px 16px 0 0;padding:24px;text-align:center;">
      <div style="color:#F8DFAF;font-size:22px;letter-spacing:2px;font-weight:bold;">KLUB SANTA</div>
      <div style="color:#D0A56A;font-size:12px;letter-spacing:3px;margin-top:4px;">WHERE BELIEVERS BELONG</div>
    </div>
    <div style="background:#FAF6F0;border-radius:0 0 16px 16px;padding:28px;border:1px solid #D0A56A;border-top:none;">
      <h2 style="color:#3A0008;margin:0 0 12px;font-size:20px;">${title}</h2>
      <div style="color:#5C2B31;font-size:15px;line-height:1.6;">${bodyHtml}</div>
      <hr style="border:none;border-top:1px solid #D0A56A;margin:24px 0 12px;" />
      <p style="color:#8a6d3b;font-size:12px;margin:0;">Klub Santa · 10% of every ritual supports orphans &amp; isolated elders · hello@klubsanta.com</p>
    </div>
  </div>
</body></html>`
}

export async function sendMail(input: MailInput): Promise<void> {
  let status = 'queued'
  let providerId: string | null = null
  let error: string | null = null

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    status = 'skipped_no_provider'
  } else {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(apiKey)
      const from = process.env.EMAIL_FROM || 'Klub Santa <onboarding@resend.dev>'
      const result = await resend.emails.send({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
      })
      if (result.error) {
        status = 'failed'
        error = result.error.message
      } else {
        status = 'sent'
        providerId = result.data?.id ?? null
      }
    } catch (e) {
      status = 'failed'
      error = e instanceof Error ? e.message : String(e)
    }
  }

  try {
    await db.emailLog.create({
      data: {
        toEmail: input.to,
        subject: input.subject,
        template: input.template,
        status,
        providerId,
        error,
      },
    })
  } catch (e) {
    console.error('EmailLog write failed:', e)
  }
}

export function bookingReceivedEmail(opts: {
  reference: string
  recipientName: string
  planName: string
  language: string
}): { subject: string; html: string } {
  const subject = `Your Klub Santa reservation ${opts.reference} is in the Believer Ledger`
  const body = `
    <p>Dear keeper of the tradition,</p>
    <p>Your reservation for <strong>${opts.recipientName}</strong> has been inscribed in the Believer Ledger.</p>
    <ul>
      <li><strong>Ritual:</strong> ${opts.planName}</li>
      <li><strong>Language:</strong> ${opts.language}</li>
      <li><strong>Reference:</strong> ${opts.reference}</li>
    </ul>
    <p>Keep this reference close — our North Pole post will reach out about the next step of your family ritual.</p>
  `
  return { subject, html: brandWrap('Reservation Received', body) }
}

export function paymentReceivedEmail(opts: {
  reference: string
  recipientName: string
  planName: string
  amountFormatted: string
}): { subject: string; html: string } {
  const subject = `Payment received — Santa is preparing ${opts.recipientName}'s ritual`
  const body = `
    <p>Wonderful news! We received your offering of <strong>${opts.amountFormatted}</strong> for reservation <strong>${opts.reference}</strong>.</p>
    <p>Santa has begun preparing <strong>${opts.recipientName}</strong>'s ${opts.planName} in candlelight. You will receive a private link the moment it is ready.</p>
  `
  return { subject, html: brandWrap('Payment Received', body) }
}

export function keepsakeReadyEmail(opts: {
  reference: string
  recipientName: string
  downloadUrl: string
}): { subject: string; html: string } {
  const subject = `A keepsake from Santa is ready for ${opts.recipientName}`
  const body = `
    <p>The moment has arrived.</p>
    <p>Santa's personalised keepsake for <strong>${opts.recipientName}</strong> (reservation <strong>${opts.reference}</strong>) is ready in your private archive:</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${opts.downloadUrl}" style="background:#7D0A16;color:#F8DFAF;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:bold;">Open Your Keepsake</a>
    </p>
    <p>This private link is meant for your family only. Gather close, and enjoy.</p>
  `
  return { subject, html: brandWrap('Keepsake Ready', body) }
}

export function newsletterWelcomeEmail(): { subject: string; html: string } {
  const subject = 'Welcome to the North Pole Dispatch'
  const body = `
    <p>Welcome to the circle of believers.</p>
    <p>You will receive seasonal reflections, early access to Christmas Eve call windows, and our 24-day December Advent prompts. Sent only when the season calls — never noisy, never shared.</p>
  `
  return { subject, html: brandWrap('Welcome to the Circle', body) }
}
