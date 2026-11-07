import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

export const dynamic = 'force-dynamic'

// GET /api/download/[token] — private signed keepsake download (30-day entitlement per brief).
// The token is issued only when a generation job completes; it redirects to the
// provider's signed URL so media streams from provider storage, not through the app.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params

  const secret = new TextEncoder().encode(
    process.env.SESSION_SECRET || 'klub-santa-dev-secret-change-me-in-production-0123456789'
  )

  try {
    const { payload } = await jwtVerify(token, secret)
    const jobId = typeof payload.jobId === 'string' ? payload.jobId : null
    if (!jobId) return NextResponse.json({ error: 'Invalid link' }, { status: 400 })

    const { db } = await import('@/lib/db')
    const job = await db.generationJob.findUnique({ where: { id: jobId } })
    if (!job || job.status !== 'completed' || !job.outputUrl) {
      return NextResponse.json({ error: 'This keepsake link is not available yet' }, { status: 404 })
    }
    return NextResponse.redirect(job.outputUrl, 302)
  } catch {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 })
  }
}
