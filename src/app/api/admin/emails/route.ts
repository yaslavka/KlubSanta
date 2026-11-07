import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/admin/emails?status=&q=&page= — outbound email log
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || ''
  const q = (searchParams.get('q') || '').trim()
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = 25

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (q) where.OR = [{ toEmail: { contains: q } }, { subject: { contains: q } }]

  try {
    const [items, total] = await Promise.all([
      db.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.emailLog.count({ where }),
    ])
    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    })
  } catch (e) {
    console.error('GET /api/admin/emails', e)
    return NextResponse.json({ error: 'Failed to load email log' }, { status: 500 })
  }
}
