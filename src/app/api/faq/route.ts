import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/faq — active "Sacred Questions" for the landing page
export async function GET() {
  try {
    const faqs = await db.faq.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json({ faqs })
  } catch (e) {
    console.error('GET /api/faq', e)
    return NextResponse.json({ error: 'Failed to load FAQ' }, { status: 500 })
  }
}
