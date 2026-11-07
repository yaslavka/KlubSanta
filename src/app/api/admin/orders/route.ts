import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/admin/orders?status=&q=&page=
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
      { sessionRef: { contains: q } },
      { paymentRef: { contains: q } },
      { booking: { is: { reference: { contains: q } } } },
      { booking: { is: { parentEmail: { contains: q } } } },
    ]
  }

  try {
    const [items, total] = await Promise.all([
      db.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          booking: {
            select: { reference: true, recipientName: true, parentEmail: true, planName: true },
          },
        },
      }),
      db.order.count({ where }),
    ])
    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    })
  } catch (e) {
    console.error('GET /api/admin/orders', e)
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 })
  }
}
