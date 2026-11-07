import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const faqSchema = z.object({
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(5).max(3000),
  sortOrder: z.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true),
})

// GET /api/admin/faqs
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const faqs = await db.faq.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })
    return NextResponse.json({ faqs })
  } catch (e) {
    console.error('GET /api/admin/faqs', e)
    return NextResponse.json({ error: 'Failed to load FAQs' }, { status: 500 })
  }
}

// POST /api/admin/faqs
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = faqSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Validation failed' }, { status: 422 })
  }

  try {
    const faq = await db.faq.create({ data: parsed.data })
    return NextResponse.json({ faq }, { status: 201 })
  } catch (e) {
    console.error('POST /api/admin/faqs', e)
    return NextResponse.json({ error: 'Failed to create FAQ' }, { status: 500 })
  }
}
