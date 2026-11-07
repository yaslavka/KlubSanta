import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { dispatchGenerationJob } from '@/lib/fulfillment'
import { JOB_STATUSES } from '@/lib/site'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  action: z.enum(['retry', 'cancel', 'complete_with_url']),
  outputUrl: z.string().url().max(1000).optional(),
})

// PATCH /api/admin/jobs/[id] — retry dispatch / cancel / manual completion (staff review path per brief)
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 422 })
  }

  try {
    const job = await db.generationJob.findUnique({ where: { id } })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    switch (parsed.data.action) {
      case 'retry': {
        await db.generationJob.update({
          where: { id: job.id },
          data: { status: 'queued', error: null },
        })
        const result = await dispatchGenerationJob(job.id)
        return NextResponse.json(
          {
            ok: result.ok,
            message: result.ok
              ? 'Job re-dispatched to the provider.'
              : `Dispatch did not succeed: ${result.error}`,
          },
          { status: result.ok ? 200 : 400 }
        )
      }
      case 'cancel': {
        await db.generationJob.updateMany({
          where: { id: job.id, status: { in: ['queued', 'submitted', 'processing', 'failed'] } },
          data: { status: 'cancelled' },
        })
        return NextResponse.json({ ok: true, message: 'Job cancelled.' })
      }
      case 'complete_with_url': {
        if (!parsed.data.outputUrl) {
          return NextResponse.json({ error: 'outputUrl is required' }, { status: 422 })
        }
        const { completeGenerationJob } = await import('@/lib/fulfillment')
        // ensure providerJobId linkage exists for the completion path
        if (!job.providerJobId) {
          await db.generationJob.update({
            where: { id: job.id },
            data: { providerJobId: `manual-${job.id}` },
          })
        }
        const result = await completeGenerationJob({
          providerJobId: job.providerJobId || `manual-${job.id}`,
          outputUrl: parsed.data.outputUrl,
        })
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        return NextResponse.json({
          ok: true,
          message: 'Job completed manually. Parent has been emailed the private download link.',
        })
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 422 })
    }
  } catch (e) {
    console.error('PATCH /api/admin/jobs/[id]', e)
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 })
  }
}

void JOB_STATUSES
