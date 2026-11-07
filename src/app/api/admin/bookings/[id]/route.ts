import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { BOOKING_STATUSES } from '@/lib/site'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  adminNote: z.string().max(2000).nullable().optional(),
})

// GET /api/admin/bookings/[id] — full detail incl. orders & jobs
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params

  try {
    const booking = await db.booking.findUnique({
      where: { id },
      include: {
        product: true,
        orders: { orderBy: { createdAt: 'desc' } },
        jobs: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ booking })
  } catch (e) {
    console.error('GET /api/admin/bookings/[id]', e)
    return NextResponse.json({ error: 'Failed to load booking' }, { status: 500 })
  }
}

// PATCH /api/admin/bookings/[id]
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
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Validation failed' }, { status: 422 })
  }

  try {
    const booking = await db.booking.update({
      where: { id },
      data: parsed.data,
    })
    return NextResponse.json({ booking })
  } catch (e) {
    console.error('PATCH /api/admin/bookings/[id]', e)
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }
}
