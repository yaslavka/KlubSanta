import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/admin/subscribers?q=&format=json|csv
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  const format = searchParams.get('format') || 'json'

  const where: Record<string, unknown> = {}
  if (q) where.email = { contains: q }

  try {
    const items = await db.newsletterSubscriber.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
    })

    if (format === 'csv') {
      const esc = (s: string | null) => `"${(s ?? '').replace(/"/g, '""')}"`
      const rows = [
        'email,source,subscribed_at,status',
        ...items.map(
          (s) =>
            `${esc(s.email)},${esc(s.source)},${s.createdAt.toISOString()},${s.unsubscribedAt ? 'unsubscribed' : 'active'}`
        ),
      ]
      return new NextResponse(rows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="klub-santa-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    }

    return NextResponse.json({
      items,
      total: items.length,
    })
  } catch (e) {
    console.error('GET /api/admin/subscribers', e)
    return NextResponse.json({ error: 'Failed to load subscribers' }, { status: 500 })
  }
}
