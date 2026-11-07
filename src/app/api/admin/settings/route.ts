import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const putSchema = z.object({
  settings: z.record(z.string(), z.string().max(2000)),
})

// GET /api/admin/settings
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const rows = await db.setting.findMany({ orderBy: { key: 'asc' } })
    return NextResponse.json({ settings: rows })
  } catch (e) {
    console.error('GET /api/admin/settings', e)
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }
}

// PUT /api/admin/settings — { settings: { key: value, ... } }
export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = putSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid settings payload' }, { status: 422 })
  }

  try {
    for (const [key, value] of Object.entries(parsed.data.settings)) {
      await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
    }
    const rows = await db.setting.findMany({ orderBy: { key: 'asc' } })
    return NextResponse.json({ settings: rows })
  } catch (e) {
    console.error('PUT /api/admin/settings', e)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
