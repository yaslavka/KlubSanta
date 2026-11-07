import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getIntegrationStatus } from '@/lib/integrations'
import { getPaymentsStatus } from '@/lib/payments'
import { isHeyGenConfigured } from '@/lib/heygen'

export const dynamic = 'force-dynamic'

// GET /api/admin/integrations — provider status + masked values for the
// "API & AI Providers" admin page. Secrets are never returned in clear text;
// raw values are only read server-side at call time (checkout, fulfillment, mail).
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [items, payments, heygen] = await Promise.all([
      getIntegrationStatus(),
      getPaymentsStatus(),
      isHeyGenConfigured(),
    ])
    return NextResponse.json({
      integrations: items,
      payments,
      providers: {
        heygen: heygen,
        stripe: payments.stripeConfigured,
        resend: items.some((i) => i.key === 'RESEND_API_KEY' && i.configured),
      },
    })
  } catch (e) {
    console.error('GET /api/admin/integrations', e)
    return NextResponse.json({ error: 'Failed to load integrations' }, { status: 500 })
  }
}
