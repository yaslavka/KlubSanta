import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import {
  INTEGRATION_SECRET_KEYS,
  isSecretKey,
  maskValue,
} from '@/lib/integrations'

export const dynamic = 'force-dynamic'

const putSchema = z.object({
  settings: z.record(z.string(), z.string().max(2000)),
})

function maskRows<T extends { key: string; value: string }>(rows: T[]) {
  return rows.map((row) => ({
    ...row,
    value: isSecretKey(row.key) ? maskValue(row.value) : row.value,
  }))
}

// GET /api/admin/settings — key/value settings; secret-like values are masked.
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const rows = await db.setting.findMany({ orderBy: { key: 'asc' } })
    return NextResponse.json({ settings: maskRows(rows) })
  } catch (e) {
    console.error('GET /api/admin/settings', e)
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }
}

// PUT /api/admin/settings — { settings: { key: value, ... } }
// Integration credentials (API keys/secrets) are owner-only: support, content
// and finance roles cannot read or overwrite provider credentials.
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

  const touchesIntegrationKeys = Object.keys(parsed.data.settings).some(
    (key) => isSecretKey(key) || (INTEGRATION_SECRET_KEYS as readonly string[]).includes(key)
  )
  if (touchesIntegrationKeys && session.role !== 'owner') {
    return NextResponse.json(
      { error: 'Only the owner role can change integration credentials' },
      { status: 403 }
    )
  }

  // Ignore masked echo-backs: a masked value (••••) must never overwrite the
  // stored secret when a form round-trips without editing that field.
  const entries = Object.entries(parsed.data.settings).filter(
    ([key, value]) => !(isSecretKey(key) && value.includes('•'))
  )

  try {
    for (const [key, value] of entries) {
      await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
    }
    const rows = await db.setting.findMany({ orderBy: { key: 'asc' } })
    return NextResponse.json({ settings: maskRows(rows) })
  } catch (e) {
    console.error('PUT /api/admin/settings', e)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
