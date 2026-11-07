import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/admin/stats — dashboard overview
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [
      bookingsTotal,
      bookingsNew,
      bookingsAwaitingPayment,
      bookingsCompleted,
      ordersPaid,
      subscribersTotal,
      jobsActive,
      jobsFailed,
      emailsFailed,
      recentBookings,
      productCount,
    ] = await Promise.all([
      db.booking.count(),
      db.booking.count({ where: { status: 'new' } }),
      db.booking.count({ where: { status: 'awaiting_payment' } }),
      db.booking.count({ where: { status: 'completed' } }),
      db.order.findMany({ where: { status: 'paid' }, select: { amountCents: true, currency: true } }),
      db.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
      db.generationJob.count({ where: { status: { in: ['queued', 'submitted', 'processing'] } } }),
      db.generationJob.count({ where: { status: 'failed' } }),
      db.emailLog.count({ where: { status: 'failed' } }),
      db.booking.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { product: { select: { name: true } } },
      }),
      db.product.count({ where: { active: true } }),
    ])

    const revenueCents = ordersPaid.reduce((sum, o) => sum + o.amountCents, 0)
    const currencies = [...new Set(ordersPaid.map((o) => o.currency))]

    const byLanguage = await db.booking.groupBy({
      by: ['language'],
      _count: { language: true },
      orderBy: { _count: { language: 'desc' } },
      take: 8,
    })

    return NextResponse.json({
      bookings: {
        total: bookingsTotal,
        new: bookingsNew,
        awaitingPayment: bookingsAwaitingPayment,
        completed: bookingsCompleted,
      },
      revenue: {
        cents: revenueCents,
        currencies,
        paidOrders: ordersPaid.length,
      },
      subscribers: subscribersTotal,
      jobs: { active: jobsActive, failed: jobsFailed },
      emailsFailed,
      productCount,
      byLanguage: byLanguage.map((g) => ({ language: g.language, count: g._count.language })),
      recentBookings: recentBookings.map((b) => ({
        id: b.id,
        reference: b.reference,
        recipientName: b.recipientName,
        language: b.language,
        status: b.status,
        planName: b.product?.name || b.planName,
        parentEmail: b.parentEmail,
        createdAt: b.createdAt,
      })),
    })
  } catch (e) {
    console.error('GET /api/admin/stats', e)
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
  }
}
