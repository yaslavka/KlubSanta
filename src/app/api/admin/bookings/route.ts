import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/admin/bookings?status=&q=&page=
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || ''
  const q = (searchParams.get('q') || '').trim()
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = 20

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (q) {
    where.OR = [
      { reference: { contains: q } },
      { recipientName: { contains: q } },
      { parentEmail: { contains: q } },
      { planName: { contains: q } },
    ]
  }

  try {
    const [items, total] = await Promise.all([
      db.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          product: { select: { name: true, priceCents: true, currency: true } },
          orders: { select: { id: true, status: true, amountCents: true, currency: true, provider: true } },
          jobs: { select: { id: true, status: true, kind: true } },
        },
      }),
      db.booking.count({ where }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    })
  } catch (e) {
    console.error('GET /api/admin/bookings', e)
    return NextResponse.json({ error: 'Failed to load bookings' }, { status: 500 })
  }
}
