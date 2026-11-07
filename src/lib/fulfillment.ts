// Fulfillment orchestration per the brief:
// paid webhook/manual confirm -> durable job -> provider dispatch (idempotent) -> verified completion -> email with private download link
import 'server-only'
import { db } from '@/lib/db'
import { sendMail, paymentReceivedEmail, keepsakeReadyEmail } from '@/lib/mailer'
import { isHeyGenConfigured, submitHeyGenVideo } from '@/lib/heygen'
import { buildSantaScript, formatMoney } from '@/lib/site'

/**
 * Marks an order as paid (idempotent) and starts fulfillment:
 * booking -> paid, generation job -> queued/submitted, parent notified.
 * Called by the Stripe webhook, by admin "mark as paid", or by manual flows.
 */
export async function markOrderPaid(orderId: string, paymentRef?: string): Promise<{ ok: boolean; alreadyPaid?: boolean; error?: string }> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { booking: { include: { product: true } } },
  })
  if (!order) return { ok: false, error: 'Order not found' }
  if (order.status === 'paid') return { ok: true, alreadyPaid: true }

  await db.order.update({
    where: { id: order.id },
    data: {
      status: 'paid',
      paidAt: new Date(),
      ...(paymentRef ? { paymentRef } : {}),
    },
  })

  await db.booking.update({
    where: { id: order.bookingId },
    data: { status: 'paid' },
  })

  const mail = paymentReceivedEmail({
    reference: order.booking.reference,
    recipientName: order.booking.recipientName,
    planName: order.booking.planName || order.booking.product?.name || 'ritual',
    amountFormatted: formatMoney(order.amountCents, order.currency),
  })
  await sendMail({
    to: order.booking.parentEmail,
    subject: mail.subject,
    html: mail.html,
    template: 'payment_received',
  })

  // Create the durable generation job (idempotent: one open job per booking)
  const existingJob = await db.generationJob.findFirst({
    where: { bookingId: order.bookingId, status: { in: ['queued', 'submitted', 'processing'] } },
  })
  if (!existingJob) {
    await createGenerationJobForBooking(order.bookingId, order.id)
  }

  return { ok: true }
}

/** Creates a generation job and immediately dispatches to HeyGen when configured. */
export async function createGenerationJobForBooking(
  bookingId: string,
  orderId?: string
): Promise<{ ok: boolean; error?: string }> {
  const booking = await db.booking.findUnique({ where: { id: bookingId }, include: { product: true } })
  if (!booking) return { ok: false, error: 'Booking not found' }

  const scriptText = buildSantaScript({
    recipientName: booking.recipientName,
    language: booking.language,
    memoryNote: booking.memoryNote,
    planName: booking.planName || booking.product?.name,
  })

  const job = await db.generationJob.create({
    data: {
      bookingId: booking.id,
      orderId: orderId ?? null,
      provider: 'heygen',
      kind: 'video',
      status: 'queued',
      scriptText,
    },
  })

  if (!(await isHeyGenConfigured())) {
    await db.generationJob.update({
      where: { id: job.id },
      data: { error: 'Waiting for provider credentials (HEYGEN_API_KEY). Job stays queued.' },
    })
    return { ok: true }
  }

  return dispatchGenerationJob(job.id)
}

/** Submits a queued job to the provider with retry-safe idempotency. */
export async function dispatchGenerationJob(jobId: string): Promise<{ ok: boolean; error?: string }> {
  const job = await db.generationJob.findUnique({ where: { id: jobId }, include: { booking: true } })
  if (!job) return { ok: false, error: 'Job not found' }
  if (job.status === 'completed') return { ok: true }
  if (job.status === 'submitted' && job.providerJobId) return { ok: true } // already dispatched

  if (!(await isHeyGenConfigured())) {
    await db.generationJob.update({
      where: { id: job.id },
      data: { error: 'Waiting for provider credentials (HEYGEN_API_KEY).' },
    })
    return { ok: false, error: 'Provider not configured' }
  }

  const result = await submitHeyGenVideo({
    scriptText: job.scriptText || '',
    title: `Klub Santa ${job.booking.reference}`,
    bookingReference: job.booking.reference,
  })

  if (!result.ok) {
    await db.generationJob.update({
      where: { id: job.id },
      data: { status: 'failed', error: result.error, attempts: { increment: 1 } },
    })
    return { ok: false, error: result.error }
  }

  await db.generationJob.update({
    where: { id: job.id },
    data: {
      status: 'submitted',
      providerJobId: result.providerJobId,
      error: null,
      attempts: { increment: 1 },
    },
  })
  await db.booking.update({ where: { id: job.bookingId }, data: { status: 'in_production' } })
  return { ok: true }
}

/** Called by the HeyGen webhook when rendering completes. */
export async function completeGenerationJob(opts: {
  providerJobId: string
  outputUrl?: string
  failed?: boolean
  errorMessage?: string
}): Promise<{ ok: boolean; error?: string }> {
  const job = await db.generationJob.findUnique({
    where: { providerJobId: opts.providerJobId },
    include: { booking: true },
  })
  if (!job) return { ok: false, error: 'Job not found for provider id' }

  if (opts.failed) {
    await db.generationJob.update({
      where: { id: job.id },
      data: { status: 'failed', error: opts.errorMessage || 'Provider reported failure', completedAt: new Date() },
    })
    return { ok: true }
  }

  if (!opts.outputUrl) return { ok: false, error: 'No output url in completion event' }

  await db.generationJob.update({
    where: { id: job.id },
    data: { status: 'completed', outputUrl: opts.outputUrl, completedAt: new Date(), error: null },
  })
  await db.booking.update({ where: { id: job.bookingId }, data: { status: 'completed' } })

  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const { SignJWT } = await import('jose')
  const secret = new TextEncoder().encode(
    process.env.SESSION_SECRET || 'klub-santa-dev-secret-change-me-in-production-0123456789'
  )
  const token = await new SignJWT({ orderId: job.orderId, jobId: job.id })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret)
  const downloadUrl = `${appUrl}/api/download/${token}`

  const mail = keepsakeReadyEmail({
    reference: job.booking.reference,
    recipientName: job.booking.recipientName,
    downloadUrl,
  })
  await sendMail({
    to: job.booking.parentEmail,
    subject: mail.subject,
    html: mail.html,
    template: 'keepsake_ready',
  })

  return { ok: true }
}
