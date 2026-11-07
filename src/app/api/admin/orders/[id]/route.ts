import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { markOrderPaid } from '@/lib/fulfillment'
import { ORDER_STATUSES } from '@/lib/site'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  action: z.enum(['mark_paid', 'mark_refunded', 'mark_failed', 'cancel']),
  manualRef: z.string().trim().max(120).optional(),
})

// PATCH /api/admin/orders/[id] — manual payment confirmations & lifecycle.
// mark_paid runs the SAME fulfillment pipeline as the Stripe webhook (idempotent).
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
    const order = await db.order.findUnique({ where: { id } })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    switch (parsed.data.action) {
      case 'mark_paid': {
        if (order.status === 'paid') {
          return NextResponse.json({ ok: true, message: 'Order is already paid (idempotent no-op).' })
        }
        const manualRef = parsed.data.manualRef || `manual-${Date.now()}`
        const existing = await db.order.findUnique({ where: { paymentRef: manualRef } }).catch(() => null)
        const ref = existing ? `${manualRef}-${Date.now()}` : manualRef
        const result = await markOrderPaid(order.id, ref)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        // reflect provider=manual when confirmed outside Stripe
        await db.order.update({ where: { id: order.id }, data: { provider: 'manual' } })
        return NextResponse.json({
          ok: true,
          message: 'Payment confirmed. Fulfillment pipeline started: booking paid, generation job created, parent notified.',
          ...(result.alreadyPaid ? { note: 'was already paid' } : {}),
        })
      }
      case 'mark_refunded': {
        await db.order.update({
          where: { id: order.id, status: 'paid' },
          data: { status: 'refunded', refundedAt: new Date() },
        })
        await db.booking.updateMany({ where: { id: order.bookingId, status: 'paid' }, data: { status: 'cancelled' } })
        return NextResponse.json({ ok: true, message: 'Order marked as refunded. Original processing fees are generally not returned (per brief).' })
      }
      case 'mark_failed': {
        await db.order.updateMany({ where: { id: order.id, status: 'pending' }, data: { status: 'failed' } })
        return NextResponse.json({ ok: true, message: 'Order marked as failed.' })
      }
      case 'cancel': {
        await db.order.updateMany({ where: { id: order.id, status: 'pending' }, data: { status: 'cancelled' } })
        return NextResponse.json({ ok: true, message: 'Order cancelled.' })
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 422 })
    }
  } catch (e) {
    console.error('PATCH /api/admin/orders/[id]', e)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}

// keep ORDER_STATUSES referenced for shared typing
void ORDER_STATUSES
