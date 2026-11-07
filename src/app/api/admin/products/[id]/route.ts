import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  tagline: z.string().trim().max(160).optional(),
  description: z.string().trim().max(1000).optional(),
  points: z.string().max(2000).optional(),
  ribbon: z.string().trim().max(60).nullable().optional(),
  badge: z.string().trim().max(60).nullable().optional(),
  ctaLabel: z.string().trim().max(60).optional(),
  priceCents: z.number().int().min(0).max(10_000_00).optional(),
  currency: z.string().trim().length(3).optional(),
  image: z.string().trim().max(300).nullable().optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
})

// PATCH /api/admin/products/[id]
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
    const data = { ...parsed.data }
    if ('ribbon' in data && data.ribbon === '') data.ribbon = null
    if ('badge' in data && data.badge === '') data.badge = null
    if ('image' in data && data.image === '') data.image = null

    const product = await db.product.update({ where: { id }, data })
    return NextResponse.json({ product })
  } catch (e) {
    console.error('PATCH /api/admin/products/[id]', e)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

// DELETE /api/admin/products/[id] — blocked when bookings reference it
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params

  try {
    const bookingsCount = await db.booking.count({ where: { productId: id } })
    if (bookingsCount > 0) {
      // Keep history intact (per brief: ledger rows are durable) — deactivate instead
      await db.product.update({ where: { id }, data: { active: false } })
      return NextResponse.json({
        ok: true,
        deactivated: true,
        message: 'Product has reservations — it was deactivated instead of deleted to keep ledger history.',
      })
    }
    await db.product.delete({ where: { id } })
    return NextResponse.json({ ok: true, deleted: true })
  } catch (e) {
    console.error('DELETE /api/admin/products/[id]', e)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
