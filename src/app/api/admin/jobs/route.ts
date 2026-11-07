import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/admin/jobs?status=
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || ''
  const where: Record<string, unknown> = {}
  if (status) where.status = status

  try {
    const items = await db.generationJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        booking: { select: { reference: true, recipientName: true, language: true, parentEmail: true } },
      },
    })
    return NextResponse.json({ items })
  } catch (e) {
    console.error('GET /api/admin/jobs', e)
    return NextResponse.json({ error: 'Failed to load jobs' }, { status: 500 })
  }
}
