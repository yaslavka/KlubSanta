import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getPaymentsStatus } from '@/lib/payments'

export const dynamic = 'force-dynamic'

// GET /api/admin/auth/me — session identity + platform status (payment mode)
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ admin: session, payments: await getPaymentsStatus() })
}
