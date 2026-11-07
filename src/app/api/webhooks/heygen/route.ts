import { NextRequest, NextResponse } from 'next/server'
import { completeGenerationJob, dispatchGenerationJob } from '@/lib/fulfillment'
import type { HeyGenWebhookEvent } from '@/lib/heygen'

export const dynamic = 'force-dynamic'

// POST /api/webhooks/heygen — provider completion callbacks.
// Acknowledges quickly and resolves durable jobs (dispatcher pattern per the brief).
// Protected with a shared secret header when HEYGEN_WEBHOOK_SECRET is set.
export async function POST(req: NextRequest) {
  const expected = process.env.HEYGEN_WEBHOOK_SECRET
  if (expected && req.headers.get('x-heygen-secret') !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: HeyGenWebhookEvent
  try {
    payload = (await req.json()) as HeyGenWebhookEvent
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const videoId = payload.data?.video_id
  if (!videoId) {
    return NextResponse.json({ received: true, note: 'no video_id, ignored' })
  }

  try {
    const { db } = await import('@/lib/db')
    const job = await db.generationJob.findUnique({ where: { providerJobId: videoId } })
    if (!job) return NextResponse.json({ received: true, note: 'unknown video_id, ignored' })

    const status = (payload.data?.status || payload.event_type || '').toLowerCase()
    const failed = status.includes('failed') || status.includes('error') || Boolean(payload.data?.failed_reason)

    if (failed) {
      await completeGenerationJob({
        providerJobId: videoId,
        failed: true,
        errorMessage: payload.data?.failed_reason || 'Provider failure',
      })
      return NextResponse.json({ received: true })
    }

    if (status.includes('complet') || status.includes('success')) {
      await completeGenerationJob({ providerJobId: videoId, outputUrl: payload.data?.video_url })
      return NextResponse.json({ received: true })
    }

    // Any other intermediate status (pending/processing/queueing...)
    await db.generationJob.update({
      where: { id: job.id },
      data: { status: status.includes('process') || status.includes('pending') ? 'processing' : job.status },
    })
    return NextResponse.json({ received: true })
  } catch (e) {
    console.error('HeyGen webhook handler error', e)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }
}

// Admin convenience: POST /api/webhooks/heygen?action=retry with { jobId } re-dispatches a failed job.
export async function PUT(req: NextRequest) {
  const { getSession } = await import('@/lib/auth')
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { jobId } = (await req.json().catch(() => ({}))) as { jobId?: string }
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 422 })

  const { db } = await import('@/lib/db')
  await db.generationJob.update({ where: { id: jobId }, data: { status: 'queued', error: null } }).catch(() => null)
  const result = await dispatchGenerationJob(jobId)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
